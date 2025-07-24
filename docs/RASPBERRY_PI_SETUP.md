# Установка Bot Constructor на Raspberry Pi

Это руководство поможет вам установить и настроить Bot Constructor на Raspberry Pi.

## Системные требования

### Минимальные требования
- **Raspberry Pi:** 3B+ или новее
- **RAM:** 1GB (рекомендуется 2GB+)
- **Хранилище:** 8GB microSD (рекомендуется 32GB+ Class 10)
- **ОС:** Raspberry Pi OS (Debian-based)
- **Интернет:** Стабильное подключение

### Рекомендуемые требования
- **Raspberry Pi:** 4B с 4GB RAM
- **Хранилище:** 64GB microSD Class 10 или SSD
- **Охлаждение:** Радиатор или активное охлаждение

## Подготовка системы

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 2. Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose -y

# Перезагрузка для применения изменений
sudo reboot
```

### 3. Проверка установки

```bash
docker --version
docker-compose --version
```

## Установка Bot Constructor

### 1. Клонирование репозитория

```bash
cd /home/pi
git clone https://github.com/your-repo/bot-constructor.git
cd bot-constructor
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Настройте следующие параметры:

```env
NODE_ENV=production
PORT=3000
WEBHOOK_BASE_URL=https://your-domain.com
USE_POLLING=false
TZ=Europe/Moscow
```

### 3. Развертывание

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# Запустить развертывание
./scripts/deploy.sh production
```

### 4. Установка как системного сервиса

```bash
sudo ./scripts/install-service.sh
```

## Настройка SSL (HTTPS)

### Вариант 1: Let's Encrypt (рекомендуется)

```bash
# Установка Certbot
sudo apt install certbot -y

# Получение сертификата
sudo certbot certonly --standalone -d your-domain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*.pem

# Запуск с Nginx
docker-compose --profile with-nginx up -d
```

### Вариант 2: Самоподписанный сертификат

```bash
# Создание самоподписанного сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=BotConstructor/CN=localhost"

# Запуск с Nginx
docker-compose --profile with-nginx up -d
```

## Настройка сети

### Проброс портов на роутере

Настройте проброс портов на вашем роутере:
- **Порт 80** → IP Raspberry Pi:80 (HTTP)
- **Порт 443** → IP Raspberry Pi:443 (HTTPS)

### Настройка статического IP

```bash
sudo nano /etc/dhcpcd.conf
```

Добавьте в конец файла:

```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

## Мониторинг и обслуживание

### Проверка состояния

```bash
# Статус сервиса
sudo systemctl status bot-constructor

# Логи сервиса
sudo journalctl -u bot-constructor -f

# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs -f bot-constructor
```

### Резервное копирование

```bash
# Ручное создание бэкапа
./scripts/backup.sh data

# Восстановление из бэкапа
./scripts/restore.sh backups/bot-constructor-backup-data-20240120_140000.tar.gz
```

### Обновление

```bash
# Остановка сервиса
sudo systemctl stop bot-constructor

# Обновление кода
git pull origin main

# Пересборка и запуск
./scripts/deploy.sh production

# Запуск сервиса
sudo systemctl start bot-constructor
```

## Оптимизация производительности

### Настройка swap файла

```bash
# Создание swap файла 1GB
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Добавление в fstab для автозагрузки
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Настройка Docker для ARM

```bash
# Ограничение памяти для контейнеров
echo 'DOCKER_OPTS="--default-ulimit memlock=-1:-1"' | sudo tee -a /etc/default/docker

# Перезапуск Docker
sudo systemctl restart docker
```

### Мониторинг ресурсов

```bash
# Установка htop для мониторинга
sudo apt install htop -y

# Мониторинг использования ресурсов
htop

# Мониторинг Docker контейнеров
docker stats
```

## Безопасность

### Настройка firewall

```bash
# Установка ufw
sudo apt install ufw -y

# Базовые правила
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешение SSH
sudo ufw allow ssh

# Разрешение HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Включение firewall
sudo ufw enable
```

### Обновление системы

```bash
# Настройка автоматических обновлений
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Устранение неполадок

### Проблемы с памятью

```bash
# Проверка использования памяти
free -h

# Очистка кэша Docker
docker system prune -a

# Перезапуск с ограничением памяти
docker-compose down
docker-compose up -d --scale bot-constructor=1
```

### Проблемы с сетью

```bash
# Проверка портов
sudo netstat -tlnp | grep :3000

# Проверка Docker сети
docker network ls
docker network inspect bot-constructor_bot-constructor-network
```

### Проблемы с SSL

```bash
# Проверка сертификатов
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Тест SSL соединения
openssl s_client -connect your-domain.com:443
```

## Полезные команды

```bash
# Просмотр логов мониторинга
sudo tail -f /var/log/bot-constructor-monitor.log

# Проверка использования диска
df -h

# Очистка старых Docker образов
docker image prune -a

# Перезапуск всех контейнеров
docker-compose restart

# Обновление Docker Compose файла
docker-compose up -d --force-recreate
```

## Поддержка

При возникновении проблем:

1. Проверьте логи: `sudo journalctl -u bot-constructor -f`
2. Проверьте статус контейнеров: `docker-compose ps`
3. Проверьте использование ресурсов: `htop`
4. Создайте issue в репозитории с подробным описанием проблемы

## Дополнительные ресурсы

- [Официальная документация Raspberry Pi](https://www.raspberrypi.org/documentation/)
- [Docker на Raspberry Pi](https://docs.docker.com/engine/install/debian/)
- [Let's Encrypt документация](https://letsencrypt.org/docs/)
- [Nginx конфигурация](https://nginx.org/en/docs/)