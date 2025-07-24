# Руководство по обновлению Bot Constructor

## Типы обновлений

### Patch обновления (1.0.1 → 1.0.2)
- Исправления ошибок
- Мелкие улучшения
- Обновления безопасности

### Minor обновления (1.0.x → 1.1.0)
- Новые функции
- Улучшения интерфейса
- Новые шаблоны ботов

### Major обновления (1.x.x → 2.0.0)
- Кардинальные изменения
- Новая архитектура
- Возможны breaking changes

## Подготовка к обновлению

### 1. Создание резервной копии

```bash
# Полный бэкап
./scripts/backup.sh full

# Только данные (быстрее)
./scripts/backup.sh data
```

### 2. Проверка текущей версии

```bash
# Версия приложения
curl http://localhost:3000/api/health | jq '.version'

# Версия из package.json
cat package.json | grep version
```

### 3. Проверка совместимости

```bash
# Тест системы
./scripts/test-raspberry-pi.sh

# Проверка Docker
docker --version
docker-compose --version
```

## Автоматическое обновление

### Скрипт обновления

```bash
#!/bin/bash
# scripts/update.sh

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "🔄 Начинаем обновление Bot Constructor..."

# Создание бэкапа
log "💾 Создание резервной копии..."
./scripts/backup.sh data

# Остановка сервиса
log "🛑 Остановка сервиса..."
sudo systemctl stop bot-constructor

# Обновление кода
log "📥 Обновление кода..."
git fetch origin
git pull origin main

# Обновление зависимостей
log "📦 Обновление зависимостей..."
if [[ -f package.json ]]; then
    npm install --production
fi

# Пересборка контейнеров
log "🔨 Пересборка контейнеров..."
docker-compose build --no-cache

# Запуск сервиса
log "🚀 Запуск сервиса..."
sudo systemctl start bot-constructor

# Проверка работоспособности
log "🏥 Проверка работоспособности..."
sleep 15

if curl -f http://localhost:3000/api/health &>/dev/null; then
    log "✅ Обновление завершено успешно!"
else
    log "❌ Ошибка после обновления, откат..."
    # Здесь можно добавить логику отката
    exit 1
fi
```

### Запуск обновления

```bash
chmod +x scripts/update.sh
./scripts/update.sh
```

## Ручное обновление

### 1. Остановка сервиса

```bash
# Остановка systemd сервиса
sudo systemctl stop bot-constructor

# Или остановка Docker контейнеров
docker-compose down
```

### 2. Обновление кода

```bash
# Сохранение локальных изменений
git stash

# Обновление из репозитория
git fetch origin
git pull origin main

# Восстановление локальных изменений (если нужно)
git stash pop
```

### 3. Проверка изменений

```bash
# Просмотр изменений
git log --oneline -10

# Проверка изменений в конфигурации
diff .env.example .env || true
```

### 4. Обновление зависимостей

```bash
# Node.js зависимости (если есть)
npm install --production

# Обновление Docker образов
docker-compose pull
```

### 5. Миграция данных (если требуется)

```bash
# Проверка необходимости миграции
if [[ -f scripts/migrate.sh ]]; then
    ./scripts/migrate.sh
fi
```

### 6. Пересборка и запуск

```bash
# Пересборка контейнеров
docker-compose build

# Запуск сервиса
sudo systemctl start bot-constructor

# Или запуск контейнеров напрямую
docker-compose up -d
```

### 7. Проверка работоспособности

```bash
# Проверка статуса
sudo systemctl status bot-constructor

# Проверка API
curl http://localhost:3000/api/health

# Проверка логов
docker-compose logs -f --tail=50
```

## Откат к предыдущей версии

### Быстрый откат

```bash
# Остановка сервиса
sudo systemctl stop bot-constructor

# Откат кода
git reset --hard HEAD~1

# Восстановление данных из бэкапа
./scripts/restore.sh backups/bot-constructor-backup-data-YYYYMMDD_HHMMSS.tar.gz

# Запуск сервиса
sudo systemctl start bot-constructor
```

### Полный откат

```bash
# Остановка и удаление контейнеров
docker-compose down --volumes

# Откат кода к определенной версии
git reset --hard v1.0.0

# Восстановление полного бэкапа
./scripts/restore.sh backups/bot-constructor-backup-full-YYYYMMDD_HHMMSS.tar.gz

# Пересборка и запуск
docker-compose build
sudo systemctl start bot-constructor
```

## Обновление конфигурации

### Проверка новых параметров

```bash
# Сравнение с примером
diff .env.example .env

# Добавление новых параметров
cat >> .env << EOF
# Новые параметры из обновления
NEW_FEATURE_ENABLED=true
NEW_API_ENDPOINT=https://api.example.com
EOF
```

### Обновление Docker Compose

```bash
# Если изменился docker-compose.yml
docker-compose config

# Пересоздание сервисов с новой конфигурацией
docker-compose up -d --force-recreate
```

## Автоматические обновления

### Настройка cron для автообновлений

```bash
# Добавление в crontab
crontab -e

# Проверка обновлений каждый день в 3:00
0 3 * * * cd /home/pi/bot-constructor && git fetch && [ $(git rev-list HEAD...origin/main --count) != 0 ] && ./scripts/update.sh
```

### Уведомления об обновлениях

```bash
# Скрипт проверки обновлений
#!/bin/bash
# scripts/check-updates.sh

cd /home/pi/bot-constructor
git fetch origin

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ $LOCAL != $REMOTE ]; then
    echo "Доступно обновление Bot Constructor"
    echo "Текущая версия: $(git describe --tags --always)"
    echo "Новая версия: $(git describe --tags --always origin/main)"
    echo "Запустите: ./scripts/update.sh"
fi
```

## Мониторинг обновлений

### Проверка статуса после обновления

```bash
# Статус сервиса
sudo systemctl is-active bot-constructor

# Версия приложения
curl -s http://localhost:3000/api/health | jq '.version'

# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats --no-stream
```

### Логи обновления

```bash
# Логи systemd
sudo journalctl -u bot-constructor --since "1 hour ago"

# Логи Docker
docker-compose logs --since 1h

# Логи обновления (если ведутся)
tail -f /var/log/bot-constructor-update.log
```

## Устранение проблем при обновлении

### Конфликты Git

```bash
# Сброс локальных изменений
git reset --hard HEAD
git clean -fd

# Повторное обновление
git pull origin main
```

### Проблемы с Docker

```bash
# Очистка Docker кэша
docker system prune -a

# Пересборка без кэша
docker-compose build --no-cache

# Перезапуск Docker
sudo systemctl restart docker
```

### Проблемы с базой данных

```bash
# Восстановление из бэкапа
./scripts/restore.sh backups/latest-backup.tar.gz

# Проверка целостности данных
# (добавить специфичные команды проверки)
```

## Планирование обновлений

### Рекомендуемое расписание

- **Patch обновления:** Еженедельно
- **Minor обновления:** Ежемесячно
- **Major обновления:** По необходимости, с тестированием

### Подготовка к major обновлениям

1. Изучение changelog и breaking changes
2. Тестирование на копии системы
3. Планирование времени обслуживания
4. Подготовка плана отката
5. Уведомление пользователей

### Тестовая среда

```bash
# Создание копии для тестирования
cp -r /home/pi/bot-constructor /home/pi/bot-constructor-test
cd /home/pi/bot-constructor-test

# Изменение портов в docker-compose.yml
sed -i 's/3000:3000/3001:3000/' docker-compose.yml

# Тестирование обновления
./scripts/update.sh
```