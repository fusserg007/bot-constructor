#!/bin/bash

# Скрипт восстановления данных Bot Constructor
# Использование: ./scripts/restore.sh <backup_file>

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

# Проверка аргументов
if [[ $# -eq 0 ]]; then
    error "Укажите файл бэкапа для восстановления"
    echo "Использование: $0 <backup_file>"
    echo ""
    echo "Доступные бэкапы:"
    ls -la backups/*.tar.gz 2>/dev/null || echo "Бэкапы не найдены"
    exit 1
fi

BACKUP_FILE="$1"

# Проверка существования файла
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

log "🔄 Начинаем восстановление из: $BACKUP_FILE"

# Определяем тип бэкапа по имени файла
if [[ "$BACKUP_FILE" == *"full"* ]]; then
    BACKUP_TYPE="full"
elif [[ "$BACKUP_FILE" == *"data"* ]]; then
    BACKUP_TYPE="data"
elif [[ "$BACKUP_FILE" == *"config"* ]]; then
    BACKUP_TYPE="config"
else
    BACKUP_TYPE="unknown"
fi

log "📦 Тип бэкапа: $BACKUP_TYPE"

# Подтверждение от пользователя
warning "⚠️ ВНИМАНИЕ: Восстановление перезапишет существующие данные!"
read -p "Продолжить? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "❌ Восстановление отменено"
    exit 0
fi

# Остановка контейнеров перед восстановлением
log "🛑 Остановка контейнеров..."
docker-compose down || true

# Создание бэкапа текущего состояния
CURRENT_BACKUP="backups/pre-restore-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
log "💾 Создание бэкапа текущего состояния: $CURRENT_BACKUP"
mkdir -p backups
tar -czf "$CURRENT_BACKUP" data/ 2>/dev/null || true

case $BACKUP_TYPE in
    "full")
        log "📦 Восстановление полного бэкапа..."
        
        # Создаем временную директорию
        TEMP_DIR=$(mktemp -d)
        
        # Извлекаем архив во временную директорию
        tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
        
        # Копируем файлы, исключая некоторые директории
        rsync -av --exclude='node_modules' --exclude='.git' --exclude='backups' "$TEMP_DIR/" ./
        
        # Удаляем временную директорию
        rm -rf "$TEMP_DIR"
        ;;
        
    "data")
        log "💾 Восстановление данных...")
        
        # Удаляем существующие данные
        rm -rf data/
        
        # Извлекаем данные из архива
        tar -xzf "$BACKUP_FILE"
        ;;
        
    "config")
        log "⚙️ Восстановление конфигурации...")
        
        # Извлекаем конфигурационные файлы
        tar -xzf "$BACKUP_FILE"
        ;;
        
    *)
        warning "⚠️ Неизвестный тип бэкапа, выполняем полное восстановление..."
        tar -xzf "$BACKUP_FILE"
        ;;
esac

# Восстановление прав доступа
log "🔧 Восстановление прав доступа..."
chmod +x scripts/*.sh 2>/dev/null || true

# Установка зависимостей (если восстанавливали package.json)
if [[ "$BACKUP_TYPE" == "full" || "$BACKUP_TYPE" == "config" ]]; then
    if [[ -f "package.json" ]]; then
        log "📦 Установка зависимостей..."
        npm install
    fi
fi

# Запуск контейнеров
log "🚀 Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска
log "⏳ Ожидание запуска сервисов..."
sleep 15

# Проверка здоровья
log "🏥 Проверка состояния сервисов..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health &>/dev/null; then
        success "✅ Сервисы восстановлены и работают!"
        break
    fi
    if [[ $i -eq 30 ]]; then
        error "❌ Сервисы не отвечают после восстановления"
        docker-compose logs
        exit 1
    fi
    sleep 2
done

success "🎉 Восстановление завершено успешно!"

# Информация о восстановлении
log "📊 Информация о восстановлении:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Восстановлено из: $BACKUP_FILE"
echo "💾 Бэкап до восстановления: $CURRENT_BACKUP"
echo "🌐 URL: http://localhost:3000"
echo "📋 Статус: docker-compose ps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Показать статус контейнеров
log "📋 Статус контейнеров:"
docker-compose ps