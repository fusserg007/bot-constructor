/**
 * Движок выполнения схем ботов
 * Интерпретирует схемы и выполняет логику ботов
 */
import { BotSchema, Node, Edge, Variable } from '../types';
import { MessengerAdapter } from '../adapters/MessengerAdapter';

export interface ExecutionContext {
  userId: string;
  chatId: string;
  messageId?: string;
  platform: string;
  variables: Record<string, any>;
  userState: Record<string, any>;
  currentNode?: string;
  executionId: string;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  nextNodes: string[];
  variables: Record<string, any>;
  userState: Record<string, any>;
  actions: ExecutionAction[];
  errors: string[];
  logs: string[];
}

export interface ExecutionAction {
  type: 'send_message' | 'send_media' | 'request_input' | 'set_variable' | 'call_webhook' | 'delay';
  data: any;
  nodeId: string;
}

export interface NodeExecutor {
  execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult>;
}

export class SchemaExecutionEngine {
  private nodeExecutors: Map<string, NodeExecutor> = new Map();
  private runningExecutions: Map<string, ExecutionContext> = new Map();
  private userStates: Map<string, Record<string, any>> = new Map();
  private executionHistory: Map<string, ExecutionContext[]> = new Map();

  constructor() {
    this.initializeNodeExecutors();
  }

