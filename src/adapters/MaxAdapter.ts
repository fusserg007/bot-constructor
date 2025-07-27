/**
 * MAX адаптер для мультиплатформенного конструктора ботов
 */

import { MessengerAdapter } from '../core/adapters/MessengerAdapter';
import {
  PlatformCredentials,
  PlatformCapabilities,
  IncomingMessage,
  CallbackQuery,
  Message,
  MediaMessage,
  WebhookRequest
} from '../core/types';

export class MaxAdapter extends MessengerAdapter {
  private apiKey: string = '';
  private secretKey: string = '';
  private baseUrl: string = 'https://api.max.ru/v1';

  constructor() {
    super('max');
  }

  async initialize(credentials: PlatformCredentials): Promise<void> {
    if (!credentials.max?.apiKey || !credentials.max?.secretKey) {
      throw new Error('MAX API key and secret key are required');
    }

    this.apiKey = credentials.max.apiKey;
    this.secretKey = credentials.max.secretKey;
    this.credentials = credentials;

    // Проверяем валидность ключей
    const isValid = await this.validateCredentials(credentials);
    if (!isValid) {
      throw new Error('Invalid MAX credentials');
    }

    this.isInitialized = true;
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    if (!credentials.max?.apiKey || !credentials.max?.secretKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.max.apiKey}`,
          'X-Secret-Key': credentials.max.secretKey
        }
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('MAX credentials validation error:', error);
      return false;
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      supportsInlineButtons: true,
      supportsMedia: true,
      supportsFiles: true,
      supportsWebhooks: true,
      supportsPolling: false, // MAX может не поддерживать polling
      maxMessageLength: 2000, // Примерное ограничение
      supportedMediaTypes: ['photo', 'video', 'audio', 'document']
    };
  }

  async sendMessage(chatId: string, message: Message): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MAX adapter not initialized');
    }

    const payload: any = {
      chat_id: chatId,
      text: message.text,
      parse_mode: message.parseMode || 'HTML',
      disable_web_page_preview: message.disablePreview || false
    };

    // Добавляем кнопки если есть
    if (message.buttons && message.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: [
          message.buttons.map(button => ({
            text: button.text,
            callback_data: button.callbackData,
            url: button.url
          }))
        ]
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Secret-Key': this.secretKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`MAX API error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending MAX message:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  async sendMedia(chatId: string, media: MediaMessage): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MAX adapter not initialized');
    }

    const payload: any = {
      chat_id: chatId,
      type: media.type,
      media: media.url || media.file,
      caption: media.caption,
      parse_mode: media.parseMode || 'HTML'
    };

    // Добавляем кнопки если есть
    if (media.buttons && media.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: [
          media.buttons.map(button => ({
            text: button.text,
            callback_data: button.callbackData,
            url: button.url
          }))
        ]
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/media/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Secret-Key': this.secretKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`MAX API error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending MAX media:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  /**
   * Обработка webhook от MAX
   */
  processWebhook(update: any): void {
    try {
      // Обработка сообщений
      if (update.message) {
        const message: IncomingMessage = {
          id: update.message.id,
          platform: 'max',
          chatId: update.message.chat_id,
          userId: update.message.user_id,
          text: update.message.text || '',
          type: update.message.type || 'text',
          data: update.message,
          timestamp: new Date(update.message.timestamp || Date.now()).toISOString()
        };
        this.emitMessage(message);
      }

      // Обработка callback запросов
      if (update.callback_query) {
        const callback: CallbackQuery = {
          id: update.callback_query.id,
          platform: 'max',
          chatId: update.callback_query.chat_id,
          userId: update.callback_query.user_id,
          data: update.callback_query.data,
          messageId: update.callback_query.message_id,
          timestamp: new Date(update.callback_query.timestamp || Date.now()).toISOString()
        };
        this.emitCallback(callback);
      }
    } catch (error) {
      console.error('Error processing MAX webhook:', error);
      this.emitError(error as Error);
    }
  }

  /**
   * Установка webhook
   */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('MAX adapter not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/webhook/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Secret-Key': this.secretKey
        },
        body: JSON.stringify({ 
          url: url,
          secret_token: this.secretKey
        })
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error setting MAX webhook:', error);
      return false;
    }
  }

  /**
   * Удаление webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('MAX adapter not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/webhook/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Secret-Key': this.secretKey
        }
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error deleting MAX webhook:', error);
      return false;
    }
  }

  async handleWebhook(request: WebhookRequest): Promise<void> {
    if (request.platform !== 'max') {
      throw new Error('Invalid platform for MAX webhook');
    }

    try {
      const update = request.body;
      this.processUpdate(update);
    } catch (error) {
      console.error('MAX webhook error:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  async startPolling(): Promise<void> {
    throw new Error('MAX adapter does not support polling');
  }

  async stopPolling(): Promise<void> {
    throw new Error('MAX adapter does not support polling');
  }

  private processUpdate(update: any): void {
    try {
      // Обработка обычных сообщений
      if (update.message) {
        const message: IncomingMessage = {
          id: update.message.id.toString(),
          platform: 'max',
          chatId: update.message.chat_id.toString(),
          userId: update.message.user_id.toString(),
          text: update.message.text,
          type: update.message.type || 'text',
          data: update.message,
          timestamp: update.message.timestamp || new Date().toISOString()
        };

        this.emitMessage(message);
      }

      // Обработка callback запросов
      if (update.callback_query) {
        const callback: CallbackQuery = {
          id: update.callback_query.id,
          platform: 'max',
          chatId: update.callback_query.chat_id.toString(),
          userId: update.callback_query.user_id.toString(),
          data: update.callback_query.data,
          messageId: update.callback_query.message_id?.toString(),
          timestamp: update.callback_query.timestamp || new Date().toISOString()
        };

        this.emitCallback(callback);
      }
    } catch (error) {
      console.error('Error processing MAX update:', error);
      this.emitError(error as Error);
    }
  }

  async dispose(): Promise<void> {
    this.removeAllListeners();
    this.isInitialized = false;
    console.log('MAX adapter disposed');
  }
}