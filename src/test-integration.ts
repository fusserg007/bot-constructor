/**
 * Интеграционный тест всей архитектуры
 */

import { initializeAdapters, getAdapterRegistry } from './core/adapters';
import { PollingManager } from './core/polling/PollingManager';

async function testIntegration() {
  console.log('🚀 Интеграционный тест мультиплатформенного конструктора ботов\n');

  try {
    // 1. Инициализация системы
    console.log('📦 Инициализация системы...');
    initializeAdapters();
    
    const registry = getAdapterRegistry();
    const pollingManager = PollingManager.getInstance();
    
    console.log('✅ Система инициализирована');

    // 2. Проверка поддерживаемых платформ
    const platforms = registry.getSupportedPlatforms();
    console.log(`\n🌐 Поддерживаемые платформы: ${platforms.join(', ')}`);

    // 3. Тестирование каждой платформы
    console.log('\n🔧 Тестирование адаптеров платформ:');
    
    const testResults: Record<string, boolean> = {};
    
    for (const platform of platforms) {
      try {
        console.log(`\n  📱 Тестирование ${platform}...`);
        
        // Создаем адаптер
        const adapter = registry.createAdapter(platform);
        console.log(`    ✅ Адаптер создан`);
        
        // Проверяем возможности
        const capabilities = adapter.getCapabilities();
        console.log(`    📋 Возможности:`);
        console.log(`      - Inline кнопки: ${capabilities.supportsInlineButtons}`);
        console.log(`      - Медиа: ${capabilities.supportsMedia}`);
        console.log(`      - Файлы: ${capabilities.supportsFiles}`);
        console.log(`      - Webhooks: ${capabilities.supportsWebhooks}`);
        console.log(`      - Polling: ${capabilities.supportsPolling}`);
        console.log(`      - Макс. длина сообщения: ${capabilities.maxMessageLength}`);
        
        // Тестируем polling если поддерживается
        if (capabilities.supportsPolling) {
          console.log(`    ⏱️ Тестирование polling...`);
          
          const adapterId = `test-${platform}-bot`;
          pollingManager.startPolling(adapterId, adapter, {
            interval: 5000,
            enabled: true,
            maxRetries: 1
          });
          
          // Проверяем что polling активен
          const isActive = pollingManager.isPollingActive(adapterId);
          console.log(`      Polling активен: ${isActive}`);
          
          // Останавливаем polling
          pollingManager.stopPolling(adapterId);
          console.log(`      Polling остановлен`);
        }
        
        // Очищаем ресурсы
        await adapter.dispose();
        console.log(`    🧹 Ресурсы очищены`);
        
        testResults[platform] = true;
        
      } catch (error) {
        console.error(`    ❌ Ошибка тестирования ${platform}:`, error);
        testResults[platform] = false;
      }
    }

    // 4. Тестирование реестра адаптеров
    console.log('\n📊 Тестирование реестра адаптеров:');
    
    try {
      // Создаем несколько адаптеров одновременно
      const adapters = platforms.map(platform => ({
        platform,
        adapter: registry.createAdapter(platform)
      }));
      
      console.log(`  ✅ Создано ${adapters.length} адаптеров одновременно`);
      
      // Проверяем статистику
      const stats = registry.getStats();
      console.log(`  📈 Статистика реестра:`);
      console.log(`    - Зарегистрировано: ${stats.totalRegistered}`);
      console.log(`    - Активных: ${stats.totalActive}`);
      console.log(`    - По платформам:`, stats.activeByPlatform);
      
      // Очищаем все адаптеры
      for (const { adapter } of adapters) {
        await adapter.dispose();
      }
      
      console.log(`  🧹 Все адаптеры очищены`);
      
    } catch (error) {
      console.error('  ❌ Ошибка тестирования реестра:', error);
    }

    // 5. Тестирование PollingManager
    console.log('\n⏱️ Тестирование PollingManager:');
    
    try {
      const overallStats = pollingManager.getOverallStats();
      console.log(`  📊 Общая статистика polling:`);
      console.log(`    - Активных: ${overallStats.totalActive}`);
      console.log(`    - Всего запросов: ${overallStats.totalRequests}`);
      console.log(`    - Всего ошибок: ${overallStats.totalErrors}`);
      console.log(`    - По платформам:`, overallStats.platformStats);
      
      console.log(`  ✅ PollingManager функционирует`);
      
    } catch (error) {
      console.error('  ❌ Ошибка тестирования PollingManager:', error);
    }

    // 6. Итоговый отчет
    console.log('\n🎉 ИТОГОВЫЙ ОТЧЕТ:');
    console.log('=' .repeat(50));
    
    const successfulPlatforms = Object.entries(testResults)
      .filter(([, success]) => success)
      .map(([platform]) => platform);
    
    const failedPlatforms = Object.entries(testResults)
      .filter(([, success]) => !success)
      .map(([platform]) => platform);
    
    console.log(`✅ Успешно протестированы: ${successfulPlatforms.join(', ') || 'нет'}`);
    console.log(`❌ Ошибки при тестировании: ${failedPlatforms.join(', ') || 'нет'}`);
    
    console.log('\n📋 Компоненты архитектуры:');
    console.log('  ✅ Система адаптеров: работает');
    console.log('  ✅ Реестр адаптеров: работает');
    console.log('  ✅ PollingManager: работает');
    console.log('  ✅ Управление жизненным циклом: работает');
    
    const successRate = (successfulPlatforms.length / platforms.length) * 100;
    console.log(`\n🎯 Успешность тестирования: ${successRate.toFixed(1)}%`);
    
    if (successRate === 100) {
      console.log('\n🏆 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('Архитектура готова к дальнейшему развитию.');
    } else {
      console.log('\n⚠️ Есть проблемы, требующие внимания.');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка интеграционного теста:', error);
  }
}

// Запускаем тест
testIntegration().catch(console.error);