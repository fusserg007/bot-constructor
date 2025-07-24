#!/bin/bash

# Скрипт развертывания Bot Constructor на Raspberry Pi
# Использование: ./scripts/deploy.sh [production|development]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка аргументов
ENVIRONMENT=${1:-production}

if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
    error "Неверное окружение. Используйте: production или development"
    exit 1
fi

log "🚀 Начинаем развертывание Bot Constructor в режиме: $ENVIRONMENT"

# Проверка системы
log "🔍 Проверка системных требований..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен. Установите Docker и повторите попытку."
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose не установлен. Установите Docker Compose и повторите попытку."
    exit 1
fi

# Проверка архитектуры (для Raspberry Pi)
ARCH=$(uname -m)
log "Архитектура системы: $ARCH"

if [[ "$ARCH" == "armv7l" || "$ARCH" == "aarch64" ]]; then
    log "✅ Обнаружена ARM архитектура (Raspberry Pi)"
else
    warning "⚠️ Система не является Raspberry Pi. Продолжаем развертывание..."
fi

# Создание необходимых директорий
log "📁 Создание структуры директорий..."
mkdir -p data/{users,bots,logs,visual_schemas}
mkdir -p nginx/ssl
mkdir -p backups

# Проверка переменных окружения
log "🔧 Настройка переменных окружения..."

if [[ ! -f .env ]]; then
    log "Создание файла .env..."
    cat > .env << EOF
# Bot Constructor Environment Configuration
NODE_ENV=$ENVIRONMENT
PORT=3000
WEBHOOK_BASE_URL=https://your-domain.com
USE_POLLING=false

# Для разработки можно использовать polling
# USE_POLLING=true

# Дополнительные настройки
TZ=Europe/Moscow
EOF
    warning "⚠️ Создан файл .env с базовыми настройками. Отредактируйте его перед запуском!"
fi

# Остановка существующих контейнеров
log "🛑 Остановка существующих контейнеров..."
docker-compose down --remove-orphans || true

# Сборка образа
log "🔨 Сборка Docker образа..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose build --no-cache
else
    docker-compose build
fi

# Запуск контейнеров
log "🚀 Запуск контейнеров..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose up -d
else
    docker-compose up -d
fi

# Ожидание запуска
log "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка здоровья
log "🏥 Проверка состояния сервисов..."
if docker-compose ps | grep -q "Up"; then
    success "✅ Сервисы запущены успешно!"
else
    error "❌ Ошибка запуска сервисов"
    docker-compose logs
    exit 1
fi

# Проверка доступности API
log "🌐 Проверка доступности API..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health &>/dev/null; then
        success "✅ API доступен!"
        break
    fi
    if [[ $i -eq 30 ]]; then
        error "❌ API недоступен после 30 попыток"
        docker-compose logs bot-constructor
        exit 1
    fi
    sleep 2
done

# Вывод информации о развертывании
log "📊 Информация о развертывании:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 URL: http://localhost:3000"
echo "📁 Данные: $(pwd)/data/"
echo "📋 Логи: docker-compose logs -f"
echo "🛑 Остановка: docker-compose down"
echo "🔄 Перезапуск: docker-compose restart"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success "🎉 Развертывание завершено успешно!"

# Показать статус контейнеров
log "📋 Статус контейнеров:"
docker-compose ps

# Рекомендации
log "💡 Рекомендации:"
echo "1. Настройте SSL сертификаты в nginx/ssl/"
echo "2. Обновите WEBHOOK_BASE_URL в .env файле"
echo "3. Настройте автоматическое резервное копирование"
echo "4. Мониторьте логи: docker-compose logs -f bot-constructor"

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "5. Настройте автозапуск: sudo systemctl enable docker"
    echo "6. Настройте firewall для портов 80, 443, 3000"
fi