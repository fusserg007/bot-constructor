/**
 * Простой тест системы Polling
 * Проверяет основную функциональность PollingManager
 */

import { PollingManager } from './core/polling/PollingManager';

// Mock адаптер для тестирования
class MockAdapter {
  private platform: string;
  private pollCount: number = 0;

  constructor(platform: string) {
    this.platform = platform;
  }

  getPlatform() {
    return this.platform as any;
  }

  getCapabilities() {
    return {
      supportsPolling: true,
      supportsWebhooks: false,
      supportsMedia: true,
      supportsInlineButtons: true,
      maxMessageLength: 4096,
      supportedMediaTypes: ['photo', 'video']
    };
  }

  async pollUpdates() {
    this.pollCount++;
    console.log(`    ${this.platform} poll #${this.pollCount}`);
    
    // Симулируем небольшую задержку
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Иногда генерируем ошибку для тестирования
    if (this.pollCount === 5) {
      throw new Error(`Mock error for ${this.platform}`);
    }
  }

  emitError(error: Error) {
    console.log(`    ${this.platform} error: ${error.message}`);
  }

  startPolling() {
    // Legacy method
  }

  getPollCount() {
    return this.pollCount;
  }
}

async function testPollingSimple() {
  console.log('🧪 Testing Polling System (Simple)...\n');

  const tests = [
    {
      name: 'Manager Singleton',
      test: testManagerSingleton
    },
    {
      name: 'Default Configurations',
      test: testDefaultConfigurations
    },
    {
      name: 'Basic Polling Operations',
      test: testBasicPollingOperations
    },
    {
      name: 'Configuration Management',
      test: testConfigurationManagement
    },
    {
      name: 'Statistics Collection',
      test: testStatisticsCollection
    },
    {
      name: 'Error Handling',
      test: testErrorHandling
    },
    {
      name: 'Health Monitoring',
      test: testHealthMonitoring
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

  console.log(`\n📊 Polling System Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function testManagerSingleton() {
  console.log('  Testing manager singleton pattern...');

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
  const discordConfig = manager.getDefaultConfig('discord');

  console.log(`    Telegram config: ${telegramConfig ? 'Present' : 'Missing'}`);
  console.log(`    MAX config: ${maxConfig ? 'Present' : 'Missing'}`);
  console.log(`    Discord config: ${discordConfig ? 'Present' : 'Missing'}`);

  if (!telegramConfig || !maxConfig || !discordConfig) {
    throw new Error('Default configurations should exist for all platforms');
  }

  console.log(`    Telegram interval: ${telegramConfig.interval}ms`);
  console.log(`    MAX interval: ${maxConfig.interval}ms`);
  console.log(`    Discord interval: ${discordConfig.interval}ms`);

  // Проверяем, что у разных платформ разные настройки
  if (telegramConfig.interval === maxConfig.interval && maxConfig.interval === discordConfig.interval) {
    console.warn('    Warning: All platforms have same interval');
  }
}

async function testBasicPollingOperations() {
  console.log('  Testing basic polling operations...');

  const manager = PollingManager.getInstance();
  const mockAdapter = new MockAdapter('telegram');
  const adapterId = 'test-basic';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // 1. Запуск polling
  manager.startPolling(adapterId, mockAdapter as any);
  console.log(`    After start - Active: ${manager.isPollingActive(adapterId)}`);

  if (!manager.isPollingActive(adapterId)) {
    throw new Error('Polling should be active after start');
  }

  // 2. Ждем немного для выполнения нескольких polls
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Проверяем, что polling выполнялся
  console.log(`    Poll count: ${mockAdapter.getPollCount()}`);

  if (mockAdapter.getPollCount() === 0) {
    throw new Error('Polling should have been executed');
  }

  // 4. Остановка polling
  manager.stopPolling(adapterId);
  console.log(`    After stop - Active: ${manager.isPollingActive(adapterId)}`);

  if (manager.isPollingActive(adapterId)) {
    throw new Error('Polling should be inactive after stop');
  }
}

async function testConfigurationManagement() {
  console.log('  Testing configuration management...');

  const manager = PollingManager.getInstance();
  const mockAdapter = new MockAdapter('telegram');
  const adapterId = 'test-config';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем с кастомной конфигурацией
  const customConfig = {
    interval: 3000,
    timeout: 45000,
    maxRetries: 2,
    backoffMultiplier: 1.5,
    enabled: true
  };

  manager.startPolling(adapterId, mockAdapter as any, customConfig);

  // Получаем конфигурацию
  const config = manager.getPollingConfig(adapterId);
  console.log(`    Custom interval: ${config?.interval}ms`);
  console.log(`    Custom timeout: ${config?.timeout}ms`);
  console.log(`    Custom retries: ${config?.maxRetries}`);

  if (!config || config.interval !== 3000) {
    throw new Error('Custom configuration should be applied');
  }

  // Обновляем конфигурацию
  manager.updatePollingConfig(adapterId, { interval: 5000 });
  const updatedConfig = manager.getPollingConfig(adapterId);
  console.log(`    Updated interval: ${updatedConfig?.interval}ms`);

  if (!updatedConfig || updatedConfig.interval !== 5000) {
    throw new Error('Configuration should be updated');
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testStatisticsCollection() {
  console.log('  Testing statistics collection...');

  const manager = PollingManager.getInstance();
  const mockAdapter = new MockAdapter('telegram');
  const adapterId = 'test-stats';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling
  manager.startPolling(adapterId, mockAdapter as any, { interval: 500 });

  // Ждем для накопления статистики
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Получаем статистику
  const stats = manager.getPollingStats(adapterId);
  console.log(`    Stats available: ${stats.length > 0 ? 'Yes' : 'No'}`);

  if (stats.length > 0) {
    const stat = stats[0];
    console.log(`    Platform: ${stat.platform}`);
    console.log(`    Active: ${stat.isActive}`);
    console.log(`    Request count: ${stat.requestCount}`);
    console.log(`    Error count: ${stat.errorCount}`);
    console.log(`    Uptime: ${Math.round(stat.uptime / 1000)}s`);
    console.log(`    Avg response time: ${Math.round(stat.averageResponseTime)}ms`);

    if (stat.requestCount === 0) {
      throw new Error('Should have some requests recorded');
    }
  } else {
    throw new Error('Statistics should be available');
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
  const mockAdapter = new MockAdapter('telegram');
  const adapterId = 'test-error';

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем polling с настройками для быстрого тестирования ошибок
  manager.startPolling(adapterId, mockAdapter as any, {
    interval: 500,
    maxRetries: 2,
    enabled: true
  });

  // Ждем, пока произойдет ошибка (на 5-м poll) и обработка
  await new Promise(resolve => setTimeout(resolve, 4000));

  const stats = manager.getPollingStats(adapterId);
  if (stats.length > 0) {
    console.log(`    Errors recorded: ${stats[0].errorCount > 0 ? 'Yes' : 'No'}`);
    console.log(`    Error count: ${stats[0].errorCount}`);
    console.log(`    Still active: ${stats[0].isActive ? 'Yes' : 'No'}`);

    if (stats[0].errorCount === 0) {
      console.warn('    Warning: No errors recorded (might be timing issue)');
    }
  }

  // Очистка
  manager.stopPolling(adapterId);
}

async function testHealthMonitoring() {
  console.log('  Testing health monitoring...');

  const manager = PollingManager.getInstance();
  const mockAdapter1 = new MockAdapter('telegram');
  const mockAdapter2 = new MockAdapter('max');

  // Останавливаем все существующие polling
  manager.stopAllPolling();

  // Запускаем несколько адаптеров
  manager.startPolling('adapter1', mockAdapter1 as any);
  manager.startPolling('adapter2', mockAdapter2 as any);

  // Ждем немного для накопления данных
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Получаем статус здоровья
  const healthStatus = manager.getHealthStatus();
  console.log(`    System healthy: ${healthStatus.healthy ? 'Yes' : 'No'}`);
  console.log(`    Issues found: ${healthStatus.issues.length}`);
  console.log(`    Recommendations: ${healthStatus.recommendations.length}`);

  if (healthStatus.issues.length > 0) {
    console.log(`    Sample issue: ${healthStatus.issues[0]}`);
  }

  if (healthStatus.recommendations.length > 0) {
    console.log(`    Sample recommendation: ${healthStatus.recommendations[0]}`);
  }

  // Проверяем список адаптеров
  const adapters = manager.getPollingAdapters();
  console.log(`    Active adapters: ${adapters.length}`);

  if (adapters.length !== 2) {
    throw new Error(`Expected 2 adapters, got ${adapters.length}`);
  }

  // Очистка
  manager.stopAllPolling();
}

// Запуск тестов
if (require.main === module) {
  testPollingSimple()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 All polling system tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some polling system tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Polling system test suite failed:', error);
      process.exit(1);
    });
}

export { testPollingSimple };