@echo off
echo Загрузка проекта Kiro Bot Constructor v1.1 в GitHub...

:: Инициализация Git репозитория
git init

:: Добавление удаленного репозитория
git remote add origin https://github.com/kas-admin07/kiro-bot-constructor-v1.1.git

:: Добавление всех файлов (кроме исключенных в .gitignore)
git add .

:: Коммит
git commit -m "Complete project upload: Kiro Bot Constructor v1.1 with visual editor fixes"

:: Загрузка в GitHub
git push -u origin main

echo Проект успешно загружен в GitHub!
echo Репозиторий: https://github.com/kas-admin07/kiro-bot-constructor-v1.1
pause