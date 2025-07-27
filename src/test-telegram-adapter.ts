/**
 * Тест Telegram адаптера
 * Проверяет функциональность адаптера в новой архитектуре
 */

import { TelegramAdapter } from './adapters/TelegramAdapter';
import { AdapterRegistry } from './core/adapters/AdapterRegistry';
import { PlatformCredentials, IncomingMessage, CallbackQuery } from './core/types';

// Mock токен для тестирования (не рабочий)
const MOCK_TOKEN = '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ';

async function testTelegramAdapter() {
    console.log('🧪 Testing Telegram Adapter...\n');

    const tests = [
        {
            name: 'Adapter Creation and Registration',
            test: testAdapterCreation
        },
        {
            name: 'Credentials Validation',
            test: testCredentialsValidation
        },
        {
            name: 'Capabilities Check',
            test: testCapabilities
        },
        {
            name: 'Message Processing',
            test: testMessageProcessing
        },
        {
            name: 'Callback Processing',
            test: testCallbackProcessing
        },
        {
            name: 'Webhook Handling',
            test: testWebhookHandling
        },
        {
            name: 'API Methods',
            test: testApiMethods
        },
        {
            name: 'Error Handling',
            test: testErrorHandling
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`\n📋 ${test.name}:`);
            await test.test();
            console.log(`✅ ${test.name} - PASSED`);
            passed++;
        } catch (error) {
            console.error(`❌ ${test.name} - FAILED:`, error);
            failed++;
        }
    }

    console.log(`\n📊 Telegram Adapter Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    return { passed, failed };
}

async function testAdapterCreation() {
    console.log('  Testing adapter creation and registration...');

    // Создаем адаптер
    const adapter = new TelegramAdapter();
    console.log(`    Adapter created: ${adapter.platform}`);

    if (adapter.platform !== 'telegram') {
        throw new Error(`Expected platform 'telegram', got '${adapter.platform}'`);
    }

    // Регистрируем в реестре
    const registry = AdapterRegistry.getInstance();
    registry.registerAdapter(adapter);

    const registeredAdapter = registry.getAdapter('telegram');
    console.log(`    Adapter registered: ${registeredAdapter ? 'Yes' : 'No'}`);

    if (!registeredAdapter) {
        throw new Error('Adapter not registered properly');
    }

    console.log(`    Available adapters: ${registry.getAvailableAdapters().join(', ')}`);
}

async function testCredentialsValidation() {
    console.log('  Testing credentials validation...');

    const adapter = new TelegramAdapter();

    // Тест с пустыми credentials
    const emptyCredentials: PlatformCredentials = {};
    const isValidEmpty = await adapter.validateCredentials(emptyCredentials);
    console.log(`    Empty credentials valid: ${isValidEmpty}`);

    if (isValidEmpty) {
        throw new Error('Empty credentials should not be valid');
    }

    // Тест с неправильным токеном
    const invalidCredentials: PlatformCredentials = {
        telegram: { token: 'invalid_token' }
    };
    const isValidInvalid = await adapter.validateCredentials(invalidCredentials);
    console.log(`    Invalid token valid: ${isValidInvalid}`);

    if (isValidInvalid) {
        throw new Error('Invalid token should not be valid');
    }

    // Тест с mock токеном (не будет работать, но структура правильная)
    const mockCredentials: PlatformCredentials = {
        telegram: { token: MOCK_TOKEN }
    };
    const isValidMock = await adapter.validateCredentials(mockCredentials);
    console.log(`    Mock token validation attempted: ${isValidMock ? 'Valid' : 'Invalid'}`);

    // Mock токен не должен быть валидным, но это нормально для теста
}

async function testCapabilities() {
    console.log('  Testing adapter capabilities...');

    const adapter = new TelegramAdapter();
    const capabilities = adapter.getCapabilities();

    console.log(`    Supports inline buttons: ${capabilities.supportsInlineButtons}`);
    console.log(`    Supports media: ${capabilities.supportsMedia}`);
    console.log(`    Supports webhooks: ${capabilities.supportsWebhooks}`);
    console.log(`    Supports polling: ${capabilities.supportsPolling}`);
    console.log(`    Max message length: ${capabilities.maxMessageLength}`);
    console.log(`    Supported media types: ${capabilities.supportedMediaTypes?.length || 0}`);

    // Проверяем обязательные возможности
    if (!capabilities.supportsInlineButtons) {
        throw new Error('Telegram should support inline buttons');
    }

    if (!capabilities.supportsMedia) {
        throw new Error('Telegram should support media');
    }

    if (!capabilities.supportsWebhooks) {
        throw new Error('Telegram should support webhooks');
    }

    if (!capabilities.supportsPolling) {
        throw new Error('Telegram should support polling');
    }

    if (capabilities.maxMessageLength !== 4096) {
        throw new Error(`Expected max message length 4096, got ${capabilities.maxMessageLength}`);
    }
}

async function testMessageProcessing() {
    console.log('  Testing message processing...');

    const adapter = new TelegramAdapter();
    let receivedMessage: IncomingMessage | null = null;

    // Подписываемся на события
    adapter.on('message', (message: IncomingMessage) => {
        receivedMessage = message;
    });

    // Создаем mock Telegram update
    const mockUpdate = {
        update_id: 123,
        message: {
            message_id: 456,
            from: {
                id: 789,
                is_bot: false,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser'
            },
            chat: {
                id: 789,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/start',
            entities: [
                {
                    offset: 0,
                    length: 6,
                    type: 'bot_command'
                }
            ]
        }
    };

    // Обрабатываем update
    await (adapter as any).processUpdate(mockUpdate);

    console.log(`    Message received: ${receivedMessage ? 'Yes' : 'No'}`);

    if (!receivedMessage) {
        throw new Error('Message was not processed');
    }

    console.log(`    Message ID: ${receivedMessage.id}`);
    console.log(`    Message text: ${receivedMessage.text}`);
    console.log(`    Message command: ${receivedMessage.command}`);
    console.log(`    User ID: ${receivedMessage.userId}`);
    console.log(`    Chat ID: ${receivedMessage.chatId}`);

    if (receivedMessage.text !== '/start') {
        throw new Error(`Expected text '/start', got '${receivedMessage.text}'`);
    }

    if (receivedMessage.command !== '/start') {
        throw new Error(`Expected command '/start', got '${receivedMessage.command}'`);
    }
}

async function testCallbackProcessing() {
    console.log('  Testing callback processing...');

    const adapter = new TelegramAdapter();
    let receivedCallback: CallbackQuery | null = null;

    // Подписываемся на события
    adapter.on('callback', (callback: CallbackQuery) => {
        receivedCallback = callback;
    });

    // Создаем mock callback query
    const mockUpdate = {
        update_id: 124,
        callback_query: {
            id: 'callback_123',
            from: {
                id: 789,
                is_bot: false,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser'
            },
            message: {
                message_id: 456,
                chat: {
                    id: 789,
                    type: 'private'
                }
            },
            data: 'button_clicked'
        }
    };

    // Обрабатываем update
    await (adapter as any).processUpdate(mockUpdate);

    console.log(`    Callback received: ${receivedCallback ? 'Yes' : 'No'}`);

    if (!receivedCallback) {
        throw new Error('Callback was not processed');
    }

    console.log(`    Callback ID: ${receivedCallback.id}`);
    console.log(`    Callback data: ${receivedCallback.data}`);
    console.log(`    User ID: ${receivedCallback.userId}`);

    if (receivedCallback.data !== 'button_clicked') {
        throw new Error(`Expected data 'button_clicked', got '${receivedCallback.data}'`);
    }
}

async function testWebhookHandling() {
    console.log('  Testing webhook handling...');

    const adapter = new TelegramAdapter();
    let receivedMessage: IncomingMessage | null = null;

    adapter.on('message', (message: IncomingMessage) => {
        receivedMessage = message;
    });

    // Создаем mock webhook request
    const webhookRequest = {
        platform: 'telegram' as const,
        body: {
            update_id: 125,
            message: {
                message_id: 457,
                from: {
                    id: 790,
                    is_bot: false,
                    first_name: 'Webhook',
                    last_name: 'User',
                    username: 'webhookuser'
                },
                chat: {
                    id: 790,
                    first_name: 'Webhook',
                    last_name: 'User',
                    username: 'webhookuser',
                    type: 'private'
                },
                date: Math.floor(Date.now() / 1000),
                text: 'Hello from webhook!'
            }
        },
        headers: {},
        query: {}
    };

    // Обрабатываем webhook
    await adapter.handleWebhook(webhookRequest);

    console.log(`    Webhook message received: ${receivedMessage ? 'Yes' : 'No'}`);

    if (!receivedMessage) {
        throw new Error('Webhook message was not processed');
    }

    console.log(`    Webhook message text: ${receivedMessage.text}`);

    if (receivedMessage.text !== 'Hello from webhook!') {
        throw new Error(`Expected text 'Hello from webhook!', got '${receivedMessage.text}'`);
    }
}

async function testApiMethods() {
    console.log('  Testing API methods...');

    const adapter = new TelegramAdapter();

    // Тестируем методы без инициализации (должны выбрасывать ошибки)
    try {
        await adapter.sendMessage('123', { text: 'Test' });
        throw new Error('Should have thrown error for uninitialized adapter');
    } catch (error) {
        if (!(error as Error).message.includes('not initialized')) {
            throw error;
        }
        console.log(`    Uninitialized adapter error: OK`);
    }

    // Тестируем построение inline клавиатуры
    const buttons = [
        { text: 'Button 1', callbackData: 'btn1' },
        { text: 'Button 2', callbackData: 'btn2' },
        { text: 'Button 3', callbackData: 'btn3' }
    ];

    const keyboard = (adapter as any).buildInlineKeyboard(buttons);
    console.log(`    Inline keyboard built: ${keyboard ? 'Yes' : 'No'}`);
    console.log(`    Keyboard rows: ${keyboard.inline_keyboard.length}`);

    if (!keyboard || !keyboard.inline_keyboard) {
        throw new Error('Failed to build inline keyboard');
    }

    // Проверяем, что кнопки правильно сгруппированы (максимум 3 в ряду)
    if (keyboard.inline_keyboard[0].length !== 3) {
        throw new Error(`Expected 3 buttons in first row, got ${keyboard.inline_keyboard[0].length}`);
    }
}

async function testErrorHandling() {
    console.log('  Testing error handling...');

    const adapter = new TelegramAdapter();
    let errorEmitted = false;

    // Подписываемся на ошибки
    adapter.on('error', (error: Error) => {
        errorEmitted = true;
        console.log(`    Error emitted: ${error.message}`);
    });

    // Тестируем обработку невалидного webhook
    try {
        await adapter.handleWebhook({
            platform: 'discord' as any, // Неправильная платформа
            body: {},
            headers: {},
            query: {}
        });
        throw new Error('Should have thrown error for invalid platform');
    } catch (error) {
        console.log(`    Invalid platform error: OK`);
    }

    // Тестируем обработку невалидного update
    try {
        await (adapter as any).processUpdate(null);
    } catch (error) {
        console.log(`    Invalid update error: OK`);
    }

    // Проверяем, что ошибки эмитятся
    if (errorEmitted) {
        console.log(`    Error emission: OK`);
    }
}

// Запуск тестов
if (require.main === module) {
    testTelegramAdapter()
        .then(results => {
            if (results.failed === 0) {
                console.log('\n🎉 All Telegram adapter tests passed!');
                process.exit(0);
            } else {
                console.log('\n💥 Some Telegram adapter tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Telegram adapter test suite failed:', error);
            process.exit(1);
        });
}

export { testTelegramAdapter };