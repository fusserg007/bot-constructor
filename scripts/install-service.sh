#!/bin/bash

# Скрипт установки Bot Constructor как системного сервиса
# Использование: sudo ./scripts/install-service.sh

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

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт должен быть запущен с правами root (sudo)"
   exit 1
fi

# Получаем текущую директорию проекта
PROJECT_DIR=$(pwd)
SERVICE_USER=${SUDO_USER:-$(whoami)}

log "🔧 Установка Bot Constructor как системного сервиса"
log "📁 Директория проекта: $PROJECT_DIR"
log "👤 Пользователь сервиса: $SERVICE_USER"

# Создание systemd сервиса
SERVICE_FILE="/etc/systemd/system/bot-constructor.service"

log "📝 Создание systemd сервиса: $SERVICE_FILE"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Bot Constructor - Visual Bot Builder
Documentation=https://github.com/bot-constructor/bot-constructor
After=docker.service
Requires=docker.service
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=oneshot
RemainAfterExit=yes
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=HOME=/home/$SERVICE_USER

# Команды запуска
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart

# Перезапуск при сбое
Restart=on-failure
RestartSec=10

# Таймауты
TimeoutStartSec=300
TimeoutStopSec=60

# Логирование
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bot-constructor

[Install]
WantedBy=multi-user.target
EOF

# Создание скрипта мониторинга
MONITOR_SCRIPT="/usr/local/bin/bot-constructor-monitor"

log "📊 Создание скрипта мониторинга: $MONITOR_SCRIPT"

cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash

# Скрипт мониторинга Bot Constructor
# Проверяет состояние сервиса и перезапускает при необходимости

PROJECT_DIR="__PROJECT_DIR__"
LOG_FILE="/var/log/bot-constructor-monitor.log"

log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

cd "$PROJECT_DIR" || exit 1

# Проверка состояния контейнеров
if ! docker-compose ps | grep -q "Up"; then
    log_message "WARNING: Контейнеры не запущены, попытка перезапуска..."
    docker-compose up -d >> "$LOG_FILE" 2>&1
    sleep 10
fi

# Проверка доступности API
if ! curl -f http://localhost:3000/api/health &>/dev/null; then
    log_message "ERROR: API недоступен, перезапуск сервиса..."
    docker-compose restart >> "$LOG_FILE" 2>&1
    sleep 15
    
    # Повторная проверка
    if ! curl -f http://localhost:3000/api/health &>/dev/null; then
        log_message "CRITICAL: API все еще недоступен после перезапуска"
        # Отправка уведомления (можно настроить email/telegram)
    else
        log_message "INFO: Сервис восстановлен после перезапуска"
    fi
else
    log_message "INFO: Сервис работает нормально"
fi
EOF

# Замена плейсхолдера на реальный путь
sed -i "s|__PROJECT_DIR__|$PROJECT_DIR|g" "$MONITOR_SCRIPT"
chmod +x "$MONITOR_SCRIPT"

# Создание cron задачи для мониторинга
CRON_FILE="/etc/cron.d/bot-constructor"

log "⏰ Создание cron задачи: $CRON_FILE"

cat > "$CRON_FILE" << EOF
# Bot Constructor мониторинг и резервное копирование
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Мониторинг каждые 5 минут
*/5 * * * * root $MONITOR_SCRIPT

# Ежедневное резервное копирование в 2:00
0 2 * * * $SERVICE_USER cd $PROJECT_DIR && ./scripts/backup.sh data

# Еженедельное полное резервное копирование в воскресенье в 3:00
0 3 * * 0 $SERVICE_USER cd $PROJECT_DIR && ./scripts/backup.sh full
EOF

# Создание директории для логов
mkdir -p /var/log
touch /var/log/bot-constructor-monitor.log
chown $SERVICE_USER:$SERVICE_USER /var/log/bot-constructor-monitor.log

# Перезагрузка systemd
log "🔄 Перезагрузка systemd..."
systemctl daemon-reload

# Включение автозапуска
log "🚀 Включение автозапуска сервиса..."
systemctl enable bot-constructor.service

# Запуск сервиса
log "▶️ Запуск сервиса..."
systemctl start bot-constructor.service

# Проверка статуса
sleep 5
if systemctl is-active --quiet bot-constructor.service; then
    success "✅ Сервис успешно установлен и запущен!"
else
    error "❌ Ошибка запуска сервиса"
    systemctl status bot-constructor.service
    exit 1
fi

success "🎉 Установка завершена!"

# Информация об управлении сервисом
log "📋 Команды управления сервисом:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Статус:      sudo systemctl status bot-constructor"
echo "▶️ Запуск:      sudo systemctl start bot-constructor"
echo "⏸️ Остановка:   sudo systemctl stop bot-constructor"
echo "🔄 Перезапуск:  sudo systemctl restart bot-constructor"
echo "📋 Логи:       sudo journalctl -u bot-constructor -f"
echo "🗄️ Мониторинг: tail -f /var/log/bot-constructor-monitor.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Показать текущий статус
log "📊 Текущий статус сервиса:"
systemctl status bot-constructor.service --no-pager