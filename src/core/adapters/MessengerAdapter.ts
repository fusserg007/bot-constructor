/**
 * Базовый интерфейс для адаптеров мессенджеров
 * Обеспечивает единый API для работы с различными платформами
 */

import {
  MessengerPlatform,
  PlatformCredentials,
  PlatformCapabilities,
  IncomingMessage,
  CallbackQuery,
  Message,
  MediaMessage,
  WebhookRequest
} from '../types';

export abstract class MessengerAdapter {
  protected platform: MessengerPlatform;
  protected credentials?: PlatformCredentials;
  protected isInitialized: boolean = false;

  constructor(platform: MessengerPlatform) {
    this.platform = platform;
  }

  /**
   * Получить платформу адаптера
   */
  getPlatform(): MessengerPlatform {
    return this.platform;
  }

  /**
   * Проверить, инициализирован ли адаптер
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Инициализация адаптера с учетными данными
   */
  abstract initialize(credentials: PlatformCredentials): Promise<void>;

  /**
   * Валидация учетных данных
   */
  abstract validateCredentials(credentials: PlatformCredentials): Promise<boolean>;

  /**
   * Получить возможности платформы
   */
  abstract getCapabilities(): PlatformCapabilities;

  /**
   * Отправка текстового сообщения
   */
  abstract sendMessage(chatId: string, message: Message): Promise<void>;

  /**
   * Отправка медиа сообщения
   */
  abstract sendMedia(chatId: string, media: MediaMessage): Promise<void>;

  /**
   * Начать polling (если поддерживается)
   */
  abstract startPolling?(): void;

  /**
   * Остановить polling (если поддерживается)
   */
  abstract stopPolling?(): void;

  /**
   * Обработать webhook запрос (если поддерживается)
   */
  abstract handleWebhook?(request: WebhookRequest): Promise<void>;

  /**
   * Установить webhook URL (если поддерживается)
   */
  abstract setWebhook?(url: string): Promise<boolean>;

  /**
   * Удалить webhook (если поддерживается)
   */
  abstract deleteWebhook?(): Promise<boolean>;

  /**
   * Обработчик входящих сообщений
   */
  protected messageHandlers: Array<(message: IncomingMessage) => void> = [];

  /**
   * Обработчик callback запросов
   */
  protected callbackHandlers: Array<(callback: CallbackQuery) => void> = [];

  /**
   * Обработчик ошибок
   */
  protected errorHandlers: Array<(error: Error) => void> = [];

  /**
   * Подписаться на входящие сообщения
   */
  onMessage(handler: (message: IncomingMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Подписаться на callback запросы
   */
  onCallback(handler: (callback: CallbackQuery) => void): void {
    this.callbackHandlers.push(handler);
  }

  /**
   * Подписаться на ошибки
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Вызвать обработчики сообщений
   */
  protected emitMessage(message: IncomingMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.emitError(error as Error);
      }
    });
  }

  /**
   * Вызвать обработчики callback'ов
   */
  protected emitCallback(callback: CallbackQuery): void {
    this.callbackHandlers.forEach(handler => {
      try {
        handler(callback);
      } catch (error) {
        this.emitError(error as Error);
      }
    });
  }

  /**
   * Вызвать обработчики ошибок
   */
  protected emitError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }

  /**
   * Очистить все обработчики
   */
  removeAllListeners(): void {
    this.messageHandlers = [];
    this.callbackHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * Освободить ресурсы адаптера
   */
  abstract dispose(): Promise<void>;
}