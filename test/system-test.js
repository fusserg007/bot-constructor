/**
 * Системный тест для Bot Constructor
 * Проверяет основные функции системы
 */

const fs = require('fs').promises;
const path = require('path');
const { FileStorage } = require('../utils/FileStorage');
const TokenManager = require('../utils/TokenManager');
const BotRuntime = require('../utils/BotRuntime');
const BotDeploymentManager = require('../utils/BotDeploymentManager');

class SystemTester {
    constructor() {
        this.storage = new FileStorage();
        this.tokenManager = new TokenManager();
        this.botRuntime = new BotRuntime();
        this.deploymentManager = new BotDeploymentManager();
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.testUserId = 123456789; // Тестовый пользователь
        this.testBots = [];
    }

    /**
     * Запуск всех тестов
     */
    async runAllTests() {
        console.log('🧪 Запуск системного тестирования Bot Constructor...\n');

        try {
            await this.testFileStorage();
            await this.testTokenManager();
            await this.testBotCreation();
            await this.testTemplateApplication();
            await this.testBotDeployment();
            await this.testVisualEditor();
            await this.testMessengerAdapters();
            await this.cleanup();

            this.printResults();
        } catch (error) {
            console.error('❌ Критическая ошибка тестирования:', error);
            this.testResults.failed++;
            this.testResults.errors.push(`Critical error: ${error.message}`);
        }
    }

    /**
     * Тестирование файлового хранилища
     */
    async testFileStorage() {
        console.log('📁 Тестирование файлового хранилища...');

        try {
            // Тест создания пользователя
            const testUser = {
                telegramId: this.testUserId,
                username: 'test_user',
                firstName: 'Test',
                lastName: 'User',
                subscription: {
                    plan: 'free',
                    botsLimit: 1
                },
                bots: [],
                createdAt: new Date().toISOString()
            };

            await this.storage.createUser(testUser.telegramId, testUser);
            const savedUser = await this.storage.getUser(this.testUserId);

            this.assert(savedUser !== null, 'User should be saved and retrieved');
            this.assert(savedUser.username === 'test_user', 'User data should match');

            console.log('✅ Файловое хранилище работает корректно');
        } catch (error) {
            this.fail('File storage test failed', error);
        }
    }

    /**
     * Тестирование менеджера токенов
     */
    async testTokenManager() {
        console.log('🔑 Тестирование менеджера токенов...');

        try {
            const testToken = '123456789:TEST_TOKEN_FOR_TESTING_PURPOSES_ONLY';

            // Тест резервирования токена
            await this.tokenManager.reserveToken(testToken, this.testUserId.toString(), 'test-bot-1');
            
            // Тест проверки уникальности
            const isUnique = await this.tokenManager.checkTokenUniqueness(testToken, this.testUserId.toString());
            this.assert(!isUnique, 'Token should not be unique after reservation');

            // Тест освобождения токена
            await this.tokenManager.releaseToken(testToken);
            const isUniqueAfterRelease = await this.tokenManager.checkTokenUniqueness(testToken, this.testUserId.toString());
            this.assert(isUniqueAfterRelease, 'Token should be unique after release');

            console.log('✅ Менеджер токенов работает корректно');
        } catch (error) {
            this.fail('Token manager test failed', error);
        }
    }

    /**
     * Тестирование создания ботов
     */
    async testBotCreation() {
        console.log('🤖 Тестирование создания ботов...');

        try {
            const testBot = {
                name: 'Test Bot',
                description: 'Bot for system testing',
                token: '123456789:TEST_TOKEN_FOR_TESTING_PURPOSES_ONLY',
                messengerType: 'telegram',
                userId: this.testUserId,
                status: 'draft',
                useVisualEditor: true,
                configuration: {
                    nodes: [
                        {
                            id: 'trigger1',
                            type: 'trigger',
                            position: { x: 50, y: 50 },
                            data: { triggerType: 'message' },
                            connections: ['action1']
                        },
                        {
                            id: 'action1',
                            type: 'action',
                            position: { x: 200, y: 50 },
                            data: { 
                                actionType: 'send_message',
                                message: 'Hello from test bot!'
                            },
                            connections: []
                        }
                    ]
                },
                createdAt: new Date().toISOString()
            };

            const createdBot = await this.storage.createBot(this.testUserId, testBot);
            this.testBots.push(createdBot.id);

            const savedBot = await this.storage.getBot(createdBot.id);
            this.assert(savedBot !== null, 'Bot should be created and retrieved');
            this.assert(savedBot.name === 'Test Bot', 'Bot data should match');

            console.log('✅ Создание ботов работает корректно');
        } catch (error) {
            this.fail('Bot creation test failed', error);
        }
    }

    /**
     * Тестирование применения шаблонов
     */
    async testTemplateApplication() {
        console.log('📋 Тестирование применения шаблонов...');

        try {
            // Загружаем шаблон модерации
            const templatePath = path.join(__dirname, '..', 'data', 'templates', 'template_moderation.json');
            const templateData = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(templateData);

            // Создаем бота на основе шаблона
            const templateBot = {
                name: 'Moderation Test Bot',
                description: 'Bot created from moderation template',
                token: '987654321:ANOTHER_TEST_TOKEN_FOR_TESTING',
                messengerType: 'telegram',
                userId: this.testUserId,
                status: 'draft',
                template: {
                    id: template.id,
                    category: template.category
                },
                configuration: template.configuration,
                createdAt: new Date().toISOString()
            };

            const createdBot = await this.storage.createBot(this.testUserId, templateBot);
            this.testBots.push(createdBot.id);

            const savedBot = await this.storage.getBot(createdBot.id);
            this.assert(savedBot !== null, 'Bot should be created from template');
            this.assert(savedBot.template && savedBot.template.id === 'moderation', 'Template should be applied');
            this.assert(savedBot.configuration && savedBot.configuration.nodes && savedBot.configuration.nodes.length > 0, 'Template configuration should be applied');

            console.log('✅ Применение шаблонов работает корректно');
        } catch (error) {
            this.fail('Template application test failed', error);
        }
    }

