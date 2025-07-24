#!/usr/bin/env node

/**
 * Скрипт для создания тестовых ботов для проверки всех типов шаблонов
 */

const { FileStorage } = require('../utils/FileStorage');
const fs = require('fs').promises;
const path = require('path');

class TestBotCreator {
    constructor() {
        this.storage = new FileStorage();
        this.testUserId = 999999999; // Специальный ID для тестовых ботов
        this.createdBots = [];
    }

    /**
     * Создание всех тестовых ботов
     */
    async createAllTestBots() {
        console.log('🤖 Создание тестовых ботов для всех шаблонов...\n');

        try {
            // Создаем тестового пользователя
            await this.createTestUser();

            // Загружаем все шаблоны
            const templates = await this.loadAllTemplates();
            
            // Создаем бота для каждого шаблона
            for (const template of templates) {
                await this.createBotFromTemplate(template);
            }

            // Создаем дополнительных тестовых ботов
            await this.createCustomTestBots();

            console.log(`\n✅ Создано ${this.createdBots.length} тестовых ботов`);
            console.log('\n📋 Список созданных ботов:');
            this.createdBots.forEach((bot, index) => {
                console.log(`${index + 1}. ${bot.name} (${bot.messengerType || 'telegram'}) - ${bot.template?.id || 'custom'}`);
            });

            console.log('\n💡 Для удаления тестовых ботов запустите: node test/cleanup-test-data.js');

        } catch (error) {
            console.error('❌ Ошибка создания тестовых ботов:', error);
            throw error;
        }
    }

