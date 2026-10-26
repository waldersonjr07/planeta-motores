# Backup local para ambiente Windows: banco, fotos e retenção.
#
# Pode ser executado manualmente ou agendado no Agendador de Tarefas do Windows (Task Scheduler).
#
# Exemplo de uso manual:
#   .\scripts\backup-local.ps1
#
# Com cópia para pasta do Google Drive ou OneDrive:
#   .\scripts\backup-local.ps1 -PastaNuvem "C:\Users\walde\OneDrive\Backups"

param(
  [string]$Destino = "$HOME\backups",
  [int]$DiasRetencao = 14,
  [string]$PastaNuvem = ""
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

# Localização dos binários portáteis do PostgreSQL
$bin = if ($env:PG_BIN) { $env:PG_BIN } else { 'C:\Users\walde\apps\pgsql-17\pgsql\bin' }

if (-not (Test-Path "$bin\pg_dump.exe")) {
  Write-Error "pg_dump.exe não encontrado em '$bin'. Verifique o caminho dos binários do PostgreSQL."
  exit 1
}

# Carregar variáveis do .env se existir
$banco = 'pm'
$usuario = 'pm'
$porta = '5432'
$servidor = 'localhost'
$env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { 'pm' }

$envFile = Join-Path $raiz '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $linha = $_.Trim()
    if ($linha -and -not $linha.StartsWith('#') -and $linha.Contains('=')) {
      $partes = $linha.Split('=', 2)
      $chave = $partes[0].Trim()
      $valor = $partes[1].Trim()
      if ($chave -eq 'DATABASE_URL' -and $valor -match 'postgres://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $usuario = $Matches[1]
        $env:PGPASSWORD = $Matches[2]
        $servidor = $Matches[3]
        $porta = $Matches[4]
        $banco = $Matches[5]
      }
    }
  }
}

Write-Host "=== Iniciando Backup Local da Planeta Motores ===" -ForegroundColor Cyan

# 1. Conferir se o banco de dados está rodando
& "$bin\pg_isready.exe" -h $servidor -p $porta -U $usuario | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Warning "PostgreSQL parado em $servidor`:$porta. Tentando iniciar..."
  if (Test-Path "$raiz\scripts\banco-local.ps1") {
    & "$raiz\scripts\banco-local.ps1" start
    Start-Sleep -Seconds 3
  }
  & "$bin\pg_isready.exe" -h $servidor -p $porta -U $usuario | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Não foi possível conectar ao PostgreSQL. Abortando backup."
    exit 1
  }
}

# 2. Criar diretórios de destino
$estadoDir = Join-Path $Destino 'estado'
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino -Force | Out-Null }
if (-not (Test-Path $estadoDir)) { New-Item -ItemType Directory -Path $estadoDir -Force | Out-Null }

$carimbo = Get-Date -Format 'yyyy-MM-dd-HHmm'
$arqBancoSql = Join-Path $Destino "banco-$carimbo.sql"
$arqBancoGz = Join-Path $Destino "banco-$carimbo.sql.gz"
$arqFotosGz = Join-Path $Destino "fotos-$carimbo.tar.gz"

# 3. Gerar Dump do Banco
Write-Host "Gerando dump do banco de dados '$banco'..." -ForegroundColor Cyan
& "$bin\pg_dump.exe" -h $servidor -p $porta -U $usuario -d $banco -f $arqBancoSql
if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao gerar o dump com pg_dump.exe."
  if (Test-Path $arqBancoSql) { Remove-Item -Force $arqBancoSql }
  exit 1
}

# Compactar com gzip usando tar nativo do Windows
Write-Host "Compactando dump do banco..." -ForegroundColor Cyan
& tar.exe -czf $arqBancoGz -C $Destino "banco-$carimbo.sql"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao compactar o dump do banco."
  exit 1
}
Remove-Item -Force $arqBancoSql

$tamBanco = (Get-Item $arqBancoGz).Length
Write-Host "Banco: $(Split-Path -Leaf $arqBancoGz) ($([math]::Round($tamBanco / 1KB, 1)) KB)" -ForegroundColor Green

# 4. Compactar pasta de uploads (fotos das OS)
$uploadsDir = Join-Path $raiz 'uploads'
if (Test-Path $uploadsDir) {
  Write-Host "Compactando pasta de uploads (fotos)..." -ForegroundColor Cyan
  & tar.exe -czf $arqFotosGz -C $uploadsDir .
  if ($LASTEXITCODE -eq 0) {
    $tamFotos = (Get-Item $arqFotosGz).Length
    Write-Host "Fotos: $(Split-Path -Leaf $arqFotosGz) ($([math]::Round($tamFotos / 1KB, 1)) KB)" -ForegroundColor Green
  } else {
    Write-Warning "Falha ao compactar as fotos das OS."
  }
} else {
  Write-Host "Pasta de uploads não encontrada ou vazia. Criando arquivo vazio." -ForegroundColor Yellow
  & tar.exe -czf $arqFotosGz -T $null
}

# 5. Cópia externa / nuvem (opcional)
$copiaExterna = "enviada-local"
if ($PastaNuvem) {
  if (Test-Path $PastaNuvem) {
    Write-Host "Copiando para a pasta da nuvem: $PastaNuvem..." -ForegroundColor Cyan
    Copy-Item $arqBancoGz -Destination $PastaNuvem -Force
    if (Test-Path $arqFotosGz) {
      Copy-Item $arqFotosGz -Destination $PastaNuvem -Force
    }
    $copiaExterna = "enviada (nuvem: $(Split-Path -Leaf $PastaNuvem))"
    Write-Host "Cópia para a nuvem concluída." -ForegroundColor Green
  } else {
    $copiaExterna = "FALHOU (pasta nuvem '$PastaNuvem' não encontrada)"
    Write-Warning "A pasta de nuvem informada não existe: $PastaNuvem"
  }
}

# 6. Retenção local (apaga backups com mais de $DiasRetencao dias)
Write-Host "Aplicando política de retenção ($DiasRetencao dias)..." -ForegroundColor Cyan
$limiteData = (Get-Date).AddDays(-$DiasRetencao)
Get-ChildItem -Path $Destino -File | Where-Object {
  ($_.Name -like 'banco-*.sql.gz' -or $_.Name -like 'fotos-*.tar.gz') -and $_.LastWriteTime -lt $limiteData
} | ForEach-Object {
  Write-Host "Apagando cópia antiga: $($_.Name)" -ForegroundColor Yellow
  Remove-Item -Force $_.FullName
}

# 7. Gravar carimbo de estado para a aplicação
$isoDate = [DateTimeOffset]::Now.ToString("yyyy-MM-ddTHH:mm:sszzz")
$marcadorLinha = "$isoDate  cópia externa: $copiaExterna"
$arquivoEstado = Join-Path $estadoDir 'ULTIMO-SUCESSO'
[System.IO.File]::WriteAllText($arquivoEstado, "$marcadorLinha`n", [System.Text.Encoding]::UTF8)

Write-Host "=== Backup Concluído com Sucesso! ($copiaExterna) ===" -ForegroundColor Green
Write-Host "Carimbo salvo em: $arquivoEstado" -ForegroundColor Cyan
