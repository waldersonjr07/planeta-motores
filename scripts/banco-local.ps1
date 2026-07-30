# Controla o PostgreSQL local desta máquina de desenvolvimento.
#
# Aqui o Postgres 17 está instalado como binários portáteis (sem serviço do
# Windows, porque o instalador oficial exige elevação). Isso significa que ele
# NÃO sobe sozinho quando a máquina liga — rode este script depois de reiniciar.
#
#   .\scripts\banco-local.ps1 start
#   .\scripts\banco-local.ps1 stop
#   .\scripts\banco-local.ps1 status

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'stop', 'status', 'restart')]
  [string]$Acao
)

$bin = 'C:\Users\walde\apps\pgsql-17\pgsql\bin'
$dados = 'C:\Users\walde\apps\pgsql-17\dados'
$log = 'C:\Users\walde\apps\pgsql-17\postgres.log'

switch ($Acao) {
  'start' {
    & "$bin\pg_ctl.exe" -D $dados -l $log -o '-p 5432' start
    Start-Sleep -Seconds 2
    & "$bin\pg_isready.exe" -h localhost -p 5432
  }
  'stop' {
    & "$bin\pg_ctl.exe" -D $dados stop
  }
  'restart' {
    & "$bin\pg_ctl.exe" -D $dados -l $log -o '-p 5432' restart
  }
  'status' {
    & "$bin\pg_ctl.exe" -D $dados status
  }
}
