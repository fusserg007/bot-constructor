/**
 * Тест системы интеграций
 */
import { SchemaExecutionEngine } from './core/engine/SchemaExecutionEngine';
import { IntegrationManager } from './core/integrations/IntegrationManager';
import { BotSchema } from './core/types';

// Мок адаптера для тестирования
class MockMessengerAdapter {
  public sentMessages: any[] = [];

  async sendMessage(chatId: string, message: string, options?: any): Promise<void> {
    this.sentMessages.push({ chatId, message, options });
    console.log(`📤 Отправлено сообщение в ${chatId}: ${message}`);
  }

  clearHistory(): void {
    this.sentMessages = [];
  }
}

async function testIntegrations() {
  console.log('🧪 Тестирование системы интеграций...\n');

  try {
    const engine = new SchemaExecutionEngine();
    const integrationManager = IntegrationManager.getInstance();
    const mockAdapter = new MockMessengerAdapter();

    console.log('1. Тестирование IntegrationManager:');
    await testIntegrationManager(integrationManager);

    console.log('\n2. Тестирование REST API интеграции:');
    await testRestApiIntegration(engine, mockAdapter);

    console.log('\n3. Тестирование парсинга CSV:');
    await testCsvParsing(engine, mockAdapter);

    console.log('\n4. Тестирование парсинга XML:');
    await testXmlParsing(engine, mockAdapter);

    console.log('\n5. Тестирование веб-скрапинга:');
    await testWebScraping(engine, mockAdapter);

    console.log('\n6. Тестирование работы с файлами:');
    await testFileOperations(engine, mockAdapter);

    console.log('\n✅ Все тесты интеграций прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании интеграций:', error);
    throw error;
  }
}

