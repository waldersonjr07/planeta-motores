# Sobe a aplicação localmente com SQLite.
#
#   .\scripts\iniciar.ps1
#
# Depois é só abrir http://localhost:3000

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

# O build de produção e o Playwright escrevem no mesmo .next do servidor de
# desenvolvimento. Se o último comando por aqui foi um deles, o servidor sobe
# apontando para pedaços que não existem mais e responde 500.
if (Test-Path "$raiz\.next\BUILD_ID") {
  Write-Host 'Sobra de build de produção em .next — limpando cache.' -ForegroundColor Yellow
  Remove-Item -Recurse -Force "$raiz\.next"
}

Write-Host 'Subindo a aplicação em http://localhost:3000' -ForegroundColor Cyan
Set-Location $raiz
npm run dev
