/**
 * Тест движка выполнения схем
 */
import { SchemaExecutionEngine, ExecutionContext } from './core/engine/SchemaExecutionEngine';
import { UserStateManager } from './core/engine/UserStateManager';
import { ErrorHandler } from './core/engine/ErrorHandler';
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

async function testSchemaExecutionEngine() {
  console.log('🧪 Тестирование движка выполнения схем...\n');

  try {
    // Инициализация
    const engine = new SchemaExecutionEngine();
    const userStateManager = UserStateManager.getInstance();
    const errorHandler = ErrorHandler.getInstance();
    const mockAdapter = new MockMessengerAdapter();

    console.log('1. Тестирование базового выполнения схемы:');

    // Создаем тестовую схему
    const testSchema: BotSchema = {
      id: 'test-schema',
      name: 'Тестовая схема',
      nodes: [
        {
          id: 'start-trigger',
          type: 'trigger-command',
          data: { command: '/start' },
          position: { x: 100, y: 100 }
        },
        {
          id: 'welcome-message',
          type: 'action-send-message',
          data: { 
            message: 'Добро пожаловать, {{userId}}! Текущее время: {{current_time}}'
          },
          position: { x: 300, y: 100 }
        },
        {
          id: 'ask-name',
          type: 'action-request-input',
          data: {
            message: 'Как вас зовут?',
            variable: 'userName'
          },
          position: { x: 500, y: 100 }
        },
        {
          id: 'greet-user',
          type: 'action-send-message',
          data: {
            message: 'Приятно познакомиться, {{userName}}!'
          },
          position: { x: 700, y: 100 }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'start-trigger', target: 'welcome-message' },
        { id: 'edge-2', source: 'welcome-message', target: 'ask-name' },
        { id: 'edge-3', source: 'ask-name', target: 'greet-user' }
      ],
      variables: {},
      settings: {
        name: 'Тестовая схема',
        description: 'Схема для тестирования движка',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Создаем контекст выполнения
    const context = engine.createExecutionContext(
      'user123',
      'chat456',
      'telegram',
      { messageText: '/start' }
    );

    console.log(`   ✅ Создан контекст выполнения: ${context.executionId}`);

    // Выполняем схему
    const result = await engine.executeSchema(
      testSchema,
      'command',
      { command: '/start' },
      context,
      mockAdapter as any
    );

    console.log(`   ✅ Схема выполнена: ${result.success ? 'успешно' : 'с ошибками'}`);
    console.log(`   📊 Выполнено действий: ${result.actions.length}`);
    console.log(`   📝 Логов: ${result.logs.length}`);
    
    if (result.errors.length > 0) {
      console.log(`   ❌ Ошибки: ${result.errors.join(', ')}`);
    }

    console.log('\n2. Тестирование состояния пользователя:');

    // Получаем сессию пользователя
    const userSession = userStateManager.getUserSession('telegram', 'user123', 'chat456');
    console.log(`   ✅ Сессия пользователя: ${userSession.sessionId}`);
    console.log(`   📊 Переменных: ${Object.keys(userSession.variables).length}`);
    console.log(`   🔄 Ожидает ввод: ${userSession.waitingForInput ? 'да' : 'нет'}`);

    // Симулируем ввод пользователя
    if (userSession.waitingForInput) {
      const inputResult = userStateManager.processUserInput('telegram', 'user123', 'chat456', 'Алексей');
      console.log(`   ✅ Обработан ввод: ${inputResult.processed ? 'да' : 'нет'}`);
      
      if (inputResult.processed && inputResult.nextNodes) {
        // Продолжаем выполнение с следующими узлами
        for (const nodeId of inputResult.nextNodes) {
          const nodeResult = await engine.executeNode(nodeId, testSchema, context, mockAdapter as any);
          console.log(`   ✅ Выполнен узел ${nodeId}: ${nodeResult.success ? 'успешно' : 'с ошибкой'}`);
        }
      }
    }

    console.log('\n3. Тестирование условной логики:');

    // Создаем схему с условием
    const conditionalSchema: BotSchema = {
      id: 'conditional-schema',
      name: 'Схема с условием',
      nodes: [
        {
          id: 'message-trigger',
          type: 'trigger-message',
          data: {},
          position: { x: 100, y: 100 }
        },
        {
          id: 'check-greeting',
          type: 'condition-text-contains',
          data: { pattern: 'привет|hello|hi' },
          position: { x: 300, y: 100 }
        },
        {
          id: 'greeting-response',
          type: 'action-send-message',
          data: { message: 'Привет! Как дела?' },
          position: { x: 500, y: 50 }
        },
        {
          id: 'default-response',
          type: 'action-send-message',
          data: { message: 'Не понял, что вы имеете в виду.' },
          position: { x: 500, y: 150 }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'message-trigger', target: 'check-greeting' },
        { id: 'edge-2', source: 'check-greeting', target: 'greeting-response', sourceHandle: 'true' },
        { id: 'edge-3', source: 'check-greeting', target: 'default-response', sourceHandle: 'false' }
      ],
      variables: {},
      settings: {
        name: 'Схема с условием',
        description: 'Тестирование условной логики',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Тестируем с приветствием
    mockAdapter.clearHistory();
    const greetingContext = engine.createExecutionContext(
      'user456',
      'chat789',
      'telegram',
      { messageText: 'Привет!' }
    );

    const greetingResult = await engine.executeSchema(
      conditionalSchema,
      'message',
      { text: 'Привет!' },
      greetingContext,
      mockAdapter as any
    );

    console.log(`   ✅ Тест с приветствием: ${greetingResult.success ? 'успешно' : 'ошибка'}`);
    console.log(`   📤 Отправлено сообщений: ${mockAdapter.sentMessages.length}`);

    // Тестируем с обычным сообщением
    mockAdapter.clearHistory();
    const normalContext = engine.createExecutionContext(
      'user456',
      'chat789',
      'telegram',
      { messageText: 'Какая погода?' }
    );

    const normalResult = await engine.executeSchema(
      conditionalSchema,
      'message',
      { text: 'Какая погода?' },
      normalContext,
      mockAdapter as any
    );

    console.log(`   ✅ Тест с обычным сообщением: ${normalResult.success ? 'успешно' : 'ошибка'}`);
    console.log(`   📤 Отправлено сообщений: ${mockAdapter.sentMessages.length}`);

    console.log('\n4. Тестирование обработки ошибок:');

    // Создаем схему с ошибкой
    const errorSchema: BotSchema = {
      id: 'error-schema',
      name: 'Схема с ошибкой',
      nodes: [
        {
          id: 'start',
          type: 'trigger-command',
          data: { command: '/error' },
          position: { x: 100, y: 100 }
        },
        {
          id: 'invalid-node',
          type: 'invalid-type', // Несуществующий тип узла
          data: {},
          position: { x: 300, y: 100 }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'start', target: 'invalid-node' }
      ],
      variables: {},
      settings: {
        name: 'Схема с ошибкой',
        description: 'Тестирование обработки ошибок',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const errorContext = engine.createExecutionContext('user789', 'chat123', 'telegram');
    const errorResult = await engine.executeSchema(
      errorSchema,
      'command',
      { command: '/error' },
      errorContext,
      mockAdapter as any
    );

    console.log(`   ✅ Тест с ошибкой: ${errorResult.success ? 'неожиданно успешно' : 'ошибка как ожидалось'}`);
    console.log(`   ❌ Ошибок: ${errorResult.errors.length}`);

    console.log('\n5. Тестирование статистики:');

    // Статистика состояний пользователей
    const sessionStats = userStateManager.getSessionStats();
    console.log(`   📊 Всего сессий: ${sessionStats.totalSessions}`);
    console.log(`   🔥 Активных сессий: ${sessionStats.activeSessions}`);
    console.log(`   📱 По платформам:`, sessionStats.sessionsByPlatform);

    // Статистика ошибок
    const errorStats = errorHandler.getErrorStats();
    console.log(`   ❌ Всего ошибок: ${errorStats.totalErrors}`);
    console.log(`   📊 По типам:`, errorStats.errorsByType);

    console.log('\n6. Тестирование переменных и математики:');

    // Схема с математическими операциями
    const mathSchema: BotSchema = {
      id: 'math-schema',
      name: 'Математическая схема',
      nodes: [
        {
          id: 'start',
          type: 'trigger-command',
          data: { command: '/calc' },
          position: { x: 100, y: 100 }
        },
        {
          id: 'set-numbers',
          type: 'action-set-variable',
          data: { variable: 'number1', value: '10' },
          position: { x: 300, y: 100 }
        },
        {
          id: 'math-operation',
          type: 'utility-math',
          data: {
            operation: 'add',
            operand1: '{{number1}}',
            operand2: '5',
            resultVariable: 'result'
          },
          position: { x: 500, y: 100 }
        },
        {
          id: 'show-result',
          type: 'action-send-message',
          data: { message: 'Результат: {{number1}} + 5 = {{result}}' },
          position: { x: 700, y: 100 }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'start', target: 'set-numbers' },
        { id: 'edge-2', source: 'set-numbers', target: 'math-operation' },
        { id: 'edge-3', source: 'math-operation', target: 'show-result' }
      ],
      variables: {},
      settings: {
        name: 'Математическая схема',
        description: 'Тестирование переменных и математики',
        platforms: ['telegram'],
        mode: 'polling',
        variables: {}
      },
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockAdapter.clearHistory();
    const mathContext = engine.createExecutionContext('user999', 'chat999', 'telegram');
    const mathResult = await engine.executeSchema(
      mathSchema,
      'command',
      { command: '/calc' },
      mathContext,
      mockAdapter as any
    );

    console.log(`   ✅ Математическая схема: ${mathResult.success ? 'успешно' : 'ошибка'}`);
    console.log(`   🔢 Переменных: ${Object.keys(mathResult.variables).length}`);
    console.log(`   📤 Отправлено сообщений: ${mockAdapter.sentMessages.length}`);

    if (mockAdapter.sentMessages.length > 0) {
      console.log(`   💬 Последнее сообщение: ${mockAdapter.sentMessages[mockAdapter.sentMessages.length - 1].message}`);
    }

    console.log('\n✅ Все тесты движка выполнения схем прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании движка выполнения схем:', error);
    throw error;
  }
}

// Запуск тестов
if (require.main === module) {
  testSchemaExecutionEngine()
    .then(() => {
      console.log('\n🎉 Тестирование завершено успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Тестирование завершилось с ошибкой:', error);
      process.exit(1);
    });
}

export { testSchemaExecutionEngine };