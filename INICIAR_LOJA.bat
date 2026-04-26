@echo off
cd /d "%~dp0"
title Dycore LOJA — Ambiente de Producao
color 0B

echo.
echo  =============================================
echo         DYCORE - MODO LOJA (PRODUCAO)
echo  =============================================
echo.

set APP_ENV=production
set PYTHON_EXE=

:: Verifica Python
python --version > nul 2>&1
if not errorlevel 1 ( set PYTHON_EXE=python& goto :python_ok )

py --version > nul 2>&1
if not errorlevel 1 ( set PYTHON_EXE=py& goto :python_ok )

echo  ERRO: Python nao encontrado!
echo  Instale em https://www.python.org/downloads/
pause & exit

:python_ok
echo  [OK] Python encontrado: %PYTHON_EXE%
echo  [OK] Ambiente: PRODUCAO (Banco de dados REAL)
echo.
echo  Iniciando sistema...
echo  Nao feche esta janela durante o uso.
echo  Para encerrar: Ctrl+C
echo  -----------------------------------------------

start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:5000"

%PYTHON_EXE% app.py

echo.
echo  Sistema encerrado.
pause
