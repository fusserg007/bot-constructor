# Системные требования Bot Constructor

## Минимальные требования

### Операционная система
- **Windows**: Windows 10/11 (64-bit)
- **Linux**: Ubuntu 18.04+ / Debian 10+ / CentOS 7+
- **macOS**: macOS 10.15+
- **Raspberry Pi**: Raspberry Pi OS (64-bit)

### Аппаратные требования
- **RAM**: 2 GB (рекомендуется 4 GB)
- **CPU**: 2 ядра 1.5 GHz+
- **Диск**: 1 GB свободного места
- **Сеть**: Интернет соединение для API мессенджеров

### Программное обеспечение
- **Node.js**: версия 16.0+ (рекомендуется 18.0+)
- **npm**: версия 8.0+
- **Git**: для клонирования репозитория

## Рекомендуемые требования

### Для разработки
- **RAM**: 8 GB+
- **CPU**: 4 ядра 2.0 GHz+
- **SSD**: для быстрой работы с файлами
- **Монитор**: 1920x1080+ для комфортной работы с визуальным редактором

### Для продакшена
- **RAM**: 4 GB+
- **CPU**: 2 ядра 2.0 GHz+
- **Диск**: SSD с 5 GB+ свободного места
- **Сеть**: Стабильное интернет соединение

## React Frontend требования

### Дополнительные требования для нового интерфейса
- **Node.js**: 16.0+ (для сборки frontend)
- **RAM**: +512 MB для Vite dev server
- **Браузер**: Chrome 90+, Firefox 88+, Safari 14+

### Сборка frontend
```bash
cd frontend
npm install    # Требует ~200 MB места
npm run build  # Создает оптимизированную сборку
```

## Специальные требования

### Raspberry Pi
- **Модель**: Raspberry Pi 4 (4GB RAM рекомендуется)
- **OS**: Raspberry Pi OS (64-bit)
- **SD карта**: Class 10, 32 GB+
- **Охлаждение**: Радиатор или вентилятор для стабильной работы

### Docker
- **Docker**: версия 20.0+
- **Docker Compose**: версия 2.0+
- **RAM**: +1 GB для контейнеров

## Проверка совместимости

### Автоматическая проверка
```bash
# Запуск скрипта проверки
./scripts/test-raspberry-pi.sh
```

### Ручная проверка
```bash
# Версия Node.js
node --version  # должна быть 16.0+

# Версия npm
npm --version   # должна быть 8.0+

# Доступная память
free -h        # Linux
wmic OS get TotalVisibleMemorySize /value  # Windows

# Свободное место на диске
df -h          # Linux
dir            # Windows
```

## Настройка окружения

### Переменные окружения
```bash
# .env файл
NODE_ENV=production
PORT=3002
TELEGRAM_BOT_TOKEN=your_token_here
MAX_BOT_TOKEN=your_max_token_here

# Для React development
VITE_API_URL=http://localhost:3002
```

### Файрвол
Откройте порты:
- **3002**: основное приложение
- **5173**: Vite dev server (только для разработки)
- **80/443**: для веб-доступа (опционально)

## Производительность

### Оптимизация для слабых систем
```bash
# Ограничение памяти Node.js
export NODE_OPTIONS="--max-old-space-size=1024"

# Отключение dev зависимостей
npm install --production

# Использование только старого интерфейса (без React)
# Не запускайте build-frontend.bat
```

### Мониторинг ресурсов
```bash
# Использование CPU и памяти
top
htop

# Использование диска
du -sh *

# Сетевые соединения
netstat -tulpn | grep :3002
```

## Устранение проблем

### Недостаточно памяти
- Увеличьте swap файл
- Закройте ненужные приложения
- Используйте `NODE_OPTIONS="--max-old-space-size=512"`
- Отключите React интерфейс для экономии памяти

### Медленная работа
- Используйте SSD вместо HDD
- Увеличьте RAM
- Проверьте скорость интернета
- Используйте production сборку React

### Проблемы с портами
```bash
# Проверка занятых портов
lsof -i :3002
netstat -tulpn | grep 3002

# Изменение порта в .env
PORT=3003
```

## Безопасность

### Рекомендации
- Используйте файрвол
- Регулярно обновляйте Node.js
- Не запускайте от root пользователя
- Используйте HTTPS в продакшене
- **НЕ ДОБАВЛЯЙТЕ АВТОРИЗАЦИЮ** - это внутренний инструмент

### Backup
```bash
# Автоматический backup
crontab -e
0 2 * * * /path/to/bot-constructor/scripts/backup.sh data
```

## Обновления

### Типы обновлений
- **Patch** (1.0.1 → 1.0.2): Исправления ошибок
- **Minor** (1.0.x → 1.1.0): Новые функции
- **Major** (1.x.x → 2.0.0): Кардинальные изменения

### Автоматическое обновление
```bash
# Создание бэкапа и обновление
./scripts/backup.sh data
git pull origin main
npm install --production
./build-frontend.bat  # Если используете React интерфейс
sudo systemctl restart bot-constructor
```

## Оптимизация для Raspberry Pi

### Настройки системы
```bash
# Увеличение swap файла
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Оптимизация GPU памяти
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
```

### Критические пороги
- **CPU**: > 80% длительное время
- **RAM**: > 90% использования
- **Диск**: < 1GB свободного места
- **Температура**: > 70°C (Raspberry Pi)

## Альтернативные платформы

### Для больших нагрузок
- **VPS**: DigitalOcean, Linode, Vultr
- **Cloud**: AWS EC2, Google Cloud, Azure
- **Dedicated**: Hetzner, OVH

### Для разработки
- **Локальная машина**: Docker Desktop
- **Виртуальная машина**: VirtualBox, VMware
- **WSL2**: Windows Subsystem for Linux