    /**
     * Тестирование развертывания ботов
     */
    async testBotDeployment() {
        console.log('🚀 Тестирование развертывания ботов...');

        try {
            if (this.testBots.length === 0) {
                throw new Error('No test bots available for deployment testing');
            }

            if (this.testBots.length === 0) {
                throw new Error('No test bots available for deployment testing');
            }

            const botId = this.testBots[0];
            
            // Тест проверки статуса развертывания
            const statusResult = await this.deploymentManager.getDeploymentStatus(botId, this.testUserId);
            this.assert(statusResult.success, 'Should get deployment status');

            // Тест валидации токена (будет неуспешным для тестового токена)
            const validationResult = await this.deploymentManager.validateBotToken('123456789:TEST_TOKEN');
            this.assert(!validationResult.valid, 'Test token should be invalid');

            // Тест экспорта конфигурации
            const exportResult = await this.deploymentManager.exportBotConfiguration(botId, this.testUserId);
            this.assert(exportResult.success, 'Should export bot configuration');

            console.log('✅ Система развертывания работает корректно');
        } catch (error) {
            this.fail('Bot deployment test failed', error);
        }
    }

    /**
     * Тестирование визуального редактора
     */
    async testVisualEditor() {
        console.log('🎨 Тестирование визуального редактора...');

        try {
            const VisualSchemaConverter = require('../utils/VisualSchemaConverter');
            const converter = new VisualSchemaConverter();

            // Тестовая визуальная схема
            const testSchema = {
                nodes: [
                    {
                        id: 'node1',
                        type: 'command',
                        position: { x: 100, y: 100 },
                        config: { command: '/start' }
                    },
                    {
                        id: 'node2',
                        type: 'send_message',
                        position: { x: 300, y: 100 },
                        config: { message: 'Welcome!' }
                    }
                ],
                connections: [
                    { sourceNodeId: 'node1', targetNodeId: 'node2' }
                ]
            };

            // Тест конвертации схемы
            const executableConfig = converter.convertToExecutable(testSchema);
            this.assert(executableConfig && executableConfig.nodes, 'Should return executable config with nodes');
            this.assert(executableConfig.nodes.length === 2, 'Should convert all nodes');
            
            // Проверяем соединения
            const firstNode = executableConfig.nodes.find(n => n.id === 'node1');
            this.assert(firstNode && firstNode.connections && firstNode.connections.includes('node2'), 'Should create connections');

            console.log('✅ Визуальный редактор работает корректно');
        } catch (error) {
            this.fail('Visual editor test failed', error);
        }
    }

    /**
     * Тестирование адаптеров мессенджеров
     */
    async testMessengerAdapters() {
        console.log('💬 Тестирование адаптеров мессенджеров...');

        try {
            const MessengerAdapterFactory = require('../utils/MessengerAdapterFactory');

            // Тест создания Telegram адаптера
            const telegramAdapter = MessengerAdapterFactory.createAdapter('telegram', {
                token: 'test_token',
                botId: 'test_bot',
                usePolling: false
            });

            this.assert(telegramAdapter.type === 'telegram', 'Should create Telegram adapter');

            // Тест создания MAX адаптера
            const maxAdapter = MessengerAdapterFactory.createAdapter('max', {
                token: 'test_token',
                botId: 'test_bot'
            });

            this.assert(maxAdapter.type === 'max', 'Should create MAX adapter');

            // Тест статистики
            const stats = telegramAdapter.getStats();
            this.assert(typeof stats.messagesReceived === 'number', 'Should have message stats');

            console.log('✅ Адаптеры мессенджеров работают корректно');
        } catch (error) {
            this.fail('Messenger adapters test failed', error);
        }
    }

    /**
     * Очистка тестовых данных
     */
    async cleanup() {
        console.log('🧹 Очистка тестовых данных...');

        try {
            // Удаляем тестовых ботов
            for (const botId of this.testBots) {
                try {
                    await this.storage.deleteBot(botId);
                } catch (error) {
                    console.warn(`Не удалось удалить тестового бота ${botId}:`, error.message);
                }
            }

            // Удаляем тестового пользователя
            try {
                await this.storage.deleteUser(this.testUserId);
            } catch (error) {
                console.warn('Не удалось удалить тестового пользователя:', error.message);
            }

            console.log('✅ Тестовые данные очищены');
        } catch (error) {
            console.warn('⚠️ Ошибка очистки тестовых данных:', error.message);
        }
    }

    /**
     * Утверждение для тестов
     */
    assert(condition, message) {
        if (condition) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Регистрация неудачного теста
     */
    fail(message, error) {
        this.testResults.failed++;
        this.testResults.errors.push(`${message}: ${error.message}`);
        console.error(`❌ ${message}:`, error.message);
    }

    /**
     * Вывод результатов тестирования
     */
    printResults() {
        console.log('\n📊 Результаты тестирования:');
        console.log(`✅ Пройдено: ${this.testResults.passed}`);
        console.log(`❌ Провалено: ${this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🐛 Ошибки:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
        console.log(`\n📈 Процент успешности: ${successRate.toFixed(1)}%`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 Все тесты пройдены успешно!');
        } else {
            console.log('\n⚠️ Обнаружены проблемы, требующие исправления');
        }
    }
}

// Запуск тестов если файл выполняется напрямую
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().catch(console.error);
}

module.exports = SystemTester;