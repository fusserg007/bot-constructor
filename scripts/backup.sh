#!/bin/bash

# Скрипт резервного копирования данных Bot Constructor
# Использование: ./scripts/backup.sh [full|data|config]

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

# Параметры
BACKUP_TYPE=${1:-full}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="bot-constructor-backup-${BACKUP_TYPE}-${TIMESTAMP}"

# Создание директории для бэкапов
mkdir -p "$BACKUP_DIR"

log "🗄️ Начинаем резервное копирование: $BACKUP_TYPE"

case $BACKUP_TYPE in
    "full")
        log "📦 Полное резервное копирование..."
        
        # Создаем архив всех данных
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='backups' \
            --exclude='*.log' \
            --exclude='tmp' \
            .
        
        success "✅ Полный бэкап создан: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
        ;;
        
    "data")
        log "💾 Резервное копирование данных..."
        
        # Проверяем наличие данных
        if [[ ! -d "data" ]]; then
            error "Директория data не найдена"
            exit 1
        fi
        
        # Создаем архив данных
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" data/
        
        success "✅ Бэкап данных создан: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
        ;;
        
    "config")
        log "⚙️ Резервное копирование конфигурации..."
        
        # Создаем архив конфигурационных файлов
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
            docker-compose.yml \
            Dockerfile \
            .env \
            nginx/ \
            scripts/ \
            package.json \
            package-lock.json
        
        success "✅ Бэкап конфигурации создан: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
        ;;
        
    *)
        error "Неизвестный тип бэкапа: $BACKUP_TYPE"
        echo "Доступные типы: full, data, config"
        exit 1
        ;;
esac

# Информация о созданном бэкапе
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
log "📊 Размер бэкапа: $BACKUP_SIZE"

# Очистка старых бэкапов (оставляем последние 7)
log "🧹 Очистка старых бэкапов..."
cd "$BACKUP_DIR"
ls -t bot-constructor-backup-*.tar.gz | tail -n +8 | xargs -r rm
REMAINING=$(ls -1 bot-constructor-backup-*.tar.gz 2>/dev/null | wc -l)
log "📁 Осталось бэкапов: $REMAINING"

success "🎉 Резервное копирование завершено!"

# Рекомендации
log "💡 Рекомендации:"
echo "1. Регулярно создавайте бэкапы данных"
echo "2. Храните бэкапы в безопасном месте"
echo "3. Периодически проверяйте целостность бэкапов"
echo "4. Настройте автоматическое создание бэкапов через cron"

# Пример cron задачи
echo ""
echo "📅 Пример cron задачи для ежедневного бэкапа в 2:00:"
echo "0 2 * * * cd $(pwd) && ./scripts/backup.sh data"