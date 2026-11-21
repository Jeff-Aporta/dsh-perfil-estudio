# Instala el binario de codebase-memory-mcp (el GRAFO DEL CODIGO) en Windows y verifica su checksum.
#
# USO
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/instalar-codebase-memory.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/instalar-codebase-memory.ps1 -Verificar
param(
  [string]$Version = $(if ($env:CBM_VERSION) { $env:CBM_VERSION } else { "v0.12.1" }),
  [string]$DestDir = $(if ($env:CBM_DIR) { $env:CBM_DIR } else { Join-Path $env:USERPROFILE ".local\bin" }),
  [switch]$Verificar
)
$ErrorActionPreference = "Stop"

Write-Output "== codebase-memory-mcp (el grafo del codigo) =="
Write-Output "version: $Version"
Write-Output "destino: $DestDir"

$yaEsta = Get-Command codebase-memory-mcp -ErrorAction SilentlyContinue
if ($yaEsta) {
  Write-Output "-- ya esta en el PATH: $($yaEsta.Source)"
  & codebase-memory-mcp --version
  Write-Output "listo."
  exit 0
}
if ($Verificar) {
  Write-Output "-- no esta en el PATH (el perfil arranca sin grafo)"
  exit 1
}

$repo = "DeusData/codebase-memory-mcp"
$asset = "codebase-memory-mcp-windows-amd64.zip"
$tmp = Join-Path $env:TEMP ("cbm-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$base = "https://github.com/$repo/releases/download/$Version"
Write-Output "-- bajando $asset"
Invoke-WebRequest -Uri "$base/$asset" -OutFile (Join-Path $tmp $asset) -UseBasicParsing
Invoke-WebRequest -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp "checksums.txt") -UseBasicParsing

$nuestro = (Get-FileHash (Join-Path $tmp $asset) -Algorithm SHA256).Hash.ToLower()
$linea = Select-String -Path (Join-Path $tmp "checksums.txt") -Pattern ([regex]::Escape($asset) + '$') | Select-Object -First 1
$oficial = ($linea.Line -split '\s+')[0]
if (-not $oficial) { Write-Output "no encuentro el checksum de $asset"; exit 3 }
if ($nuestro -ne $oficial) {
  Write-Output "CHECKSUM DISTINTO: no se instala"
  Write-Output "  bajamos: $nuestro"
  Write-Output "  oficial: $oficial"
  exit 4
}
Write-Output "-- checksum ok ($nuestro)"

Expand-Archive -Path (Join-Path $tmp $asset) -DestinationPath (Join-Path $tmp "x") -Force
$exe = Get-ChildItem (Join-Path $tmp "x") -Recurse -Filter "codebase-memory-mcp*.exe" | Select-Object -First 1
if (-not $exe) { Write-Output "no encuentro el exe dentro del zip"; exit 5 }
New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
Copy-Item $exe.FullName (Join-Path $DestDir "codebase-memory-mcp.exe") -Force
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

Write-Output "-- instalado: $(Join-Path $DestDir 'codebase-memory-mcp.exe')"
& (Join-Path $DestDir "codebase-memory-mcp.exe") --version

$pathUsuario = [Environment]::GetEnvironmentVariable("Path","User")
if ($pathUsuario -notlike "*$DestDir*") {
  Write-Output ""
  Write-Output "AVISO: $DestDir no esta en el PATH del usuario. Anadelo con:"
  Write-Output "  [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';$DestDir', 'User')"
}
Write-Output ""
Write-Output "listo. el perfil ya monta el servidor MCP (mcp-codebase)."
