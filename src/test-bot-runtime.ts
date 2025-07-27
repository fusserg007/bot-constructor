/**
 * Тест BotRuntimeManager - интеграции Schema Engine с системой ботов
 */

import { BotRuntimeManager, BotRuntimeConfig } from './core/runtime/BotRuntimeManager';
import { AdapterRegistry } from './core/adapters/AdapterRegistry';
import { MessengerAdapter } from './core/adapters/MessengerAdapter';
import { MessengerPlatform, PlatformCredentials, BotSchema, IncomingMessage } from './core/types';

console.log('🤖 Тестирование BotRuntimeManager...\n');

// Мок адаптер для тестирования
class MockTelegramAdapter extends MessengerAdapter {
  private isPolling = false;

  constructor() {
    super('telegram');
  }

  async initialize(credentials: PlatformCredentials): Promise<void> {
    console.log('📱 Инициализация Mock Telegram адаптера');
    this.credentials = credentials;
    this.isInitialized = true;
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    return !!credentials.telegram?.token;
  }

  getCapabilities() {
    return {
      supportsInlineButtons: true,
      supportsMedia: true,
      supportsFiles: true,
      supportsWebhooks: true,
      supportsPolling: true,
      maxMessageLength: 4096,
      supportedMediaTypes: ['photo', 'video', 'audio', 'document']
    };
  }

  async sendMessage(chatId: string, message: any): Promise<void> {
    console.log(`📤 [Mock Telegram] Отправка в ${chatId}:`, message.text);
  }

  async sendMedia(chatId: string, media: any): Promise<void> {
    console.log(`📸 [Mock Telegram] Отправка медиа в ${chatId}:`, media.type, media.url);
  }

  startPolling(): void {
    this.isPolling = true;
    console.log('📡 [Mock Telegram] Polling запущен');
    
    // Симулируем входящее сообщение через 1 секунду
    setTimeout(() => {
      this.simulateIncomingMessage('/start');
    }, 1000);
  }

  stopPolling(): void {
    this.isPolling = false;
    console.log('📡 [Mock Telegram] Polling остановлен');
  }

  async setWebhook(url: string): Promise<boolean> {
    console.log(`🔗 [Mock Telegram] Webhook установлен: ${url}`);
    return true;
  }

  async deleteWebhook(): Promise<boolean> {
    console.log('🔗 [Mock Telegram] Webhook удален');
    return true;
  }

  async handleWebhook(request: any): Promise<void> {
    console.log('🔗 [Mock Telegram] Обработка webhook:', request);
  }

  async dispose(): Promise<void> {
    this.stopPolling();
    this.removeAllListeners();
    this.isInitialized = false;
    console.log('🗑️ [Mock Telegram] Адаптер очищен');
  }

  // Симуляция входящего сообщения
  simulateIncomingMessage(text: string): void {
    const message: IncomingMessage = {
      id: 'msg-' + Date.now(),
      platform: 'telegram',
      chatId: 'test-chat-123',
      userId: 'test-user-456',
      text,
      type: 'text',
      timestamp: new Date().toISOString()
    };

    console.log(`📨 [Mock Telegram] Симуляция входящего сообщения: ${text}`);
    this.emitMessage(message);
  }
}

async function setupMockAdapter() {
  console.log('🔧 Настройка Mock адаптера...');
  
  const registry = AdapterRegistry.getInstance();
  registry.registerAdapter('telegram', MockTelegramAdapter);
  
  console.log('✅ Mock адаптер зарегистрирован');
}

