/**
 * Интеграция движка выполнения схем с основной системой
 */
import { SchemaExecutionEngine } from './SchemaExecutionEngine';
import { UserStateManager } from './UserStateManager';
import { ErrorHandler } from './ErrorHandler';
import { BotSchema } from '../types';
import { MessengerAdapter } from '../adapters/MessengerAdapter';

export interface BotMessage {
  userId: string;
  chatId: string;
  messageId?: string;
  text?: string;
  command?: string;
  callbackData?: string;
  platform: string;
  timestamp: number;
}

export interface BotResponse {
  success: boolean;
  responses: Array<{
    type: 'message' | 'media' | 'action';
    data: any;
  }>;
  errors: string[];
  userState: Record<string, any>;
}

export class SchemaEngineIntegration {
  private static instance: SchemaEngineIntegration;
  private executionEngine: SchemaExecutionEngine;
  private userStateManager: UserStateManager;
  private errorHandler: ErrorHandler;
  private activeSchemas: Map<string, BotSchema> = new Map();

  private constructor() {
    this.executionEngine = new SchemaExecutionEngine();
    this.userStateManager = UserStateManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getInstance(): SchemaEngineIntegration {
    if (!SchemaEngineIntegration.instance) {
      SchemaEngineIntegration.instance = new SchemaEngineIntegration();
    }
    return SchemaEngineIntegration.instance;
  }

  /**
   * Зарегистрировать схему бота
   */
  registerBotSchema(botId: string, schema: BotSchema): void {
    this.activeSchemas.set(botId, schema);
    console.log(`Зарегистрирована схема бота: ${botId} (${schema.name})`);
  }

  /**
   * Удалить схему бота
   */
  unregisterBotSchema(botId: string): void {
    this.activeSchemas.delete(botId);
    console.log(`Удалена схема бота: ${botId}`);
  }

  /**
   * Обработать сообщение пользователя
   */
  async processMessage(
    botId: string,
    message: BotMessage,
    adapter: MessengerAdapter
  ): Promise<BotResponse> {
    try {
      const schema = this.activeSchemas.get(botId);
      if (!schema) {
        return {
          success: false,
          responses: [],
          errors: [`Схема бота ${botId} не найдена`],
          userState: {}
        };
      }

      // Получаем сессию пользователя
      const userSession = this.userStateManager.getUserSession(
        message.platform,
        message.userId,
        message.chatId
      );

      // Создаем контекст выполнения
      const context = this.executionEngine.createExecutionContext(
        message.userId,
        message.chatId,
        message.platform,
        {
          messageText: message.text || '',
          messageId: message.messageId,
          ...userSession.variables
        }
      );

      // Обновляем состояние пользователя в контексте
      context.userState = userSession.state;

      let result;

      // Проверяем, ожидает ли пользователь ввода
      if (userSession.waitingForInput && message.text) {
        const inputResult = this.userStateManager.processUserInput(
          message.platform,
          message.userId,
          message.chatId,
          message.text
        );

        if (inputResult.processed && inputResult.nextNodes) {
          // Обновляем переменные в контексте
          context.variables = {
            ...context.variables,
            ...this.userStateManager.getUserSession(message.platform, message.userId, message.chatId).variables
          };

          // Выполняем следующие узлы
          result = {
            success: true,
            nextNodes: [],
            variables: context.variables,
            userState: context.userState,
            actions: [],
            errors: [],
            logs: []
          };

          for (const nodeId of inputResult.nextNodes) {
            const nodeResult = await this.executionEngine.executeNode(
              nodeId,
              schema,
              context,
              adapter
            );

            // Объединяем результаты
            result.actions.push(...nodeResult.actions);
            result.errors.push(...nodeResult.errors);
            result.logs.push(...nodeResult.logs);
            result.variables = { ...result.variables, ...nodeResult.variables };
            result.userState = { ...result.userState, ...nodeResult.userState };
            result.success = result.success && nodeResult.success;
          }
        } else {
          // Если ввод не был обработан, обрабатываем как обычное сообщение
          result = await this.processNormalMessage(schema, message, context, adapter);
        }
      } else {
        // Обычная обработка сообщения
        result = await this.processNormalMessage(schema, message, context, adapter);
      }

      // Обновляем сессию пользователя
      userSession.variables = { ...userSession.variables, ...result.variables };
      userSession.state = { ...userSession.state, ...result.userState };
      this.userStateManager.updateUserSession(userSession);

      // Формируем ответ
      const responses = result.actions.map(action => ({
        type: action.type === 'send_message' ? 'message' as const : 
              action.type === 'send_media' ? 'media' as const : 'action' as const,
        data: action.data
      }));

      return {
        success: result.success,
        responses,
        errors: result.errors,
        userState: result.userState
      };

    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error);
      
      return {
        success: false,
        responses: [{
          type: 'message',
          data: {
            message: 'Произошла ошибка при обработке вашего сообщения. Попробуйте позже.',
            options: {}
          }
        }],
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
        userState: {}
      };
    }
  }

