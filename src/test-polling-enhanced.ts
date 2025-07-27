/**
 * Расширенный тест системы Polling
 * Проверяет улучшенную функциональность PollingManager
 */

import { PollingManager } from './core/polling/PollingManager';
import { TelegramAdapter } from './adapters/TelegramAdapter';
import { MaxAdapter } from './adapters/MaxAdapter';
import { PlatformCredentials } from './core/types';

// Mock credentials для тестирования
const MOCK_CREDENTIALS: PlatformCredentials = {
  telegram: { token: '123456789:MOCK_TOKEN' },
  max: { apiKey: 'mock_api_key', secretKey: 'mock_secret_key' }
};

async function testPollingEnhanced() {
  console.log('🧪 Testing Enhanced Polling System...\n');

  const tests = [
    {
      name: 'Singleton Pattern',
      test: testSingletonPattern
    },
    {
      name: 'Default Configurations',
      test: testDefaultConfigurations
    },
    {
      name: 'Adapter Registration',
      test: testAdapterRegistration
    },
    {
      name: 'Polling Lifecycle',
      test: testPollingLifecycle
    },
    {
      name: 'Configuration Management',
      test: testConfigurationManagement
    },
    {
      name: 'Statistics Tracking',
      test: testStatisticsTracking
    },
    {
      name: 'Error Handling',
      test: testErrorHandling
    },
    {
      name: 'Health Monitoring',
      test: testHealthMonitoring
    },
    {
      name: 'Multi-Platform Support',
      test: testMultiPlatformSupport
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

  console.log(`\n📊 Enhanced Polling Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function testSingletonPattern() {
  console.log('  Testing singleton pattern...');

  const manager1 = PollingManager.getInstance();
  const manager2 = PollingManager.getInstance();

  console.log(`    Same instance: ${manager1 === manager2 ? 'Yes' : 'No'}`);

  if (manager1 !== manager2) {
    throw new Error('PollingManager should be a singleton');
  }
}

async function testDefaultConfigurations() {
  console.log('  Testing default configurations...');

  const manager = PollingManager.getInstance();

  // Проверяем конфигурации для разных платформ
  const telegramConfig = manager.getDefaultConfig('telegram');
  const maxConfig = manager.getDefaultConfig('max');

  console.log(`    Telegram config exists: ${telegramConfig ? 'Yes' : 'No'}`);
  console.log(`    MAX config exists: ${maxConfig ? 'Yes' : 'No'}`);

  if (!telegramConfig || !maxConfig) {
    throw new Error('Default configurations should exist for all platforms');
  }

  console.log(`    Telegram interval: ${telegramConfig.interval}ms`);
  console.log(`    Telegram timeout: ${telegramConfig.timeout}ms`);
  console.log(`    MAX interval: ${maxConfig.interval}ms`);
  console.log(`    MAX timeout: ${maxConfig.timeout}ms`);

  // Проверяем, что конфигурации разные для разных платформ
  if (telegramConfig.interval === maxConfig.interval) {
    console.warn('    Warning: Same interval for different platforms');
  }
}

async function testAdapterRegistration() {
  console.log('  Testing adapter registration...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Регистрируем адаптер
  const adapterId = 'test-telegram-1';
  manager.startPolling(adapterId, telegramAdapter);

  console.log(`    Polling active: ${manager.isPollingActive(adapterId) ? 'Yes' : 'No'}`);
  console.log(`    Registered adapters: ${manager.getPollingAdapters().length}`);

  if (!manager.isPollingActive(adapterId)) {
    throw new Error('Polling should be active after registration');
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testPollingLifecycle() {
  console.log('  Testing polling lifecycle...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();
  const adapterId = 'test-lifecycle';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // 1. Запуск
  manager.startPolling(adapterId, telegramAdapter);
  console.log(`    After start - Active: ${manager.isPollingActive(adapterId)}`);

  // 2. Пауза
  manager.pausePolling(adapterId);
  console.log(`    After pause - Active: ${manager.isPollingActive(adapterId)}`);

  // 3. Возобновление
  manager.resumePolling(adapterId);
  console.log(`    After resume - Active: ${manager.isPollingActive(adapterId)}`);

  // 4. Остановка
  manager.stopPolling(adapterId);
  console.log(`    After stop - Active: ${manager.isPollingActive(adapterId)}`);

  if (manager.isPollingActive(adapterId)) {
    throw new Error('Polling should be inactive after stop');
  }
}

async function testConfigurationManagement() {
  console.log('  Testing configuration management...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();
  const adapterId = 'test-config';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем с кастомной конфигурацией
  const customConfig = {
    interval: 5000,
    timeout: 60000,
    maxRetries: 5,
    enabled: true
  };

  manager.startPolling(adapterId, telegramAdapter, customConfig);

  // Получаем конфигурацию
  const config = manager.getPollingConfig(adapterId);
  console.log(`    Custom interval applied: ${config?.interval === 5000 ? 'Yes' : 'No'}`);
  console.log(`    Custom timeout applied: ${config?.timeout === 60000 ? 'Yes' : 'No'}`);

  if (!config || config.interval !== 5000) {
    throw new Error('Custom configuration should be applied');
  }

  // Обновляем конфигурацию
  manager.updatePollingConfig(adapterId, { interval: 3000 });
  const updatedConfig = manager.getPollingConfig(adapterId);
  console.log(`    Updated interval: ${updatedConfig?.interval}ms`);

  if (!updatedConfig || updatedConfig.interval !== 3000) {
    throw new Error('Configuration should be updated');
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testStatisticsTracking() {
  console.log('  Testing statistics tracking...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();
  const adapterId = 'test-stats';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling
  manager.startPolling(adapterId, telegramAdapter);

  // Ждем немного для накопления статистики
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Получаем статистику
  const stats = manager.getPollingStats(adapterId);
  console.log(`    Stats collected: ${stats.length > 0 ? 'Yes' : 'No'}`);

  if (stats.length > 0) {
    const stat = stats[0];
    console.log(`    Platform: ${stat.platform}`);
    console.log(`    Active: ${stat.isActive}`);
    console.log(`    Request count: ${stat.requestCount}`);
    console.log(`    Error count: ${stat.errorCount}`);
    console.log(`    Uptime: ${stat.uptime}ms`);
  }

  // Общая статистика
  const overallStats = manager.getOverallStats();
  console.log(`    Total active: ${overallStats.totalActive}`);
  console.log(`    Total requests: ${overallStats.totalRequests}`);

  // Очистка
  manager.stopPolling(adapterId);
}

async function testErrorHandling() {
  console.log('  Testing error handling...');

  const manager = PollingManager.getInstance();
  
  // Создаем mock адаптер, который будет генерировать ошибки
  const errorAdapter = {
    getPlatform: () => 'telegram' as const,
    getCapabilities: () => ({ supportsPolling: true }),
    pollUpdates: async () => {
      throw new Error('Mock polling error');
    },
    emitError: (error: Error) => {
      console.log(`    Error emitted: ${error.message}`);
    }
  } as any;

  const adapterId = 'test-error';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling с адаптером, который генерирует ошибки
  manager.startPolling(adapterId, errorAdapter, {
    interval: 1000,
    maxRetries: 2,
    enabled: true
  });

  // Ждем, пока произойдут ошибки и polling остановится
  await new Promise(resolve => setTimeout(resolve, 5000));

  const stats = manager.getPollingStats(adapterId);
  if (stats.length > 0) {
    console.log(`    Errors handled: ${stats[0].errorCount > 0 ? 'Yes' : 'No'}`);
    console.log(`    Error count: ${stats[0].errorCount}`);
    console.log(`    Still active: ${stats[0].isActive ? 'Yes' : 'No'}`);
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testHealthMonitoring() {
  console.log('  Testing health monitoring...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();
  const adapterId = 'test-health';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling
  manager.startPolling(adapterId, telegramAdapter);

  // Получаем статус здоровья
  const healthStatus = manager.getHealthStatus();
  console.log(`    System healthy: ${healthStatus.healthy ? 'Yes' : 'No'}`);
  console.log(`    Issues found: ${healthStatus.issues.length}`);
  console.log(`    Recommendations: ${healthStatus.recommendations.length}`);

  if (healthStatus.issues.length > 0) {
    console.log(`    Issues: ${healthStatus.issues.join(', ')}`);
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testMultiPlatformSupport() {
  console.log('  Testing multi-platform support...');

  const manager = PollingManager.getInstance();
  const telegramAdapter = new TelegramAdapter();
  const maxAdapter = new MaxAdapter();

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling для разных платформ
  manager.startPolling('telegram-1', telegramAdapter);
  manager.startPolling('max-1', maxAdapter);

  console.log(`    Active adapters: ${manager.getPollingAdapters().length}`);
  console.log(`    Telegram active: ${manager.isPollingActive('telegram-1')}`);
  console.log(`    MAX active: ${manager.isPollingActive('max-1')}`);

  // Проверяем общую статистику
  const overallStats = manager.getOverallStats();
  console.log(`    Total active: ${overallStats.totalActive}`);
  console.log(`    Platform stats:`, overallStats.platformStats);

  if (overallStats.totalActive !== 2) {
    throw new Error(`Expected 2 active adapters, got ${overallStats.totalActive}`);
  }

  // Очистка
  manager.stopAllPolling();
}

// Запуск тестов
if (require.main === module) {
  testPollingEnhanced()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 All enhanced polling tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some enhanced polling tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Enhanced polling test suite failed:', error);
      process.exit(1);
    });
}

export { testPollingEnhanced };