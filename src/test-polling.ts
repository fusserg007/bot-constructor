/**
 * Тест системы polling
 */

import { PollingManager } from './core/polling/PollingManager';
import { TelegramAdapter } from './adapters/TelegramAdapter';
import { MaxAdapter } from './adapters/MaxAdapter';

async function testPolling() {
  console.log('🚀 Тестирование системы polling...');

  const pollingManager = PollingManager.getInstance();

  // Создаем тестовые адаптеры
  const telegramAdapter = new TelegramAdapter();
  const maxAdapter = new MaxAdapter();

  try {
    // Инициализируем адаптеры с тестовыми данными
    await telegramAdapter.initialize({
      telegram: {
        token: 'test_token'
      }
    });

    await maxAdapter.initialize({
      max: {
        apiKey: 'test_api_key',
        secretKey: 'test_secret_key'
      }
    });

    // Запускаем polling для Telegram
    pollingManager.startPolling('test-telegram-bot', telegramAdapter, {
      interval: 2000,
      timeout: 10000,
      enabled: true
    });

    // Запускаем polling для MAX
    pollingManager.startPolling('test-max-bot', maxAdapter, {
      interval: 3000,
      timeout: 15000,
      enabled: true
    });

    console.log('✅ Polling запущен для обоих адаптеров');

    // Показываем статистику через 5 секунд
    setTimeout(() => {
      const stats = pollingManager.getPollingStats();
      console.log('📊 Статистика polling:');
      stats.forEach(stat => {
        console.log(`  ${stat.platform}: активен=${stat.isActive}, запросов=${stat.requestCount}, ошибок=${stat.errorCount}`);
      });

      const overallStats = pollingManager.getOverallStats();
      console.log('📈 Общая статистика:', overallStats);

      // Останавливаем polling
      pollingManager.stopAllPolling();
      console.log('🛑 Polling остановлен');
    }, 5000);

  } catch (error) {
    console.error('❌ Ошибка при тестировании polling:', error);
  }
}

// Запускаем тест только если файл выполняется напрямую
if (require.main === module) {
  testPolling().catch(console.error);
}

export { testPolling };