    /**
     * Создание тестового пользователя
     */
    async createTestUser() {
        const testUser = {
            telegramId: this.testUserId,
            username: 'test_bot_creator',
            firstName: 'Test',
            lastName: 'Bot Creator',
            subscription: {
                plan: 'premium', // Даем премиум для тестирования всех функций
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // На год
                botsLimit: 100
            },
            bots: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.storage.createUser(testUser.telegramId, testUser);
        console.log('👤 Тестовый пользователь создан');
    }

    /**
     * Загрузка всех шаблонов
     */
    async loadAllTemplates() {
        const templatesDir = path.join(__dirname, '..', 'data', 'templates');
        const files = await fs.readdir(templatesDir);
        const templates = [];

        for (const file of files) {
            if (file.endsWith('.json') && file.startsWith('template_')) {
                try {
                    const templatePath = path.join(templatesDir, file);
                    const templateData = await fs.readFile(templatePath, 'utf8');
                    const template = JSON.parse(templateData);
                    templates.push(template);
                } catch (error) {
                    console.warn(`⚠️ Не удалось загрузить шаблон ${file}:`, error.message);
                }
            }
        }

        console.log(`📋 Загружено ${templates.length} шаблонов`);
        return templates;
    }

    /**
     * Создание бота из шаблона
     */
    async createBotFromTemplate(template) {
        try {
            const botData = {
                name: `Test ${template.name}`,
                description: `Тестовый бот на основе шаблона: ${template.description}`,
                token: this.generateTestToken(template.id),
                messengerType: 'telegram',
                userId: this.testUserId,
                status: 'draft',
                template: {
                    id: template.id,
                    category: template.category,
                    customizations: {}
                },
                configuration: template.configuration,
                useVisualEditor: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const createdBot = await this.storage.createBot(this.testUserId, botData);
            
            if (createdBot && createdBot.id) {
                this.createdBots.push(createdBot);
                console.log(`✅ Создан бот: ${createdBot.name}`);
            } else {
                console.error(`❌ Не удалось создать бота для шаблона ${template.id}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка создания бота для шаблона ${template.id}:`, error.message);
        }
    }

    /**
     * Создание дополнительных тестовых ботов
     */
    async createCustomTestBots() {
        // Бот для тестирования Telegram
        await this.createCustomBot({
            name: 'Test Telegram Bot',
            description: 'Бот для тестирования Telegram функций',
            messengerType: 'telegram',
            configuration: this.createBasicConfiguration('telegram')
        });

        // Бот для тестирования MAX
        await this.createCustomBot({
            name: 'Test MAX Bot',
            description: 'Бот для тестирования MAX функций',
            messengerType: 'max',
            configuration: this.createBasicConfiguration('max')
        });

        // Бот с визуальной схемой
        await this.createCustomBot({
            name: 'Test Visual Editor Bot',
            description: 'Бот для тестирования визуального редактора',
            messengerType: 'telegram',
            useVisualEditor: true,
            visualSchemaId: 'test-visual-schema',
            configuration: this.createVisualConfiguration()
        });

        // Бот с ошибками (для тестирования обработки ошибок)
        await this.createCustomBot({
            name: 'Test Error Handling Bot',
            description: 'Бот для тестирования обработки ошибок',
            messengerType: 'telegram',
            configuration: this.createErrorConfiguration()
        });
    }

    /**
     * Создание кастомного бота
     */
    async createCustomBot(botConfig) {
        try {
            const botData = {
                name: botConfig.name,
                description: botConfig.description,
                token: this.generateTestToken(botConfig.name.toLowerCase().replace(/\s+/g, '_')),
                messengerType: botConfig.messengerType || 'telegram',
                userId: this.testUserId,
                status: 'draft',
                useVisualEditor: botConfig.useVisualEditor || false,
                visualSchemaId: botConfig.visualSchemaId,
                configuration: botConfig.configuration,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const createdBot = await this.storage.createBot(this.testUserId, botData);
            
            if (createdBot && createdBot.id) {
                this.createdBots.push(createdBot);
                console.log(`✅ Создан кастомный бот: ${createdBot.name}`);
            } else {
                console.error(`❌ Не удалось создать кастомного бота ${botConfig.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка создания кастомного бота ${botConfig.name}:`, error.message);
        }
    }

    /**
     * Создание базовой конфигурации
     */
    createBasicConfiguration(messengerType) {
        return {
            nodes: [
                {
                    id: 'start_trigger',
                    type: 'trigger',
                    position: { x: 50, y: 50 },
                    data: {
                        triggerType: 'command',
                        command: '/start'
                    },
                    connections: ['welcome_action']
                },
                {
                    id: 'welcome_action',
                    type: 'action',
                    position: { x: 250, y: 50 },
                    data: {
                        actionType: 'send_message',
                        message: `Добро пожаловать в тестового ${messengerType.toUpperCase()} бота!\n\nДоступные команды:\n/start - начать\n/help - помощь\n/test - тест`
                    },
                    connections: []
                },
                {
                    id: 'help_trigger',
                    type: 'trigger',
                    position: { x: 50, y: 150 },
                    data: {
                        triggerType: 'command',
                        command: '/help'
                    },
                    connections: ['help_action']
                },
                {
                    id: 'help_action',
                    type: 'action',
                    position: { x: 250, y: 150 },
                    data: {
                        actionType: 'send_message',
                        message: 'Это тестовый бот для проверки функций системы.\n\nИспользуйте команды для тестирования различных функций.'
                    },
                    connections: []
                },
                {
                    id: 'test_trigger',
                    type: 'trigger',
                    position: { x: 50, y: 250 },
                    data: {
                        triggerType: 'command',
                        command: '/test'
                    },
                    connections: ['test_condition']
                },
                {
                    id: 'test_condition',
                    type: 'condition',
                    position: { x: 250, y: 250 },
                    data: {
                        conditionType: 'user_is_admin'
                    },
                    connections: {
                        true: ['admin_response'],
                        false: ['user_response']
                    }
                },
                {
                    id: 'admin_response',
                    type: 'action',
                    position: { x: 450, y: 200 },
                    data: {
                        actionType: 'send_message',
                        message: '🔧 Тест для администратора пройден успешно!'
                    },
                    connections: []
                },
                {
                    id: 'user_response',
                    type: 'action',
                    position: { x: 450, y: 300 },
                    data: {
                        actionType: 'send_message',
                        message: '✅ Тест для пользователя пройден успешно!'
                    },
                    connections: []
                }
            ]
        };
    }

    /**
     * Создание конфигурации для визуального редактора
     */
    createVisualConfiguration() {
        return {
            nodes: [
                {
                    id: 'visual_start',
                    type: 'trigger',
                    position: { x: 100, y: 100 },
                    data: {
                        triggerType: 'message',
                        filters: ['привет', 'hello', 'hi']
                    },
                    connections: ['visual_response']
                },
                {
                    id: 'visual_response',
                    type: 'action',
                    position: { x: 300, y: 100 },
                    data: {
                        actionType: 'send_message',
                        message: 'Привет, {user_name}! 👋\n\nЭто сообщение создано в визуальном редакторе.'
                    },
                    connections: ['visual_delay']
                },
                {
                    id: 'visual_delay',
                    type: 'action',
                    position: { x: 500, y: 100 },
                    data: {
                        actionType: 'delay',
                        delay: 2000
                    },
                    connections: ['visual_followup']
                },
                {
                    id: 'visual_followup',
                    type: 'action',
                    position: { x: 700, y: 100 },
                    data: {
                        actionType: 'send_message',
                        message: 'Как дела? Чем могу помочь?'
                    },
                    connections: []
                }
            ]
        };
    }

    /**
     * Создание конфигурации с ошибками для тестирования
     */
    createErrorConfiguration() {
        return {
            nodes: [
                {
                    id: 'error_trigger',
                    type: 'trigger',
                    position: { x: 50, y: 50 },
                    data: {
                        triggerType: 'command',
                        command: '/error'
                    },
                    connections: ['invalid_node_id'] // Несуществующий узел
                },
                {
                    id: 'valid_node',
                    type: 'action',
                    position: { x: 250, y: 50 },
                    data: {
                        actionType: 'send_message',
                        message: 'Этот узел корректный'
                    },
                    connections: []
                },
                {
                    id: 'invalid_action_type',
                    type: 'action',
                    position: { x: 50, y: 150 },
                    data: {
                        actionType: 'unknown_action', // Несуществующий тип действия
                        message: 'Это не должно работать'
                    },
                    connections: []
                }
            ]
        };
    }

    /**
     * Генерация тестового токена
     */
    generateTestToken(identifier) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}:TEST_TOKEN_${identifier.toUpperCase()}_${random}`;
    }
}

// Запуск создания тестовых ботов
if (require.main === module) {
    const creator = new TestBotCreator();
    creator.createAllTestBots().catch((error) => {
        console.error('💥 Ошибка создания тестовых ботов:', error);
        process.exit(1);
    });
}

module.exports = TestBotCreator;