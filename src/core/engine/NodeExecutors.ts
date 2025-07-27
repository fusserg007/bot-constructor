/**
 * Исполнители различных типов узлов
 */
import { Node, BotSchema } from '../types';
import { ExecutionContext, ExecutionResult, NodeExecutor } from './SchemaExecutionEngine';

/**
 * Базовый класс для исполнителей узлов
 */
abstract class BaseNodeExecutor implements NodeExecutor {
  abstract execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult>;

  /**
   * Получить следующие узлы для выполнения
   */
  protected getNextNodes(nodeId: string, schema: BotSchema): string[] {
    const edges = schema.edges.filter(edge => edge.source === nodeId);
    return edges.map(edge => edge.target);
  }

  /**
   * Заменить переменные в тексте
   */
  protected replaceVariables(text: string, context: ExecutionContext): string {
    let result = text;
    
    // Заменяем переменные из контекста
    Object.entries(context.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    // Заменяем системные переменные
    result = result.replace(/{{userId}}/g, context.userId);
    result = result.replace(/{{chatId}}/g, context.chatId);
    result = result.replace(/{{platform}}/g, context.platform);
    result = result.replace(/{{timestamp}}/g, String(context.timestamp));
    result = result.replace(/{{current_date}}/g, new Date().toLocaleDateString());
    result = result.replace(/{{current_time}}/g, new Date().toLocaleTimeString());

    return result;
  }

  /**
   * Создать успешный результат
   */
  protected createSuccessResult(
    nextNodes: string[],
    variables: Record<string, any> = {},
    userState: Record<string, any> = {},
    actions: any[] = [],
    logs: string[] = []
  ): ExecutionResult {
    return {
      success: true,
      nextNodes,
      variables,
      userState,
      actions,
      errors: [],
      logs
    };
  }

  /**
   * Создать результат с ошибкой
   */
  protected createErrorResult(
    error: string,
    variables: Record<string, any> = {},
    userState: Record<string, any> = {}
  ): ExecutionResult {
    return {
      success: false,
      nextNodes: [],
      variables,
      userState,
      actions: [],
      errors: [error],
      logs: []
    };
  }
}

/**
 * Исполнитель триггера команды
 */
export class CommandTriggerExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const command = node.data.command;
    const nextNodes = this.getNextNodes(node.id, schema);
    
    return this.createSuccessResult(
      nextNodes,
      context.variables,
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
    const nextNodes = this.getNextNodes(node.id, schema);
    
    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      ['Выполнен триггер сообщения']
    );
  }
}

/**
 * Исполнитель отправки сообщения
 */
export class SendMessageExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const message = this.replaceVariables(node.data.message || '', context);
    const nextNodes = this.getNextNodes(node.id, schema);
    
    const action = {
      type: 'send_message' as const,
      data: {
        message,
        options: node.data.options || {}
      },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Отправлено сообщение: ${message.substring(0, 50)}...`]
    );
  }
}

/**
 * Исполнитель условия содержания текста
 */
export class TextConditionExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const pattern = node.data.pattern || '';
    const text = context.variables.messageText || '';
    const caseSensitive = node.data.caseSensitive || false;
    
    let matches = false;
    
    try {
      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      matches = regex.test(text);
    } catch (error) {
      // Если регулярное выражение некорректно, используем простое сравнение
      const searchText = caseSensitive ? text : text.toLowerCase();
      const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
      matches = searchText.includes(searchPattern);
    }

    // Получаем все исходящие связи
    const edges = schema.edges.filter(edge => edge.source === node.id);
    let nextNodes: string[] = [];

    if (matches) {
      // Ищем связь с handle 'true' или первую доступную
      const trueEdge = edges.find(edge => edge.sourceHandle === 'true') || edges[0];
      if (trueEdge) {
        nextNodes = [trueEdge.target];
      }
    } else {
      // Ищем связь с handle 'false'
      const falseEdge = edges.find(edge => edge.sourceHandle === 'false');
      if (falseEdge) {
        nextNodes = [falseEdge.target];
      }
    }

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [],
      [`Условие "${pattern}": ${matches ? 'выполнено' : 'не выполнено'}`]
    );
  }
}

/**
 * Исполнитель запроса ввода
 */
export class RequestInputExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const message = this.replaceVariables(node.data.message || 'Введите данные:', context);
    const variableName = node.data.variable || 'userInput';
    const nextNodes = this.getNextNodes(node.id, schema);

    // Отправляем сообщение с запросом ввода
    const action = {
      type: 'send_message' as const,
      data: {
        message,
        options: { forceReply: true }
      },
      nodeId: node.id
    };

    // Сохраняем состояние ожидания ввода
    const newUserState = {
      ...context.userState,
      waitingForInput: true,
      inputVariable: variableName,
      nextNodes: nextNodes
    };

    return this.createSuccessResult(
      [], // Не переходим к следующим узлам, ждем ввода
      context.variables,
      newUserState,
      [action],
      [`Запрошен ввод в переменную: ${variableName}`]
    );
  }
}

/**
 * Исполнитель установки переменной
 */
export class SetVariableExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const variableName = node.data.variable || 'temp';
    const value = this.replaceVariables(node.data.value || '', context);
    const nextNodes = this.getNextNodes(node.id, schema);

    const newVariables = {
      ...context.variables,
      [variableName]: value
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Установлена переменная ${variableName} = ${value}`]
    );
  }
}

