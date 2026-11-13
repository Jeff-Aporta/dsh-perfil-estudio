# actualizar.ps1 - actualiza el perfil DSH del estudio: pull + reinstalacion + reinicio + anuncio.
#
#   powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File actualizar.ps1
#
# Es idempotente y SILENCIOSO si no hay cambios: si el repo del perfil no se ha
# movido, no reinstala, no reinicia el bot y no anuncia nada.
#
# Cuando hay cambios:
#   1. git pull del repo del perfil;
#   2. reinstala TODOS los perfiles (install.ps1);
#   3. reinicia el bot local (si esta el repo del estudio);
#   4. anuncia en el canal: "perfil actualizado a <sha>".
param(
  [string]$Repo = $env:DSH_PERFIL_REPO_DIR,
  [string]$EstudioRepo = "D:\VPS\estudio-videos"
)
$ErrorActionPreference = "Stop"

$Raiz = Split-Path -Parent $PSCommandPath
if (-not $Repo) { $Repo = $Raiz }

if (-not (Test-Path (Join-Path $Repo ".git"))) {
  Write-Error "El repo del perfil no esta en $Repo (se instala con install.ps1)"
  exit 1
}

$antes = (git -C $Repo rev-parse HEAD).Trim()
git -C $Repo pull --ff-only 2>&1 | Out-Null
$despues = (git -C $Repo rev-parse HEAD).Trim()

if ($antes -eq $despues) {
  # Sin cambios: no se toca nada (esto es lo que comprueba la tarea cada 15 min).
  exit 0
}

Write-Output "Perfil actualizado: $antes -> $despues"
& (Join-Path $Repo "install.ps1") -Repo $Repo -SinPull

# El bot local del PC: se para por su pid y se vuelve a arrancar.
$pidfile = Join-Path $EstudioRepo "datos\equipo\bot-local.pid"
if (Test-Path $pidfile) {
  try {
    $pidBot = [int](Get-Content $pidfile -Raw).Trim()
    Stop-Process -Id $pidBot -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  } catch {}
}
$arrancar = Join-Path $EstudioRepo "tools\iniciar-bot-local.ps1"
if (Test-Path $arrancar) {
  & powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $arrancar
  Write-Output "Bot local rearrancado"
}

# El anuncio en el canal (si hay secreto configurado).
$envCanal = Join-Path $EstudioRepo "canal.env"
if (Test-Path $envCanal) {
  foreach ($linea in Get-Content $envCanal) {
    if ($linea -match "^\s*(CANAL_[A-Za-z0-9_]*)\s*=\s*(.*)$") {
      $nombre = $matches[1]; $valor = $matches[2].Trim()
      if ($valor.StartsWith('"') -and $valor.EndsWith('"')) { $valor = $valor.Substring(1, $valor.Length - 2) }
      Set-Item -Path ("Env:\" + $nombre) -Value $valor
    }
  }
}
if (Get-Command node -ErrorAction SilentlyContinue) {
  & node (Join-Path $Repo "anunciar.mjs") $despues
}
Write-Output "Listo."
