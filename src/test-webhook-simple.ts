/**
 * Простой тест системы Webhook
 * Проверяет основную функциональность WebhookManager
 */

import { WebhookManager } from './core/webhooks/WebhookManager';
import { WebhookRequest } from './core/types';

// Mock адаптер для тестирования
class MockWebhookAdapter {
  private platform: string;
  private webhookCount: number = 0;
  private shouldError: boolean = false;

  constructor(platform: string) {
    this.platform = platform;
  }

  getPlatform() {
    return this.platform as any;
  }

  getCapabilities() {
    return {
      supportsWebhooks: true,
      supportsPolling: false,
      supportsMedia: true,
      supportsInlineButtons: true,
      maxMessageLength: 4096,
      supportedMediaTypes: ['photo', 'video']
    };
  }

  async handleWebhook(request: WebhookRequest): Promise<void> {
    this.webhookCount++;
    console.log(`    ${this.platform} webhook #${this.webhookCount}`);
    
    // Симулируем обработку
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (this.shouldError) {
      throw new Error(`Mock webhook error for ${this.platform}`);
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    console.log(`    Setting webhook for ${this.platform}: ${url}`);
    return true;
  }

  async deleteWebhook(): Promise<boolean> {
    console.log(`    Deleting webhook for ${this.platform}`);
    return true;
  }

  getWebhookCount() {
    return this.webhookCount;
  }

  setShouldError(shouldError: boolean) {
    this.shouldError = shouldError;
  }
}

async function testWebhookSimple() {
  console.log('🧪 Testing Webhook System (Simple)...\n');

  const tests = [
    {
      name: 'Manager Singleton',
      test: testManagerSingleton
    },
    {
      name: 'Webhook Registration',
      test: testWebhookRegistration
    },
    {
      name: 'Configuration Management',
      test: testConfigurationManagement
    },
    {
      name: 'Direct Webhook Handling',
      test: testDirectWebhookHandling
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
    },
    {
      name: 'Webhook Setup and Removal',
      test: testWebhookSetupRemoval
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

  console.log(`\n📊 Webhook System Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function testManagerSingleton() {
  console.log('  Testing manager singleton pattern...');

  const manager1 = WebhookManager.getInstance();
  const manager2 = WebhookManager.getInstance();

  console.log(`    Same instance: ${manager1 === manager2 ? 'Yes' : 'No'}`);

  if (manager1 !== manager2) {
    throw new Error('WebhookManager should be a singleton');
  }
}

async function testWebhookRegistration() {
  console.log('  Testing webhook registration...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('telegram');

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем webhook
  const adapterId = 'test-telegram';
  manager.registerWebhook(adapterId, mockAdapter as any, {
    path: '/webhook/test/telegram',
    secret: 'test-secret',
    validateSignature: true
  });

  console.log(`    Webhook registered: Yes`);

  // Проверяем конфигурацию
  const config = manager.getWebhookConfig(adapterId);
  console.log(`    Config exists: ${config ? 'Yes' : 'No'}`);
  console.log(`    Path: ${config?.path}`);
  console.log(`    Has secret: ${config?.secret ? 'Yes' : 'No'}`);
  console.log(`    Validates signature: ${config?.validateSignature}`);

  if (!config) {
    throw new Error('Webhook configuration should exist');
  }

  if (config.path !== '/webhook/test/telegram') {
    throw new Error(`Expected path '/webhook/test/telegram', got '${config.path}'`);
  }

  // Проверяем список зарегистрированных webhook'ов
  const registered = manager.getRegisteredWebhooks();
  console.log(`    Registered webhooks: ${registered.length}`);

  if (registered.length !== 1) {
    throw new Error(`Expected 1 registered webhook, got ${registered.length}`);
  }
}

async function testConfigurationManagement() {
  console.log('  Testing configuration management...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('max');
  const adapterId = 'test-config';

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем с кастомной конфигурацией
  manager.registerWebhook(adapterId, mockAdapter as any, {
    maxBodySize: 2048,
    timeout: 15000,
    validateSignature: false
  });

  // Получаем конфигурацию
  const config = manager.getWebhookConfig(adapterId);
  console.log(`    Max body size: ${config?.maxBodySize} bytes`);
  console.log(`    Timeout: ${config?.timeout}ms`);
  console.log(`    Validate signature: ${config?.validateSignature}`);

  if (!config || config.maxBodySize !== 2048) {
    throw new Error('Custom configuration should be applied');
  }

  // Обновляем конфигурацию
  manager.updateWebhookConfig(adapterId, { timeout: 20000 });
  const updatedConfig = manager.getWebhookConfig(adapterId);
  console.log(`    Updated timeout: ${updatedConfig?.timeout}ms`);

  if (!updatedConfig || updatedConfig.timeout !== 20000) {
    throw new Error('Configuration should be updated');
  }
}

async function testDirectWebhookHandling() {
  console.log('  Testing direct webhook handling...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('telegram');
  const adapterId = 'test-direct';

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем webhook
  manager.registerWebhook(adapterId, mockAdapter as any, {});

  // Создаем mock webhook request
  const webhookRequest: WebhookRequest = {
    platform: 'telegram',
    body: {
      update_id: 123,
      message: {
        message_id: 456,
        from: { id: 789, first_name: 'Test' },
        chat: { id: 789, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Test webhook message'
      }
    },
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'test-secret'
    }
  };

  // Обрабатываем webhook напрямую
  await manager.handleWebhook(adapterId, webhookRequest);

  console.log(`    Webhook processed: Yes`);
  console.log(`    Adapter webhook count: ${mockAdapter.getWebhookCount()}`);

  if (mockAdapter.getWebhookCount() !== 1) {
    throw new Error('Webhook should have been processed once');
  }
}

async function testStatisticsCollection() {
  console.log('  Testing statistics collection...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('telegram');
  const adapterId = 'test-stats';

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем webhook
  manager.registerWebhook(adapterId, mockAdapter as any, {});

  // Обрабатываем несколько webhook'ов
  const webhookRequest: WebhookRequest = {
    platform: 'telegram',
    body: { test: 'data' },
    headers: {}
  };

  for (let i = 0; i < 3; i++) {
    await manager.handleWebhook(adapterId, webhookRequest);
  }

  // Получаем статистику
  const stats = manager.getWebhookStats(adapterId);
  console.log(`    Stats available: ${stats.length > 0 ? 'Yes' : 'No'}`);

  if (stats.length > 0) {
    const stat = stats[0];
    console.log(`    Platform: ${stat.platform}`);
    console.log(`    Request count: ${stat.requestCount}`);
    console.log(`    Error count: ${stat.errorCount}`);
    console.log(`    Active: ${stat.isActive}`);
    console.log(`    Avg processing time: ${Math.round(stat.averageProcessingTime)}ms`);

    if (stat.requestCount !== 3) {
      throw new Error(`Expected 3 requests, got ${stat.requestCount}`);
    }
  } else {
    throw new Error('Statistics should be available');
  }

  // Общая статистика
  const overallStats = manager.getOverallStats();
  console.log(`    Total webhooks: ${overallStats.totalWebhooks}`);
  console.log(`    Total requests: ${overallStats.totalRequests}`);

  if (overallStats.totalRequests !== 3) {
    throw new Error(`Expected 3 total requests, got ${overallStats.totalRequests}`);
  }
}

async function testErrorHandling() {
  console.log('  Testing error handling...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('telegram');
  const adapterId = 'test-error';

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем webhook
  manager.registerWebhook(adapterId, mockAdapter as any, {});

  // Настраиваем адаптер на генерацию ошибок
  mockAdapter.setShouldError(true);

  const webhookRequest: WebhookRequest = {
    platform: 'telegram',
    body: { test: 'error' },
    headers: {}
  };

  // Пытаемся обработать webhook с ошибкой
  try {
    await manager.handleWebhook(adapterId, webhookRequest);
    throw new Error('Should have thrown an error');
  } catch (error) {
    console.log(`    Error caught: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Проверяем статистику ошибок
  const stats = manager.getWebhookStats(adapterId);
  if (stats.length > 0) {
    console.log(`    Error count: ${stats[0].errorCount}`);
    
    if (stats[0].errorCount !== 1) {
      throw new Error(`Expected 1 error, got ${stats[0].errorCount}`);
    }
  }

  // Возвращаем нормальную работу
  mockAdapter.setShouldError(false);
}

async function testHealthMonitoring() {
  console.log('  Testing health monitoring...');

  const manager = WebhookManager.getInstance();
  const mockAdapter1 = new MockWebhookAdapter('telegram');
  const mockAdapter2 = new MockWebhookAdapter('max');

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Регистрируем несколько webhook'ов
  manager.registerWebhook('adapter1', mockAdapter1 as any, {});
  manager.registerWebhook('adapter2', mockAdapter2 as any, {});

  // Получаем статус системы
  const status = manager.getStatus();
  console.log(`    System running: ${status.isRunning}`);
  console.log(`    Active adapters: ${status.adapters.length}`);

  if (!status.isRunning) {
    throw new Error('System should be running');
  }

  if (status.adapters.length !== 2) {
    throw new Error(`Expected 2 adapters, got ${status.adapters.length}`);
  }

  // Получаем статус здоровья
  const healthStatus = manager.getHealthStatus();
  console.log(`    System healthy: ${healthStatus.healthy}`);
  console.log(`    Issues: ${healthStatus.issues.length}`);
  console.log(`    Recommendations: ${healthStatus.recommendations.length}`);

  // Деактивируем один webhook
  manager.setWebhookActive('adapter1', false);

  const updatedHealthStatus = manager.getHealthStatus();
  console.log(`    After deactivation - Healthy: ${updatedHealthStatus.healthy}`);
  console.log(`    Issues after deactivation: ${updatedHealthStatus.issues.length}`);
}

async function testWebhookSetupRemoval() {
  console.log('  Testing webhook setup and removal...');

  const manager = WebhookManager.getInstance();
  const mockAdapter = new MockWebhookAdapter('telegram');
  const adapterId = 'test-setup';

  // Очищаем предыдущие webhook'и
  await manager.dispose();

  // Автоматическая настройка webhook'а
  const setupSuccess = await manager.setupWebhookForAdapter(
    adapterId,
    mockAdapter as any,
    'https://example.com',
    { secret: 'test-secret' }
  );

  console.log(`    Setup success: ${setupSuccess}`);

  if (!setupSuccess) {
    throw new Error('Webhook setup should succeed');
  }

  // Проверяем, что webhook зарегистрирован
  const config = manager.getWebhookConfig(adapterId);
  console.log(`    Webhook registered after setup: ${config ? 'Yes' : 'No'}`);

  if (!config) {
    throw new Error('Webhook should be registered after setup');
  }

  // Получаем детальную информацию
  const details = manager.getWebhookDetails(adapterId);
  console.log(`    Details available: ${details ? 'Yes' : 'No'}`);
  console.log(`    Config path: ${details?.config.path}`);

  if (!details) {
    throw new Error('Webhook details should be available');
  }

  // Удаляем webhook
  const removeSuccess = await manager.removeWebhookForAdapter(adapterId);
  console.log(`    Remove success: ${removeSuccess}`);

  if (!removeSuccess) {
    throw new Error('Webhook removal should succeed');
  }

  // Проверяем, что webhook удален
  const configAfterRemoval = manager.getWebhookConfig(adapterId);
  console.log(`    Webhook exists after removal: ${configAfterRemoval ? 'Yes' : 'No'}`);

  if (configAfterRemoval) {
    throw new Error('Webhook should be removed');
  }
}

// Запуск тестов
if (require.main === module) {
  testWebhookSimple()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 All webhook system tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some webhook system tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Webhook system test suite failed:', error);
      process.exit(1);
    });
}

export { testWebhookSimple };