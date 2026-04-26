@echo off
cd /d "%~dp0"
title Dycore DEV — Ambiente de Desenvolvimento
color 0E

echo.
echo  =============================================
echo       DYCORE - MODO DESENVOLVIMENTO (DEV)
echo  =============================================
echo.

set APP_ENV=development
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
echo  [OK] Ambiente: DESENVOLVIMENTO (Banco de dados de TESTE)
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
