#!/bin/bash

# Быстрая установка Bot Constructor на Raspberry Pi
# Использование: curl -sSL https://raw.githubusercontent.com/your-repo/bot-constructor/main/install.sh | bash

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Проверка системы
log "🍓 Быстрая установка Bot Constructor на Raspberry Pi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка архитектуры
ARCH=$(uname -m)
if [[ "$ARCH" != "armv7l" && "$ARCH" != "aarch64" ]]; then
    warning "⚠️ Система не является Raspberry Pi, но продолжаем установку..."
fi

# Обновление системы
log "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка зависимостей
log "🔧 Установка зависимостей..."
sudo apt install -y curl git

# Установка Docker
if ! command -v docker &> /dev/null; then
    log "🐳 Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    success "✅ Docker установлен"
else
    success "✅ Docker уже установлен"
fi

# Установка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log "🔧 Установка Docker Compose..."
    sudo apt install -y docker-compose
    success "✅ Docker Compose установлен"
else
    success "✅ Docker Compose уже установлен"
fi

# Клонирование репозитория
INSTALL_DIR="/home/pi/bot-constructor"
if [[ -d "$INSTALL_DIR" ]]; then
    log "📁 Обновление существующей установки..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    log "📥 Клонирование репозитория..."
    git clone https://github.com/your-repo/bot-constructor.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Настройка переменных окружения
if [[ ! -f .env ]]; then
    log "⚙️ Создание файла конфигурации..."
    cp .env.example .env
    
    # Базовая настройка
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i 's/USE_POLLING=true/USE_POLLING=false/' .env
    
    warning "⚠️ Отредактируйте файл .env для настройки вашего домена и других параметров"
fi

# Создание директорий данных
log "📁 Создание директорий данных..."
mkdir -p data/{users,bots,logs,visual_schemas}
mkdir -p nginx/ssl
mkdir -p backups

# Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# Тестирование системы
log "🧪 Тестирование системы..."
if ./scripts/test-raspberry-pi.sh; then
    success "✅ Система готова к развертыванию"
else
    error "❌ Обнаружены проблемы с системой"
    echo "Проверьте вывод тестирования и исправьте проблемы"
    exit 1
fi

# Развертывание
log "🚀 Развертывание Bot Constructor..."
./scripts/deploy.sh production

# Установка как системного сервиса
log "🔧 Установка системного сервиса..."
sudo ./scripts/install-service.sh

# Проверка установки
log "🏥 Проверка установки..."
sleep 10

if curl -f http://localhost:3000/api/health &>/dev/null; then
    success "🎉 Bot Constructor успешно установлен и запущен!"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 URL: http://$(hostname -I | awk '{print $1}'):3000"
    echo "📁 Директория: $INSTALL_DIR"
    echo "⚙️ Конфигурация: $INSTALL_DIR/.env"
    echo "📋 Логи: sudo journalctl -u bot-constructor -f"
    echo "🛑 Остановка: sudo systemctl stop bot-constructor"
    echo "🔄 Перезапуск: sudo systemctl restart bot-constructor"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo ""
    log "💡 Следующие шаги:"
    echo "1. Отредактируйте $INSTALL_DIR/.env для настройки домена"
    echo "2. Настройте SSL сертификаты (см. docs/RASPBERRY_PI_SETUP.md)"
    echo "3. Настройте проброс портов на роутере"
    echo "4. Создайте первого бота через веб-интерфейс"
    
else
    error "❌ Проблемы с запуском Bot Constructor"
    echo "Проверьте логи: sudo journalctl -u bot-constructor -f"
    echo "Статус контейнеров: docker-compose ps"
    exit 1
fi

success "🎉 Установка завершена!"