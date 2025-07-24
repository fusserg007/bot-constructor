@echo off
chcp 65001 >nul
title Bot Constructor - Перезапуск

echo ========================================
echo    Bot Constructor - Перезапуск
echo ========================================
echo.

echo [%time%] Остановка текущего экземпляра...
call stop.bat

echo.
echo [%time%] Ожидание завершения процессов...
timeout /t 2 /nobreak >nul

echo.
echo [%time%] Запуск нового экземпляра...
call start.bat