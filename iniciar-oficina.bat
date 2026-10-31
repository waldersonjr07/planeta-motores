@echo off
title Servidor Planeta Motores

cd /d "%~dp0"

echo Iniciando o sistema Planeta Motores...
start "Servidor Planeta Motores" npm start

timeout /t 6 /nobreak > nul

start http://localhost:3000
