@echo off
title Lancement de CityFlow (Backend et Frontend)
echo ========================================================
echo       Lancement de CityFlow - Smart City Manager
echo ========================================================
echo.
echo Demarrage du Backend en arriere-plan...
start "CityFlow Backend" cmd /k "cd backend && npm run dev"

echo Demarrage du Frontend...
start "CityFlow Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Les deux serveurs sont en cours de demarrage.
echo Le frontend sera bientot disponible sur http://localhost:5173
echo ========================================================
timeout /t 5 >nul
start http://localhost:5173
exit
