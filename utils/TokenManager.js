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
            console.error('Ошибка сохранения токенов:', error);
        }
    }

    /**
     * Проверяет, используется ли токен
     */
    isTokenUsed(token) {
        return this.usedTokens.has(token);
    }

    /**
     * Резервирует токен для бота
     */
    async reserveToken(token, userId, botId) {
        if (this.isTokenUsed(token)) {
            const existing = this.usedTokens.get(token);
            if (existing.botId !== botId) {
                throw new Error('Токен уже используется другим ботом');
            }
        }

        this.usedTokens.set(token, {
            userId,
            botId,
            status: 'reserved',
            reservedAt: new Date().toISOString()
        });

        await this.saveTokens();
    }

    /**
     * Освобождает токен
     */
    async releaseToken(token) {
        this.usedTokens.delete(token);
        await this.saveTokens();
    }

    /**
     * Получает информацию о токене
     */
    getTokenInfo(token) {
        return this.usedTokens.get(token);
    }

    /**
     * Получает все токены пользователя
     */
    getUserTokens(userId) {
        const userTokens = [];
        for (const [token, info] of this.usedTokens) {
            if (info.userId === userId) {
                userTokens.push({ token, ...info });
            }
        }
        return userTokens;
    }

    /**
     * Валидирует токен через Telegram API
     */
    async validateTelegramToken(token) {
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
                    error: data.description
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = TokenManager;