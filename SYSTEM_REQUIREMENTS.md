# Системные требования Bot Constructor

## Минимальные требования

### Raspberry Pi
- **Модель:** Raspberry Pi 3B+ или новее
- **RAM:** 1GB (рекомендуется 2GB+)
- **Хранилище:** 8GB microSD Class 10
- **ОС:** Raspberry Pi OS (Debian-based)

### Другие системы
- **CPU:** ARM64 или x86_64
- **RAM:** 1GB (рекомендуется 2GB+)
- **Хранилище:** 4GB свободного места
- **ОС:** Linux (Ubuntu, Debian, CentOS)

## Рекомендуемые требования

### Для продакшена
- **Raspberry Pi:** 4B с 4GB RAM
- **Хранилище:** 32GB+ microSD Class 10 или SSD
- **Сеть:** Стабильное интернет-соединение
- **Охлаждение:** Радиатор или активное охлаждение

### Для разработки
- **RAM:** 4GB+
- **Хранилище:** 16GB+ свободного места
- **CPU:** 4+ ядра

## Программные зависимости

### Обязательные
- **Docker:** 20.10+
- **Docker Compose:** 1.29+
- **Git:** 2.0+

### Опциональные
- **Node.js:** 18+ (для разработки)
- **Nginx:** 1.18+ (для SSL/reverse proxy)
- **Certbot:** для Let's Encrypt сертификатов

## Сетевые требования

### Порты
- **3000:** Основное приложение
- **80:** HTTP (для редиректа на HTTPS)
- **443:** HTTPS (для продакшена)

### Внешние сервисы
- **Telegram API:** api.telegram.org
- **Docker Hub:** hub.docker.com
- **NPM Registry:** registry.npmjs.org

## Производительность

### Ожидаемая нагрузка
- **Одновременные боты:** до 50
- **Сообщений в секунду:** до 100
- **Пользователей:** до 1000

### Ограничения Raspberry Pi
- **CPU:** Может быть узким местом при высокой нагрузке
- **I/O:** microSD карты медленнее SSD
- **Сеть:** 100Mbps Ethernet на Pi 3, 1Gbps на Pi 4

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

# Отключение ненужных сервисов
sudo systemctl disable bluetooth
sudo systemctl disable wifi-powersave
```

### Docker оптимизации
```bash
# Ограничение логов Docker
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json

# Перезапуск Docker
sudo systemctl restart docker
```

## Мониторинг ресурсов

### Команды для проверки
```bash
# Использование CPU и памяти
htop

# Использование диска
df -h

# Температура (Raspberry Pi)
vcgencmd measure_temp

# Статистика Docker
docker stats

# Логи системы
sudo journalctl -u bot-constructor -f
```

### Критические пороги
- **CPU:** > 80% длительное время
- **RAM:** > 90% использования
- **Диск:** < 1GB свободного места
- **Температура:** > 70°C (Raspberry Pi)

## Резервное копирование

### Рекомендуемая стратегия
- **Ежедневно:** Данные ботов и пользователей
- **Еженедельно:** Полный бэкап системы
- **Ежемесячно:** Образ SD карты

### Размеры бэкапов
- **Данные:** 10-100MB (зависит от количества ботов)
- **Полный бэкап:** 500MB-2GB
- **Образ системы:** 4-32GB

## Безопасность

### Рекомендации
- Регулярные обновления системы
- Настройка firewall (ufw)
- Использование SSL сертификатов
- Ограничение SSH доступа
- Мониторинг логов

### Порты для firewall
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Устранение неполадок

### Частые проблемы
1. **Нехватка памяти:** Увеличить swap, оптимизировать контейнеры
2. **Медленная работа:** Использовать SSD вместо microSD
3. **Перегрев:** Улучшить охлаждение
4. **Сетевые проблемы:** Проверить DNS, firewall

### Диагностика
```bash
# Проверка системы
./scripts/test-raspberry-pi.sh

# Логи приложения
docker-compose logs -f bot-constructor

# Статус сервиса
sudo systemctl status bot-constructor

# Проверка портов
sudo netstat -tlnp | grep :3000
```

## Масштабирование

### Вертикальное масштабирование
- Переход на Raspberry Pi 4 с большим объемом RAM
- Использование SSD вместо microSD
- Улучшение охлаждения

### Горизонтальное масштабирование
- Использование нескольких Raspberry Pi
- Балансировка нагрузки через Nginx
- Распределенная база данных

## Альтернативные платформы

### Для больших нагрузок
- **VPS:** DigitalOcean, Linode, Vultr
- **Cloud:** AWS EC2, Google Cloud, Azure
- **Dedicated:** Hetzner, OVH

### Для разработки
- **Локальная машина:** Docker Desktop
- **Виртуальная машина:** VirtualBox, VMware
- **WSL2:** Windows Subsystem for Linux