const { FileStorage, SCHEMAS } = require('./FileStorage');
const { v4: uuidv4 } = require('uuid');

/**
 * Менеджер данных для работы с пользователями, ботами и шаблонами
 */
class DataManager {
    constructor() {
        this.storage = new FileStorage();
    }

    // === РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ===

    /**
     * Загрузить пользователя по Telegram ID
     */
    async loadUser(telegramId) {
        try {
            const filename = `user_${telegramId}.json`;
            return await this.storage.readFile('users', filename, SCHEMAS.user);
        } catch (error) {
            console.error(`Ошибка загрузки пользователя ${telegramId}:`, error.message);
            return null;
        }
    }

    /**
     * Сохранить пользователя
     */
    async saveUser(userData) {
        try {
            const filename = `user_${userData.telegramId}.json`;
            
            // Добавляем timestamp обновления
            userData.updatedAt = new Date().toISOString();
            
            return await this.storage.writeFile('users', filename, userData, SCHEMAS.user);
        } catch (error) {
            console.error(`Ошибка сохранения пользователя ${userData.telegramId}:`, error.message);
            return false;
        }
    }

    /**
     * Создать нового пользователя
     */
    async createUser(telegramData) {
        const userData = {
            telegramId: parseInt(telegramData.id),
            username: telegramData.username || '',
            firstName: telegramData.first_name || '',
            lastName: telegramData.last_name || '',
            photoUrl: telegramData.photo_url || '',
            subscription: {
                plan: 'free',
                expiresAt: null,
                botsLimit: 1
            },
            bots: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const saved = await this.saveUser(userData);
        return saved ? userData : null;
    }

    /**
     * Обновить данные пользователя
     */
    async updateUser(telegramId, updates) {
        const user = await this.loadUser(telegramId);
        if (!user) return null;

        const updatedUser = { ...user, ...updates };
        const saved = await this.saveUser(updatedUser);
        return saved ? updatedUser : null;
    }

    /**
     * Получить список всех пользователей
     */
    async getAllUsers() {
        try {
            const userFiles = await this.storage.listFiles('users');
            const users = [];
            
            for (const filename of userFiles) {
                const telegramId = filename.replace('user_', '');
                const user = await this.loadUser(parseInt(telegramId));
                if (user) users.push(user);
            }
            
            return users;
        } catch (error) {
            console.error('Ошибка получения списка пользователей:', error.message);
            return [];
        }
    }

    // === РАБОТА С БОТАМИ ===

    /**
     * Загрузить бота по ID
     */
    async loadBot(botId) {
        try {
            const filename = `bot_${botId}.json`;
            return await this.storage.readFile('bots', filename, SCHEMAS.bot);
        } catch (error) {
            console.error(`Ошибка загрузки бота ${botId}:`, error.message);
            return null;
        }
    }

    /**
     * Сохранить бота
     */
    async saveBot(botData) {
        try {
            const filename = `bot_${botData.id}.json`;
            
            // Добавляем timestamp обновления
            botData.updatedAt = new Date().toISOString();
            
            return await this.storage.writeFile('bots', filename, botData, SCHEMAS.bot);
        } catch (error) {
            console.error(`Ошибка сохранения бота ${botData.id}:`, error.message);
            return false;
        }
    }

    /**
     * Создать нового бота
     */
    async createBot(userId, botData) {
        const botId = uuidv4();
        
        const newBot = {
            id: botId,
            userId: userId,
            name: botData.name || 'Новый бот',
            description: botData.description || '',
            token: botData.token || '',
            status: 'draft',
            configuration: botData.configuration || {
                nodes: [],
                variables: {},
                settings: {}
            },
            template: botData.template || null,
            stats: {
                messagesProcessed: 0,
                activeUsers: 0,
                lastActivity: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const saved = await this.saveBot(newBot);
        if (saved) {
            // Добавляем бота в список пользователя
            await this.addBotToUser(userId, botId);
            return newBot;
        }
        
        return null;
    }

    /**
     * Обновить бота
     */
    async updateBot(botId, updates) {
        const bot = await this.loadBot(botId);
        if (!bot) return null;

        const updatedBot = { ...bot, ...updates };
        const saved = await this.saveBot(updatedBot);
        return saved ? updatedBot : null;
    }

    /**
     * Удалить бота
     */
    async deleteBot(botId) {
        try {
            const bot = await this.loadBot(botId);
            if (!bot) return false;

            // Удаляем файл бота
            const filename = `bot_${botId}.json`;
            const deleted = await this.storage.deleteFile('bots', filename);
            
            if (deleted) {
                // Убираем бота из списка пользователя
                await this.removeBotFromUser(bot.userId, botId);
            }
            
            return deleted;
        } catch (error) {
            console.error(`Ошибка удаления бота ${botId}:`, error.message);
            return false;
        }
    }

    /**
     * Получить ботов пользователя
     */
    async getUserBots(userId) {
        try {
            const user = await this.loadUser(userId);
            if (!user || !user.bots) return [];

            const bots = [];
            for (const botId of user.bots) {
                const bot = await this.loadBot(botId);
                if (bot) bots.push(bot);
            }
            
            return bots;
        } catch (error) {
            console.error(`Ошибка получения ботов пользователя ${userId}:`, error.message);
            return [];
        }
    }

    /**
     * Добавить бота в список пользователя
     */
    async addBotToUser(userId, botId) {
        const user = await this.loadUser(userId);
        if (!user) return false;

        if (!user.bots.includes(botId)) {
            user.bots.push(botId);
            return await this.saveUser(user);
        }
        
        return true;
    }

    /**
     * Убрать бота из списка пользователя
     */
    async removeBotFromUser(userId, botId) {
        const user = await this.loadUser(userId);
        if (!user) return false;

        user.bots = user.bots.filter(id => id !== botId);
        return await this.saveUser(user);
    }

    // === РАБОТА С ШАБЛОНАМИ ===

    /**
     * Загрузить шаблон по ID
     */
    async loadTemplate(templateId) {
        try {
            const filename = `template_${templateId}.json`;
            return await this.storage.readFile('templates', filename, SCHEMAS.template);
        } catch (error) {
            console.error(`Ошибка загрузки шаблона ${templateId}:`, error.message);
            return null;
        }
    }

    /**
     * Получить все шаблоны
     */
    async getAllTemplates() {
        try {
            const templateFiles = await this.storage.listFiles('templates');
            const templates = [];
            
            for (const filename of templateFiles) {
                const templateId = filename.replace('template_', '');
                const template = await this.loadTemplate(templateId);
                if (template) templates.push(template);
            }
            
            return templates;
        } catch (error) {
            console.error('Ошибка получения шаблонов:', error.message);
            return [];
        }
    }

    /**
     * Получить шаблоны по категории
     */
    async getTemplatesByCategory(category) {
        const allTemplates = await this.getAllTemplates();
        return allTemplates.filter(template => template.category === category);
    }

    // === ЛОГИРОВАНИЕ ===

    /**
     * Записать лог события
     */
    async logEvent(botId, userId, event, data = {}) {
        try {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const filename = `${botId}_${monthKey}.json`;
            
            // Загружаем существующие логи или создаем новый файл
            let logs = await this.storage.readFile('logs', filename) || { events: [] };
            
            // Добавляем новое событие
            logs.events.push({
                timestamp: now.toISOString(),
                botId,
                userId,
                event,
                data
            });
            
            // Ограничиваем количество событий в файле (максимум 1000)
            if (logs.events.length > 1000) {
                logs.events = logs.events.slice(-1000);
            }
            
            return await this.storage.writeFile('logs', filename, logs);
        } catch (error) {
            console.error('Ошибка записи лога:', error.message);
            return false;
        }
    }

    /**
     * Получить логи бота за месяц
     */
    async getBotLogs(botId, year, month) {
        try {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const filename = `${botId}_${monthKey}.json`;
            
            const logs = await this.storage.readFile('logs', filename);
            return logs ? logs.events : [];
        } catch (error) {
            console.error(`Ошибка получения логов бота ${botId}:`, error.message);
            return [];
        }
    }
}

module.exports = DataManager;