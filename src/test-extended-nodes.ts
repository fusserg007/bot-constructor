/**
 * Тест расширенных типов узлов Schema Engine
 */

import { SchemaEngine, SchemaExecutionContext } from './core/engine/SchemaEngine';
import { MessengerPlatform } from './core/types';

console.log('🔧 Тестирование расширенных типов узлов...\n');

// Простые типы для тестирования
interface TestNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

interface TestEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

async function createTestContext(): Promise<SchemaExecutionContext> {
  const mockAdapter = {
    sendMessage: async (chatId: string, message: any) => {
      console.log(`📤 Отправка сообщения в ${chatId}:`, message.text);
      return { messageId: 'test-message-id' };
    },
    sendMedia: async (chatId: string, media: any) => {
      console.log(`📸 Отправка медиа в ${chatId}:`, media.type, media.url);
      return { messageId: 'test-media-id' };
    }
  } as any;

  return {
    userId: 'test-user-123',
    chatId: 'test-chat-456',
    platform: 'telegram' as MessengerPlatform,
    message: {
      text: 'Тестовое сообщение',
      messageId: 'msg-123',
      timestamp: Date.now(),
      user: {
        id: 'test-user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User'
      }
    },
    variables: {
      userName: 'Test User',
      userRole: 'admin'
    },
    sessionData: {
      counter_default: 5,
      array_items: ['item1', 'item2']
    },
    adapter: mockAdapter
  };
}

async function testNewTriggers() {
  console.log('🎯 Тестирование новых триггеров...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест trigger-schedule
    const scheduleNodes: TestNode[] = [
      {
        id: 'trigger-schedule',
        type: 'trigger-schedule',
        data: {
          scheduleTime: new Date(Date.now() - 1000).toISOString() // 1 секунду назад
        },
        position: { x: 0, y: 0 }
      },
      {
        id: 'action-scheduled',
        type: 'action-send-message',
        data: {
          message: 'Запланированное сообщение отправлено!'
        },
        position: { x: 200, y: 0 }
      }
    ];

    const scheduleEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-schedule', target: 'action-scheduled' }
    ];

    const result = await engine.executeSchema(scheduleNodes, scheduleEdges, context);
    console.log('✅ Тест trigger-schedule:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте триггеров:', error);
    return false;
  }
}

async function testNewActions() {
  console.log('🎬 Тестирование новых действий...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест action-delay и action-send-audio
    const actionNodes: TestNode[] = [
      {
        id: 'trigger-start',
        type: 'trigger-command',
        data: { command: '/test' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'action-delay',
        type: 'action-delay',
        data: { delay: '100' }, // 100ms
        position: { x: 200, y: 0 }
      },
      {
        id: 'action-audio',
        type: 'action-send-audio',
        data: {
          audioUrl: 'https://example.com/audio.mp3',
          caption: 'Тестовое аудио'
        },
        position: { x: 400, y: 0 }
      }
    ];

    const actionEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-start', target: 'action-delay' },
      { id: 'edge-2', source: 'action-delay', target: 'action-audio' }
    ];

    const testContext = {
      ...context,
      message: { ...context.message!, text: '/test' }
    };

    const result = await engine.executeSchema(actionNodes, actionEdges, testContext);
    console.log('✅ Тест новых действий:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте действий:', error);
    return false;
  }
}

async function testNewConditions() {
  console.log('🔀 Тестирование новых условий...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест condition-counter и condition-random
    const conditionNodes: TestNode[] = [
      {
        id: 'trigger-msg',
        type: 'trigger-message',
        data: {},
        position: { x: 0, y: 0 }
      },
      {
        id: 'condition-counter',
        type: 'condition-counter',
        data: {
          counterName: 'default',
          operator: 'greater',
          value: '3'
        },
        position: { x: 200, y: 0 }
      },
      {
        id: 'action-counter-high',
        type: 'action-send-message',
        data: { message: 'Счетчик больше 3!' },
        position: { x: 400, y: -50 }
      },
      {
        id: 'action-counter-low',
        type: 'action-send-message',
        data: { message: 'Счетчик меньше или равен 3' },
        position: { x: 400, y: 50 }
      }
    ];

    const conditionEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-msg', target: 'condition-counter' },
      { id: 'edge-true', source: 'condition-counter', target: 'action-counter-high', sourceHandle: 'true' },
      { id: 'edge-false', source: 'condition-counter', target: 'action-counter-low', sourceHandle: 'false' }
    ];

    const result = await engine.executeSchema(conditionNodes, conditionEdges, context);
    console.log('✅ Тест новых условий:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте условий:', error);
    return false;
  }
}

