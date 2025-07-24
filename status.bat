@echo off
chcp 65001 >nul
title Bot Constructor - Статус

echo ========================================
echo     Bot Constructor - Статус
echo ========================================
echo.

:: Проверяем PID файл
if exist "bot-constructor.pid" (
    echo [%time%] PID файл найден
    
    :: Читаем PID из файла
    set /p APP_PID=<bot-constructor.pid
    echo [%time%] Записанный PID: %APP_PID%
    
    :: Проверяем, запущен ли процесс
    tasklist /FI "PID eq %APP_PID%" 2>nul | find /I "node.exe" >nul
    if not errorlevel 1 (
        echo ✅ Приложение ЗАПУЩЕНО (PID: %APP_PID%)
        
        :: Получаем дополнительную информацию о процессе
        for /f "tokens=5" %%i in ('tasklist /FI "PID eq %APP_PID%" /FO CSV ^| find "%APP_PID%"') do (
            echo [%time%] Использование памяти: %%i
        )
        
        :: Проверяем доступность веб-интерфейса
        echo [%time%] Проверка веб-интерфейса...
        curl -s -o nul -w "%%{http_code}" http://localhost:3002 2>nul | find "200" >nul
        if not errorlevel 1 (
            echo ✅ Веб-интерфейс доступен: http://localhost:3002
        ) else (
            echo ⚠️  Веб-интерфейс недоступен
        )
        
    ) else (
        echo ❌ Процесс с PID %APP_PID% НЕ ЗАПУЩЕН
        echo [%time%] PID файл устарел, удаляем...
        del "bot-constructor.pid" >nul 2>&1
    )
) else (
    echo [%time%] PID файл не найден
    echo ❌ Приложение НЕ ЗАПУЩЕНО
)

echo.

:: Проверяем все процессы Node.js
echo [%time%] Поиск всех процессов Node.js...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find "node.exe" >nul
if not errorlevel 1 (
    echo [%time%] Найденные процессы Node.js:
    tasklist /FI "IMAGENAME eq node.exe" /FO TABLE
) else (
    echo [%time%] Процессы Node.js не найдены
)

echo.

:: Проверяем логи
if exist "logs\process.log" (
    echo [%time%] Последние записи из лога:
    echo ----------------------------------------
    for /f "skip=0 tokens=*" %%i in ('powershell "Get-Content logs\process.log -Tail 5"') do echo %%i
    echo ----------------------------------------
) else (
    echo [%time%] Лог файл не найден
)

echo.
echo ========================================
echo [%time%] Проверка статуса завершена
echo ========================================
echo.
pause