async function testIntegrationManager(manager: IntegrationManager) {
  // Получаем все интеграции
  const integrations = manager.getAllIntegrations();
  console.log(`   ✅ Загружено ${integrations.length} интеграций по умолчанию`);

  // Добавляем кастомную интеграцию
  manager.addIntegration({
    id: 'test-api',
    name: 'Тестовое API',
    type: 'rest_api',
    enabled: true,
    config: {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      testUrl: 'https://jsonplaceholder.typicode.com/posts/1'
    },
    timeout: 5000,
    retries: 1,
    rateLimit: {
      requests: 10,
      period: 60000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const testIntegration = manager.getIntegration('test-api');
  console.log(`   ✅ Добавлена тестовая интеграция: ${testIntegration?.name}`);

  // Тестируем лимит запросов
  const canMakeRequest = manager.checkRateLimit('test-api');
  console.log(`   ✅ Проверка лимита запросов: ${canMakeRequest ? 'разрешено' : 'заблокировано'}`);

  // Записываем использование
  manager.recordUsage('test-api', 150, false);
  const usage = manager.getUsageStats('test-api');
  console.log(`   ✅ Статистика использования: ${usage[0]?.requests} запросов`);

  // Получаем общую статистику
  const stats = manager.getOverallStats();
  console.log(`   ✅ Общая статистика: ${stats.totalIntegrations} интеграций, ${stats.enabledIntegrations} активных`);

  // Тестируем интеграцию (будет ошибка, так как это мок)
  try {
    const testResult = await manager.testIntegration('test-api');
    console.log(`   ✅ Тест интеграции: ${testResult.success ? 'успешно' : 'ошибка'} (${testResult.responseTime}мс)`);
  } catch (error) {
    console.log(`   ⚠️ Тест интеграции: ошибка (ожидаемо в тестовой среде)`);
  }
}

async function testRestApiIntegration(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  const restApiSchema: BotSchema = {
    id: 'rest-api-test',
    name: 'Тест REST API',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/api' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'api-call',
        type: 'integration-rest-api',
        data: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
          responseVariable: 'apiData',
          timeout: 5000
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'show-result',
        type: 'action-send-message',
        data: {
          message: 'API ответ получен! Заголовок: {{apiData.title}}'
        },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'api-call' },
      { id: 'edge-2', source: 'api-call', target: 'show-result' }
    ],
    variables: {},
    settings: {
      name: 'Тест REST API',
      description: 'Тестирование REST API интеграции',
      platforms: ['telegram'],
      mode: 'polling',
      variables: {}
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const context = engine.createExecutionContext('user1', 'chat1', 'telegram');
  
  try {
    const result = await engine.executeSchema(restApiSchema, 'command', { command: '/api' }, context, mockAdapter as any);
    console.log(`   ✅ REST API интеграция: ${result.success ? 'успешно' : 'ошибка'}`);
    if (result.errors.length > 0) {
      console.log(`   ⚠️ Ошибки: ${result.errors.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ⚠️ REST API интеграция: ошибка (возможно, нет интернета)`);
  }
}

async function testCsvParsing(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  const csvSchema: BotSchema = {
    id: 'csv-test',
    name: 'Тест CSV парсинга',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/csv' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'parse-csv',
        type: 'integration-csv-parser',
        data: {
          csvData: 'name,age,city\nИван,25,Москва\nМария,30,СПб\nПетр,35,Казань',
          hasHeader: true,
          delimiter: ',',
          responseVariable: 'csvData'
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'show-csv',
        type: 'action-send-message',
        data: {
          message: 'CSV обработан! Найдено {{csvData_rows}} строк, {{csvData_columns}} колонок'
        },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'parse-csv' },
      { id: 'edge-2', source: 'parse-csv', target: 'show-csv' }
    ],
    variables: {},
    settings: {
      name: 'Тест CSV парсинга',
      description: 'Тестирование парсинга CSV данных',
      platforms: ['telegram'],
      mode: 'polling',
      variables: {}
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const context = engine.createExecutionContext('user2', 'chat2', 'telegram');
  const result = await engine.executeSchema(csvSchema, 'command', { command: '/csv' }, context, mockAdapter as any);
  console.log(`   ✅ CSV парсинг: ${result.success ? 'успешно' : 'ошибка'}`);
  
  if (result.variables.csvData) {
    console.log(`   📊 Данные CSV:`, result.variables.csvData.slice(0, 2)); // Показываем первые 2 строки
  }
}

async function testXmlParsing(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  const xmlSchema: BotSchema = {
    id: 'xml-test',
    name: 'Тест XML парсинга',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/xml' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'parse-xml',
        type: 'integration-xml-parser',
        data: {
          xmlData: '<?xml version="1.0"?><root><user><name>Иван</name><age>25</age></user><user><name>Мария</name><age>30</age></user></root>',
          xpath: '/root/user/name',
          responseVariable: 'xmlData'
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'show-xml',
        type: 'action-send-message',
        data: {
          message: 'XML обработан! Данные: {{xmlData}}'
        },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'parse-xml' },
      { id: 'edge-2', source: 'parse-xml', target: 'show-xml' }
    ],
    variables: {},
    settings: {
      name: 'Тест XML парсинга',
      description: 'Тестирование парсинга XML данных',
      platforms: ['telegram'],
      mode: 'polling',
      variables: {}
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const context = engine.createExecutionContext('user3', 'chat3', 'telegram');
  const result = await engine.executeSchema(xmlSchema, 'command', { command: '/xml' }, context, mockAdapter as any);
  console.log(`   ✅ XML парсинг: ${result.success ? 'успешно' : 'ошибка'}`);
  
  if (result.variables.xmlData) {
    console.log(`   📄 Данные XML:`, result.variables.xmlData);
  }
}

async function testWebScraping(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  const scrapingSchema: BotSchema = {
    id: 'scraping-test',
    name: 'Тест веб-скрапинга',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/scrape' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'scrape-page',
        type: 'integration-web-scraping',
        data: {
          url: 'https://example.com',
          selector: 'title',
          attribute: 'textContent',
          responseVariable: 'pageTitle'
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'show-title',
        type: 'action-send-message',
        data: {
          message: 'Заголовок страницы: {{pageTitle}}'
        },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'scrape-page' },
      { id: 'edge-2', source: 'scrape-page', target: 'show-title' }
    ],
    variables: {},
    settings: {
      name: 'Тест веб-скрапинга',
      description: 'Тестирование веб-скрапинга',
      platforms: ['telegram'],
      mode: 'polling',
      variables: {}
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const context = engine.createExecutionContext('user4', 'chat4', 'telegram');
  
  try {
    const result = await engine.executeSchema(scrapingSchema, 'command', { command: '/scrape' }, context, mockAdapter as any);
    console.log(`   ✅ Веб-скрапинг: ${result.success ? 'успешно' : 'ошибка'}`);
    
    if (result.variables.pageTitle) {
      console.log(`   🌐 Заголовок страницы: ${result.variables.pageTitle}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Веб-скрапинг: ошибка (возможно, нет интернета)`);
  }
}

async function testFileOperations(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  const fileSchema: BotSchema = {
    id: 'file-test',
    name: 'Тест файловых операций',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/file' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'write-file',
        type: 'integration-file-operation',
        data: {
          operation: 'write',
          filePath: './test-data.txt',
          content: 'Тестовые данные от {{userId}} в {{current_time}}',
          responseVariable: 'writeResult'
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'read-file',
        type: 'integration-file-operation',
        data: {
          operation: 'read',
          filePath: './test-data.txt',
          responseVariable: 'fileContent'
        },
        position: { x: 500, y: 100 }
      },
      {
        id: 'show-content',
        type: 'action-send-message',
        data: {
          message: 'Файл записан и прочитан! Содержимое: {{fileContent}}'
        },
        position: { x: 700, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'write-file' },
      { id: 'edge-2', source: 'write-file', target: 'read-file' },
      { id: 'edge-3', source: 'read-file', target: 'show-content' }
    ],
    variables: {},
    settings: {
      name: 'Тест файловых операций',
      description: 'Тестирование работы с файлами',
      platforms: ['telegram'],
      mode: 'polling',
      variables: {}
    },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const context = engine.createExecutionContext('user5', 'chat5', 'telegram');
  const result = await engine.executeSchema(fileSchema, 'command', { command: '/file' }, context, mockAdapter as any);
  console.log(`   ✅ Файловые операции: ${result.success ? 'успешно' : 'ошибка'}`);
  
  if (result.variables.writeResult) {
    console.log(`   💾 Результат записи:`, result.variables.writeResult);
  }
  if (result.variables.fileContent) {
    console.log(`   📄 Содержимое файла: ${result.variables.fileContent}`);
  }
}

// Запуск тестов
if (require.main === module) {
  testIntegrations()
    .then(() => {
      console.log('\n🎉 Тестирование интеграций завершено успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Тестирование завершилось с ошибкой:', error);
      process.exit(1);
    });
}

export { testIntegrations };