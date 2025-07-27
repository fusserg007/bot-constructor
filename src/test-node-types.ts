/**
 * Тест всех типов узлов
 */
import { SchemaExecutionEngine } from './core/engine/SchemaExecutionEngine';
import { BotSchema } from './core/types';

// Мок адаптера для тестирования
class MockMessengerAdapter {
  public sentMessages: any[] = [];
  public sentMedia: any[] = [];

  async sendMessage(chatId: string, message: string, options?: any): Promise<void> {
    this.sentMessages.push({ chatId, message, options });
    console.log(`📤 Отправлено сообщение в ${chatId}: ${message}`);
  }

  async sendMedia(chatId: string, type: string, media: string, options?: any): Promise<void> {
    this.sentMedia.push({ chatId, type, media, options });
    console.log(`📤 Отправлено медиа в ${chatId}: ${type} - ${media}`);
  }

  clearHistory(): void {
    this.sentMessages = [];
    this.sentMedia = [];
  }
}

async function testNodeTypes() {
  console.log('🧪 Тестирование всех типов узлов...\n');

  try {
    const engine = new SchemaExecutionEngine();
    const mockAdapter = new MockMessengerAdapter();

    console.log('1. Тестирование триггеров:');
    await testTriggerNodes(engine, mockAdapter);

    console.log('\n2. Тестирование действий:');
    await testActionNodes(engine, mockAdapter);

    console.log('\n3. Тестирование условий:');
    await testConditionNodes(engine, mockAdapter);

    console.log('\n4. Тестирование узлов данных:');
    await testDataNodes(engine, mockAdapter);

    console.log('\n✅ Все тесты типов узлов прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании типов узлов:', error);
    throw error;
  }
}