  /**
   * Выполнить узел схемы
   */
  async executeNode(
    nodeId: string,
    schema: BotSchema,
    context: ExecutionContext,
    adapter: MessengerAdapter
  ): Promise<ExecutionResult> {
    try {
      const node = schema.nodes.find(n => n.id === nodeId);
      if (!node) {
        return {
          success: false,
          nextNodes: [],
          variables: context.variables,
          userState: context.userState,
          actions: [],
          errors: [`Узел ${nodeId} не найден в схеме`],
          logs: []
        };
      }

      // Получаем исполнитель для типа узла
      const executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        return {
          success: false,
          nextNodes: [],
          variables: context.variables,
          userState: context.userState,
          actions: [],
          errors: [`Исполнитель для типа узла ${node.type} не найден`],
          logs: []
        };
      }

      // Обновляем контекст
      context.currentNode = nodeId;
      context.timestamp = Date.now();

      // Сохраняем состояние выполнения
      this.runningExecutions.set(context.executionId, context);

      // Выполняем узел
      const result = await executor.execute(node, context, schema);

      // Обновляем состояние пользователя
      if (result.userState) {
        this.userStates.set(`${context.platform}:${context.userId}`, result.userState);
      }

      // Сохраняем историю выполнения
      this.saveExecutionHistory(context);

      // Выполняем действия через адаптер
      await this.executeActions(result.actions, adapter, context);

      return result;

    } catch (error) {
      console.error('Ошибка выполнения узла:', error);
      return {
        success: false,
        nextNodes: [],
        variables: context.variables,
        userState: context.userState,
        actions: [],
        errors: [`Ошибка выполнения узла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`],
        logs: []
      };
    }
  }

  /**
   * Выполнить схему с начального узла
   */
  async executeSchema(
    schema: BotSchema,
    triggerType: string,
    triggerData: any,
    context: ExecutionContext,
    adapter: MessengerAdapter
  ): Promise<ExecutionResult> {
    try {
      // Находим стартовые узлы (триггеры)
      const triggerNodes = schema.nodes.filter(node => 
        node.type.startsWith('trigger-') && this.matchesTrigger(node, triggerType, triggerData)
      );

      if (triggerNodes.length === 0) {
        return {
          success: false,
          nextNodes: [],
          variables: context.variables,
          userState: context.userState,
          actions: [],
          errors: ['Не найдены подходящие триггеры'],
          logs: []
        };
      }

      // Выполняем первый подходящий триггер
      const triggerNode = triggerNodes[0];
      let currentResult = await this.executeNode(triggerNode.id, schema, context, adapter);

      // Продолжаем выполнение по цепочке
      while (currentResult.success && currentResult.nextNodes.length > 0) {
        const nextNodeId = currentResult.nextNodes[0]; // Берем первый следующий узел
        
        // Обновляем контекст с результатами предыдущего выполнения
        context.variables = { ...context.variables, ...currentResult.variables };
        context.userState = { ...context.userState, ...currentResult.userState };

        const nextResult = await this.executeNode(nextNodeId, schema, context, adapter);
        
        // Объединяем результаты
        currentResult = {
          success: nextResult.success,
          nextNodes: nextResult.nextNodes,
          variables: nextResult.variables,
          userState: nextResult.userState,
          actions: [...currentResult.actions, ...nextResult.actions],
          errors: [...currentResult.errors, ...nextResult.errors],
          logs: [...currentResult.logs, ...nextResult.logs]
        };

        // Предотвращаем бесконечные циклы
        if (currentResult.logs.length > 100) {
          currentResult.errors.push('Превышен лимит выполнения узлов (возможно, бесконечный цикл)');
          break;
        }
      }

      return currentResult;

    } catch (error) {
      console.error('Ошибка выполнения схемы:', error);
      return {
        success: false,
        nextNodes: [],
        variables: context.variables,
        userState: context.userState,
        actions: [],
        errors: [`Ошибка выполнения схемы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`],
        logs: []
      };
    }
  }

  /**
   * Получить следующие узлы для выполнения
   */
  getNextNodes(currentNodeId: string, schema: BotSchema, context: ExecutionContext): string[] {
    const edges = schema.edges.filter(edge => edge.source === currentNodeId);
    
    // Если нет исходящих связей, выполнение завершено
    if (edges.length === 0) {
      return [];
    }

    // Возвращаем целевые узлы всех исходящих связей
    return edges.map(edge => edge.target);
  }

  /**
   * Получить состояние пользователя
   */
  getUserState(platform: string, userId: string): Record<string, any> {
    return this.userStates.get(`${platform}:${userId}`) || {};
  }

  /**
   * Установить состояние пользователя
   */
  setUserState(platform: string, userId: string, state: Record<string, any>): void {
    this.userStates.set(`${platform}:${userId}`, state);
  }

  /**
   * Очистить состояние пользователя
   */
  clearUserState(platform: string, userId: string): void {
    this.userStates.delete(`${platform}:${userId}`);
  }

  /**
   * Получить историю выполнения
   */
  getExecutionHistory(executionId: string): ExecutionContext[] {
    return this.executionHistory.get(executionId) || [];
  }

  /**
   * Остановить выполнение
   */
  stopExecution(executionId: string): void {
    this.runningExecutions.delete(executionId);
  }

  /**
   * Проверить, соответствует ли узел триггеру
   */
  private matchesTrigger(node: Node, triggerType: string, triggerData: any): boolean {
    switch (node.type) {
      case 'trigger-command':
        return triggerType === 'command' && 
               node.data.command === triggerData.command;
      
      case 'trigger-message':
        return triggerType === 'message';
      
      case 'trigger-callback':
        return triggerType === 'callback' && 
               node.data.callbackData === triggerData.callbackData;
      
      default:
        return false;
    }
  }

  /**
   * Выполнить действия через адаптер
   */
  private async executeActions(
    actions: ExecutionAction[],
    adapter: MessengerAdapter,
    context: ExecutionContext
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_message':
            await adapter.sendMessage(context.chatId, action.data.message, action.data.options);
            break;
          
          case 'send_media':
            await adapter.sendMedia(context.chatId, action.data.type, action.data.media, action.data.options);
            break;
          
          case 'delay':
            await new Promise(resolve => setTimeout(resolve, action.data.duration));
            break;
          
          // Другие типы действий будут добавлены позже
        }
      } catch (error) {
        console.error(`Ошибка выполнения действия ${action.type}:`, error);
      }
    }
  }

  /**
   * Сохранить историю выполнения
   */
  private saveExecutionHistory(context: ExecutionContext): void {
    const executionId = context.executionId;
    const history = this.executionHistory.get(executionId) || [];
    
    history.push({ ...context });
    
    // Ограничиваем размер истории
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.executionHistory.set(executionId, history);
  }

  /**
   * Инициализация исполнителей узлов
   */
  private initializeNodeExecutors(): void {
    // Импортируем исполнители триггеров
    const {
      CommandTriggerExecutor,
      MessageTriggerExecutor,
      CallbackTriggerExecutor,
      ScheduleTriggerExecutor,
      EventTriggerExecutor,
      ConditionalTriggerExecutor,
      WebhookTriggerExecutor
    } = require('./nodes/TriggerNodes');

    // Импортируем исполнители действий
    const {
      SendMessageExecutor,
      SendMediaExecutor,
      SendKeyboardExecutor,
      RequestInputExecutor,
      SetVariableExecutor,
      DelayExecutor,
      HttpRequestExecutor,
      SaveDataExecutor,
      SendNotificationExecutor,
      LogExecutor
    } = require('./nodes/ActionNodes');

    // Импортируем исполнители условий
    const {
      TextConditionExecutor,
      VariableConditionExecutor,
      LogicConditionExecutor,
      TimeConditionExecutor,
      RandomConditionExecutor,
      SwitchExecutor,
      ExistsConditionExecutor,
      TypeConditionExecutor
    } = require('./nodes/ConditionNodes');

    // Импортируем исполнители данных
    const {
      MathExecutor,
      StringExecutor,
      ArrayExecutor,
      JsonExecutor,
      RandomDataExecutor,
      FormatExecutor
    } = require('./nodes/DataNodes');

    // Импортируем исполнители интеграций
    const {
      RestApiExecutor,
      GraphQLExecutor,
      WebScrapingExecutor,
      CsvParserExecutor,
      XmlParserExecutor,
      DatabaseExecutor,
      FileOperationExecutor
    } = require('./nodes/IntegrationNodes');

    // Регистрируем триггеры
    this.registerNodeExecutor('trigger-command', new CommandTriggerExecutor());
    this.registerNodeExecutor('trigger-message', new MessageTriggerExecutor());
    this.registerNodeExecutor('trigger-callback', new CallbackTriggerExecutor());
    this.registerNodeExecutor('trigger-schedule', new ScheduleTriggerExecutor());
    this.registerNodeExecutor('trigger-event', new EventTriggerExecutor());
    this.registerNodeExecutor('trigger-condition', new ConditionalTriggerExecutor());
    this.registerNodeExecutor('trigger-webhook', new WebhookTriggerExecutor());

    // Регистрируем действия
    this.registerNodeExecutor('action-send-message', new SendMessageExecutor());
    this.registerNodeExecutor('action-send-media', new SendMediaExecutor());
    this.registerNodeExecutor('action-send-keyboard', new SendKeyboardExecutor());
    this.registerNodeExecutor('action-request-input', new RequestInputExecutor());
    this.registerNodeExecutor('action-set-variable', new SetVariableExecutor());
    this.registerNodeExecutor('action-delay', new DelayExecutor());
    this.registerNodeExecutor('action-http-request', new HttpRequestExecutor());
    this.registerNodeExecutor('action-save-data', new SaveDataExecutor());
    this.registerNodeExecutor('action-send-notification', new SendNotificationExecutor());
    this.registerNodeExecutor('action-log', new LogExecutor());

    // Регистрируем условия
    this.registerNodeExecutor('condition-text-contains', new TextConditionExecutor());
    this.registerNodeExecutor('condition-variable-compare', new VariableConditionExecutor());
    this.registerNodeExecutor('condition-logic', new LogicConditionExecutor());
    this.registerNodeExecutor('condition-time', new TimeConditionExecutor());
    this.registerNodeExecutor('condition-random', new RandomConditionExecutor());
    this.registerNodeExecutor('condition-switch', new SwitchExecutor());
    this.registerNodeExecutor('condition-exists', new ExistsConditionExecutor());
    this.registerNodeExecutor('condition-type', new TypeConditionExecutor());

    // Регистрируем узлы данных
    this.registerNodeExecutor('data-math', new MathExecutor());
    this.registerNodeExecutor('data-string', new StringExecutor());
    this.registerNodeExecutor('data-array', new ArrayExecutor());
    this.registerNodeExecutor('data-json', new JsonExecutor());
    this.registerNodeExecutor('data-random', new RandomDataExecutor());
    this.registerNodeExecutor('data-format', new FormatExecutor());

    // Регистрируем узлы интеграций
    this.registerNodeExecutor('integration-rest-api', new RestApiExecutor());
    this.registerNodeExecutor('integration-graphql', new GraphQLExecutor());
    this.registerNodeExecutor('integration-web-scraping', new WebScrapingExecutor());
    this.registerNodeExecutor('integration-csv-parser', new CsvParserExecutor());
    this.registerNodeExecutor('integration-xml-parser', new XmlParserExecutor());
    this.registerNodeExecutor('integration-database', new DatabaseExecutor());
    this.registerNodeExecutor('integration-file-operation', new FileOperationExecutor());

    // Регистрируем устаревшие алиасы для совместимости
    this.registerNodeExecutor('utility-math', new MathExecutor());
    this.registerNodeExecutor('scenario-faq', new TextConditionExecutor());
    this.registerNodeExecutor('scenario-quiz', new SwitchExecutor());
    this.registerNodeExecutor('scenario-support', new RequestInputExecutor());
    this.registerNodeExecutor('action-http-request', new RestApiExecutor()); // Алиас для совместимости
  }

  /**
   * Зарегистрировать исполнитель узла
   */
  registerNodeExecutor(nodeType: string, executor: NodeExecutor): void {
    this.nodeExecutors.set(nodeType, executor);
  }

  /**
   * Создать контекст выполнения
   */
  createExecutionContext(
    userId: string,
    chatId: string,
    platform: string,
    initialVariables: Record<string, any> = {}
  ): ExecutionContext {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userState = this.getUserState(platform, userId);

    return {
      userId,
      chatId,
      platform,
      variables: initialVariables,
      userState,
      executionId,
      timestamp: Date.now()
    };
  }
}