  /**
   * Получить статистику работы движка
   */
  getEngineStats(): {
    activeBots: number;
    totalSessions: number;
    activeSessions: number;
    totalErrors: number;
    sessionsByPlatform: Record<string, number>;
    errorsByType: Record<string, number>;
  } {
    const sessionStats = this.userStateManager.getSessionStats();
    const errorStats = this.errorHandler.getErrorStats();

    return {
      activeBots: this.activeSchemas.size,
      totalSessions: sessionStats.totalSessions,
      activeSessions: sessionStats.activeSessions,
      totalErrors: errorStats.totalErrors,
      sessionsByPlatform: sessionStats.sessionsByPlatform,
      errorsByType: errorStats.errorsByType
    };
  }

  /**
   * Очистить состояние пользователя
   */
  clearUserState(platform: string, userId: string, chatId: string): void {
    this.userStateManager.clearUserSession(platform, userId, chatId);
  }

  /**
   * Получить активные схемы
   */
  getActiveSchemas(): Array<{ botId: string; schema: BotSchema }> {
    return Array.from(this.activeSchemas.entries()).map(([botId, schema]) => ({
      botId,
      schema
    }));
  }

  /**
   * Остановить выполнение для пользователя
   */
  stopUserExecution(platform: string, userId: string, chatId: string): void {
    const userSession = this.userStateManager.getUserSession(platform, userId, chatId);
    if (userSession.sessionId) {
      this.executionEngine.stopExecution(userSession.sessionId);
    }
  }

  /**
   * Обработать обычное сообщение
   */
  private async processNormalMessage(
    schema: BotSchema,
    message: BotMessage,
    context: any,
    adapter: MessengerAdapter
  ) {
    // Определяем тип триггера
    let triggerType: string;
    let triggerData: any;

    if (message.command) {
      triggerType = 'command';
      triggerData = { command: message.command };
    } else if (message.callbackData) {
      triggerType = 'callback';
      triggerData = { callbackData: message.callbackData };
    } else {
      triggerType = 'message';
      triggerData = { text: message.text };
    }

    // Выполняем схему
    return await this.executionEngine.executeSchema(
      schema,
      triggerType,
      triggerData,
      context,
      adapter
    );
  }

  /**
   * Валидировать схему перед регистрацией
   */
  validateSchema(schema: BotSchema): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверяем обязательные поля
    if (!schema.id) errors.push('ID схемы обязателен');
    if (!schema.name) errors.push('Название схемы обязательно');
    if (!schema.nodes || schema.nodes.length === 0) {
      errors.push('Схема должна содержать хотя бы один узел');
    }

    // Проверяем узлы
    if (schema.nodes) {
      const nodeIds = new Set<string>();
      
      schema.nodes.forEach((node, index) => {
        if (!node.id) {
          errors.push(`Узел ${index} не имеет ID`);
        } else if (nodeIds.has(node.id)) {
          errors.push(`Дублирующийся ID узла: ${node.id}`);
        } else {
          nodeIds.add(node.id);
        }

        if (!node.type) {
          errors.push(`Узел ${node.id} не имеет типа`);
        }
      });

      // Проверяем связи
      if (schema.edges) {
        schema.edges.forEach((edge, index) => {
          if (!edge.source || !edge.target) {
            errors.push(`Связь ${index} не имеет источника или цели`);
          } else {
            if (!nodeIds.has(edge.source)) {
              errors.push(`Связь ${index} ссылается на несуществующий узел-источник: ${edge.source}`);
            }
            if (!nodeIds.has(edge.target)) {
              errors.push(`Связь ${index} ссылается на несуществующий узел-цель: ${edge.target}`);
            }
          }
        });
      }

      // Проверяем наличие триггеров
      const triggerNodes = schema.nodes.filter(node => node.type.startsWith('trigger-'));
      if (triggerNodes.length === 0) {
        warnings.push('Схема не содержит триггеров');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}