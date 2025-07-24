const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Класс для работы с файловым хранилищем данных
 * Обеспечивает безопасное чтение/запись JSON файлов с блокировками
 */
class FileStorage {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.locks = new Map(); // Карта блокировок файлов
    }

    /**
     * Получить путь к файлу
     */
    getFilePath(category, filename) {
        return path.join(this.dataDir, category, filename);
    }

    /**
     * Создать блокировку файла для предотвращения конфликтов
     */
    async acquireLock(filePath) {
        const lockKey = filePath;
        
        // Ждем освобождения блокировки
        while (this.locks.has(lockKey)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Устанавливаем блокировку
        this.locks.set(lockKey, true);
    }

    /**
     * Освободить блокировку файла
     */
    releaseLock(filePath) {
        this.locks.delete(filePath);
    }

    /**
     * Проверить существование файла
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Создать директорию если не существует
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Валидация структуры данных
     */
    validateData(data, schema) {
        if (!data || typeof data !== 'object') {
            throw new Error('Данные должны быть объектом');
        }

        if (schema) {
            for (const [key, type] of Object.entries(schema)) {
                if (data[key] === undefined) {
                    throw new Error(`Отсутствует обязательное поле: ${key}`);
                }
                
                if (typeof data[key] !== type) {
                    throw new Error(`Неверный тип поля ${key}: ожидается ${type}, получен ${typeof data[key]}`);
                }
            }
        }
    }

    /**
     * Прочитать JSON файл
     */
    async readFile(category, filename, schema = null) {
        const filePath = this.getFilePath(category, filename);
        
        try {
            await this.acquireLock(filePath);
            
            if (!(await this.fileExists(filePath))) {
                return null;
            }
            
            const fileContent = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            
            if (schema) {
                this.validateData(data, schema);
            }
            
            return data;
            
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Поврежденный JSON файл: ${filePath}`);
            }
            throw error;
        } finally {
            this.releaseLock(filePath);
        }
    }

    /**
     * Записать JSON файл
     */
    async writeFile(category, filename, data, schema = null) {
        const filePath = this.getFilePath(category, filename);
        const dirPath = path.dirname(filePath);
        
        try {
            await this.acquireLock(filePath);
            
            if (schema) {
                this.validateData(data, schema);
            }
            
            // Создаем директорию если не существует
            await this.ensureDirectory(dirPath);
            
            // Добавляем метаданные
            const dataWithMeta = {
                ...data,
                _meta: {
                    lastModified: new Date().toISOString(),
                    version: data._meta?.version ? data._meta.version + 1 : 1
                }
            };
            
            // Записываем с красивым форматированием
            const jsonContent = JSON.stringify(dataWithMeta, null, 2);
            await fs.writeFile(filePath, jsonContent, 'utf8');
            
            return true;
            
        } catch (error) {
            throw new Error(`Ошибка записи файла ${filePath}: ${error.message}`);
        } finally {
            this.releaseLock(filePath);
        }
    }

    /**
     * Удалить файл
     */
    async deleteFile(category, filename) {
        const filePath = this.getFilePath(category, filename);
        
        try {
            await this.acquireLock(filePath);
            
            if (await this.fileExists(filePath)) {
                await fs.unlink(filePath);
                return true;
            }
            
            return false;
            
        } catch (error) {
            throw new Error(`Ошибка удаления файла ${filePath}: ${error.message}`);
        } finally {
            this.releaseLock(filePath);
        }
    }

    /**
     * Получить список файлов в категории
     */
    async listFiles(category, extension = '.json') {
        const dirPath = path.join(this.dataDir, category);
        
        try {
            if (!(await this.fileExists(dirPath))) {
                return [];
            }
            
            const files = await fs.readdir(dirPath);
            return files
                .filter(file => file.endsWith(extension))
                .map(file => file.replace(extension, ''));
                
        } catch (error) {
            throw new Error(`Ошибка чтения директории ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Создать резервную копию файла
     */
    async backupFile(category, filename) {
        const filePath = this.getFilePath(category, filename);
        const backupPath = filePath + '.backup.' + Date.now();
        
        try {
            if (await this.fileExists(filePath)) {
                await fs.copyFile(filePath, backupPath);
                return backupPath;
            }
            return null;
        } catch (error) {
            throw new Error(`Ошибка создания резервной копии: ${error.message}`);
        }
    }

    /**
     * Восстановить файл из резервной копии
     */
    async restoreFromBackup(backupPath, category, filename) {
        const filePath = this.getFilePath(category, filename);
        
        try {
            if (await this.fileExists(backupPath)) {
                await fs.copyFile(backupPath, filePath);
                return true;
            }
            return false;
        } catch (error) {
            throw new Error(`Ошибка восстановления из резервной копии: ${error.message}`);
        }
    }

    // ========== МЕТОДЫ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ==========

    /**
     * Создать нового пользователя
     */
    async createUser(telegramId, userData) {
        const filename = `user_${telegramId}.json`;
        
        const user = {
            telegramId,
            username: userData.username || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            subscription: {
                plan: 'free',
                expiresAt: null,
                botsLimit: 1
            },
            bots: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.writeFile('users', filename, user, SCHEMAS.user);
        return user;
    }

    /**
     * Получить пользователя по Telegram ID
     */
    async getUser(telegramId) {
        const filename = `user_${telegramId}.json`;
        return await this.readFile('users', filename, SCHEMAS.user);
    }

    /**
     * Обновить данные пользователя
     */
    async updateUser(telegramId, updates) {
        const filename = `user_${telegramId}.json`;
        const user = await this.getUser(telegramId);
        
        if (!user) {
            throw new Error(`Пользователь с ID ${telegramId} не найден`);
        }

        const updatedUser = {
            ...user,
            ...updates,
            telegramId, // Защищаем от изменения ID
            updatedAt: new Date().toISOString()
        };

        await this.writeFile('users', filename, updatedUser, SCHEMAS.user);
        return updatedUser;
    }

    /**
     * Удалить пользователя
     */
    async deleteUser(telegramId) {
        const filename = `user_${telegramId}.json`;
        return await this.deleteFile('users', filename);
    }

    /**
     * Получить список всех пользователей
     */
    async getAllUsers() {
        const userFiles = await this.listFiles('users');
        const users = [];
        
        for (const userFile of userFiles) {
            if (userFile.startsWith('user_')) {
                const user = await this.readFile('users', `${userFile}.json`, SCHEMAS.user);
                if (user) {
                    users.push(user);
                }
            }
        }
        
        return users;
    }

    /**
     * Добавить бота к пользователю
     */
    async addBotToUser(telegramId, botId) {
        const user = await this.getUser(telegramId);
        if (!user) {
            throw new Error(`Пользователь с ID ${telegramId} не найден`);
        }

        if (!user.bots.includes(botId)) {
            user.bots.push(botId);
            await this.updateUser(telegramId, { bots: user.bots });
        }
    }

    /**
     * Удалить бота у пользователя
     */
    async removeBotFromUser(telegramId, botId) {
        const user = await this.getUser(telegramId);
        if (!user) {
            throw new Error(`Пользователь с ID ${telegramId} не найден`);
        }

        user.bots = user.bots.filter(id => id !== botId);
        await this.updateUser(telegramId, { bots: user.bots });
    }

    // ========== МЕТОДЫ ДЛЯ РАБОТЫ С БОТАМИ ==========

    /**
     * Создать нового бота
     */
    async createBot(userId, botData) {
        const botId = uuidv4();
        const filename = `bot_${botId}.json`;
        
        const bot = {
            id: botId,
            userId,
            name: botData.name || 'Новый бот',
            description: botData.description || '',
            token: botData.token || '',
            messengerType: botData.messengerType || 'telegram',
            status: botData.status || 'draft',
            configuration: botData.configuration || {
                nodes: [],
                variables: {},
                settings: {}
            },
            template: botData.template || null,
            useVisualEditor: botData.useVisualEditor || false,
            visualSchemaId: botData.visualSchemaId || null,
            stats: {
                messagesProcessed: 0,
                activeUsers: 0,
                lastActivity: null
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.writeFile('bots', filename, bot, SCHEMAS.bot);
        
        // Добавляем бота к пользователю
        await this.addBotToUser(userId, botId);
        
        return bot;
    }

    /**
     * Получить бота по ID
     */
    async getBot(botId) {
        const filename = `bot_${botId}.json`;
        return await this.readFile('bots', filename, SCHEMAS.bot);
    }

    /**
     * Обновить данные бота
     */
    async updateBot(botId, updates) {
        const filename = `bot_${botId}.json`;
        const bot = await this.getBot(botId);
        
        if (!bot) {
            throw new Error(`Бот с ID ${botId} не найден`);
        }

        const updatedBot = {
            ...bot,
            ...updates,
            id: botId, // Защищаем от изменения ID
            updatedAt: new Date().toISOString()
        };

        await this.writeFile('bots', filename, updatedBot, SCHEMAS.bot);
        return updatedBot;
    }

    /**
     * Удалить бота
     */
    async deleteBot(botId) {
        const bot = await this.getBot(botId);
        if (!bot) {
            return false;
        }

        // Удаляем бота у пользователя
        await this.removeBotFromUser(bot.userId, botId);
        
        // Удаляем файл бота
        const filename = `bot_${botId}.json`;
        return await this.deleteFile('bots', filename);
    }

    /**
     * Получить всех ботов пользователя
     */
    async getUserBots(telegramId) {
        const user = await this.getUser(telegramId);
        if (!user) {
            return [];
        }

        const bots = [];
        for (const botId of user.bots) {
            const bot = await this.getBot(botId);
            if (bot) {
                bots.push(bot);
            }
        }
        
        return bots;
    }

    /**
     * Получить список всех ботов
     */
    async getAllBots() {
        const botFiles = await this.listFiles('bots');
        const bots = [];
        
        for (const botFile of botFiles) {
            if (botFile.startsWith('bot_')) {
                const bot = await this.readFile('bots', `${botFile}.json`, SCHEMAS.bot);
                if (bot) {
                    bots.push(bot);
                }
            }
        }
        
        return bots;
    }

    /**
     * Обновить статистику бота
     */
    async updateBotStats(botId, stats) {
        const bot = await this.getBot(botId);
        if (!bot) {
            throw new Error(`Бот с ID ${botId} не найден`);
        }

        const updatedStats = {
            ...bot.stats,
            ...stats,
            lastActivity: new Date().toISOString()
        };

        return await this.updateBot(botId, { stats: updatedStats });
    }

    /**
     * Изменить статус бота
     */
    async setBotStatus(botId, status) {
        const validStatuses = ['draft', 'active', 'paused'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Недопустимый статус: ${status}. Допустимые: ${validStatuses.join(', ')}`);
        }

        return await this.updateBot(botId, { status });
    }
}

// Схемы валидации для разных типов данных
const SCHEMAS = {
    user: {
        telegramId: 'number',
        username: 'string',
        firstName: 'string',
        subscription: 'object',
        bots: 'object',
        createdAt: 'string'
    },
    
    bot: {
        id: 'string',
        userId: 'number',
        name: 'string',
        token: 'string',
        status: 'string',
        configuration: 'object',
        createdAt: 'string'
    },
    
    template: {
        id: 'string',
        name: 'string',
        category: 'string',
        configuration: 'object'
    }
};

module.exports = { FileStorage, SCHEMAS };