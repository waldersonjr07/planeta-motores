@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Planeta Motores - Script de Backup Automático do PostgreSQL (Docker)
:: Uso: Windows (Execução manual ou agendada pelo Agendador de Tarefas / Task Scheduler)
:: Destino: Sincronização direta na pasta local do Google Drive / Nuvem
:: ============================================================================

:: ----------------------------------------------------------------------------
:: 1. DEFINIÇÃO DE VARIÁVEIS (Ajuste os valores conforme o seu ambiente)
:: ----------------------------------------------------------------------------
:: Caminho da pasta local do Google Drive onde os backups serão armazenados
set "CAMINHO_DRIVE=G:\Meu Drive\Backups\PlanetaMotores"

:: Nome do container Docker do PostgreSQL
set "NOME_CONTAINER=pm-postgres"

:: Nome do banco de dados e usuário do PostgreSQL
set "NOME_DB=pm"
set "USUARIO_DB=pm"

:: ----------------------------------------------------------------------------
:: 2. VALIDAÇÃO DA PASTA DE DESTINO
:: ----------------------------------------------------------------------------
:: Cria a pasta de destino caso ela ainda não exista, com fallback seguro
if not exist "%CAMINHO_DRIVE%" (
    echo [INFO] Criando pasta de destino: "%CAMINHO_DRIVE%"
    mkdir "%CAMINHO_DRIVE%" 2>nul
)
if not exist "%CAMINHO_DRIVE%" (
    echo [AVISO] Caminho "%CAMINHO_DRIVE%" inacessivel. Usando fallback em "%USERPROFILE%\backups\PlanetaMotores".
    set "CAMINHO_DRIVE=%USERPROFILE%\backups\PlanetaMotores"
    if not exist "!CAMINHO_DRIVE!" mkdir "!CAMINHO_DRIVE!" 2>nul
)

:: ----------------------------------------------------------------------------
:: 3. CAPTURA DA DATA ATUAL PARA NOMEAÇÃO DO ARQUIVO (backup_dd-mm-aaaa.sql)
:: ----------------------------------------------------------------------------
:: Obtém a data atual no formato dia-mes-ano (dd-mm-aaaa) de forma padronizada
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format 'dd-MM-yyyy'" 2^>nul') do set "DATA_ATUAL=%%a"

:: Fallback se o PowerShell não estiver disponível no ambiente
if not defined DATA_ATUAL (
    set "DATA_ATUAL=%date:~-10,2%-%date:~-7,2%-%date:~-4,4%"
)

set "NOME_ARQUIVO=backup_%DATA_ATUAL%.sql"
echo [INFO] Iniciando backup diário: %NOME_ARQUIVO%

:: ----------------------------------------------------------------------------
:: 4. EXECUÇÃO DO BACKUP VIA DOCKER EXEC E PG_DUMP
:: ----------------------------------------------------------------------------
:: Executa o pg_dump dentro do container do Docker e redireciona a saída para o arquivo
:: Nota: usa -i (ou sem TTY) em vez de -t para não corromper o dump com caracteres de controle/CRLF
docker exec -i %NOME_CONTAINER% pg_dump -U %USUARIO_DB% %NOME_DB% > "%CAMINHO_DRIVE%\%NOME_ARQUIVO%"

if %ERRORLEVEL% equ 0 (
    echo [SUCESSO] Backup salvo com sucesso em: "%CAMINHO_DRIVE%\%NOME_ARQUIVO%"
) else (
    echo [ERRO] Falha ao extrair backup do container %NOME_CONTAINER%. Verifique se o Docker está em execução.
)

:: ----------------------------------------------------------------------------
:: 5. POLÍTICA DE RETENÇÃO (LIMPEZA DE ARQUIVOS COM MAIS DE 7 DIAS)
:: ----------------------------------------------------------------------------
:: Remove backups antigos para não lotar o disco nem o armazenamento em nuvem
echo [INFO] Limpando arquivos com mais de 7 dias na pasta de destino...
ForFiles /p "%CAMINHO_DRIVE%" /s /d -7 /c "cmd /c del @file" 2>nul

echo [INFO] Rotina de backup finalizada.
exit /b 0
