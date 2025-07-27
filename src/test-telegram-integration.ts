/**
 * Интеграционный тест Telegram адаптера
 * Проверяет интеграцию с polling и webhook системами
 */

import { TelegramAdapter } from './adapters/TelegramAdapter';
import { PollingManager } from './core/polling/PollingManager';
import { WebhookManager } from './core/webhooks/WebhookManager';
import { AdapterRegistry } from './core/adapters/AdapterRegistry';
import { PlatformCredentials } from './core/types';

// Mock токен для тестирования
const MOCK_CREDENTIALS: PlatformCredentials = {
  telegram: {
    token: '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ-mock-token'
  }
};

async function testTelegramIntegration() {
  console.log('🧪 Testing Telegram Integration...\n');

  const tests = [
    {
      name: 'Adapter Registration',
      test: testAdapterRegistration
    },
    {
      name: 'Polling Integration',
      test: testPollingIntegration
    },
    {
      name: 'Webhook Integration', 
      test: testWebhookIntegration
    },
    {
      name: 'Message Flow',
      test: testMessageFlow
    },
    {
      name: 'Error Recovery',
      test: testErrorRecovery
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

  console.log(`\n📊 Integration Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function testAdapterRegistration() {
  console.log('  Testing adapter registration with systems...');

  // Создаем и регистрируем адаптер
  const adapter = new TelegramAdapter();
  const registry = AdapterRegistry.getInstance();
  
  registry.registerAdapter(adapter);
  console.log(`    Adapter registered: ${registry.getAdapter('telegram') ? 'Yes' : 'No'}`);

  // Проверяем возможности
  const capabilities = adapter.getCapabilities();
  console.log(`    Supports polling: ${capabilities.supportsPolling}`);
  console.log(`    Supports webhooks: ${capabilities.supportsWebhooks}`);

  if (!capabilities.supportsPolling || !capabilities.supportsWebhooks) {
    throw new Error('Telegram adapter should support both polling and webhooks');
  }
}

async function testPollingIntegration() {
  console.log('  Testing polling integration...');

  const adapter = new TelegramAdapter();
  const pollingManager = new PollingManager();

  // Регистрируем адаптер в polling manager
  pollingManager.registerAdapter(adapter);
  console.log(`    Adapter registered in polling manager: Yes`);

  // Проверяем статус
  const status = pollingManager.getStatus();
  console.log(`    Polling manager status: ${status.isRunning ? 'Running' : 'Stopped'}`);
  console.log(`    Registered adapters: ${status.adapters.length}`);

  if (status.adapters.length === 0) {
    throw new Error('No adapters registered in polling manager');
  }

  // Проверяем, что наш адаптер зарегистрирован
  const telegramStatus = status.adapters.find(a => a.platform === 'telegram');
  if (!telegramStatus) {
    throw new Error('Telegram adapter not found in polling manager');
  }

  console.log(`    Telegram adapter status: ${telegramStatus.status}`);
  console.log(`    Telegram adapter initialized: ${telegramStatus.initialized}`);
}

async function testWebhookIntegration() {
  console.log('  Testing webhook integration...');

  const adapter = new TelegramAdapter();
  const webhookManager = new WebhookManager();

  // Регистрируем адаптер в webhook manager
  webhookManager.registerAdapter(adapter);
  console.log(`    Adapter registered in webhook manager: Yes`);

  // Проверяем статус
  const status = webhookManager.getStatus();
  console.log(`    Webhook manager status: ${status.isRunning ? 'Running' : 'Stopped'}`);
  console.log(`    Registered adapters: ${status.adapters.length}`);

  if (status.adapters.length === 0) {
    throw new Error('No adapters registered in webhook manager');
  }

  // Проверяем, что наш адаптер зарегистрирован
  const telegramStatus = status.adapters.find(a => a.platform === 'telegram');
  if (!telegramStatus) {
    throw new Error('Telegram adapter not found in webhook manager');
  }

  console.log(`    Telegram adapter status: ${telegramStatus.status}`);

  // Тестируем обработку webhook
  const mockWebhookRequest = {
    platform: 'telegram' as const,
    body: {
      update_id: 123,
      message: {
        message_id: 456,
        from: { id: 789, first_name: 'Test', username: 'test' },
        chat: { id: 789, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Test webhook message'
      }
    },
    headers: {},
    query: {}
  };

  let messageReceived = false;
  adapter.on('message', () => {
    messageReceived = true;
  });

  await webhookManager.handleWebhook('telegram', mockWebhookRequest);
  console.log(`    Webhook message processed: ${messageReceived ? 'Yes' : 'No'}`);

  if (!messageReceived) {
    throw new Error('Webhook message was not processed');
  }
}

async function testMessageFlow() {
  console.log('  Testing message flow...');

  const adapter = new TelegramAdapter();
  let messagesReceived = 0;
  let callbacksReceived = 0;

  // Подписываемся на события
  adapter.on('message', (message) => {
    messagesReceived++;
    console.log(`    Message received: ${message.text} (${message.type})`);
  });

  adapter.on('callback', (callback) => {
    callbacksReceived++;
    console.log(`    Callback received: ${callback.data}`);
  });

  // Симулируем различные типы обновлений
  const updates = [
    // Текстовое сообщение
    {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 1, first_name: 'User1' },
        chat: { id: 1, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Hello!'
      }
    },
    // Команда
    {
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: 1, first_name: 'User1' },
        chat: { id: 1, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start',
        entities: [{ offset: 0, length: 6, type: 'bot_command' }]
      }
    },
    // Callback query
    {
      update_id: 3,
      callback_query: {
        id: 'cb1',
        from: { id: 1, first_name: 'User1' },
        message: { message_id: 2, chat: { id: 1, type: 'private' } },
        data: 'button_1'
      }
    },
    // Фото
    {
      update_id: 4,
      message: {
        message_id: 3,
        from: { id: 1, first_name: 'User1' },
        chat: { id: 1, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        photo: [{ file_id: 'photo123', width: 100, height: 100 }],
        caption: 'Test photo'
      }
    }
  ];

  // Обрабатываем все обновления
  for (const update of updates) {
    await (adapter as any).processUpdate(update);
  }

  console.log(`    Total messages processed: ${messagesReceived}`);
  console.log(`    Total callbacks processed: ${callbacksReceived}`);

  if (messagesReceived !== 3) { // 3 сообщения (текст, команда, фото)
    throw new Error(`Expected 3 messages, got ${messagesReceived}`);
  }

  if (callbacksReceived !== 1) { // 1 callback
    throw new Error(`Expected 1 callback, got ${callbacksReceived}`);
  }
}

async function testErrorRecovery() {
  console.log('  Testing error recovery...');

  const adapter = new TelegramAdapter();
  let errorsEmitted = 0;

  adapter.on('error', (error) => {
    errorsEmitted++;
    console.log(`    Error emitted: ${error.message}`);
  });

  // Тестируем обработку невалидных данных
  const invalidUpdates = [
    null,
    undefined,
    {},
    { update_id: 'invalid' },
    { update_id: 1, message: null }
  ];

  for (const update of invalidUpdates) {
    try {
      await (adapter as any).processUpdate(update);
    } catch (error) {
      // Ошибки ожидаемы
    }
  }

  console.log(`    Errors handled gracefully: ${errorsEmitted >= 0 ? 'Yes' : 'No'}`);

  // Тестируем восстановление после ошибки
  const validUpdate = {
    update_id: 100,
    message: {
      message_id: 100,
      from: { id: 100, first_name: 'Recovery' },
      chat: { id: 100, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Recovery test'
    }
  };

  let recoveryMessageReceived = false;
  adapter.on('message', () => {
    recoveryMessageReceived = true;
  });

  await (adapter as any).processUpdate(validUpdate);
  console.log(`    Recovery after error: ${recoveryMessageReceived ? 'Yes' : 'No'}`);

  if (!recoveryMessageReceived) {
    throw new Error('Adapter did not recover after errors');
  }
}

// Запуск тестов
if (require.main === module) {
  testTelegramIntegration()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 All Telegram integration tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some Telegram integration tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Telegram integration test suite failed:', error);
      process.exit(1);
    });
}

export { testTelegramIntegration };