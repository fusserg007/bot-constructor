/**
 * Тест Schema Engine - движка выполнения схем
 */

import { SchemaEngine, SchemaExecutionContext } from './core/engine/SchemaEngine';
import { MessengerPlatform } from './core/types';

// Простые типы для тестирования (без зависимости от reactflow)
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

console.log('⚙️ Тестирование Schema Engine...\n');

async function testSchemaEngine() {
  try {
    console.log('📋 Создание Schema Engine...');
    const engine = new SchemaEngine();
    console.log('✅ Schema Engine создан');

    // Создаем тестовый контекст
    const mockAdapter = {
      sendMessage: async (chatId: string, message: any) => {
        console.log(`📤 Отправка сообщения в ${chatId}:`, message.text);
        return { messageId: 'test-message-id' };
      },
      editMessage: async (chatId: string, messageId: string, message: any) => {
        console.log(`✏️ Редактирование сообщения ${messageId} в ${chatId}:`, message.text);
        return true;
      },
      deleteMessage: async (chatId: string, messageId: string) => {
        console.log(`🗑️ Удаление сообщения ${messageId} в ${chatId}`);
        return true;
      }
    } as any;

    const context: SchemaExecutionContext = {
      userId: 'test-user-123',
      chatId: 'test-chat-456',
      platform: 'telegram' as MessengerPlatform,
      message: {
        text: '/start',
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
        userName: 'Test User'
      },
      sessionData: {},
      adapter: mockAdapter
    };

    console.log('✅ Контекст выполнения создан');

    return { engine, context };

  } catch (error) {
    console.error('❌ Ошибка при создании Schema Engine:', error);
    return null;
  }
}

async function testSimpleSchema() {
  console.log('\n🔄 Тестирование простой схемы...');

  const result = await testSchemaEngine();
  if (!result) return false;

  const { engine, context } = result;

  try {
    // Создаем простую схему: триггер команды -> отправка сообщения
    const nodes: TestNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger-command',
        data: {
          label: 'Команда /start',
          command: '/start'
        },
        position: { x: 0, y: 0 }
      },
      {
        id: 'action-1',
        type: 'action-send-message',
        data: {
          label: 'Приветствие',
          message: 'Привет, {{userName}}! Добро пожаловать в бота.'
        },
        position: { x: 200, y: 0 }
      }
    ];

    const edges: TestEdge[] = [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1'
      }
    ];

    console.log('📋 Выполнение простой схемы...');
    const result = await engine.executeSchema(nodes, edges, context);

    console.log('✅ Результат выполнения:');
    console.log('  - Успешно:', result.success);
    console.log('  - Выполненные узлы:', result.executedNodes);
    console.log('  - Время выполнения:', result.executionTime, 'мс');
    console.log('  - Ошибки:', result.errors.length);

    if (result.errors.length > 0) {
      console.log('  - Детали ошибок:', result.errors);
    }

    return result.success && result.executedNodes.length === 2;

  } catch (error) {
    console.error('❌ Ошибка при тестировании простой схемы:', error);
    return false;
  }
}

async function testConditionalSchema() {
  console.log('\n🔀 Тестирование схемы с условиями...');

  const result = await testSchemaEngine();
  if (!result) return false;

  const { engine, context } = result;

  try {
    // Создаем схему с условием: триггер -> условие -> два разных действия
    const nodes: TestNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger-message',
        data: {
          label: 'Любое сообщение'
        },
        position: { x: 0, y: 0 }
      },
      {
        id: 'condition-1',
        type: 'condition-text-contains',
        data: {
          label: 'Проверка на "привет"',
          pattern: 'привет'
        },
        position: { x: 200, y: 0 }
      },
      {
        id: 'action-true',
        type: 'action-send-message',
        data: {
          label: 'Ответ на приветствие',
          message: 'Привет! Как дела?'
        },
        position: { x: 400, y: -50 }
      },
      {
        id: 'action-false',
        type: 'action-send-message',
        data: {
          label: 'Обычный ответ',
          message: 'Я не понял, что вы имеете в виду.'
        },
        position: { x: 400, y: 50 }
      }
    ];

    const edges: TestEdge[] = [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'condition-1'
      },
      {
        id: 'edge-true',
        source: 'condition-1',
        target: 'action-true',
        sourceHandle: 'true'
      },
      {
        id: 'edge-false',
        source: 'condition-1',
        target: 'action-false',
        sourceHandle: 'false'
      }
    ];

    // Тестируем с сообщением, содержащим "привет"
    const contextWithGreeting = {
      ...context,
      message: {
        ...context.message!,
        text: 'Привет, бот!'
      }
    };

    console.log('📋 Выполнение схемы с условием (true ветка)...');
    const resultTrue = await engine.executeSchema(nodes, edges, contextWithGreeting);

    console.log('✅ Результат выполнения (true):');
    console.log('  - Успешно:', resultTrue.success);
    console.log('  - Выполненные узлы:', resultTrue.executedNodes);
    console.log('  - Время выполнения:', resultTrue.executionTime, 'мс');

    // Тестируем с обычным сообщением
    const contextWithoutGreeting = {
      ...context,
      message: {
        ...context.message!,
        text: 'Какая погода?'
      }
    };

    console.log('\\n📋 Выполнение схемы с условием (false ветка)...');
    const resultFalse = await engine.executeSchema(nodes, edges, contextWithoutGreeting);

    console.log('✅ Результат выполнения (false):');
    console.log('  - Успешно:', resultFalse.success);
    console.log('  - Выполненные узлы:', resultFalse.executedNodes);
    console.log('  - Время выполнения:', resultFalse.executionTime, 'мс');

    return resultTrue.success && resultFalse.success && 
           resultTrue.executedNodes.includes('action-true') &&
           resultFalse.executedNodes.includes('action-false');

  } catch (error) {
    console.error('❌ Ошибка при тестировании условной схемы:', error);
    return false;
  }
}

