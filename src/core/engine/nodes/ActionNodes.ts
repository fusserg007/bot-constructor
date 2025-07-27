/**
 * Исполнители узлов действий
 */
import { Node, BotSchema } from '../../types';
import { ExecutionContext, ExecutionResult } from '../SchemaExecutionEngine';
import { BaseNodeExecutor } from './BaseNodeExecutor';

/**
 * Исполнитель отправки сообщения
 */
export class SendMessageExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const message = this.replaceVariables(node.data.message || '', context);
    const parseMode = node.data.parseMode || 'text'; // text, markdown, html
    const disablePreview = node.data.disablePreview || false;
    const replyToMessage = node.data.replyToMessage || false;
    const nextNodes = this.getNextNodes(node.id, schema);
    
    const action = {
      type: 'send_message' as const,
      data: {
        message,
        options: {
          parseMode,
          disablePreview,
          replyToMessage: replyToMessage ? context.messageId : undefined
        }
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
 * Исполнитель отправки медиа
 */
export class SendMediaExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const mediaType = node.data.mediaType || 'photo'; // photo, video, audio, document
    const mediaUrl = this.replaceVariables(node.data.mediaUrl || '', context);
    const caption = this.replaceVariables(node.data.caption || '', context);
    const fileName = node.data.fileName || '';
    const nextNodes = this.getNextNodes(node.id, schema);

    const action = {
      type: 'send_media' as const,
      data: {
        type: mediaType,
        media: mediaUrl,
        options: { 
          caption,
          fileName: fileName || undefined
        }
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
 * Исполнитель отправки клавиатуры
 */
export class SendKeyboardExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const message = this.replaceVariables(node.data.message || '', context);
    const keyboardType = node.data.keyboardType || 'inline'; // inline, reply
    const buttons = node.data.buttons || [];
    const oneTime = node.data.oneTime || false;
    const resize = node.data.resize || true;
    const nextNodes = this.getNextNodes(node.id, schema);

    // Обрабатываем кнопки, заменяя переменные
    const processedButtons = buttons.map((row: any[]) => 
      row.map((button: any) => ({
        text: this.replaceVariables(button.text || '', context),
        callbackData: button.callbackData || '',
        url: button.url ? this.replaceVariables(button.url, context) : undefined
      }))
    );

    const action = {
      type: 'send_message' as const,
      data: {
        message,
        options: {
          keyboard: {
            type: keyboardType,
            buttons: processedButtons,
            oneTime,
            resize
          }
        }
      },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Отправлена клавиатура с ${buttons.length} рядами кнопок`]
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
    const inputType = node.data.inputType || 'text'; // text, number, email, phone
    const validation = node.data.validation || {};
    const timeout = node.data.timeout || 300000; // 5 минут по умолчанию
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
      inputType,
      validation,
      timeout: Date.now() + timeout,
      nextNodes: nextNodes
    };

    return this.createSuccessResult(
      [], // Не переходим к следующим узлам, ждем ввода
      context.variables,
      newUserState,
      [action],
      [`Запрошен ввод в переменную: ${variableName} (тип: ${inputType})`]
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
    const valueType = node.data.valueType || 'string'; // string, number, boolean, json
    const nextNodes = this.getNextNodes(node.id, schema);

    let processedValue: any = value;

    // Обрабатываем значение в зависимости от типа
    try {
      switch (valueType) {
        case 'number':
          processedValue = parseFloat(value);
          if (isNaN(processedValue)) {
            return this.createErrorResult(
              `Невозможно преобразовать "${value}" в число`,
              context.variables,
              context.userState
            );
          }
          break;
        case 'boolean':
          processedValue = value.toLowerCase() === 'true' || value === '1';
          break;
        case 'json':
          processedValue = JSON.parse(value);
          break;
        default:
          processedValue = value;
      }
    } catch (error) {
      return this.createErrorResult(
        `Ошибка обработки значения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        context.variables,
        context.userState
      );
    }

    const newVariables = {
      ...context.variables,
      [variableName]: processedValue
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Установлена переменная ${variableName} = ${processedValue} (${valueType})`]
    );
  }
}

/**
 * Исполнитель задержки
 */
export class DelayExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const duration = parseInt(this.replaceVariables(node.data.duration || '1000', context));
    const unit = node.data.unit || 'ms'; // ms, s, m, h
    const nextNodes = this.getNextNodes(node.id, schema);

    let delayMs = duration;
    switch (unit) {
      case 's':
        delayMs = duration * 1000;
        break;
      case 'm':
        delayMs = duration * 60 * 1000;
        break;
      case 'h':
        delayMs = duration * 60 * 60 * 1000;
        break;
    }

    const action = {
      type: 'delay' as const,
      data: { duration: delayMs },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Задержка: ${duration}${unit} (${delayMs}мс)`]
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
    const timeout = node.data.timeout || 10000;
    const nextNodes = this.getNextNodes(node.id, schema);

    try {
      // Обрабатываем заголовки
      const processedHeaders: Record<string, string> = {};
      Object.entries(headers).forEach(([key, value]) => {
        processedHeaders[key] = this.replaceVariables(String(value), context);
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...processedHeaders
        },
        body: body ? JSON.parse(body) : undefined,
        signal: AbortSignal.timeout(timeout)
      });

      const responseData = await response.json();
      
      const newVariables = {
        ...context.variables,
        [responseVariable]: responseData,
        [`${responseVariable}_status`]: response.status,
        [`${responseVariable}_headers`]: Object.fromEntries(response.headers.entries())
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
 * Исполнитель записи в файл/базу данных
 */
export class SaveDataExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const dataType = node.data.dataType || 'json'; // json, csv, txt
    const fileName = this.replaceVariables(node.data.fileName || 'data.json', context);
    const data = node.data.data || context.variables;
    const append = node.data.append || false;
    const nextNodes = this.getNextNodes(node.id, schema);

    // В реальной реализации здесь была бы запись в файл или базу данных
    // Пока что просто логируем
    const action = {
      type: 'save_data' as const,
      data: {
        dataType,
        fileName,
        data,
        append
      },
      nodeId: node.id
    };

    const newVariables = {
      ...context.variables,
      lastSavedFile: fileName,
      lastSavedAt: Date.now()
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [action],
      [`Данные сохранены в ${fileName} (${dataType})`]
    );
  }
}

/**
 * Исполнитель отправки уведомления
 */
export class SendNotificationExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const notificationType = node.data.notificationType || 'info'; // info, warning, error, success
    const title = this.replaceVariables(node.data.title || '', context);
    const message = this.replaceVariables(node.data.message || '', context);
    const recipients = node.data.recipients || [context.userId];
    const nextNodes = this.getNextNodes(node.id, schema);

    const action = {
      type: 'send_notification' as const,
      data: {
        type: notificationType,
        title,
        message,
        recipients
      },
      nodeId: node.id
    };

    return this.createSuccessResult(
      nextNodes,
      context.variables,
      context.userState,
      [action],
      [`Отправлено уведомление: ${title} (${notificationType})`]
    );
  }
}

/**
 * Исполнитель логирования
 */
export class LogExecutor extends BaseNodeExecutor {
  async execute(node: Node, context: ExecutionContext, schema: BotSchema): Promise<ExecutionResult> {
    const logLevel = node.data.logLevel || 'info'; // debug, info, warn, error
    const message = this.replaceVariables(node.data.message || '', context);
    const includeContext = node.data.includeContext || false;
    const nextNodes = this.getNextNodes(node.id, schema);

    const logData = {
      level: logLevel,
      message,
      timestamp: new Date().toISOString(),
      userId: context.userId,
      chatId: context.chatId,
      platform: context.platform,
      nodeId: node.id
    };

    if (includeContext) {
      (logData as any).context = {
        variables: context.variables,
        userState: context.userState
      };
    }

    // В реальной реализации здесь была бы запись в систему логирования
    console.log(`[${logLevel.toUpperCase()}] ${message}`, logData);

    const newVariables = {
      ...context.variables,
      lastLogMessage: message,
      lastLogLevel: logLevel,
      lastLogTime: Date.now()
    };

    return this.createSuccessResult(
      nextNodes,
      newVariables,
      context.userState,
      [],
      [`Записан лог: ${message} (${logLevel})`]
    );
  }
}