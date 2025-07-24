# Dockerfile для Bot Constructor
# Оптимизирован для Raspberry Pi (ARM архитектура)

# Используем официальный Node.js образ для ARM
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botconstructor -u 1001

# Копируем package.json и package-lock.json для кэширования зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && \
    npm cache clean --force

# Копируем исходный код приложения
COPY . .

# Создаем директории для данных
RUN mkdir -p /app/data/users \
             /app/data/bots \
             /app/data/templates \
             /app/data/logs \
             /app/data/visual_schemas && \
    chown -R botconstructor:nodejs /app/data

# Устанавливаем права доступа
RUN chown -R botconstructor:nodejs /app

# Переключаемся на непривилегированного пользователя
USER botconstructor

# Открываем порт
EXPOSE 3000

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) process.exit(0); \
        else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Запускаем приложение
CMD ["npm", "start"]