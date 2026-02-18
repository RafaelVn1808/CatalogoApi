# Coloca a API (CatalagoApi) dentro de backend/ para completar a divisão backend/frontend.
# Execute com o Cursor/Visual Studio fechado para evitar "arquivo em uso".
# Uso: .\mover-api-para-backend.ps1

$raiz = $PSScriptRoot
$apiOrigem = Join-Path $raiz "CatalagoApi"
$apiDestino = Join-Path $raiz "backend\CatalagoApi"
$testesCsproj = Join-Path $raiz "backend\CatalagoApi.Tests\CatalagoApi.Tests.csproj"

if (-not (Test-Path $apiOrigem)) {
    Write-Host "CatalagoApi já está em backend/ ou não foi encontrada em $apiOrigem" -ForegroundColor Yellow
    exit 0
}

Write-Host "Movendo CatalagoApi para backend/ ..." -ForegroundColor Cyan
try {
    Move-Item -Path $apiOrigem -Destination $apiDestino -Force
} catch {
    Write-Host "Erro ao mover (pode ser arquivo em uso): $_" -ForegroundColor Red
    Write-Host "Feche o Cursor/Visual Studio e tente novamente." -ForegroundColor Yellow
    exit 1
}

# Ajusta referência no projeto de testes: de ..\..\CatalagoApi para ..\CatalagoApi
$content = Get-Content $testesCsproj -Raw
$content = $content -replace '\.\.\\\.\.\\CatalagoApi\\CatalagoApi\.csproj', '..\CatalagoApi\CatalagoApi.csproj'
Set-Content $testesCsproj -Value $content -NoNewline

# Atualiza a solution para apontar para backend/CatalagoApi
$slnPath = Join-Path $raiz "CatalagoApi.slnx"
$sln = Get-Content $slnPath -Raw
$sln = $sln -replace 'CatalagoApi/CatalagoApi\.csproj', 'backend/CatalagoApi/CatalagoApi.csproj'
Set-Content $slnPath -Value $sln -NoNewline

Write-Host "Concluído. Estrutura: backend/CatalagoApi, backend/CatalagoApi.Tests, frontend/" -ForegroundColor Green
