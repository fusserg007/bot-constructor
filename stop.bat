@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Bot Constructor - Остановка

echo ========================================
echo     Bot Constructor - Остановка
echo ========================================
echo.

echo [%time%] Поиск запущенных экземпляров...

:: Проверяем PID файл
if exist "bot-constructor.pid" (
    echo [%time%] Найден PID файл, читаем...
    
    :: Читаем PID из файла
    set /p APP_PID=<bot-constructor.pid
    
    :: Проверяем, запущен ли процесс
    tasklist /FI "PID eq %APP_PID%" 2>nul | find /I "node.exe" >nul
    if not errorlevel 1 (
        echo [%time%] Завершаем основной процесс (PID: %APP_PID%)...
        
        :: Сначала пытаемся мягко завершить
        taskkill /PID %APP_PID% >nul 2>&1
        
        :: Ждем 3 секунды
        timeout /t 3 /nobreak >nul
        
        :: Проверяем, завершился ли процесс
        tasklist /FI "PID eq %APP_PID%" 2>nul | find /I "node.exe" >nul
        if not errorlevel 1 (
            echo [%time%] Принудительное завершение процесса...
            taskkill /PID %APP_PID% /F >nul 2>&1
        )
        
        echo ✅ Основной процесс завершен
    ) else (
        echo [%time%] Процесс с указанным PID уже не запущен
    )
    
    :: Удаляем PID файл
    del "bot-constructor.pid" >nul 2>&1
    echo [%time%] PID файл удален
) else (
    echo [%time%] PID файл не найден
)

:: Дополнительная проверка и завершение всех процессов node.js с server.js
echo [%time%] Поиск дополнительных процессов Node.js...

for /f "tokens=2,9" %%a in ('tasklist /FO CSV /V ^| find "node.exe"') do (
    set "PID=%%a"
    set "TITLE=%%b"
    set "PID=!PID:"=!"
    set "TITLE=!TITLE:"=!"
    
    :: Проверяем, содержит ли заголовок окна "Bot Constructor" или командная строка содержит server.js
    echo !TITLE! | find /I "Bot Constructor" >nul
    if not errorlevel 1 (
        echo [%time%] Завершаем связанный процесс (PID: !PID!)...
        taskkill /PID !PID! /F >nul 2>&1
    )
)

:: Проверяем процессы по командной строке
wmic process where "name='node.exe' and CommandLine like '%%server.js%%'" get ProcessId /format:value 2>nul | find "ProcessId=" >nul
if not errorlevel 1 (
    echo [%time%] Найдены процессы server.js, завершаем...
    for /f "tokens=2 delims==" %%i in ('wmic process where "name='node.exe' and CommandLine like '%%server.js%%'" get ProcessId /format:value ^| find "ProcessId="') do (
        if not "%%i"=="" (
            echo [%time%] Завершаем процесс server.js (PID: %%i)...
            taskkill /PID %%i /F >nul 2>&1
        )
    )
)

echo.
echo ✅ Все процессы Bot Constructor завершены
echo.
echo ========================================
echo [%time%] Остановка завершена
echo ========================================
echo.
pause