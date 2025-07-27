@echo off
echo 🤖 Запуск бота...

REM Проверяем наличие виртуального окружения
if not exist "venv" (
    echo Создание виртуального окружения...
    python -m venv venv
)

REM Активируем виртуальное окружение
call venv\Scripts\activate

REM Устанавливаем зависимости
echo Установка зависимостей...
pip install -r requirements.txt

REM Запускаем бота
echo Запуск бота...
python main.py

pause