async function testNewDataNodes() {
  console.log('💾 Тестирование новых узлов данных...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест data-counter-increment и data-array-add
    const dataNodes: TestNode[] = [
      {
        id: 'trigger-start',
        type: 'trigger-command',
        data: { command: '/count' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'data-increment',
        type: 'data-counter-increment',
        data: {
          counterName: 'test_counter',
          amount: '2'
        },
        position: { x: 200, y: 0 }
      },
      {
        id: 'data-array',
        type: 'data-array-add',
        data: {
          arrayName: 'test_array',
          item: 'новый элемент'
        },
        position: { x: 400, y: 0 }
      },
      {
        id: 'data-timestamp',
        type: 'data-timestamp',
        data: { format: 'readable' },
        position: { x: 600, y: 0 }
      },
      {
        id: 'action-result',
        type: 'action-send-message',
        data: { message: 'Операции с данными выполнены!' },
        position: { x: 800, y: 0 }
      }
    ];

    const dataEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-start', target: 'data-increment' },
      { id: 'edge-2', source: 'data-increment', target: 'data-array' },
      { id: 'edge-3', source: 'data-array', target: 'data-timestamp' },
      { id: 'edge-4', source: 'data-timestamp', target: 'action-result' }
    ];

    const testContext = {
      ...context,
      message: { ...context.message!, text: '/count' }
    };

    const result = await engine.executeSchema(dataNodes, dataEdges, testContext);
    console.log('✅ Тест новых узлов данных:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
    console.log('📊 Финальные данные сессии:', result.finalSessionData);

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте узлов данных:', error);
    return false;
  }
}

async function testNewIntegrations() {
  console.log('🔗 Тестирование новых интеграций...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест integration-json-parse
    const integrationNodes: TestNode[] = [
      {
        id: 'trigger-start',
        type: 'trigger-command',
        data: { command: '/parse' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'integration-json',
        type: 'integration-json-parse',
        data: {
          jsonString: '{"name": "Test", "age": 25, "active": true}'
        },
        position: { x: 200, y: 0 }
      },
      {
        id: 'integration-csv',
        type: 'integration-csv-parse',
        data: {
          csvString: 'name,age,city\\nИван,30,Москва\\nМария,25,СПб',
          delimiter: ','
        },
        position: { x: 400, y: 0 }
      },
      {
        id: 'action-result',
        type: 'action-send-message',
        data: { message: 'Парсинг данных завершен!' },
        position: { x: 600, y: 0 }
      }
    ];

    const integrationEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-start', target: 'integration-json' },
      { id: 'edge-2', source: 'integration-json', target: 'integration-csv' },
      { id: 'edge-3', source: 'integration-csv', target: 'action-result' }
    ];

    const testContext = {
      ...context,
      message: { ...context.message!, text: '/parse' }
    };

    const result = await engine.executeSchema(integrationNodes, integrationEdges, testContext);
    console.log('✅ Тест новых интеграций:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте интеграций:', error);
    return false;
  }
}

async function testNewScenarios() {
  console.log('🎭 Тестирование новых сценариев...');

  const engine = new SchemaEngine();
  const context = await createTestContext();

  try {
    // Тест scenario-faq
    const scenarioNodes: TestNode[] = [
      {
        id: 'trigger-start',
        type: 'trigger-message',
        data: {},
        position: { x: 0, y: 0 }
      },
      {
        id: 'scenario-faq',
        type: 'scenario-faq',
        data: {
          faqAnswers: {
            'как дела': 'У меня все отлично, спасибо!',
            'что умеешь': 'Я умею отвечать на вопросы и помогать пользователям.',
            'помощь': 'Задайте мне любой вопрос, и я постараюсь помочь!'
          }
        },
        position: { x: 200, y: 0 }
      }
    ];

    const scenarioEdges: TestEdge[] = [
      { id: 'edge-1', source: 'trigger-start', target: 'scenario-faq' }
    ];

    const testContext = {
      ...context,
      message: { ...context.message!, text: 'как дела?' }
    };

    const result = await engine.executeSchema(scenarioNodes, scenarioEdges, testContext);
    console.log('✅ Тест новых сценариев:', result.success ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

    return result.success;
  } catch (error) {
    console.error('❌ Ошибка в тесте сценариев:', error);
    return false;
  }
}

// Запуск всех тестов
async function runAllExtendedTests() {
  console.log('🚀 Запуск всех тестов расширенных узлов...\n');

  const results = {
    triggers: await testNewTriggers(),
    actions: await testNewActions(),
    conditions: await testNewConditions(),
    data: await testNewDataNodes(),
    integrations: await testNewIntegrations(),
    scenarios: await testNewScenarios()
  };

  console.log('\n📊 Итоговые результаты тестирования расширенных узлов:');
  console.log('✅ Новые триггеры:', results.triggers ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Новые действия:', results.actions ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Новые условия:', results.conditions ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Новые узлы данных:', results.data ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Новые интеграции:', results.integrations ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Новые сценарии:', results.scenarios ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 Все тесты расширенных узлов успешно пройдены!');
    console.log('\n📋 Новые возможности Schema Engine:');
    
    console.log('\n🎯 Новые триггеры:');
    console.log('  • trigger-inline-query - обработка inline запросов');
    console.log('  • trigger-join-group - присоединение к группе');
    console.log('  • trigger-leave-group - покидание группы');
    console.log('  • trigger-schedule - запланированные события');
    
    console.log('\n🎬 Новые действия:');
    console.log('  • action-send-audio - отправка аудио');
    console.log('  • action-send-document - отправка документов');
    console.log('  • action-send-keyboard - отправка клавиатур');
    console.log('  • action-delay - задержка выполнения');
    console.log('  • action-forward-message - пересылка сообщений');
    console.log('  • action-ban-user / action-mute-user - модерация');
    
    console.log('\n🔀 Новые условия:');
    console.log('  • condition-time-range - проверка времени');
    console.log('  • condition-user-in-list - проверка пользователя в списке');
    console.log('  • condition-message-length - проверка длины сообщения');
    console.log('  • condition-regex-match - проверка регулярными выражениями');
    console.log('  • condition-counter - проверка счетчиков');
    console.log('  • condition-random - случайные условия');
    
    console.log('\n💾 Новые узлы данных:');
    console.log('  • data-counter-* - работа со счетчиками');
    console.log('  • data-array-* - работа с массивами');
    console.log('  • data-random-choice - случайный выбор');
    console.log('  • data-timestamp - работа с временными метками');
    
    console.log('\n🔗 Новые интеграции:');
    console.log('  • integration-webhook - регистрация webhook\'ов');
    console.log('  • integration-database - работа с БД');
    console.log('  • integration-email - отправка email');
    console.log('  • integration-json-parse - парсинг JSON');
    console.log('  • integration-csv-parse - парсинг CSV');
    
    console.log('\n🎭 Новые сценарии:');
    console.log('  • scenario-faq - система FAQ');
    console.log('  • scenario-survey - проведение опросов');
    console.log('  • scenario-quiz - создание квизов');
    console.log('  • scenario-booking - система бронирования');
    console.log('  • scenario-moderation - автоматическая модерация');
    
  } else {
    console.log('\n❌ Некоторые тесты не пройдены. Требуется доработка.');
  }

  return allPassed;
}

// Запуск тестов
runAllExtendedTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Критическая ошибка при запуске тестов:', error);
  process.exit(1);
});