async function testDataOperations() {
  console.log('\\n💾 Тестирование операций с данными...');

  const result = await testSchemaEngine();
  if (!result) return false;

  const { engine, context } = result;

  try {
    // Создаем схему с операциями данных
    const nodes: TestNode[] = [
      {
        id: 'trigger-1',
        type: 'trigger-command',
        data: {
          label: 'Команда /save',
          command: '/save'
        },
        position: { x: 0, y: 0 }
      },
      {
        id: 'data-save',
        type: 'data-variable-set',
        data: {
          label: 'Сохранить имя',
          variableName: 'savedName',
          variableValue: '{{userName}}'
        },
        position: { x: 200, y: 0 }
      },
      {
        id: 'data-load',
        type: 'data-variable-get',
        data: {
          label: 'Загрузить имя',
          variableName: 'savedName'
        },
        position: { x: 400, y: 0 }
      },
      {
        id: 'action-1',
        type: 'action-send-message',
        data: {
          label: 'Показать сохраненное',
          message: 'Сохраненное имя: {{savedName}}'
        },
        position: { x: 600, y: 0 }
      }
    ];

    const edges: TestEdge[] = [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'data-save'
      },
      {
        id: 'edge-2',
        source: 'data-save',
        target: 'data-load'
      },
      {
        id: 'edge-3',
        source: 'data-load',
        target: 'action-1'
      }
    ];

    const contextWithSave = {
      ...context,
      message: {
        ...context.message!,
        text: '/save'
      }
    };

    console.log('📋 Выполнение схемы с операциями данных...');
    const result = await engine.executeSchema(nodes, edges, contextWithSave);

    console.log('✅ Результат выполнения:');
    console.log('  - Успешно:', result.success);
    console.log('  - Выполненные узлы:', result.executedNodes);
    console.log('  - Финальные переменные:', result.finalVariables);
    console.log('  - Время выполнения:', result.executionTime, 'мс');

    return result.success && result.executedNodes.length === 4;

  } catch (error) {
    console.error('❌ Ошибка при тестировании операций с данными:', error);
    return false;
  }
}

async function testEngineStats() {
  console.log('\\n📊 Тестирование статистики движка...');

  const result = await testSchemaEngine();
  if (!result) return false;

  const { engine } = result;

  try {
    console.log('📋 Получение статистики выполнения...');
    const stats = engine.getExecutionStats();

    console.log('✅ Статистика движка:');
    console.log('  - Всего выполнений:', stats.totalExecutions);
    console.log('  - Успешных выполнений:', stats.successfulExecutions);
    console.log('  - Неудачных выполнений:', stats.failedExecutions);
    console.log('  - Среднее время выполнения:', stats.averageExecutionTime.toFixed(2), 'мс');
    console.log('  - Активных выполнений:', stats.activeExecutions);

    console.log('\\n📋 Получение истории выполнения...');
    const history = engine.getExecutionHistory();
    console.log('✅ История выполнения:', history.length, 'записей');

    console.log('\\n📋 Получение активных выполнений...');
    const activeExecutions = engine.getActiveExecutions();
    console.log('✅ Активные выполнения:', activeExecutions);

    return true;

  } catch (error) {
    console.error('❌ Ошибка при тестировании статистики:', error);
    return false;
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 Запуск всех тестов Schema Engine...\\n');

  const results = {
    engine: await testSchemaEngine() !== null,
    simple: await testSimpleSchema(),
    conditional: await testConditionalSchema(),
    data: await testDataOperations(),
    stats: await testEngineStats()
  };

  console.log('\\n📊 Итоговые результаты тестирования:');
  console.log('✅ Создание движка:', results.engine ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Простая схема:', results.simple ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Условная схема:', results.conditional ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Операции с данными:', results.data ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');
  console.log('✅ Статистика движка:', results.stats ? 'ПРОЙДЕН' : 'ПРОВАЛЕН');

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\\n🎉 Все тесты Schema Engine успешно пройдены!');
    console.log('\\n📋 Возможности Schema Engine:');
    console.log('  ⚙️ Интерпретация визуальных схем React Flow');
    console.log('  🔄 Выполнение всех типов узлов (триггеры, действия, условия, данные, интеграции, сценарии)');
    console.log('  🔀 Поддержка условной логики с true/false ветвлением');
    console.log('  💾 Операции с переменными и данными сессии');
    console.log('  🔗 Интеграция с внешними API через HTTP');
    console.log('  📝 Система шаблонов с подстановкой переменных');
    console.log('  🛡️ Защита от бесконечных циклов');
    console.log('  📊 Статистика и история выполнения');
    console.log('  🚫 Контроль активных выполнений');
    console.log('  ⚡ Асинхронное выполнение с изоляцией ошибок');
  } else {
    console.log('\\n❌ Некоторые тесты не пройдены. Требуется доработка.');
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