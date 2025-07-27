/**
 * Исполнители триггерных узлов
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult } from '../SchemaExecutionEngine';
import { BaseNodeExecutor } from './BaseNodeExecutor';

/**
 * Исполнитель триггера команды
 */
export class CommandTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const command = node.data.command;
    const description = node.data.description || '';
    const nextNodes = this.getNextNodes(node.id, schema);
    
    // Сохраняем информацию о команде в переменные
    const newVariables = {
      ...context.variables,
      triggeredCommand: command,
      commandDescription: description
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен триггер команды: ${command}`]
    );
  }
}

/**
 * Исполнитель триггера сообщения
 */
export class MessageTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const patterns = node.data.patterns || [];
    const caseSensitive = node.data.caseSensitive || false;
    const messageText = context.variables.messageText || '';
    const nextNodes = this.getNextNodes(node.id, schema);
    
    // Если есть паттерны, проверяем соответствие
    let matches = true;
    if (patterns.length > 0) {
      matches = patterns.some((pattern: string) => {
        try {
          const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
          return regex.test(messageText);
        } catch (error) {
          // Если регулярное выражение некорректно, используем простое сравнение
          const searchText = caseSensitive ? messageText : messageText.toLowerCase();
          const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
          return searchText.includes(searchPattern);
        }
      });
    }
    
    if (!matches) {
      return this.createSuccessResult([], context.variables, context.userState, [], ['Сообщение не соответствует паттернам триггера']);
    }
    
    const newVariables = {
      ...context.variables,
      triggeredByMessage: messageText,
      messageLength: messageText.length
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен триггер сообщения для: "${messageText.substring(0, 50)}..."`]
    );
  }
}

/**
 * Исполнитель триггера callback кнопки
 */
export class CallbackTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const expectedCallback = node.data.callbackData;
    const actualCallback = context.variables.callbackData;
    const nextNodes = this.getNextNodes(node.id, schema);
    
    // Проверяем соответствие callback данных
    if (expectedCallback && actualCallback !== expectedCallback) {
      return this.createSuccessResult([], context.variables, context.userState, [], ['Callback данные не соответствуют ожидаемым']);
    }
    
    const newVariables = {
      ...context.variables,
      triggeredCallback: actualCallback,
      callbackProcessed: true
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен триггер callback: ${actualCallback}`]
    );
  }
}

/**
 * Исполнитель триггера по времени/расписанию
 */
export class ScheduleTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const scheduleType = node.data.scheduleType || 'once'; // once, daily, weekly, monthly
    const scheduleTime = node.data.scheduleTime; // время в формате HH:MM
    const scheduleDays = node.data.scheduleDays || []; // дни недели для weekly
    const nextNodes = this.getNextNodes(node.id, schema);
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, и т.д.
    
    let shouldTrigger = false;
    
    switch (scheduleType) {
      case 'once':
        shouldTrigger = true; // Одноразовый триггер всегда срабатывает
        break;
      case 'daily':
        shouldTrigger = !scheduleTime || currentTime === scheduleTime;
        break;
      case 'weekly':
        shouldTrigger = scheduleDays.includes(currentDay) && (!scheduleTime || currentTime === scheduleTime);
        break;
      case 'monthly':
        const currentDate = now.getDate();
        const scheduleDate = node.data.scheduleDate || 1;
        shouldTrigger = currentDate === scheduleDate && (!scheduleTime || currentTime === scheduleTime);
        break;
    }
    
    if (!shouldTrigger) {
      return this.createSuccessResult([], context.variables, context.userState, [], ['Условия расписания не выполнены']);
    }
    
    const newVariables = {
      ...context.variables,
      triggeredAt: now.toISOString(),
      scheduleType,
      currentTime,
      currentDay
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен триггер по расписанию: ${scheduleType} в ${currentTime}`]
    );
  }
}

/**
 * Исполнитель триггера события
 */
export class EventTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const eventType = node.data.eventType; // user_joined, user_left, message_edited, etc.
    const actualEvent = context.variables.eventType;
    const nextNodes = this.getNextNodes(node.id, schema);
    
    // Проверяем соответствие типа события
    if (eventType && actualEvent !== eventType) {
      return this.createSuccessResult([], context.variables, context.userState, [], [`Тип события не соответствует: ожидался ${eventType}, получен ${actualEvent}`]);
    }
    
    const newVariables = {
      ...context.variables,
      triggeredEvent: actualEvent,
      eventData: context.variables.eventData || {},
      eventTimestamp: Date.now()
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен триггер события: ${actualEvent}`]
    );
  }
}

/**
 * Исполнитель триггера по условию
 */
export class ConditionalTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const condition = node.data.condition; // JavaScript выражение
    const variables = context.variables;
    const nextNodes = this.getNextNodes(node.id, schema);
    
    let conditionResult = false;
    
    try {
      // Создаем безопасный контекст для выполнения условия
      const safeContext = {
        ...variables,
        // Добавляем полезные функции
        now: Date.now(),
        today: new Date().toDateString(),
        random: Math.random,
        // Математические функции
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        round: Math.round
      };
      
      // Простая проверка условия (в реальном проекте лучше использовать безопасный парсер)
      const conditionFunction = new Function(...Object.keys(safeContext), `return ${condition}`);
      conditionResult = Boolean(conditionFunction(...Object.values(safeContext)));
      
    } catch (error) {
      return this.createErrorResult(
        `Ошибка в условии триггера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
    
    if (!conditionResult) {
      return this.createSuccessResult([], context.variables, context.userState, [], ['Условие триггера не выполнено']);
    }
    
    const newVariables = {
      ...context.variables,
      conditionResult: true,
      conditionEvaluatedAt: Date.now()
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен условный триггер: ${condition}`]
    );
  }
}

/**
 * Исполнитель триггера webhook
 */
export class WebhookTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const webhookPath = node.data.webhookPath || '/webhook';
    const expectedMethod = node.data.method || 'POST';
    const actualMethod = context.variables.requestMethod;
    const webhookData = context.variables.webhookData || {};
    const nextNodes = this.getNextNodes(node.id, schema);
    
    // Проверяем метод запроса
    if (actualMethod && actualMethod !== expectedMethod) {
      return this.createSuccessResult([], context.variables, context.userState, [], [`Метод запроса не соответствует: ожидался ${expectedMethod}, получен ${actualMethod}`]);
    }
    
    const newVariables = {
      ...context.variables,
      webhookPath,
      webhookData,
      requestHeaders: context.variables.requestHeaders || {},
      requestBody: context.variables.requestBody || {},
      webhookTriggeredAt: Date.now()
    };
    
    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Выполнен webhook триггер: ${expectedMethod} ${webhookPath}`]
    );
  }
}