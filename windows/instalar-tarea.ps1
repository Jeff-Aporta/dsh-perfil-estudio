# instalar-tarea.ps1 - deja la tarea programada de actualizacion del perfil en el PC.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File windows\instalar-tarea.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File windows\instalar-tarea.ps1 -Quitar
#
# La tarea se llama "DSH-Perfil-Actualizar" y se ejecuta cada 15 minutos.
param(
  [string]$Repo = $env:DSH_PERFIL_REPO_DIR,
  [switch]$Quitar
)
$ErrorActionPreference = "Stop"

$Nombre = "DSH-Perfil-Actualizar"
$Raiz = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
if (-not $Repo) { $Repo = $Raiz }

if ($Quitar) {
  Unregister-ScheduledTask -TaskName $Nombre -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Tarea $Nombre quitada."
  exit 0
}

$guion = Join-Path $Repo "actualizar.ps1"
if (-not (Test-Path $guion)) {
  Write-Error "No encuentro $guion (clona el repo del perfil antes)"
  exit 1
}

$accion = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$guion`""
$disparador = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName $Nombre -Action $accion -Trigger $disparador -Description "Actualiza el perfil DSH del estudio (pull + reinstalacion + reinicio + anuncio)" -Force | Out-Null
Write-Output "OK  tarea programada $Nombre creada (cada 15 minutos)."
Get-ScheduledTask -TaskName $Nombre | Select-Object TaskName, State | Format-Table -AutoSize | Out-String | Write-Output
