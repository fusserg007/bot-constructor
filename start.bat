@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Bot Constructor

echo ========================================
echo       Bot Constructor - Запуск
echo ========================================
echo.

:: Проверяем наличие Node.js
echo [%time%] Проверка зависимостей...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ОШИБКА: Node.js не найден!
    echo    Установите Node.js с https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Проверяем наличие package.json
if not exist "package.json" (
    echo ❌ ОШИБКА: package.json не найден!
    echo    Убедитесь, что вы запускаете скрипт из корневой папки проекта
    echo.
    pause
    exit /b 1
)

:: Проверяем установку зависимостей
if not exist "node_modules" (
    echo [%time%] Установка зависимостей...
    npm install
    if errorlevel 1 (
        echo ❌ ОШИБКА: Не удалось установить зависимости!
        pause
        exit /b 1
    )
)

echo [%time%] Проверка предыдущих экземпляров...

:: Проверяем, занят ли порт 3002
echo [%time%] Проверка порта 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    set "PORT_PID=%%a"
    if not "!PORT_PID!"=="" (
        echo [%time%] Найден процесс на порту 3002 с PID: !PORT_PID!, завершаем...
        taskkill /PID !PORT_PID! /F >nul 2>&1
        timeout /t 2 >nul
    )
)

:: Дополнительная очистка PID файла
if exist "bot-constructor.pid" (
    echo [%time%] Удаляем старый PID файл...
    del "bot-constructor.pid" >nul 2>&1
)

:: Создаем папку для логов если её нет
if not exist "logs" mkdir logs

echo.
echo [%time%] Запуск Bot Constructor...
echo ========================================

:: Запускаем приложение с детальным выводом ошибок
echo Запуск сервера...
node server.js
set "EXIT_CODE=%ERRORLEVEL%"

:: Проверяем код завершения
if %EXIT_CODE% NEQ 0 (
    echo.
    echo ❌ Приложение завершилось с ошибкой! (Код: %EXIT_CODE%)
    echo    Проверьте логи в папке logs/
    echo.
    echo Последние строки из лога процесса:
    if exist "logs\process.log" (
        powershell -Command "Get-Content 'logs\process.log' | Select-Object -Last 10"
    )
    echo.
    echo Последние строки из лога сервера:
    if exist "logs\server.log" (
        powershell -Command "Get-Content 'logs\server.log' | Select-Object -Last 10"
    )
) else (
    echo.
    echo ✅ Приложение ЗАПУЩЕНО (PID: %PID%)
    echo    Веб-интерфейс: http://localhost:3002
)

echo.
echo ========================================
echo [%time%] Bot Constructor завершен
echo ========================================
echo Нажмите любую клавишу для выхода...
pause >nul