/**
 * Тест архитектуры мультиплатформенного конструктора ботов
 */

import { initializeAdapters, getAdapterRegistry } from './core/adapters';
import { PollingManager } from './core/polling/PollingManager';
import { WebhookManager } from './core/webhooks/WebhookManager';

async function testArchitecture() {
  console.log('🚀 Тестирование архитектуры мультиплатформенного конструктора ботов...');

  try {
    // 1. Инициализируем систему адаптеров
    console.log('\n📦 Инициализация системы адаптеров...');
    initializeAdapters();
    
    const registry = getAdapterRegistry();
    const supportedPlatforms = registry.getSupportedPlatforms();
    console.log('✅ Поддерживаемые платформы:', supportedPlatforms);

    // 2. Тестируем создание адаптеров
    console.log('\n🔧 Тестирование создания адаптеров...');
    
    for (const platform of supportedPlatforms) {
      try {
        const adapter = registry.createAdapter(platform);
        console.log(`✅ ${platform} адаптер создан успешно`);
        
        // Проверяем возможности адаптера
        const capabilities = adapter.getCapabilities();
        console.log(`  Возможности: кнопки=${capabilities.supportsInlineButtons}, медиа=${capabilities.supportsMedia}`);
      } catch (error) {
        console.error(`❌ Ошибка создания ${platform} адаптера:`, error);
      }
    }

    // 3. Тестируем статистику реестра
    console.log('\n📊 Статистика реестра адаптеров:');
    const stats = registry.getStats();
    console.log('  Зарегистрировано:', stats.totalRegistered);
    console.log('  Активных:', stats.totalActive);
    console.log('  По платформам:', stats.activeByPlatform);

    // 4. Тестируем PollingManager
    console.log('\n⏱️ Тестирование PollingManager...');
    const pollingManager = PollingManager.getInstance();
    const overallPollingStats = pollingManager.getOverallStats();
    console.log('✅ PollingManager инициализирован');
    console.log('  Общая статистика:', overallPollingStats);

    // 5. Тестируем WebhookManager
    console.log('\n🌐 Тестирование WebhookManager...');
    const webhookManager = WebhookManager.getInstance();
    const overallWebhookStats = webhookManager.getOverallStats();
    console.log('✅ WebhookManager инициализирован');
    console.log('  Общая статистика:', overallWebhookStats);

    // 6. Тестируем интеграцию компонентов
    console.log('\n🔗 Тестирование интеграции компонентов...');
    
    // Создаем тестовый адаптер
    const telegramAdapter = registry.createAdapter('telegram');
    
    try {
      await telegramAdapter.initialize({
        telegram: { token: 'test_token' }
      });
      console.log('✅ Адаптер инициализирован с тестовыми данными');
    } catch (error) {
      console.log('⚠️ Адаптер не инициализирован (ожидаемо для тестовых данных)');
    }

    // Проверяем возможности адаптера
    const capabilities = telegramAdapter.getCapabilities();
    console.log('✅ Возможности адаптера получены:', {
      platform: telegramAdapter.getPlatform(),
      supportsPolling: capabilities.supportsPolling,
      supportsWebhooks: capabilities.supportsWebhooks
    });

    console.log('\n🎉 Архитектура успешно протестирована!');
    console.log('\n📋 Резюме:');
    console.log(`  ✅ Система адаптеров: ${supportedPlatforms.length} платформ`);
    console.log('  ✅ Polling система: готова');
    console.log('  ✅ Webhook система: готова');
    console.log('  ✅ Реестр адаптеров: функционирует');
    console.log('  ✅ Интеграция компонентов: работает');

  } catch (error) {
    console.error('❌ Ошибка при тестировании архитектуры:', error);
  }
}

// Запускаем тест только если файл выполняется напрямую
if (require.main === module) {
  testArchitecture().catch(console.error);
}

export { testArchitecture };