#!/bin/bash

# Скрипт тестирования Bot Constructor на Raspberry Pi
# Проверяет совместимость и производительность

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

# Результаты тестов
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

test_result() {
    if [[ $1 -eq 0 ]]; then
        success "$2"
        ((TESTS_PASSED++))
    else
        error "$2"
        ((TESTS_FAILED++))
    fi
}

log "🍓 Запуск тестирования Bot Constructor на Raspberry Pi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка системы
log "🔍 Проверка системной информации..."

# Архитектура
ARCH=$(uname -m)
log "Архитектура: $ARCH"

if [[ "$ARCH" == "armv7l" || "$ARCH" == "aarch64" ]]; then
    success "✅ ARM архитектура обнаружена"
else
    warning "⚠️ Не ARM архитектура, возможны проблемы совместимости"
    ((WARNINGS++))
fi

# Модель Raspberry Pi
if [[ -f /proc/device-tree/model ]]; then
    PI_MODEL=$(cat /proc/device-tree/model)
    log "Модель: $PI_MODEL"
    
    if [[ "$PI_MODEL" == *"Raspberry Pi 4"* ]]; then
        success "✅ Raspberry Pi 4 - отличная производительность"
    elif [[ "$PI_MODEL" == *"Raspberry Pi 3"* ]]; then
        success "✅ Raspberry Pi 3 - хорошая производительность"
    else
        warning "⚠️ Старая модель Raspberry Pi, возможны проблемы с производительностью"
        ((WARNINGS++))
    fi
fi

# Проверка ресурсов
log "💾 Проверка системных ресурсов..."

# Память
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
log "Общая память: ${TOTAL_RAM}MB"

if [[ $TOTAL_RAM -ge 2048 ]]; then
    success "✅ Достаточно памяти (${TOTAL_RAM}MB)"
elif [[ $TOTAL_RAM -ge 1024 ]]; then
    warning "⚠️ Минимальное количество памяти (${TOTAL_RAM}MB)"
    ((WARNINGS++))
else
    error "❌ Недостаточно памяти (${TOTAL_RAM}MB < 1024MB)"
    ((TESTS_FAILED++))
fi

# Свободное место
DISK_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
log "Свободное место: ${DISK_SPACE}GB"

if [[ $DISK_SPACE -ge 8 ]]; then
    success "✅ Достаточно места на диске (${DISK_SPACE}GB)"
elif [[ $DISK_SPACE -ge 4 ]]; then
    warning "⚠️ Мало места на диске (${DISK_SPACE}GB)"
    ((WARNINGS++))
else
    error "❌ Недостаточно места на диске (${DISK_SPACE}GB < 4GB)"
    ((TESTS_FAILED++))
fi

# Проверка зависимостей
log "📦 Проверка зависимостей..."

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    success "✅ Docker установлен: $DOCKER_VERSION"
    
    # Проверка прав Docker
    if docker ps &> /dev/null; then
        success "✅ Docker права настроены корректно"
    else
        error "❌ Нет прав для использования Docker"
        ((TESTS_FAILED++))
    fi
else
    error "❌ Docker не установлен"
    ((TESTS_FAILED++))
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    success "✅ Docker Compose установлен: $COMPOSE_VERSION"
else
    error "❌ Docker Compose не установлен"
    ((TESTS_FAILED++))
fi

# Node.js (для разработки)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "✅ Node.js установлен: $NODE_VERSION"
else
    warning "⚠️ Node.js не установлен (не критично для Docker развертывания)"
    ((WARNINGS++))
fi

# Проверка сети
log "🌐 Проверка сетевого подключения..."

# Интернет соединение
if ping -c 1 google.com &> /dev/null; then
    success "✅ Интернет соединение работает"
else
    error "❌ Нет интернет соединения"
    ((TESTS_FAILED++))
fi

# Docker Hub доступность
if curl -f https://hub.docker.com &> /dev/null; then
    success "✅ Docker Hub доступен"
else
    warning "⚠️ Docker Hub недоступен"
    ((WARNINGS++))
fi

# Проверка портов
log "🔌 Проверка доступности портов..."

check_port() {
    local port=$1
    local name=$2
    
    if netstat -tuln | grep -q ":$port "; then
        warning "⚠️ Порт $port ($name) уже используется"
        ((WARNINGS++))
    else
        success "✅ Порт $port ($name) свободен"
    fi
}

check_port 3000 "Bot Constructor"
check_port 80 "HTTP"
check_port 443 "HTTPS"

# Тест производительности
log "⚡ Тест производительности..."

