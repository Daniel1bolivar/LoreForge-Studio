@echo off
title LoreForge Studio
cd /d "%~dp0"
echo ===================================================
echo   Iniciando LoreForge Studio en servidor local...
echo ===================================================
timeout /t 2 /nobreak >nul
start http://localhost:5173
npm run dev
