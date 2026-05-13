$ErrorActionPreference = "Stop"

$port = 9222
$bravePath = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

if (-not (Test-Path $bravePath)) {
  throw "Brave nao encontrado em: $bravePath"
}

$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
  Write-Host "Brave ja esta com depuracao remota ativa em http://127.0.0.1:$port"
  exit 0
}

$runningBrave = Get-Process brave -ErrorAction SilentlyContinue
if ($runningBrave) {
  Write-Host "O Brave esta aberto, mas a porta $port nao esta ativa."
  Write-Host "Feche todas as janelas do Brave antes de abrir com depuracao remota."
  Write-Host "Se ainda aparecer brave.exe no Gerenciador de Tarefas, finalize esses processos e rode este script de novo."
  exit 1
}

Start-Process -FilePath $bravePath -ArgumentList "--remote-debugging-port=$port"
Start-Sleep -Seconds 2

$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
  Write-Host "Brave aberto com depuracao remota em http://127.0.0.1:$port"
  exit 0
}

throw "Tentei abrir o Brave, mas a porta $port nao ficou ativa."
