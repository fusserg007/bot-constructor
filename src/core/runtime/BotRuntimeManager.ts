/**
 * Менеджер выполнения ботов - интегрирует Schema Engine с системой ботов
 */

import { SchemaEngine, SchemaExecutionContext } from '../engine/SchemaEngine';
import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { MessengerPlatform, PlatformCredentials, Bot, BotSchema } from '../types';
import { IncomingMessage, CallbackQuery } from '../types';

export interface BotRuntimeConfig {
  botId: string;
  schema: BotSchema;
  platforms: Array<{
    platform: MessengerPlatform;
    credentials: PlatformCredentials;
    mode: 'polling' | 'webhook';
  }>;
}

export class BotRuntimeManager {
  private static instance: BotRuntimeManager;
  private schemaEngine: SchemaEngine;
  private adapterRegistry: AdapterRegistry;
  private activeBots: Map<string, BotRuntimeConfig> = new Map();
  private userSessions: Map<string, Record<string, any>> = new Map();

  private constructor() {
    this.schemaEngine = new SchemaEngine();
    this.adapterRegistry = AdapterRegistry.getInstance();
  }

  static getInstance(): BotRuntimeManager {
    if (!BotRuntimeManager.instance) {
      BotRuntimeManager.instance = new BotRuntimeManager();
    }
    return BotRuntimeManager.instance;
  }

  /**
   * Запустить бота
   */
  async startBot(config: BotRuntimeConfig): Promise<void> {
    console.log(`🚀 Запуск бота ${config.botId}...`);

    try {
      // Сохраняем конфигурацию
      this.activeBots.set(config.botId, config);

      // Инициализируем адаптеры для всех платформ
      for (const platformConfig of config.platforms) {
        await this.initializePlatform(config.botId, platformConfig);
      }

      console.log(`✅ Бот ${config.botId} успешно запущен на платформах:`, 
        config.platforms.map(p => p.platform).join(', '));

    } catch (error) {
      console.error(`❌ Ошибка запуска бота ${config.botId}:`, error);
      throw error;
    }
  }

  /**
   * Остановить бота
   */
  async stopBot(botId: string): Promise<void> {
    console.log(`🛑 Остановка бота ${botId}...`);

    try {
      // Удаляем адаптеры
      await this.adapterRegistry.removeAdaptersForBot(botId);

      // Удаляем конфигурацию
      this.activeBots.delete(botId);

      // Очищаем сессии пользователей для этого бота
      const sessionsToDelete: string[] = [];
      for (const [sessionKey] of this.userSessions) {
        if (sessionKey.startsWith(`${botId}-`)) {
          sessionsToDelete.push(sessionKey);
        }
      }
      sessionsToDelete.forEach(key => this.userSessions.delete(key));

      console.log(`✅ Бот ${botId} успешно остановлен`);

    } catch (error) {
      console.error(`❌ Ошибка остановки бота ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Перезапустить бота (обновить схему)
   */
  async restartBot(botId: string, newSchema: BotSchema): Promise<void> {
    console.log(`🔄 Перезапуск бота ${botId} с новой схемой...`);

    const config = this.activeBots.get(botId);
    if (!config) {
      throw new Error(`Bot ${botId} is not running`);
    }

    // Обновляем схему
    const newConfig = {
      ...config,
      schema: newSchema
    };

    // Перезапускаем
    await this.stopBot(botId);
    await this.startBot(newConfig);
  }

  /**
   * Инициализировать платформу для бота
   */
  private async initializePlatform(
    botId: string, 
    platformConfig: { platform: MessengerPlatform; credentials: PlatformCredentials; mode: 'polling' | 'webhook' }
  ): Promise<void> {
    const { platform, credentials, mode } = platformConfig;

    try {
      // Получаем адаптер
      const adapter = await this.adapterRegistry.getAdapter(botId, platform, credentials);

      // Подписываемся на события
      adapter.onMessage((message) => {
        this.handleIncomingMessage(botId, platform, message);
      });

      adapter.onCallback((callback) => {
        this.handleCallbackQuery(botId, platform, callback);
      });

      adapter.onError((error) => {
        console.error(`❌ Ошибка адаптера ${botId}-${platform}:`, error);
      });

      // Запускаем в нужном режиме
      if (mode === 'polling' && adapter.startPolling) {
        adapter.startPolling();
        console.log(`📡 Polling запущен для ${botId} на ${platform}`);
      } else if (mode === 'webhook' && adapter.setWebhook) {
        const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3002'}/webhook/${platform}/${botId}`;
        await adapter.setWebhook(webhookUrl);
        console.log(`🔗 Webhook установлен для ${botId} на ${platform}: ${webhookUrl}`);
      }

    } catch (error) {
      console.error(`❌ Ошибка инициализации платформы ${platform} для бота ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Обработать входящее сообщение
   */
  private async handleIncomingMessage(
    botId: string, 
    platform: MessengerPlatform, 
    message: IncomingMessage
  ): Promise<void> {
    console.log(`📨 Входящее сообщение для бота ${botId} на ${platform}:`, message.text);

    try {
      const config = this.activeBots.get(botId);
      if (!config) {
        console.error(`❌ Конфигурация бота ${botId} не найдена`);
        return;
      }

      // Получаем адаптер
      const adapter = await this.adapterRegistry.getAdapter(
        botId, 
        platform, 
        config.platforms.find(p => p.platform === platform)?.credentials || {}
      );

      // Получаем или создаем сессию пользователя
      const sessionKey = `${botId}-${message.userId}`;
      const sessionData = this.userSessions.get(sessionKey) || {};

      // Создаем контекст выполнения
      const context: SchemaExecutionContext = {
        userId: message.userId,
        chatId: message.chatId,
        platform,
        message: {
          text: message.text,
          messageId: message.id,
          timestamp: Date.now(),
          user: {
            id: message.userId
          }
        },
        variables: {
          messageText: message.text || '',
          userId: message.userId,
          chatId: message.chatId,
          platform,
          messageType: message.type
        },
        sessionData,
        adapter
      };

      // Выполняем схему
      const result = await this.schemaEngine.executeSchema(
        config.schema.nodes,
        config.schema.edges,
        context
      );

      // Сохраняем обновленные данные сессии
      if (Object.keys(result.finalSessionData).length > 0) {
        this.userSessions.set(sessionKey, result.finalSessionData);
      }

      // Логируем результат
      if (result.success) {
        console.log(`✅ Схема выполнена успешно для ${botId}. Узлы: ${result.executedNodes.join(' -> ')}`);
      } else {
        console.error(`❌ Ошибки выполнения схемы для ${botId}:`, result.errors);
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки сообщения для бота ${botId}:`, error);
    }
  }

