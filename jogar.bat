@echo off
rem ============================================================
rem  Age of Grecce - atalho para abrir o jogo direto no Electron.
rem  Sobe o servidor de desenvolvimento e abre a janela sozinho.
rem  Fechar a janela do jogo encerra tudo.
rem ============================================================

setlocal
cd /d "%~dp0"
title Age of Grecce

rem Essa variavel faz o Electron rodar como Node puro e quebrar. Limpar sempre.
set "ELECTRON_RUN_AS_NODE="

if not exist "node_modules\" (
  echo Primeira execucao: instalando dependencias...
  call npm install
  if errorlevel 1 goto :erro
)

echo Iniciando o jogo...
echo (feche a janela do jogo para encerrar)
echo.
call npm run app
if errorlevel 1 goto :erro

endlocal
exit /b 0

:erro
echo.
echo ============================================
echo  Algo deu errado. A mensagem esta acima.
echo ============================================
pause
endlocal
exit /b 1
