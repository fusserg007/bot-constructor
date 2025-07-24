const fs = require('fs').promises;
const path = require('path');

class TokenManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.tokensFile = path.join(__dirname, '../data/tokens.json');
        this.usedTokens = new Map(); // token -> {userId, botId, status, reservedAt}
        this.loadTokens();
    }

    async loadTokens() {
        try {
            const data = await fs.readFile(this.tokensFile, 'utf8');
            const tokens = JSON.parse(data);
            this.usedTokens = new Map(Object.entries(tokens));
        } catch (error) {
            // Файл не существует или поврежден, создаем новый
            this.usedTokens = new Map();
            await this.saveTokens();
        }
    }

    async saveTokens() {
        try {
            const tokensObj = Object.fromEntries(this.usedTokens);
            await fs.writeFile(this.tokensFile, JSON.stringify(tokensObj, null, 2));
        } catch (error) {
            console.error('Error saving tokens:', error);
        }
    }

    /**
     * Проверяет уникальность токена
     * @param {string} token - Токен бота
     * @param {string} userId - ID пользователя
     * @param {string} botId - ID бота (опционально для обновления)
     * @returns {Promise<boolean>} - true если токен уникален
     */
    async checkTokenUniqueness(token, userId, botId = null) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token format');
        }

        // Проверяем формат токена (должен быть вида: числа:буквы/цифры/символы)
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!tokenPattern.test(token)) {
            throw new Error('Invalid token format. Expected format: 123456789:ABCDEF...');
        }

        const existingToken = this.usedTokens.get(token);
        
        if (!existingToken) {
            return true; // Токен свободен
        }

        // Если это обновление существующего бота
        if (botId && existingToken.botId === botId && existingToken.userId === userId) {
            return true;
        }

        // Токен уже используется другим ботом
        return false;
    }

    /**
     * Резервирует токен за пользователем
     * @param {string} token - Токен бота
     * @param {string} userId - ID пользователя
     * @param {string} botId - ID бота
     * @returns {Promise<void>}
     */
    async reserveToken(token, userId, botId) {
        const isUnique = await this.checkTokenUniqueness(token, userId, botId);
        
        if (!isUnique) {
            throw new Error('Token already in use by another bot');
        }

        this.usedTokens.set(token, {
            userId: userId,
            botId: botId,
            status: 'active',
            reservedAt: new Date().toISOString()
        });

        await this.saveTokens();
    }

    /**
     * Освобождает токен
     * @param {string} token - Токен для освобождения
     * @returns {Promise<void>}
     */
    async releaseToken(token) {
        if (this.usedTokens.has(token)) {
            this.usedTokens.delete(token);
            await this.saveTokens();
        }
    }

    /**
     * Получает статус токена
     * @param {string} token - Токен бота
     * @returns {Promise<Object|null>} - Информация о токене или null
     */
    async getTokenStatus(token) {
        return this.usedTokens.get(token) || null;
    }

    /**
     * Получает все токены пользователя
     * @param {string} userId - ID пользователя
     * @returns {Promise<Array>} - Массив токенов пользователя
     */
    async getUserTokens(userId) {
        const userTokens = [];
        for (const [token, info] of this.usedTokens.entries()) {
            if (info.userId === userId) {
                userTokens.push({
                    token: token,
                    ...info
                });
            }
        }
        return userTokens;
    }

    /**
     * Обновляет статус токена
     * @param {string} token - Токен бота
     * @param {string} status - Новый статус (active, inactive, error)
     * @returns {Promise<void>}
     */
    async updateTokenStatus(token, status) {
        const tokenInfo = this.usedTokens.get(token);
        if (tokenInfo) {
            tokenInfo.status = status;
            tokenInfo.lastUpdated = new Date().toISOString();
            this.usedTokens.set(token, tokenInfo);
            await this.saveTokens();
        }
    }

    /**
     * Валидирует токен через Telegram API
     * @param {string} token - Токен для валидации
     * @returns {Promise<Object>} - Информация о боте или ошибка
     */
    async validateTokenWithTelegram(token) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
            const data = await response.json();
            
            if (data.ok) {
                return {
                    valid: true,
                    botInfo: data.result
                };
            } else {
                return {
                    valid: false,
                    error: data.description || 'Invalid token'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Failed to validate token with Telegram API'
            };
        }
    }

    /**
     * Валидирует токен через MAX API
     * @param {string} token - Токен бота MAX
     * @returns {Promise<Object>} - Информация о боте или ошибка
     */
    async validateTokenWithMax(token) {
        try {
            const response = await fetch(`https://bot-api.max.ru/bot${token}/getMe`);
            const data = await response.json();
            
            if (data.ok) {
                return {
                    valid: true,
                    botInfo: data.result
                };
            } else {
                return {
                    valid: false,
                    error: data.description || 'Invalid MAX token'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Failed to validate token with MAX API'
            };
        }
    }

    /**
     * Получает статистику использования токенов
     * @returns {Promise<Object>} - Статистика токенов
     */
    async getTokenStats() {
        const stats = {
            total: this.usedTokens.size,
            active: 0,
            inactive: 0,
            error: 0
        };

        for (const [token, info] of this.usedTokens.entries()) {
            stats[info.status] = (stats[info.status] || 0) + 1;
        }

        return stats;
    }
}

module.exports = TokenManager;