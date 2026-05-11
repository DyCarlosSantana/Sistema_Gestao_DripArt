@echo off
cd /d "%~dp0"
title Dycore DEV — Ambiente de Desenvolvimento
color 0E

echo.
echo  ==============================================
echo.
echo       ____                                  
echo      / __ ^\ _   _  ___ ___  _ __ ___       
echo     / / _` ^| ^| ^| ^|/ __/ _ \^| '__/ _ \      
echo    ^| ^| (_^| ^| ^|_^| ^| (_^| (_) ^| ^| ^|  __/      
echo     \ \__,_^|\__, ^|\___\___/^|_^|  \___^|      
echo      \____/ ^|___/                            
echo.
echo       MODO DEV  -  Ambiente de Desenvolvimento
echo  ==============================================
echo.

:: ─── Definir Ambiente ────────────────────────────
set APP_ENV=development

:: ─── Detectar Python ─────────────────────────────
set PYTHON_EXE=

python --version > nul 2>&1
if not errorlevel 1 ( set PYTHON_EXE=python& goto :python_ok )

py --version > nul 2>&1
if not errorlevel 1 ( set PYTHON_EXE=py& goto :python_ok )

for %%V in (314 313 312 311 310) do (
    if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
        set PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe
        goto :python_ok
    )
)

echo.
echo  [ERRO] Python nao encontrado!
echo  Instale em: https://www.python.org/downloads/
echo  Marque "Add Python to PATH" durante a instalacao.
echo.
pause & exit /b 1

:python_ok
echo  [OK] Python encontrado

:: ─── Verificar Dependencias ─────────────────────
echo  [..] Verificando dependencias...
%PYTHON_EXE% -m pip show flask > nul 2>&1
if errorlevel 1 (
    echo  [..] Instalando dependencias pela primeira vez...
    %PYTHON_EXE% -m pip install -r requirements.txt -q
    if errorlevel 1 (
        echo  [ERRO] Falha ao instalar dependencias.
        pause & exit /b 1
    )
    echo  [OK] Dependencias instaladas com sucesso!
) else (
    echo  [OK] Dependencias verificadas
)

:: ─── Build do Frontend ────────────────────────────
echo  [..] Compilando o frontend (npm run build)...
cd decor-venue-flow-main
call npm run build >nul 2>&1
if errorlevel 1 (
    echo  [AVISO] Falha no build do frontend. Usando versao anterior.
) else (
    echo  [OK] Frontend compilado com sucesso!
)
cd ..

:: ─── Iniciar Sistema ────────────────────────────
echo.
echo  ──────────────────────────────────────────────
echo  [>>] Iniciando Dycore em modo DESENVOLVIMENTO...
echo  [>>] Banco de dados: TESTE (Neon.tech Dev)
echo  [>>] Acesse: http://localhost:5000
echo.
echo  Nao feche esta janela durante o uso.
echo  Para encerrar o sistema: Ctrl+C
echo  ──────────────────────────────────────────────
echo.

start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:5000"

%PYTHON_EXE% app.py

echo.
echo  ──────────────────────────────────────────────
echo  Sistema encerrado.
echo  ──────────────────────────────────────────────
pause