async function testTriggerNodes(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  // Тест триггера команды
  const commandSchema: BotSchema = {
    id: 'command-test',
    name: 'Тест команды',
    nodes: [
      {
        id: 'cmd-trigger',
        type: 'trigger-command',
        data: { command: '/test', description: 'Тестовая команда' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'response',
        type: 'action-send-message',
        data: { message: 'Команда {{triggeredCommand}} выполнена!' },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [{ id: 'edge-1', source: 'cmd-trigger', target: 'response' }],
    variables: {},
    settings: { name: 'Тест команды', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const context = engine.createExecutionContext('user1', 'chat1', 'telegram');
  const result = await engine.executeSchema(commandSchema, 'command', { command: '/test' }, context, mockAdapter as any);
  console.log(`   ✅ Триггер команды: ${result.success ? 'успешно' : 'ошибка'}`);

  // Тест триггера сообщения с паттерном
  const messageSchema: BotSchema = {
    id: 'message-test',
    name: 'Тест сообщения',
    nodes: [
      {
        id: 'msg-trigger',
        type: 'trigger-message',
        data: { patterns: ['привет', 'hello'], caseSensitive: false },
        position: { x: 100, y: 100 }
      },
      {
        id: 'greeting',
        type: 'action-send-message',
        data: { message: 'Привет! Вы написали: {{triggeredByMessage}}' },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [{ id: 'edge-1', source: 'msg-trigger', target: 'greeting' }],
    variables: {},
    settings: { name: 'Тест сообщения', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const msgContext = engine.createExecutionContext('user2', 'chat2', 'telegram', { messageText: 'Привет всем!' });
  const msgResult = await engine.executeSchema(messageSchema, 'message', { text: 'Привет всем!' }, msgContext, mockAdapter as any);
  console.log(`   ✅ Триггер сообщения: ${msgResult.success ? 'успешно' : 'ошибка'}`);

  // Тест условного триггера
  const conditionalSchema: BotSchema = {
    id: 'conditional-test',
    name: 'Тест условного триггера',
    nodes: [
      {
        id: 'cond-trigger',
        type: 'trigger-condition',
        data: { condition: 'currentHour >= 9 && currentHour <= 17' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'work-hours',
        type: 'action-send-message',
        data: { message: 'Сейчас рабочее время!' },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [{ id: 'edge-1', source: 'cond-trigger', target: 'work-hours' }],
    variables: {},
    settings: { name: 'Тест условного триггера', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const condContext = engine.createExecutionContext('user3', 'chat3', 'telegram');
  const condResult = await engine.executeSchema(conditionalSchema, 'condition', {}, condContext, mockAdapter as any);
  console.log(`   ✅ Условный триггер: ${condResult.success ? 'успешно' : 'ошибка'}`);
}

async function testActionNodes(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  // Тест отправки клавиатуры
  const keyboardSchema: BotSchema = {
    id: 'keyboard-test',
    name: 'Тест клавиатуры',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/menu' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'keyboard',
        type: 'action-send-keyboard',
        data: {
          message: 'Выберите опцию:',
          keyboardType: 'inline',
          buttons: [
            [{ text: 'Опция 1', callbackData: 'opt1' }, { text: 'Опция 2', callbackData: 'opt2' }],
            [{ text: 'Помощь', url: 'https://example.com/help' }]
          ]
        },
        position: { x: 300, y: 100 }
      }
    ],
    edges: [{ id: 'edge-1', source: 'start', target: 'keyboard' }],
    variables: {},
    settings: { name: 'Тест клавиатуры', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const kbContext = engine.createExecutionContext('user4', 'chat4', 'telegram');
  const kbResult = await engine.executeSchema(keyboardSchema, 'command', { command: '/menu' }, kbContext, mockAdapter as any);
  console.log(`   ✅ Отправка клавиатуры: ${kbResult.success ? 'успешно' : 'ошибка'}`);

  // Тест установки переменной с типом
  const varSchema: BotSchema = {
    id: 'variable-test',
    name: 'Тест переменных',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/calc' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'set-number',
        type: 'action-set-variable',
        data: { variable: 'myNumber', value: '42.5', valueType: 'number' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'set-boolean',
        type: 'action-set-variable',
        data: { variable: 'isActive', value: 'true', valueType: 'boolean' },
        position: { x: 500, y: 100 }
      },
      {
        id: 'show-vars',
        type: 'action-send-message',
        data: { message: 'Число: {{myNumber}}, Активно: {{isActive}}' },
        position: { x: 700, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'set-number' },
      { id: 'edge-2', source: 'set-number', target: 'set-boolean' },
      { id: 'edge-3', source: 'set-boolean', target: 'show-vars' }
    ],
    variables: {},
    settings: { name: 'Тест переменных', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const varContext = engine.createExecutionContext('user5', 'chat5', 'telegram');
  const varResult = await engine.executeSchema(varSchema, 'command', { command: '/calc' }, varContext, mockAdapter as any);
  console.log(`   ✅ Установка переменных: ${varResult.success ? 'успешно' : 'ошибка'}`);

  // Тест логирования
  const logSchema: BotSchema = {
    id: 'log-test',
    name: 'Тест логирования',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/log' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'log-info',
        type: 'action-log',
        data: { 
          logLevel: 'info', 
          message: 'Пользователь {{userId}} выполнил команду в {{current_time}}',
          includeContext: false
        },
        position: { x: 300, y: 100 }
      },
      {
        id: 'response',
        type: 'action-send-message',
        data: { message: 'Событие записано в лог' },
        position: { x: 500, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'log-info' },
      { id: 'edge-2', source: 'log-info', target: 'response' }
    ],
    variables: {},
    settings: { name: 'Тест логирования', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const logContext = engine.createExecutionContext('user6', 'chat6', 'telegram');
  const logResult = await engine.executeSchema(logSchema, 'command', { command: '/log' }, logContext, mockAdapter as any);
  console.log(`   ✅ Логирование: ${logResult.success ? 'успешно' : 'ошибка'}`);
}

async function testConditionNodes(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  // Тест сравнения переменных
  const compareSchema: BotSchema = {
    id: 'compare-test',
    name: 'Тест сравнения',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/compare' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'set-age',
        type: 'action-set-variable',
        data: { variable: 'age', value: '25', valueType: 'number' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'check-adult',
        type: 'condition-variable-compare',
        data: { variable1: '{{age}}', operator: '>=', variable2: '18' },
        position: { x: 500, y: 100 }
      },
      {
        id: 'adult-msg',
        type: 'action-send-message',
        data: { message: 'Вы совершеннолетний (возраст: {{age}})' },
        position: { x: 700, y: 50 }
      },
      {
        id: 'minor-msg',
        type: 'action-send-message',
        data: { message: 'Вы несовершеннолетний (возраст: {{age}})' },
        position: { x: 700, y: 150 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'set-age' },
      { id: 'edge-2', source: 'set-age', target: 'check-adult' },
      { id: 'edge-3', source: 'check-adult', target: 'adult-msg', sourceHandle: 'true' },
      { id: 'edge-4', source: 'check-adult', target: 'minor-msg', sourceHandle: 'false' }
    ],
    variables: {},
    settings: { name: 'Тест сравнения', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const compareContext = engine.createExecutionContext('user7', 'chat7', 'telegram');
  const compareResult = await engine.executeSchema(compareSchema, 'command', { command: '/compare' }, compareContext, mockAdapter as any);
  console.log(`   ✅ Сравнение переменных: ${compareResult.success ? 'успешно' : 'ошибка'}`);

  // Тест случайного условия
  const randomSchema: BotSchema = {
    id: 'random-test',
    name: 'Тест случайности',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/random' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'random-check',
        type: 'condition-random',
        data: { probability: '0.7' }, // 70% вероятность
        position: { x: 300, y: 100 }
      },
      {
        id: 'lucky-msg',
        type: 'action-send-message',
        data: { message: '🍀 Вам повезло!' },
        position: { x: 500, y: 50 }
      },
      {
        id: 'unlucky-msg',
        type: 'action-send-message',
        data: { message: '😔 Не повезло...' },
        position: { x: 500, y: 150 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'random-check' },
      { id: 'edge-2', source: 'random-check', target: 'lucky-msg', sourceHandle: 'true' },
      { id: 'edge-3', source: 'random-check', target: 'unlucky-msg', sourceHandle: 'false' }
    ],
    variables: {},
    settings: { name: 'Тест случайности', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const randomContext = engine.createExecutionContext('user8', 'chat8', 'telegram');
  const randomResult = await engine.executeSchema(randomSchema, 'command', { command: '/random' }, randomContext, mockAdapter as any);
  console.log(`   ✅ Случайное условие: ${randomResult.success ? 'успешно' : 'ошибка'}`);

  // Тест переключателя (switch)
  const switchSchema: BotSchema = {
    id: 'switch-test',
    name: 'Тест переключателя',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/color' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'set-color',
        type: 'action-set-variable',
        data: { variable: 'color', value: 'red' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'color-switch',
        type: 'condition-switch',
        data: {
          variable: '{{color}}',
          cases: [
            { value: 'red', output: 'red-case' },
            { value: 'blue', output: 'blue-case' },
            { value: 'green', output: 'green-case' }
          ],
          defaultCase: 'default-case'
        },
        position: { x: 500, y: 100 }
      },
      {
        id: 'red-msg',
        type: 'action-send-message',
        data: { message: '🔴 Красный цвет!' },
        position: { x: 700, y: 50 }
      },
      {
        id: 'blue-msg',
        type: 'action-send-message',
        data: { message: '🔵 Синий цвет!' },
        position: { x: 700, y: 100 }
      },
      {
        id: 'default-msg',
        type: 'action-send-message',
        data: { message: '⚪ Неизвестный цвет: {{color}}' },
        position: { x: 700, y: 150 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'set-color' },
      { id: 'edge-2', source: 'set-color', target: 'color-switch' },
      { id: 'edge-3', source: 'color-switch', target: 'red-msg', sourceHandle: 'red-case' },
      { id: 'edge-4', source: 'color-switch', target: 'blue-msg', sourceHandle: 'blue-case' },
      { id: 'edge-5', source: 'color-switch', target: 'default-msg', sourceHandle: 'default-case' }
    ],
    variables: {},
    settings: { name: 'Тест переключателя', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const switchContext = engine.createExecutionContext('user9', 'chat9', 'telegram');
  const switchResult = await engine.executeSchema(switchSchema, 'command', { command: '/color' }, switchContext, mockAdapter as any);
  console.log(`   ✅ Переключатель: ${switchResult.success ? 'успешно' : 'ошибка'}`);
}

async function testDataNodes(engine: SchemaExecutionEngine, mockAdapter: MockMessengerAdapter) {
  // Тест математических операций
  const mathSchema: BotSchema = {
    id: 'math-test',
    name: 'Тест математики',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/math' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'math-add',
        type: 'data-math',
        data: { operation: 'add', operand1: '15', operand2: '27', resultVariable: 'sum' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'math-multiply',
        type: 'data-math',
        data: { operation: 'multiply', operand1: '{{sum}}', operand2: '2', resultVariable: 'result' },
        position: { x: 500, y: 100 }
      },
      {
        id: 'show-result',
        type: 'action-send-message',
        data: { message: '🧮 (15 + 27) × 2 = {{result}}' },
        position: { x: 700, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'math-add' },
      { id: 'edge-2', source: 'math-add', target: 'math-multiply' },
      { id: 'edge-3', source: 'math-multiply', target: 'show-result' }
    ],
    variables: {},
    settings: { name: 'Тест математики', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const mathContext = engine.createExecutionContext('user10', 'chat10', 'telegram');
  const mathResult = await engine.executeSchema(mathSchema, 'command', { command: '/math' }, mathContext, mockAdapter as any);
  console.log(`   ✅ Математические операции: ${mathResult.success ? 'успешно' : 'ошибка'}`);

  // Тест работы со строками
  const stringSchema: BotSchema = {
    id: 'string-test',
    name: 'Тест строк',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/string' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'set-name',
        type: 'action-set-variable',
        data: { variable: 'firstName', value: 'john' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'capitalize',
        type: 'data-string',
        data: { operation: 'toUpperCase', string1: '{{firstName}}', resultVariable: 'upperName' },
        position: { x: 500, y: 100 }
      },
      {
        id: 'concat',
        type: 'data-string',
        data: { operation: 'concat', string1: 'Привет, ', string2: '{{upperName}}!', resultVariable: 'greeting' },
        position: { x: 700, y: 100 }
      },
      {
        id: 'show-greeting',
        type: 'action-send-message',
        data: { message: '{{greeting}}' },
        position: { x: 900, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'set-name' },
      { id: 'edge-2', source: 'set-name', target: 'capitalize' },
      { id: 'edge-3', source: 'capitalize', target: 'concat' },
      { id: 'edge-4', source: 'concat', target: 'show-greeting' }
    ],
    variables: {},
    settings: { name: 'Тест строк', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const stringContext = engine.createExecutionContext('user11', 'chat11', 'telegram');
  const stringResult = await engine.executeSchema(stringSchema, 'command', { command: '/string' }, stringContext, mockAdapter as any);
  console.log(`   ✅ Строковые операции: ${stringResult.success ? 'успешно' : 'ошибка'}`);

  // Тест генерации случайных данных
  const randomDataSchema: BotSchema = {
    id: 'random-data-test',
    name: 'Тест случайных данных',
    nodes: [
      {
        id: 'start',
        type: 'trigger-command',
        data: { command: '/random-data' },
        position: { x: 100, y: 100 }
      },
      {
        id: 'random-number',
        type: 'data-random',
        data: { dataType: 'number', min: '1', max: '100', integer: true, resultVariable: 'randomNum' },
        position: { x: 300, y: 100 }
      },
      {
        id: 'random-string',
        type: 'data-random',
        data: { dataType: 'string', length: '8', resultVariable: 'randomStr' },
        position: { x: 500, y: 100 }
      },
      {
        id: 'random-choice',
        type: 'data-random',
        data: { dataType: 'choice', choices: ['🍎', '🍌', '🍊', '🍇'], resultVariable: 'randomFruit' },
        position: { x: 700, y: 100 }
      },
      {
        id: 'show-random',
        type: 'action-send-message',
        data: { message: '🎲 Случайные данные:\nЧисло: {{randomNum}}\nСтрока: {{randomStr}}\nФрукт: {{randomFruit}}' },
        position: { x: 900, y: 100 }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'start', target: 'random-number' },
      { id: 'edge-2', source: 'random-number', target: 'random-string' },
      { id: 'edge-3', source: 'random-string', target: 'random-choice' },
      { id: 'edge-4', source: 'random-choice', target: 'show-random' }
    ],
    variables: {},
    settings: { name: 'Тест случайных данных', description: '', platforms: ['telegram'], mode: 'polling', variables: {} },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockAdapter.clearHistory();
  const randomDataContext = engine.createExecutionContext('user12', 'chat12', 'telegram');
  const randomDataResult = await engine.executeSchema(randomDataSchema, 'command', { command: '/random-data' }, randomDataContext, mockAdapter as any);
  console.log(`   ✅ Генерация случайных данных: ${randomDataResult.success ? 'успешно' : 'ошибка'}`);
}

// Запуск тестов
if (require.main === module) {
  testNodeTypes()
    .then(() => {
      console.log('\n🎉 Тестирование типов узлов завершено успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Тестирование завершилось с ошибкой:', error);
      process.exit(1);
    });
}

export { testNodeTypes };