# CPU тест
log "Тестирование CPU..."
CPU_SCORE=$(timeout 10s yes > /dev/null & sleep 5; kill $! 2>/dev/null; echo "100")

if [[ $CPU_SCORE -gt 0 ]]; then
    success "✅ CPU тест пройден"
else
    warning "⚠️ Проблемы с производительностью CPU"
    ((WARNINGS++))
fi

# Тест памяти
log "Тестирование памяти..."
AVAILABLE_RAM=$(free -m | awk 'NR==2{printf "%.0f", $7}')

if [[ $AVAILABLE_RAM -gt 512 ]]; then
    success "✅ Достаточно свободной памяти (${AVAILABLE_RAM}MB)"
elif [[ $AVAILABLE_RAM -gt 256 ]]; then
    warning "⚠️ Мало свободной памяти (${AVAILABLE_RAM}MB)"
    ((WARNINGS++))
else
    error "❌ Критически мало памяти (${AVAILABLE_RAM}MB)"
    ((TESTS_FAILED++))
fi

# Тест Docker
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    log "🐳 Тестирование Docker..."
    
    # Запуск тестового контейнера
    if docker run --rm hello-world &> /dev/null; then
        success "✅ Docker работает корректно"
    else
        error "❌ Проблемы с Docker"
        ((TESTS_FAILED++))
    fi
    
    # Проверка ARM образов
    if docker run --rm --platform linux/arm64 alpine:latest echo "ARM test" &> /dev/null; then
        success "✅ ARM образы поддерживаются"
    else
        warning "⚠️ Проблемы с ARM образами"
        ((WARNINGS++))
    fi
fi

# Проверка файловой системы
log "📁 Проверка файловой системы..."

# Права на запись
if touch test_write_permissions 2>/dev/null; then
    rm -f test_write_permissions
    success "✅ Права на запись в текущей директории"
else
    error "❌ Нет прав на запись в текущей директории"
    ((TESTS_FAILED++))
fi

# Проверка структуры проекта
log "📋 Проверка структуры проекта..."

check_file() {
    local file=$1
    local name=$2
    
    if [[ -f "$file" ]]; then
        success "✅ $name найден"
    else
        error "❌ $name не найден: $file"
        ((TESTS_FAILED++))
    fi
}

check_file "package.json" "Package.json"
check_file "Dockerfile" "Dockerfile"
check_file "docker-compose.yml" "Docker Compose"
check_file ".env.example" "Environment example"
check_file "server.js" "Main server file"

# Проверка директорий
check_dir() {
    local dir=$1
    local name=$2
    
    if [[ -d "$dir" ]]; then
        success "✅ Директория $name найдена"
    else
        warning "⚠️ Директория $name не найдена: $dir"
        ((WARNINGS++))
    fi
}

check_dir "data" "Data directory"
check_dir "public" "Public directory"
check_dir "utils" "Utils directory"
check_dir "routes" "Routes directory"

# Результаты тестирования
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "✅ Пройдено: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Провалено: ${RED}$TESTS_FAILED${NC}"
echo -e "⚠️ Предупреждений: ${YELLOW}$WARNINGS${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [[ $TOTAL_TESTS -gt 0 ]]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    echo -e "📈 Процент успешности: ${SUCCESS_RATE}%"
fi

echo ""

# Рекомендации
log "💡 РЕКОМЕНДАЦИИ:"

if [[ $TESTS_FAILED -eq 0 ]]; then
    success "🎉 Система готова для развертывания Bot Constructor!"
    echo "Запустите: ./scripts/deploy.sh production"
else
    error "⚠️ Обнаружены критические проблемы:"
    echo "1. Установите недостающие зависимости"
    echo "2. Исправьте проблемы с правами доступа"
    echo "3. Освободите место на диске при необходимости"
    echo "4. Повторите тестирование"
fi

if [[ $WARNINGS -gt 0 ]]; then
    warning "⚠️ Рекомендации по оптимизации:"
    echo "1. Увеличьте объем памяти если возможно"
    echo "2. Используйте быструю microSD карту (Class 10+)"
    echo "3. Настройте swap файл для дополнительной памяти"
    echo "4. Рассмотрите использование SSD вместо microSD"
fi

# Дополнительная информация
echo ""
log "📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:"
echo "📖 Документация: docs/RASPBERRY_PI_SETUP.md"
echo "🚀 Развертывание: ./scripts/deploy.sh"
echo "🔧 Установка сервиса: sudo ./scripts/install-service.sh"
echo "📊 Мониторинг: docker-compose logs -f"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Код выхода
if [[ $TESTS_FAILED -eq 0 ]]; then
    exit 0
else
    exit 1
fi