  /**
   * Обработать callback запрос
   */
  private async handleCallbackQuery(
    botId: string, 
    platform: MessengerPlatform, 
    callback: CallbackQuery
  ): Promise<void> {
    console.log(`🔘 Callback запрос для бота ${botId} на ${platform}:`, callback.data);

    try {
      const config = this.activeBots.get(botId);
      if (!config) {
        console.error(`❌ Конфигурация бота ${botId} не найдена`);
        return;
      }

      // Получаем адаптер
      const adapter = await this.adapterRegistry.getAdapter(
        botId, 
        platform, 
        config.platforms.find(p => p.platform === platform)?.credentials || {}
      );

      // Получаем сессию пользователя
      const sessionKey = `${botId}-${callback.userId}`;
      const sessionData = this.userSessions.get(sessionKey) || {};

      // Создаем контекст выполнения
      const context: SchemaExecutionContext = {
        userId: callback.userId,
        chatId: callback.chatId,
        platform,
        message: {
          callbackData: callback.data,
          messageId: callback.messageId,
          timestamp: Date.now(),
          user: {
            id: callback.userId
          }
        },
        variables: {
          callbackData: callback.data,
          userId: callback.userId,
          chatId: callback.chatId,
          platform,
          messageId: callback.messageId
        },
        sessionData,
        adapter
      };

      // Выполняем схему
      const result = await this.schemaEngine.executeSchema(
        config.schema.nodes,
        config.schema.edges,
        context
      );

      // Сохраняем обновленные данные сессии
      if (Object.keys(result.finalSessionData).length > 0) {
        this.userSessions.set(sessionKey, result.finalSessionData);
      }

      // Логируем результат
      if (result.success) {
        console.log(`✅ Callback обработан успешно для ${botId}. Узлы: ${result.executedNodes.join(' -> ')}`);
      } else {
        console.error(`❌ Ошибки обработки callback для ${botId}:`, result.errors);
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки callback для бота ${botId}:`, error);
    }
  }

  /**
   * Получить статус всех активных ботов
   */
  getActiveBotsStatus(): Array<{
    botId: string;
    platforms: MessengerPlatform[];
    status: 'running' | 'error';
    uptime: number;
  }> {
    const status: Array<{
      botId: string;
      platforms: MessengerPlatform[];
      status: 'running' | 'error';
      uptime: number;
    }> = [];

    for (const [botId, config] of this.activeBots) {
      status.push({
        botId,
        platforms: config.platforms.map(p => p.platform),
        status: 'running', // TODO: реальная проверка статуса
        uptime: Date.now() // TODO: реальное время работы
      });
    }

    return status;
  }

  /**
   * Получить статистику выполнения схем
   */
  getExecutionStats() {
    return this.schemaEngine.getExecutionStats();
  }

  /**
   * Получить историю выполнения
   */
  getExecutionHistory(executionId?: string) {
    return this.schemaEngine.getExecutionHistory(executionId);
  }

  /**
   * Очистить сессии пользователей
   */
  clearUserSessions(botId?: string): void {
    if (botId) {
      const sessionsToDelete: string[] = [];
      for (const [sessionKey] of this.userSessions) {
        if (sessionKey.startsWith(`${botId}-`)) {
          sessionsToDelete.push(sessionKey);
        }
      }
      sessionsToDelete.forEach(key => this.userSessions.delete(key));
    } else {
      this.userSessions.clear();
    }
  }

  /**
   * Остановить все боты
   */
  async dispose(): Promise<void> {
    console.log('🛑 Остановка всех ботов...');

    const stopPromises = Array.from(this.activeBots.keys())
      .map(botId => this.stopBot(botId));

    await Promise.all(stopPromises);
    
    await this.adapterRegistry.dispose();
    this.userSessions.clear();

    console.log('✅ Все боты остановлены');
  }
}