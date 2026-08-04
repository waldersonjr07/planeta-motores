# Sobe o sistema inteiro: banco e aplicação.
#
# Existe porque nesta máquina o PostgreSQL está instalado como binários
# portáteis, sem serviço do Windows, e por isso não sobe sozinho quando o
# computador liga. Este script confere o banco, sobe se preciso, e então
# inicia a aplicação.
#
#   .\scripts\iniciar.ps1
#
# Depois é só abrir http://localhost:3000

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$bin = 'C:\Users\walde\apps\pgsql-17\pgsql\bin'

Write-Host 'Conferindo o banco...' -ForegroundColor Cyan
& "$bin\pg_isready.exe" -h localhost -p 5432 | Out-Null

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Banco parado. Subindo...' -ForegroundColor Yellow
  & "$raiz\scripts\banco-local.ps1" start
} else {
  Write-Host 'Banco de pé.' -ForegroundColor Green
}

# O build de produção e o Playwright escrevem no mesmo .next do servidor de
# desenvolvimento. Se o último comando por aqui foi um deles, o servidor sobe
# apontando para pedaços que não existem mais e responde 500.
if (Test-Path "$raiz\.next\BUILD_ID") {
  Write-Host 'Sobra de build de producao em .next — limpando.' -ForegroundColor Yellow
  Remove-Item -Recurse -Force "$raiz\.next"
}

Write-Host 'Subindo a aplicacao em http://localhost:3000' -ForegroundColor Cyan
Set-Location $raiz
npm run dev
