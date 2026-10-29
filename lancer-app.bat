@echo off
chcp 65001 >nul
title KEG-Sporting - Musculation & Course à Pied
cd /d "%~dp0"
echo ========================================================
echo   Lancement de KEG-Sporting (Musculation & Running)
echo ========================================================
echo.
start "" "http://localhost:5173"
npm run dev
pause
