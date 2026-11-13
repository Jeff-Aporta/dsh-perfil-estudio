# install.ps1 - instala (o reinstala) TODOS los perfiles DSH del estudio desde este repo.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -Repo D:\VPS\dsh-perfil-estudio
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -SinPull
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -SoloVerificar
#
# Que hace:
#   · clona (o actualiza con git pull) el repo del perfil;
#   · copia en $DSH_HOME\profiles\<nombre>\ los ficheros de cada perfil (incluidas las skills);
#   · NO toca NUNCA identidad.md (es por nodo: lo escribe instalar-identidad.mjs);
#   · instala el plugin del perfil con pnpm (dependencia git de este repo);
#   · imprime el hash de cada fichero instalado.
#
# Idempotente: se puede ejecutar tantas veces como haga falta.
param(
  [string]$Repo = $env:DSH_PERFIL_REPO_DIR,
  [string]$Url = "https://github.com/Jeff-Aporta/dsh-perfil-estudio.git",
  [switch]$SinPull,
  [switch]$SoloVerificar
)
$ErrorActionPreference = "Stop"

$Raiz = Split-Path -Parent $PSCommandPath
if (-not $Repo) { $Repo = $Raiz }
$DshHomePc = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE ".dsh" }
$Base = Join-Path $DshHomePc "profiles"
$Ficheros = @("perfil.yml", "package.json", "cordis.yml", "cordis.patch.yml", "pnpm-workspace.yaml", "definiciones.md", "PERFIL-TG.md")

Write-Output "== Perfiles DSH del estudio =="
Write-Output "repo:    $Repo"
Write-Output "destino: $Base"
Write-Output ""

# 1. El repo del perfil (clone si no existe).
if (-not (Test-Path (Join-Path $Repo "perfiles"))) {
  Write-Output "-- clono el repo del perfil en $Repo"
  git clone $Url $Repo
  $SinPull = $true
} elseif (-not $SinPull) {
  Write-Output "-- git pull (repo del perfil)"
  git -C $Repo pull --ff-only 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Output "AVISO: el pull no ha ido bien (se sigue con lo que hay)" }
}
if (-not (Test-Path (Join-Path $Repo "perfiles"))) {
  Write-Error "FALTA $Repo\perfiles: no puedo instalar"
  exit 1
}

# 2. pnpm: lo usa DSH para instalar el plugin. En el PC lo trae el runtime de DSH.
$Pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $Pnpm) {
  $DshCmd = Join-Path $env:LOCALAPPDATA "Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
  if (Test-Path $DshCmd) {
    Write-Output "-- pnpm: lo usa el runtime de DSH (dsh plugin --profile <perfil> install)"
    $Pnpm = "dsh"
  }
}
if (-not $Pnpm) {
  Write-Error "FALTA pnpm (lo necesita DSH para instalar el plugin del perfil)"
  exit 1
}

$errores = 0
foreach ($dir in Get-ChildItem -Directory (Join-Path $Repo "perfiles")) {
  if (-not (Test-Path (Join-Path $dir.FullName "perfil.yml"))) { continue }
  $nombre = $dir.Name
  $dest = Join-Path $Base $nombre
  Write-Output "-- $nombre -> $dest"

  if ($SoloVerificar) {
    foreach ($f in $Ficheros) {
      $instalado = Join-Path $dest $f
      if (-not (Test-Path $instalado)) { Write-Output "   x $f : no esta instalado"; $errores = 1; continue }
      $a = (Get-FileHash (Join-Path $dir.FullName $f) -Algorithm SHA256).Hash
      $b = (Get-FileHash $instalado -Algorithm SHA256).Hash
      if ($a -ne $b) { Write-Output "   x $f : repo=$($a.Substring(0,8)) instalado=$($b.Substring(0,8))"; $errores = 1 }
    }
    continue
  }

  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  foreach ($f in $Ficheros) {
    $origen = Join-Path $dir.FullName $f
    if (Test-Path $origen) { Copy-Item -Force $origen (Join-Path $dest $f) }
  }
  # Las skills, tal cual (mismos bytes en PC y VPS).
  $skillsOrigen = Join-Path $dir.FullName "skills"
  if (Test-Path $skillsOrigen) {
    $skillsDest = Join-Path $dest "skills"
    if (Test-Path $skillsDest) { Remove-Item -Recurse -Force $skillsDest }
    Copy-Item -Recurse -Force $skillsOrigen $skillsDest
  }
  # identidad.md NO se toca: es por nodo.

  # El plugin: pnpm (o el runtime de DSH, que trae pnpm).
  if ($Pnpm -eq "dsh") {
    $dshCmd = Join-Path $env:LOCALAPPDATA "Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
    & $dshCmd plugin --profile $nombre install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { & $dshCmd plugin --profile $nombre install; $errores = 1 }
    & $dshCmd plugin --profile $nombre update dsh-estudio-plugin --latest 2>&1 | Out-Null
  } else {
    Push-Location $dest
    try {
      pnpm install --no-frozen-lockfile --prefer-offline 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { pnpm install --no-frozen-lockfile; if ($LASTEXITCODE -ne 0) { $errores = 1 } }
      pnpm update dsh-estudio-plugin --latest 2>&1 | Out-Null
    } finally { Pop-Location }
  }

  $plugin = Join-Path $dest "node_modules\dsh-estudio-plugin\lib\index.js"
  if (Test-Path $plugin) {
    Write-Output ("   OK  plugin instalado (" + (Get-FileHash $plugin -Algorithm SHA256).Hash.Substring(0,8) + ")")
  } else {
    Write-Output "   x  el plugin NO esta instalado en node_modules"
    $errores = 1
  }
  foreach ($f in $Ficheros) {
    $instalado = Join-Path $dest $f
    if (Test-Path $instalado) { Write-Output ("   " + (Get-FileHash $instalado -Algorithm SHA256).Hash.Substring(0,8) + "  " + $f) }
  }
}

Write-Output ""
if ($SoloVerificar) {
  if ($errores -eq 0) { Write-Output "PERFILES OK: identicos al repo."; exit 0 }
  Write-Output "PERFILES DISTINTOS"; exit 1
}
if ($errores -eq 0) {
  Write-Output "Listo. Se usan con: dsh --profile <nombre>"
} else {
  Write-Output "Ha habido fallos (mira arriba)."; exit 1
}