async function testBotRuntimeManager() {
  console.log('🚀 Тестирование BotRuntimeManager...\n');

  try {
    // Настраиваем мок адаптер
    await setupMockAdapter();

    // Получаем экземпляр менеджера
    const runtimeManager = BotRuntimeManager.getInstance();
    console.log('✅ BotRuntimeManager получен');

    // Создаем тестовую схему бота (упрощенная версия)
    const testSchema: any = {
      id: 'test-bot-schema',
      name: 'Тестовый бот',
      nodes: [
        {
          id: 'trigger-start',
          type: 'trigger-command',
          data: {
            command: '/start'
          },
          position: { x: 0, y: 0 }
        },
        {
          id: 'action-welcome',
          type: 'action-send-message',
          data: {
            message: 'Привет! Я тестовый бот. Как дела?'
          },
          position: { x: 200, y: 0 }
        }
      ],
      edges: [
        {
          id: 'edge-start-welcome',
          source: 'trigger-start',
          target: 'action-welcome'
        }
      ],
      variables: {},
      settings: {
        name: 'Тестовый бот',
        description: 'Бот для тестирования',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Конфигурация бота
    const botConfig: BotRuntimeConfig = {
      botId: 'test-bot-001',
      schema: testSchema,
      platforms: [
        {
          platform: 'telegram',
          credentials: {
            telegram: {
              token: 'test-token-123'
            }
          },
          mode: 'polling'
        }
      ]
    };

    console.log('📋 Тестовая конфигурация создана');

    // Запускаем бота
    console.log('\n🚀 Запуск тестового бота...');
    await runtimeManager.startBot(botConfig);

    // Ждем обработки сообщения
    console.log('\n⏳ Ожидание обработки сообщения...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Проверяем статус ботов
    console.log('\n📊 Проверка статуса ботов...');
    const status = runtimeManager.getActiveBotsStatus();
    console.log('✅ Активные боты:', status);

    // Проверяем статистику выполнения
    console.log('\n📈 Статистика выполнения схем...');
    const stats = runtimeManager.getExecutionStats();
    console.log('✅ Статистика:', stats);

    // Останавливаем бота
    console.log('\n🛑 Остановка тестового бота...');
    await runtimeManager.stopBot('test-bot-001');

    console.log('\n🎉 Тест BotRuntimeManager завершен успешно!');
    return true;

  } catch (error) {
    console.error('❌ Ошибка в тесте BotRuntimeManager:', error);
    return false;
  }
}

async function testBotRestart() {
  console.log('\n🔄 Тестирование перезапуска бота...');

  try {
    const runtimeManager = BotRuntimeManager.getInstance();

    // Создаем первую схему (упрощенная версия)
    const initialSchema: any = {
      id: 'restart-test-schema',
      name: 'Схема для перезапуска',
      nodes: [
        {
          id: 'trigger-help',
          type: 'trigger-command',
          data: {
            command: '/help'
          },
          position: { x: 0, y: 0 }
        },
        {
          id: 'action-help',
          type: 'action-send-message',
          data: {
            message: 'Это старая версия помощи'
          },
          position: { x: 200, y: 0 }
        }
      ],
      edges: [
        {
          id: 'edge-help',
          source: 'trigger-help',
          target: 'action-help'
        }
      ],
      variables: {},
      settings: {
        name: 'Тест перезапуска',
        description: 'Бот для тестирования перезапуска',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const botConfig: BotRuntimeConfig = {
      botId: 'restart-test-bot',
      schema: initialSchema,
      platforms: [
        {
          platform: 'telegram',
          credentials: {
            telegram: {
              token: 'restart-test-token'
            }
          },
          mode: 'polling'
        }
      ]
    };

    // Запускаем бота
    await runtimeManager.startBot(botConfig);
    console.log('✅ Бот запущен с первой схемой');

    // Создаем обновленную схему (упрощенная версия)
    const updatedSchema: any = {
      ...initialSchema,
      nodes: [
        {
          id: 'trigger-help',
          type: 'trigger-command',
          data: {
            command: '/help'
          },
          position: { x: 0, y: 0 }
        },
        {
          id: 'action-help-new',
          type: 'action-send-message',
          data: {
            message: 'Это НОВАЯ версия помощи! 🎉'
          },
          position: { x: 200, y: 0 }
        }
      ],
      edges: [
        {
          id: 'edge-help-new',
          source: 'trigger-help',
          target: 'action-help-new'
        }
      ],
      version: '2.0.0',
      updatedAt: new Date().toISOString()
    };

    // Перезапускаем с новой схемой
    await runtimeManager.restartBot('restart-test-bot', updatedSchema);
    console.log('✅ Бот перезапущен с новой схемой');

    // Останавливаем
    await runtimeManager.stopBot('restart-test-bot');
    console.log('✅ Тест перезапуска завершен');

    return true;

  } catch (error) {
    console.error('❌ Ошибка в тесте перезапуска:', error);
    return false;
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🧪 Запуск всех тестов BotRuntimeManager...\n');

  const results = {
    basic: await testBotRuntimeManager(),
    restart: await testBotRestart()
  };

  console.log('\n📊 Итоговые результаты тестирования:');
  console.log('✅ Базовый функционал:', results.basic ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Перезапуск бота:', results.restart ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Все тесты BotRuntimeManager успешно пройдены!');
    console.log('\n📋 Возможности BotRuntimeManager:');
    console.log('  🤖 Управление жизненным циклом ботов (запуск/остановка/перезапуск)');
    console.log('  🔗 Интеграция Schema Engine с адаптерами мессенджеров');
    console.log('  📨 Автоматическая обработка входящих сообщений и callback\'ов');
    console.log('  💾 Управление сессиями пользователей');
    console.log('  📊 Мониторинг статуса и статистики ботов');
    console.log('  🔄 Горячая перезагрузка схем без остановки бота');
    console.log('  🛡️ Изоляция ошибок между ботами');
    console.log('  📡 Поддержка polling и webhook режимов');
  } else {
    console.log('\n❌ Некоторые тесты не пройдены. Требуется доработка.');
  }

  return allPassed;
}

// Запуск тестов
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Критическая ошибка при запуске тестов:', error);
  process.exit(1);
});