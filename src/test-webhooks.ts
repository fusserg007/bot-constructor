/**
 * Тест системы webhook'ов
 */

import express from 'express';
import { WebhookManager } from './core/webhooks/WebhookManager';
import { TelegramAdapter } from './adapters/TelegramAdapter';
import { MaxAdapter } from './adapters/MaxAdapter';

async function testWebhooks() {
  console.log('🚀 Тестирование системы webhook\'ов...');

  const app = express();
  const webhookManager = WebhookManager.getInstance();

  // Настраиваем Express middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Добавляем webhook middleware
  app.use('/webhook', webhookManager.getWebhookMiddleware());

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

    // Регистрируем webhook'и
    webhookManager.registerWebhook('test-telegram-bot', telegramAdapter, {
      secret: 'telegram_secret',
      validateSignature: true
    });

    webhookManager.registerWebhook('test-max-bot', maxAdapter, {
      secret: 'max_secret',
      validateSignature: true
    });

    console.log('✅ Webhook\'и зарегистрированы');

    // Показываем конфигурации
    const telegramConfig = webhookManager.getWebhookConfig('test-telegram-bot');
    const maxConfig = webhookManager.getWebhookConfig('test-max-bot');

    console.log('📋 Конфигурации webhook\'ов:');
    console.log('  Telegram:', telegramConfig?.path);
    console.log('  MAX:', maxConfig?.path);

    // Добавляем тестовый endpoint для статистики
    app.get('/webhook-stats', (req, res) => {
      const stats = webhookManager.getWebhookStats();
      const overallStats = webhookManager.getOverallStats();
      
      res.json({
        individual: stats,
        overall: overallStats
      });
    });

    // Добавляем тестовый endpoint для симуляции webhook'а
    app.post('/test-webhook/:platform/:botId', (req, res) => {
      console.log(`📨 Тестовый webhook для ${req.params.platform}/${req.params.botId}:`, req.body);
      res.json({ success: true, message: 'Test webhook received' });
    });

    // Запускаем сервер
    const port = 3001;
    const server = app.listen(port, () => {
      console.log(`🌐 Webhook сервер запущен на порту ${port}`);
      console.log(`📊 Статистика доступна на: http://localhost:${port}/webhook-stats`);
      console.log(`🧪 Тестовые webhook'и:`);
      console.log(`  Telegram: http://localhost:${port}${telegramConfig?.path}`);
      console.log(`  MAX: http://localhost:${port}${maxConfig?.path}`);
    });

    // Останавливаем сервер через 30 секунд
    setTimeout(() => {
      console.log('🛑 Остановка тестового сервера...');
      server.close();
      webhookManager.dispose();
    }, 30000);

  } catch (error) {
    console.error('❌ Ошибка при тестировании webhook\'ов:', error);
  }
}

// Запускаем тест только если файл выполняется напрямую
if (require.main === module) {
  testWebhooks().catch(console.error);
}

export { testWebhooks };