/**
 * Исполнитель задержки
 */
export class DelayExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const duration = parseInt(node.data.duration || '1000');
    const nextNodes = this.getNextNodes(node.id, schema);

    const action = {
      type: 'delay' as const,
      data: { duration },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Задержка: ${duration}мс`]
    );
  }
}

/**
 * Исполнитель отправки медиа
 */
export class SendMediaExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const mediaType = node.data.mediaType || 'photo';
    const mediaUrl = this.replaceVariables(node.data.mediaUrl || '', context);
    const caption = this.replaceVariables(node.data.caption || '', context);
    const nextNodes = this.getNextNodes(node.id, schema);

    const action = {
      type: 'send_media' as const,
      data: {
        type: mediaType,
        media: mediaUrl,
        options: { caption }
      },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Отправлено медиа: ${mediaType} - ${mediaUrl}`]
    );
  }
}

/**
 * Исполнитель HTTP запроса
 */
export class HttpRequestExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const url = this.replaceVariables(node.data.url || '', context);
    const method = node.data.method || 'GET';
    const headers = node.data.headers || {};
    const body = node.data.body ? this.replaceVariables(JSON.stringify(node.data.body), context) : undefined;
    const responseVariable = node.data.responseVariable || 'httpResponse';
    const nextNodes = this.getNextNodes(node.id, schema);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.parse(body) : undefined
      });

      const responseData = await response.json();
      
      const newVariables = {
        ...context.variables,
        [responseVariable]: responseData,
        [`${responseVariable}_status`]: response.status
      };

      return this.createSuccessResult(
        nextNodes,
        newVariables,
        context.userState,
        [],
        [`HTTP запрос выполнен: ${method} ${url} -> ${response.status}`]
      );

    } catch (error) {
      return this.createErrorResult(
        `Ошибка HTTP запроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }
  }
}

/**
 * Исполнитель математических операций
 */
export class MathExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const operation = node.data.operation || 'add';
    const operand1 = parseFloat(this.replaceVariables(node.data.operand1 || '0', context));
    const operand2 = parseFloat(this.replaceVariables(node.data.operand2 || '0', context));
    const resultVariable = node.data.resultVariable || 'mathResult';
    const nextNodes = this.getNextNodes(node.id, schema);

    let result: number;

    switch (operation) {
      case 'add':
        result = operand1 + operand2;
        break;
      case 'subtract':
        result = operand1 - operand2;
        break;
      case 'multiply':
        result = operand1 * operand2;
        break;
      case 'divide':
        result = operand2 !== 0 ? operand1 / operand2 : 0;
        break;
      case 'modulo':
        result = operand2 !== 0 ? operand1 % operand2 : 0;
        break;
      default:
        result = 0;
    }

    const newVariables = {
      ...context.variables,
      [resultVariable]: result
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Математическая операция: ${operand1} ${operation} ${operand2} = ${result}`]
    );
  }
}