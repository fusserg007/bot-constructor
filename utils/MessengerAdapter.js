/**
 * Базовый класс для адаптеров мессенджеров
 * Определяет единый интерфейс для работы с разными мессенджерами
 */
class MessengerAdapter {
    constructor(config) {
        this.config = config;
        this.type = config.type; // 'telegram', 'max', etc.
        this.token = config.token;
        this.botId = config.botId;
        this.isActive = false;
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            errors: 0,
            startTime: null
        };
    }

    /**
     * Инициализация адаптера
     * Должен быть переопределен в наследниках
     */
    async initialize() {
        throw new Error('initialize() должен быть реализован в наследнике');
    }

    /**
     * Запуск бота
     * Должен быть переопределен в наследниках
     */
    async start() {
        throw new Error('start() должен быть реализован в наследнике');
    }

    /**
     * Остановка бота
     * Должен быть переопределен в наследниках
     */
    async stop() {
        throw new Error('stop() должен быть реализован в наследнике');
    }

    /**
     * Отправка сообщения
     * Должен быть переопределен в наследниках
     */
    async sendMessage(chatId, message, options = {}) {
        throw new Error('sendMessage() должен быть реализован в наследнике');
    }

    /**
     * Валидация токена
     * Должен быть переопределен в наследниках
     */
    async validateToken() {
        throw new Error('validateToken() должен быть реализован в наследнике');
    }

    /**
     * Получение информации о боте
     * Должен быть переопределен в наследниках
     */
    async getBotInfo() {
        throw new Error('getBotInfo() должен быть реализован в наследнике');
    }

    /**
     * Установка webhook (если поддерживается)
     */
    async setWebhook(url) {
        // По умолчанию не поддерживается
        return false;
    }

    /**
     * Удаление webhook (если поддерживается)
     */
    async deleteWebhook() {
        // По умолчанию не поддерживается
        return false;
    }

    /**
     * Обработка входящего сообщения
     * Унифицированный формат для всех мессенджеров
     */
    normalizeMessage(rawMessage) {
        return {
            id: null,
            chatId: null,
            userId: null,
            text: null,
            type: 'text', // text, photo, document, etc.
            timestamp: Date.now(),
            raw: rawMessage
        };
    }

    /**
     * Обновление статистики
     */
    updateStats(type, increment = 1) {
        if (this.stats[type] !== undefined) {
            this.stats[type] += increment;
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
            isActive: this.isActive
        };
    }

    /**
     * Проверка здоровья адаптера
     * @returns {boolean} Здоров ли адаптер
     */
    isHealthy() {
        // Базовая проверка - адаптер активен и не слишком много ошибок
        const errorRate = this.stats.errors / Math.max(this.stats.messagesReceived, 1);
        const isHealthy = this.isActive && errorRate < 0.1; // Менее 10% ошибок
        
        return isHealthy;
    }

    /**
     * Логирование
     */
    log(level, message, data = null) {
        const logMessage = `[${this.type.toUpperCase()}:${this.botId}] ${message}`;
        
        switch (level) {
            case 'info':
                console.log(logMessage, data || '');
                break;
            case 'warn':
                console.warn(logMessage, data || '');
                break;
            case 'error':
                console.error(logMessage, data || '');
                this.updateStats('errors');
                break;
            default:
                console.log(logMessage, data || '');
        }
    }
}

module.exports = MessengerAdapter;