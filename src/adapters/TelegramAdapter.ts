/**
 * Расширенный Telegram адаптер для мультиплатформенного конструктора ботов
 * Поддерживает polling и webhook режимы, все типы сообщений и событий
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

interface TelegramUpdate {
  update_id: number;
  message?: any;
  edited_message?: any;
  channel_post?: any;
  edited_channel_post?: any;
  callback_query?: any;
  inline_query?: any;
  chosen_inline_result?: any;
  shipping_query?: any;
  pre_checkout_query?: any;
  poll?: any;
  poll_answer?: any;
  my_chat_member?: any;
  chat_member?: any;
  chat_join_request?: any;
}

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

interface TelegramApiResponse<T = any> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export class TelegramAdapter extends MessengerAdapter {
  private token: string = '';
  private pollingInterval?: ReturnType<typeof setInterval>;
  private lastUpdateId: number = 0;
  private isPolling: boolean = false;
  private botInfo?: TelegramBotInfo;
  private webhookUrl?: string;
  private pollingTimeout: number = 30;
  private pollingLimit: number = 100;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    super('telegram');
  }

  async initialize(credentials: PlatformCredentials): Promise<void> {
    if (!credentials.telegram?.token) {
      throw new Error('Telegram token is required');
    }

    this.token = credentials.telegram.token;
    this.credentials = credentials;

    // Настройки из credentials
    if (credentials.telegram.pollingTimeout) {
      this.pollingTimeout = credentials.telegram.pollingTimeout;
    }
    if (credentials.telegram.pollingLimit) {
      this.pollingLimit = credentials.telegram.pollingLimit;
    }

    // Проверяем валидность токена и получаем информацию о боте
    const isValid = await this.validateCredentials(credentials);
    if (!isValid) {
      throw new Error('Invalid Telegram token');
    }

    // Получаем информацию о боте
    await this.getBotInfo();

    this.isInitialized = true;
    console.log(`Telegram adapter initialized for bot: ${this.botInfo?.username}`);
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    if (!credentials.telegram?.token) {
      return false;
    }

    try {
      const response = await this.makeApiCall('getMe');
      return response.ok === true;
    } catch (error) {
      console.error('Telegram credentials validation error:', error);
      return false;
    }
  }

  /**
   * Получить информацию о боте
   */
  async getBotInfo(): Promise<TelegramBotInfo | null> {
    try {
      const response = await this.makeApiCall<TelegramBotInfo>('getMe');
      if (response.ok && response.result) {
        this.botInfo = response.result;
        return response.result;
      }
      return null;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      supportsInlineButtons: true,
      supportsMedia: true,
      supportsFiles: true,
      supportsWebhooks: true,
      supportsPolling: true,
      maxMessageLength: 4096,
      supportedMediaTypes: ['photo', 'video', 'audio', 'document', 'sticker', 'voice', 'video_note', 'animation'],
      supportsInlineQueries: this.botInfo?.supports_inline_queries || false,
      supportsGroupChats: this.botInfo?.can_join_groups || false,
      supportsChannels: true,
      supportsCallbacks: true,
      supportsCommands: true,
      supportsMarkdown: true,
      supportsHTML: true
    };
  }

  async sendMessage(chatId: string, message: Message): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    // Проверяем длину сообщения
    if (message.text && message.text.length > 4096) {
      // Разбиваем длинное сообщение на части
      await this.sendLongMessage(chatId, message);
      return;
    }

    const payload: any = {
      chat_id: chatId,
      text: message.text || 'Empty message',
      parse_mode: message.parseMode || 'HTML',
      disable_web_page_preview: message.disablePreview || false,
      disable_notification: message.silent || false
    };

    // Добавляем reply_to_message_id если указан
    if (message.replyToMessageId) {
      payload.reply_to_message_id = parseInt(message.replyToMessageId);
    }

    // Добавляем inline кнопки если есть
    if (message.buttons && message.buttons.length > 0) {
      payload.reply_markup = this.buildInlineKeyboard(message.buttons);
    }

    try {
      const response = await this.makeApiCall('sendMessage', payload);
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.description}`);
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  /**
   * Отправка длинного сообщения по частям
   */
  private async sendLongMessage(chatId: string, message: Message): Promise<void> {
    const maxLength = 4096;
    const text = message.text || '';
    const parts = [];

    for (let i = 0; i < text.length; i += maxLength) {
      parts.push(text.substring(i, i + maxLength));
    }

    for (let i = 0; i < parts.length; i++) {
      const partMessage: Message = {
        ...message,
        text: parts[i],
        buttons: i === parts.length - 1 ? message.buttons : undefined // Кнопки только в последней части
      };

      await this.sendMessage(chatId, partMessage);
      
      // Небольшая задержка между частями
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Построение inline клавиатуры
   */
  private buildInlineKeyboard(buttons: any[]): any {
    // Группируем кнопки по рядам (максимум 3 кнопки в ряду)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      const row = buttons.slice(i, i + 3).map(button => ({
        text: button.text,
        callback_data: button.callbackData,
        url: button.url,
        switch_inline_query: button.switchInlineQuery,
        switch_inline_query_current_chat: button.switchInlineQueryCurrentChat
      }));
      rows.push(row);
    }

    return {
      inline_keyboard: rows
    };
  }

  async sendMedia(chatId: string, media: MediaMessage): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    const methodMap: Record<string, string> = {
      'photo': 'sendPhoto',
      'video': 'sendVideo',
      'audio': 'sendAudio',
      'document': 'sendDocument',
      'sticker': 'sendSticker',
      'voice': 'sendVoice',
      'video_note': 'sendVideoNote',
      'animation': 'sendAnimation'
    };

    const method = methodMap[media.type];
    if (!method) {
      throw new Error(`Unsupported media type: ${media.type}`);
    }

    const payload: any = {
      chat_id: chatId,
      [media.type]: media.url || media.file,
      caption: media.caption,
      parse_mode: media.parseMode || 'HTML',
      disable_notification: media.silent || false
    };

    // Специфичные параметры для разных типов медиа
    if (media.type === 'video') {
      payload.width = media.width;
      payload.height = media.height;
      payload.duration = media.duration;
      payload.supports_streaming = media.supportsStreaming;
    }

    if (media.type === 'audio') {
      payload.duration = media.duration;
      payload.performer = media.performer;
      payload.title = media.title;
    }

    if (media.type === 'voice') {
      payload.duration = media.duration;
    }

    if (media.type === 'video_note') {
      payload.duration = media.duration;
      payload.length = media.length;
    }

    // Добавляем reply_to_message_id если указан
    if (media.replyToMessageId) {
      payload.reply_to_message_id = parseInt(media.replyToMessageId);
    }

    // Добавляем inline кнопки если есть
    if (media.buttons && media.buttons.length > 0) {
      payload.reply_markup = this.buildInlineKeyboard(media.buttons);
    }

    try {
      const response = await this.makeApiCall(method, payload);
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.description}`);
      }
    } catch (error) {
      console.error('Error sending Telegram media:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  /**
   * Отправка группы медиа (альбом)
   */
  async sendMediaGroup(chatId: string, mediaGroup: MediaMessage[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    if (mediaGroup.length < 2 || mediaGroup.length > 10) {
      throw new Error('Media group must contain 2-10 items');
    }

    const media = mediaGroup.map((item, index) => ({
      type: item.type,
      media: item.url || item.file,
      caption: index === 0 ? item.caption : undefined, // Подпись только у первого элемента
      parse_mode: item.parseMode || 'HTML'
    }));

    const payload = {
      chat_id: chatId,
      media: media,
      disable_notification: mediaGroup[0].silent || false
    };

    try {
      const response = await this.makeApiCall('sendMediaGroup', payload);
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.description}`);
      }
    } catch (error) {
      console.error('Error sending Telegram media group:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('Telegram polling already running');
      return;
    }

    // Удаляем webhook перед началом polling
    await this.deleteWebhook();

    this.isPolling = true;
    
    // Запускаем непрерывный polling
    this.continuousPolling();

    console.log(`Telegram polling started for bot: ${this.botInfo?.username}`);
  }

  async stopPolling(): Promise<void> {
    this.isPolling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    
    console.log('Telegram polling stopped');
  }

  /**
   * Непрерывный polling с обработкой ошибок
   */
  private async continuousPolling(): Promise<void> {
    while (this.isPolling) {
      try {
        await this.pollUpdates();
      } catch (error) {
        console.error('Polling error:', error);
        this.emitError(error as Error);
        
        // Ждем перед повторной попыткой
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  /**
   * Выполнить одиночный poll для получения обновлений
   * Используется PollingManager'ом
   */
  async pollUpdates(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    const params = {
      offset: this.lastUpdateId + 1,
      limit: this.pollingLimit,
      timeout: this.pollingTimeout,
      allowed_updates: [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'callback_query',
        'inline_query',
        'chosen_inline_result',
        'shipping_query',
        'pre_checkout_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request'
      ]
    };

    try {
      const response = await this.makeApiCall<TelegramUpdate[]>('getUpdates', params);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.description}`);
      }

      if (response.result && response.result.length > 0) {
        console.log(`Processing ${response.result.length} updates`);
        
        for (const update of response.result) {
          try {
            await this.processUpdate(update);
            this.lastUpdateId = update.update_id;
          } catch (updateError) {
            console.error(`Error processing update ${update.update_id}:`, updateError);
            this.emitError(updateError as Error);
          }
        }
      }
    } catch (error) {
      console.error('Telegram polling error:', error);
      throw error;
    }
  }

  async handleWebhook(request: WebhookRequest): Promise<void> {
    if (request.platform !== 'telegram') {
      throw new Error('Invalid platform for Telegram webhook');
    }

    try {
      const update = request.body as TelegramUpdate;
      await this.processUpdate(update);
    } catch (error) {
      console.error('Telegram webhook error:', error);
      this.emitError(error as Error);
      throw error;
    }
  }

  async setWebhook(url: string, options?: {
    certificate?: string;
    ipAddress?: string;
    maxConnections?: number;
    allowedUpdates?: string[];
    dropPendingUpdates?: boolean;
    secretToken?: string;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    // Останавливаем polling перед установкой webhook
    if (this.isPolling) {
      await this.stopPolling();
    }

    const payload: any = {
      url: url,
      max_connections: options?.maxConnections || 40,
      allowed_updates: options?.allowedUpdates || [
        'message',
        'edited_message',
        'callback_query',
        'inline_query',
        'chosen_inline_result'
      ],
      drop_pending_updates: options?.dropPendingUpdates || false
    };

    if (options?.certificate) {
      payload.certificate = options.certificate;
    }

    if (options?.ipAddress) {
      payload.ip_address = options.ipAddress;
    }

    if (options?.secretToken) {
      payload.secret_token = options.secretToken;
    }

    try {
      const response = await this.makeApiCall('setWebhook', payload);
      
      if (response.ok) {
        this.webhookUrl = url;
        console.log(`Telegram webhook set to: ${url}`);
        return true;
      } else {
        console.error('Failed to set webhook:', response.description);
        return false;
      }
    } catch (error) {
      console.error('Error setting Telegram webhook:', error);
      return false;
    }
  }

  async deleteWebhook(dropPendingUpdates: boolean = false): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    try {
      const response = await this.makeApiCall('deleteWebhook', {
        drop_pending_updates: dropPendingUpdates
      });

      if (response.ok) {
        this.webhookUrl = undefined;
        console.log('Telegram webhook deleted');
        return true;
      } else {
        console.error('Failed to delete webhook:', response.description);
        return false;
      }
    } catch (error) {
      console.error('Error deleting Telegram webhook:', error);
      return false;
    }
  }

  /**
   * Получить информацию о webhook
   */
  async getWebhookInfo(): Promise<TelegramWebhookInfo | null> {
    if (!this.isInitialized) {
      throw new Error('Telegram adapter not initialized');
    }

    try {
      const response = await this.makeApiCall<TelegramWebhookInfo>('getWebhookInfo');
      
      if (response.ok && response.result) {
        return response.result;
      }
      return null;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      return null;
    }
  }

  private async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Обработка обычных сообщений
      if (update.message) {
        await this.processMessage(update.message);
      }

      // Обработка отредактированных сообщений
      if (update.edited_message) {
        await this.processEditedMessage(update.edited_message);
      }

      // Обработка сообщений в каналах
      if (update.channel_post) {
        await this.processChannelPost(update.channel_post);
      }

      // Обработка отредактированных сообщений в каналах
      if (update.edited_channel_post) {
        await this.processEditedChannelPost(update.edited_channel_post);
      }

      // Обработка callback запросов
      if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query);
      }

      // Обработка inline запросов
      if (update.inline_query) {
        await this.processInlineQuery(update.inline_query);
      }

      // Обработка выбранных inline результатов
      if (update.chosen_inline_result) {
        await this.processChosenInlineResult(update.chosen_inline_result);
      }

      // Обработка изменений участников чата
      if (update.my_chat_member) {
        await this.processChatMemberUpdate(update.my_chat_member, 'my_chat_member');
      }

      if (update.chat_member) {
        await this.processChatMemberUpdate(update.chat_member, 'chat_member');
      }

      // Обработка запросов на вступление в чат
      if (update.chat_join_request) {
        await this.processChatJoinRequest(update.chat_join_request);
      }

      // Обработка опросов
      if (update.poll) {
        await this.processPoll(update.poll);
      }

      if (update.poll_answer) {
        await this.processPollAnswer(update.poll_answer);
      }

    } catch (error) {
      console.error('Error processing Telegram update:', error);
      this.emitError(error as Error);
    }
  }

  private async processMessage(message: any): Promise<void> {
    const incomingMessage: IncomingMessage = {
      id: message.message_id.toString(),
      platform: 'telegram',
      chatId: message.chat.id.toString(),
      userId: message.from?.id.toString() || 'unknown',
      text: message.text || message.caption || '',
      type: this.getMessageType(message),
      data: message,
      timestamp: new Date(message.date * 1000).toISOString(),
      isForwarded: !!message.forward_from || !!message.forward_from_chat,
      isReply: !!message.reply_to_message,
      chatType: message.chat.type,
      userName: message.from?.username,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name
    };

    // Обработка команд
    if (message.entities) {
      const commandEntity = message.entities.find((entity: any) => entity.type === 'bot_command');
      if (commandEntity) {
        incomingMessage.command = message.text.substring(commandEntity.offset, commandEntity.offset + commandEntity.length);
      }
    }

    this.emitMessage(incomingMessage);
  }

  private async processEditedMessage(message: any): Promise<void> {
    const editedMessage: IncomingMessage = {
      id: message.message_id.toString(),
      platform: 'telegram',
      chatId: message.chat.id.toString(),
      userId: message.from?.id.toString() || 'unknown',
      text: message.text || message.caption || '',
      type: this.getMessageType(message),
      data: message,
      timestamp: new Date(message.edit_date * 1000).toISOString(),
      isEdited: true,
      chatType: message.chat.type,
      userName: message.from?.username,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name
    };

    this.emit('message_edited', editedMessage);
  }

  private async processChannelPost(post: any): Promise<void> {
    const channelMessage: IncomingMessage = {
      id: post.message_id.toString(),
      platform: 'telegram',
      chatId: post.chat.id.toString(),
      userId: post.chat.id.toString(), // В каналах отправитель = канал
      text: post.text || post.caption || '',
      type: this.getMessageType(post),
      data: post,
      timestamp: new Date(post.date * 1000).toISOString(),
      chatType: 'channel',
      isChannelPost: true
    };

    this.emit('channel_post', channelMessage);
  }

  private async processEditedChannelPost(post: any): Promise<void> {
    const editedChannelMessage: IncomingMessage = {
      id: post.message_id.toString(),
      platform: 'telegram',
      chatId: post.chat.id.toString(),
      userId: post.chat.id.toString(),
      text: post.text || post.caption || '',
      type: this.getMessageType(post),
      data: post,
      timestamp: new Date(post.edit_date * 1000).toISOString(),
      isEdited: true,
      chatType: 'channel',
      isChannelPost: true
    };

    this.emit('channel_post_edited', editedChannelMessage);
  }

  private async processCallbackQuery(callbackQuery: any): Promise<void> {
    const callback: CallbackQuery = {
      id: callbackQuery.id,
      platform: 'telegram',
      chatId: callbackQuery.message?.chat.id.toString() || callbackQuery.from.id.toString(),
      userId: callbackQuery.from.id.toString(),
      data: callbackQuery.data,
      messageId: callbackQuery.message?.message_id.toString(),
      timestamp: new Date().toISOString(),
      userName: callbackQuery.from.username,
      firstName: callbackQuery.from.first_name,
      lastName: callbackQuery.from.last_name
    };

    this.emitCallback(callback);

    // Автоматически отвечаем на callback query
    try {
      await this.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Error answering callback query:', error);
    }
  }

  private async processInlineQuery(inlineQuery: any): Promise<void> {
    this.emit('inline_query', {
      id: inlineQuery.id,
      platform: 'telegram',
      userId: inlineQuery.from.id.toString(),
      query: inlineQuery.query,
      offset: inlineQuery.offset,
      chatType: inlineQuery.chat_type,
      location: inlineQuery.location,
      timestamp: new Date().toISOString()
    });
  }

  private async processChosenInlineResult(result: any): Promise<void> {
    this.emit('chosen_inline_result', {
      resultId: result.result_id,
      platform: 'telegram',
      userId: result.from.id.toString(),
      query: result.query,
      location: result.location,
      inlineMessageId: result.inline_message_id,
      timestamp: new Date().toISOString()
    });
  }

  private async processChatMemberUpdate(update: any, type: string): Promise<void> {
    this.emit('chat_member_update', {
      type: type,
      platform: 'telegram',
      chatId: update.chat.id.toString(),
      userId: update.from.id.toString(),
      date: new Date(update.date * 1000).toISOString(),
      oldChatMember: update.old_chat_member,
      newChatMember: update.new_chat_member,
      inviteLink: update.invite_link
    });
  }

  private async processChatJoinRequest(request: any): Promise<void> {
    this.emit('chat_join_request', {
      platform: 'telegram',
      chatId: request.chat.id.toString(),
      userId: request.from.id.toString(),
      date: new Date(request.date * 1000).toISOString(),
      bio: request.bio,
      inviteLink: request.invite_link
    });
  }

  private async processPoll(poll: any): Promise<void> {
    this.emit('poll', {
      id: poll.id,
      platform: 'telegram',
      question: poll.question,
      options: poll.options,
      totalVoterCount: poll.total_voter_count,
      isClosed: poll.is_closed,
      isAnonymous: poll.is_anonymous,
      type: poll.type,
      allowsMultipleAnswers: poll.allows_multiple_answers
    });
  }

  private async processPollAnswer(answer: any): Promise<void> {
    this.emit('poll_answer', {
      pollId: answer.poll_id,
      platform: 'telegram',
      userId: answer.user?.id.toString(),
      optionIds: answer.option_ids,
      timestamp: new Date().toISOString()
    });
  }

  private getMessageType(message: any): IncomingMessage['type'] {
    if (message.photo) return 'photo';
    if (message.video) return 'video';
    if (message.audio) return 'audio';
    if (message.voice) return 'voice';
    if (message.video_note) return 'video_note';
    if (message.document) return 'document';
    if (message.sticker) return 'sticker';
    if (message.animation) return 'animation';
    if (message.contact) return 'contact';
    if (message.location) return 'location';
    if (message.venue) return 'venue';
    if (message.poll) return 'poll';
    if (message.dice) return 'dice';
    return 'text';
  }

  /**
   * Универсальный метод для вызова Telegram API
   */
  private async makeApiCall<T = any>(method: string, params?: any): Promise<TelegramApiResponse<T>> {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    
    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: params ? JSON.stringify(params) : undefined
        });

        const data = await response.json();
        
        // Если получили rate limit, ждем и повторяем
        if (data.error_code === 429) {
          const retryAfter = data.parameters?.retry_after || 1;
          console.log(`Rate limited, waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          attempt++;
          continue;
        }

        return data;
      } catch (error) {
        attempt++;
        if (attempt >= this.retryAttempts) {
          throw error;
        }
        
        console.log(`API call failed, retrying... (${attempt}/${this.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    throw new Error(`Failed to make API call after ${this.retryAttempts} attempts`);
  }

  /**
   * Ответить на callback query
   */
  async answerCallbackQuery(callbackQueryId: string, options?: {
    text?: string;
    showAlert?: boolean;
    url?: string;
    cacheTime?: number;
  }): Promise<boolean> {
    try {
      const response = await this.makeApiCall('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: options?.text,
        show_alert: options?.showAlert || false,
        url: options?.url,
        cache_time: options?.cacheTime || 0
      });

      return response.ok;
    } catch (error) {
      console.error('Error answering callback query:', error);
      return false;
    }
  }

  /**
   * Редактировать сообщение
   */
  async editMessage(chatId: string, messageId: string, newText: string, options?: {
    parseMode?: string;
    disableWebPagePreview?: boolean;
    buttons?: any[];
  }): Promise<boolean> {
    try {
      const payload: any = {
        chat_id: chatId,
        message_id: parseInt(messageId),
        text: newText,
        parse_mode: options?.parseMode || 'HTML',
        disable_web_page_preview: options?.disableWebPagePreview || false
      };

      if (options?.buttons && options.buttons.length > 0) {
        payload.reply_markup = this.buildInlineKeyboard(options.buttons);
      }

      const response = await this.makeApiCall('editMessageText', payload);
      return response.ok;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  /**
   * Удалить сообщение
   */
  async deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    try {
      const response = await this.makeApiCall('deleteMessage', {
        chat_id: chatId,
        message_id: parseInt(messageId)
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Получить информацию о чате
   */
  async getChatInfo(chatId: string): Promise<any> {
    try {
      const response = await this.makeApiCall('getChat', {
        chat_id: chatId
      });

      return response.ok ? response.result : null;
    } catch (error) {
      console.error('Error getting chat info:', error);
      return null;
    }
  }

  /**
   * Получить участника чата
   */
  async getChatMember(chatId: string, userId: string): Promise<any> {
    try {
      const response = await this.makeApiCall('getChatMember', {
        chat_id: chatId,
        user_id: parseInt(userId)
      });

      return response.ok ? response.result : null;
    } catch (error) {
      console.error('Error getting chat member:', error);
      return null;
    }
  }

  /**
   * Получить статистику адаптера
   */
  getStats(): {
    isInitialized: boolean;
    isPolling: boolean;
    webhookUrl?: string;
    botInfo?: TelegramBotInfo;
    lastUpdateId: number;
    pollingTimeout: number;
    pollingLimit: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isPolling: this.isPolling,
      webhookUrl: this.webhookUrl,
      botInfo: this.botInfo,
      lastUpdateId: this.lastUpdateId,
      pollingTimeout: this.pollingTimeout,
      pollingLimit: this.pollingLimit
    };
  }

  /**
   * Проверить здоровье адаптера
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          details: { error: 'Adapter not initialized' }
        };
      }

      // Проверяем соединение с API
      const botInfo = await this.getBotInfo();
      if (!botInfo) {
        return {
          status: 'unhealthy',
          details: { error: 'Cannot connect to Telegram API' }
        };
      }

      // Проверяем webhook если установлен
      let webhookInfo = null;
      if (this.webhookUrl) {
        webhookInfo = await this.getWebhookInfo();
      }

      return {
        status: 'healthy',
        details: {
          botInfo,
          webhookInfo,
          isPolling: this.isPolling,
          lastUpdateId: this.lastUpdateId
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  async dispose(): Promise<void> {
    console.log('Disposing Telegram adapter...');
    
    // Останавливаем polling
    await this.stopPolling();
    
    // Удаляем webhook если установлен
    if (this.webhookUrl) {
      await this.deleteWebhook();
    }
    
    // Очищаем все слушатели
    this.removeAllListeners();
    
    // Сбрасываем состояние
    this.isInitialized = false;
    this.botInfo = undefined;
    this.webhookUrl = undefined;
    this.lastUpdateId = 0;
    
    console.log('Telegram adapter disposed');
  }
}