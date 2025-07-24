const fs = require('fs').promises;
const path = require('path');

/**
 * Процессор узлов для выполнения логики ботов
 */
class NodeProcessor {
  constructor(botInstance) {
    this.botInstance = botInstance;
    this.telegramBot = botInstance.telegramBot;
    this.config = botInstance.config;
    this.userSessions = new Map();
    this.dataDir = path.join(__dirname, '..', 'data', 'bot_data', botInstance.id);
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка создания папки данных:', error);
    }
  }

  async processTriggers(message) {
    const triggers = this.config.configuration.nodes.filter(node => node.type === 'trigger');

    for (const trigger of triggers) {
      if (await this.checkTrigger(trigger, message)) {
        await this.executeNodeFlow(trigger, message);
      }
    }
  }

  async checkTrigger(trigger, message) {
    const triggerData = trigger.data;

    switch (triggerData.triggerType) {
      case 'command':
        return this.checkCommandTrigger(triggerData, message);
      case 'message':
        return this.checkMessageTrigger(triggerData, message);
      case 'new_chat_members':
        return message.new_chat_members && message.new_chat_members.length > 0;
      default:
        return false;
    }
  }

  checkCommandTrigger(triggerData, message) {
    if (!message.text) return false;
    return message.text.startsWith(triggerData.command);
  }

  checkMessageTrigger(triggerData, message) {
    if (!message.text) return false;

    if (triggerData.filters) {
      return triggerData.filters.some(filter => {
        switch (filter) {
          case 'contains_links':
            return /https?:\/\/|www\./i.test(message.text);
          case 'contains_email':
            return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(message.text);
          case 'contains_phone':
            return /(\+7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/.test(message.text);
          case 'caps_lock':
            return message.text.length > 10 && message.text === message.text.toUpperCase();
          case 'spam_keywords':
            const spamWords = this.config.configuration.defaultSettings?.spamKeywords || [];
            return spamWords.some(word => message.text.toLowerCase().includes(word.toLowerCase()));
          default:
            return message.text.toLowerCase().includes(filter.toLowerCase());
        }
      });
    }

    return true;
  }

  async executeNodeFlow(startNode, message, context = {}) {
    const visited = new Set();
    await this.executeNode(startNode, message, context, visited);
  }

  async executeNode(node, message, context = {}, visited = new Set()) {
    if (visited.has(node.id)) {
      console.warn(`Обнаружен цикл в узле ${node.id}`);
      return;
    }

    visited.add(node.id);

    try {
      switch (node.type) {
        case 'trigger':
          await this.executeTriggerNode(node, message, context, visited);
          break;
        case 'action':
          await this.executeActionNode(node, message, context, visited);
          break;
        case 'condition':
          await this.executeConditionNode(node, message, context, visited);
          break;
      }
    } catch (error) {
      console.error(`Ошибка выполнения узла ${node.id}:`, error);
    }
  }

  async executeTriggerNode(node, message, context, visited) {
    await this.executeConnections(node.connections, message, context, visited);
  }

  async executeActionNode(node, message, context, visited) {
    const actionData = node.data;
    let result = { success: true, error: null };

    try {
      switch (actionData.actionType || node.type) {
        case 'send_message':
          result = await this.executeSendMessage(actionData, message, context);
          break;
        case 'send_photo':
          result = await this.executeSendPhoto(actionData, message, context);
          break;
        case 'send_document':
          result = await this.executeSendDocument(actionData, message, context);
          break;
        case 'create_keyboard':
          result = await this.executeCreateKeyboard(actionData, message, context);
          break;
        case 'delete_message':
          result = await this.executeDeleteMessage(actionData, message, context);
          break;
        case 'admin_action':
          result = await this.executeAdminAction(actionData, message, context);
          break;
        case 'delay_action':
          result = await this.executeDelayAction(actionData, message, context);
          break;
        case 'forward_message':
          result = await this.executeForwardMessage(actionData, message, context);
          break;
        case 'edit_message':
          result = await this.executeEditMessage(actionData, message, context);
          break;
        case 'save_data':
          result = await this.saveData(actionData, message, context);
          break;
        case 'save_variable':
          result = await this.executeSaveVariable(actionData, message, context);
          break;
        case 'load_variable':
          result = await this.executeLoadVariable(actionData, message, context);
          break;
        case 'counter':
          result = await this.executeCounter(actionData, message, context);
          break;
        case 'database_query':
          result = await this.executeDatabaseQuery(actionData, message, context);
          break;
        case 'random_generator':
          result = await this.executeRandomGenerator(actionData, message, context);
          break;
        case 'data_transformer':
          result = await this.executeDataTransformer(actionData, message, context);
          break;
        case 'data_validator':
          result = await this.executeDataValidator(actionData, message, context);
          break;
        case 'http_request':
          result = await this.executeHttpRequest(actionData, message, context);
          break;
        case 'weather_api':
          result = await this.executeWeatherApi(actionData, message, context);
          break;
        case 'news_api':
          result = await this.executeNewsApi(actionData, message, context);
          break;
        case 'currency_api':
          result = await this.executeCurrencyApi(actionData, message, context);
          break;
        case 'translate_api':
          result = await this.executeTranslateApi(actionData, message, context);
          break;
        case 'qr_generator':
          result = await this.executeQrGenerator(actionData, message, context);
          break;
        case 'joke_api':
          result = await this.executeJokeApi(actionData, message, context);
          break;
        case 'cat_api':
          result = await this.executeCatApi(actionData, message, context);
          break;
        case 'webhook_sender':
          result = await this.executeWebhookSender(actionData, message, context);
          break;
        case 'scheduler':
          result = await this.executeScheduler(actionData, message, context);
          break;
        case 'notification_sender':
          result = await this.executeNotificationSender(actionData, message, context);
          break;
        case 'crypto_api':
          result = await this.executeCryptoApi(actionData, message, context);
          break;
        case 'github_api':
          result = await this.executeGithubApi(actionData, message, context);
          break;
        case 'wikipedia_api':
          result = await this.executeWikipediaApi(actionData, message, context);
          break;
        case 'youtube_api':
          result = await this.executeYoutubeApi(actionData, message, context);
          break;
        case 'rss_parser':
          result = await this.executeRssParser(actionData, message, context);
          break;
        case 'ip_geolocation':
          result = await this.executeIpGeolocation(actionData, message, context);
          break;
        case 'shorturl_api':
          result = await this.executeShorturlApi(actionData, message, context);
          break;
        case 'ai_chat':
          result = await this.executeAiChat(actionData, message, context);
          break;
        case 'image_generator':
          result = await this.executeImageGenerator(actionData, message, context);
          break;
        case 'email_sender':
          result = await this.executeEmailSender(actionData, message, context);
          break;
        case 'database_external':
          result = await this.executeDatabaseExternal(actionData, message, context);
          break;
        default:
          console.warn(`Неизвестный тип действия: ${actionData.actionType || node.type}`);
          result = { success: false, error: 'Unknown action type' };
      }
    } catch (error) {
      console.error(`Ошибка выполнения действия ${node.type}:`, error);
      result = { success: false, error: error.message };
    }

    // Выполняем соединения в зависимости от результата
    const connections = node.connections;
    if (typeof connections === 'object' && !Array.isArray(connections)) {
      const branch = result.success ? connections.output : connections.error;
      if (branch) {
        await this.executeConnections(branch, message, { ...context, actionResult: result }, visited);
      }
    } else {
      await this.executeConnections(connections, message, { ...context, actionResult: result }, visited);
    }
  }

  async executeConditionNode(node, message, context, visited) {
    const conditionData = node.data;
    const result = await this.evaluateCondition(conditionData, message, context);

    const connections = node.connections;
    if (typeof connections === 'object' && !Array.isArray(connections)) {
      const branch = result ? connections.true : connections.false;
      if (branch) {
        await this.executeConnections(branch, message, context, visited);
      }
    }
  }

  async sendMessage(actionData, message, context) {
    let messageText = this.replaceVariables(actionData.message, message, context);

    const options = {};
    if (actionData.keyboard) {
      options.reply_markup = {
        keyboard: actionData.keyboard,
        resize_keyboard: true,
        one_time_keyboard: actionData.oneTimeKeyboard || false
      };
    }

    const sentMessage = await this.telegramBot.sendMessage(message.chat.id, messageText, options);

    if (actionData.deleteAfter) {
      setTimeout(async () => {
        try {
          await this.telegramBot.deleteMessage(message.chat.id, sentMessage.message_id);
        } catch (error) {
          console.error('Ошибка удаления сообщения:', error);
        }
      }, actionData.deleteAfter * 1000);
    }
  }

  async deleteMessage(message) {
    try {
      await this.telegramBot.deleteMessage(message.chat.id, message.message_id);
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
    }
  }

  async saveData(actionData, message, context) {
    const dataType = actionData.dataType;
    const data = {
      userId: message.from.id,
      chatId: message.chat.id,
      timestamp: new Date().toISOString(),
      data: {}
    };

    if (actionData.fields) {
      for (const field of actionData.fields) {
        switch (field) {
          case 'user_id':
            data.data.userId = message.from.id;
            break;
          case 'message_text':
            data.data.messageText = message.text;
            break;
          default:
            if (context[field]) {
              data.data[field] = context[field];
            }
        }
      }
    }

    const fileName = `${dataType}_${Date.now()}.json`;
    const filePath = path.join(this.dataDir, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`Данные сохранены: ${fileName}`);
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
    }
  }

  async evaluateCondition(conditionData, message, context) {
    switch (conditionData.conditionType) {
      case 'user_is_admin':
        return await this.isUserAdmin(message);
      case 'text_contains':
        return message.text && message.text.toLowerCase().includes(conditionData.text.toLowerCase());
      case 'text_equals':
        return message.text && message.text.toLowerCase() === conditionData.text.toLowerCase();
      case 'message_length':
        const length = message.text ? message.text.length : 0;
        return this.compareNumbers(length, conditionData.operator, conditionData.value);
      case 'random':
        const probability = conditionData.probability || 0.5;
        return Math.random() < probability;
      case 'text_check':
        return await this.evaluateTextCheck(conditionData, message, context);
      case 'user_check':
        return await this.evaluateUserCheck(conditionData, message, context);
      case 'time_check':
        return await this.evaluateTimeCheck(conditionData, message, context);
      case 'data_check':
        return await this.evaluateDataCheck(conditionData, message, context);
      case 'logic_and':
        return await this.evaluateLogicAnd(conditionData, message, context);
      case 'logic_or':
        return await this.evaluateLogicOr(conditionData, message, context);
      case 'logic_not':
        return await this.evaluateLogicNot(conditionData, message, context);
      default:
        return false;
    }
  }

  async isUserAdmin(message) {
    try {
      if (message.chat.type === 'private') return true;

      const chatMember = await this.telegramBot.getChatMember(message.chat.id, message.from.id);
      return ['creator', 'administrator'].includes(chatMember.status);
    } catch (error) {
      console.error('Ошибка проверки админских прав:', error);
      return false;
    }
  }

  compareNumbers(value1, operator, value2) {
    switch (operator) {
      case '>': return value1 > value2;
      case '<': return value1 < value2;
      case '>=': return value1 >= value2;
      case '<=': return value1 <= value2;
      case '==': return value1 == value2;
      case '!=': return value1 != value2;
      default: return false;
    }
  }

  replaceVariables(text, message, context) {
    let result = text;

    result = result.replace(/{user_name}/g, message.from.first_name || 'Пользователь');
    result = result.replace(/{user_id}/g, message.from.id);
    result = result.replace(/{username}/g, message.from.username || 'неизвестно');
    result = result.replace(/{chat_id}/g, message.chat.id);
    result = result.replace(/{message_text}/g, message.text || '');
    result = result.replace(/{date}/g, new Date().toLocaleDateString());
    result = result.replace(/{time}/g, new Date().toLocaleTimeString());

    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  async executeConnections(connections, message, context, visited) {
    if (!connections) return;

    const connectionIds = Array.isArray(connections) ? connections : [connections];

    for (const connectionId of connectionIds) {
      const nextNode = this.findNodeById(connectionId);
      if (nextNode) {
        await this.executeNode(nextNode, message, context, visited);
      }
    }
  }

  findNodeById(nodeId) {
    return this.config.configuration.nodes.find(node => node.id === nodeId);
  }

  setUserSession(userId, key, value) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {});
    }
    this.userSessions.get(userId)[key] = value;
  }

  getUserSession(userId, key) {
    const session = this.userSessions.get(userId);
    return session ? session[key] : undefined;
  }

  // Новые методы для обработки условий

  async evaluateTextCheck(conditionData, message, context) {
    if (!message.text) return false;

    const text = conditionData.case_sensitive ? message.text : message.text.toLowerCase();
    const value = conditionData.case_sensitive ? conditionData.value : conditionData.value.toLowerCase();

    switch (conditionData.condition) {
      case 'contains':
        return text.includes(value);
      case 'equals':
        return text === value;
      case 'starts_with':
        return text.startsWith(value);
      case 'ends_with':
        return text.endsWith(value);
      case 'regex':
        try {
          const regex = new RegExp(conditionData.value, conditionData.case_sensitive ? '' : 'i');
          return regex.test(message.text);
        } catch (error) {
          console.error('Ошибка в регулярном выражении:', error);
          return false;
        }
      default:
        return false;
    }
  }

  async evaluateUserCheck(conditionData, message, context) {
    const user = message.from;
    let userValue;

    switch (conditionData.property) {
      case 'is_admin':
        return await this.isUserAdmin(message);
      case 'is_member':
        try {
          if (message.chat.type === 'private') return true;
          const chatMember = await this.telegramBot.getChatMember(message.chat.id, user.id);
          return ['member', 'administrator', 'creator'].includes(chatMember.status);
        } catch (error) {
          return false;
        }
      case 'user_id':
        userValue = user.id.toString();
        break;
      case 'username':
        userValue = user.username || '';
        break;
      case 'first_name':
        userValue = user.first_name || '';
        break;
      case 'is_bot':
        return user.is_bot === true;
      default:
        return false;
    }

    switch (conditionData.operator) {
      case 'equals':
        return userValue === conditionData.value;
      case 'not_equals':
        return userValue !== conditionData.value;
      case 'contains':
        return userValue.toLowerCase().includes(conditionData.value.toLowerCase());
      default:
        return false;
    }
  }

  async evaluateTimeCheck(conditionData, message, context) {
    const now = new Date();
    const timezone = conditionData.timezone || 'Europe/Moscow';

    try {
      // Получаем время в нужном часовом поясе
      const timeInZone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

      switch (conditionData.check_type) {
        case 'time_range':
          return this.checkTimeRange(timeInZone, conditionData.start_time, conditionData.end_time);
        case 'day_of_week':
          return this.checkDayOfWeek(timeInZone, conditionData.days);
        case 'hour':
          const currentHour = timeInZone.getHours();
          const targetHour = parseInt(conditionData.start_time.split(':')[0]);
          return currentHour === targetHour;
        case 'date_range':
          // Можно расширить для проверки диапазона дат
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Ошибка проверки времени:', error);
      return false;
    }
  }

  checkTimeRange(date, startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Переход через полночь
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  checkDayOfWeek(date, daysString) {
    const currentDay = date.getDay() === 0 ? 7 : date.getDay(); // Понедельник = 1, Воскресенье = 7
    const allowedDays = daysString.split(',').map(d => parseInt(d.trim()));
    return allowedDays.includes(currentDay);
  }

  async evaluateDataCheck(conditionData, message, context) {
    let dataValue;

    switch (conditionData.data_source) {
      case 'variable':
        dataValue = context[conditionData.key];
        break;
      case 'user_data':
        dataValue = this.getUserSession(message.from.id, conditionData.key);
        break;
      case 'chat_data':
        // Можно расширить для хранения данных чата
        dataValue = context[`chat_${conditionData.key}`];
        break;
      case 'global_data':
        // Можно расширить для глобальных данных
        dataValue = context[`global_${conditionData.key}`];
        break;
      default:
        dataValue = undefined;
    }

    // Проверка существования
    if (conditionData.operator === 'exists') {
      return dataValue !== undefined && dataValue !== null;
    }
    if (conditionData.operator === 'not_exists') {
      return dataValue === undefined || dataValue === null;
    }

    if (dataValue === undefined || dataValue === null) {
      return false;
    }

    // Приведение типов
    let compareValue = conditionData.value;
    if (conditionData.data_type === 'number') {
      dataValue = Number(dataValue);
      compareValue = Number(compareValue);
    } else if (conditionData.data_type === 'boolean') {
      dataValue = Boolean(dataValue);
      compareValue = compareValue === 'true';
    } else {
      dataValue = String(dataValue);
      compareValue = String(compareValue);
    }

    switch (conditionData.operator) {
      case 'equals':
        return dataValue === compareValue;
      case 'not_equals':
        return dataValue !== compareValue;
      case 'greater':
        return dataValue > compareValue;
      case 'less':
        return dataValue < compareValue;
      case 'greater_equal':
        return dataValue >= compareValue;
      case 'less_equal':
        return dataValue <= compareValue;
      default:
        return false;
    }
  }

  async evaluateLogicAnd(conditionData, message, context) {
    // Для логических операторов нужно получить результаты от входных узлов
    // Это упрощенная реализация - в реальности нужно обрабатывать входные соединения
    return context.input1 && context.input2;
  }

  async evaluateLogicOr(conditionData, message, context) {
    // Упрощенная реализация
    return context.input1 || context.input2;
  }

  async evaluateLogicNot(conditionData, message, context) {
    // Упрощенная реализация
    return !context.input;
  }

  // Новые методы для выполнения действий

  async executeSendMessage(actionData, message, context) {
    try {
      let messageText = this.replaceVariables(actionData.text, message, context);

      const options = {
        parse_mode: actionData.parse_mode !== 'none' ? actionData.parse_mode : undefined,
        disable_web_page_preview: actionData.disable_web_page_preview || false,
        reply_to_message_id: actionData.reply_to_message ? message.message_id : undefined
      };

      const sentMessage = await this.telegramBot.sendMessage(message.chat.id, messageText, options);

      // Автоудаление сообщения
      if (actionData.delete_after && actionData.delete_after > 0) {
        setTimeout(async () => {
          try {
            await this.telegramBot.deleteMessage(message.chat.id, sentMessage.message_id);
          } catch (error) {
            console.error('Ошибка автоудаления сообщения:', error);
          }
        }, actionData.delete_after * 1000);
      }

      return { success: true, messageId: sentMessage.message_id };
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return { success: false, error: error.message };
    }
  }

  async executeSendPhoto(actionData, message, context) {
    try {
      const photo = actionData.photo_url || actionData.photo_file;
      if (!photo) {
        return { success: false, error: 'No photo URL or file specified' };
      }

      const options = {
        caption: actionData.caption ? this.replaceVariables(actionData.caption, message, context) : undefined,
        parse_mode: actionData.parse_mode !== 'none' ? actionData.parse_mode : undefined
      };

      const sentMessage = await this.telegramBot.sendPhoto(message.chat.id, photo, options);
      return { success: true, messageId: sentMessage.message_id };
    } catch (error) {
      console.error('Ошибка отправки фото:', error);
      return { success: false, error: error.message };
    }
  }

  async executeSendDocument(actionData, message, context) {
    try {
      const document = actionData.document_url || actionData.document_file;
      if (!document) {
        return { success: false, error: 'No document URL or file specified' };
      }

      const options = {
        caption: actionData.caption ? this.replaceVariables(actionData.caption, message, context) : undefined,
        filename: actionData.filename || undefined
      };

      const sentMessage = await this.telegramBot.sendDocument(message.chat.id, document, options);
      return { success: true, messageId: sentMessage.message_id };
    } catch (error) {
      console.error('Ошибка отправки документа:', error);
      return { success: false, error: error.message };
    }
  }

  async executeCreateKeyboard(actionData, message, context) {
    try {
      let buttons;
      try {
        buttons = JSON.parse(actionData.buttons);
      } catch (parseError) {
        return { success: false, error: 'Invalid JSON in buttons configuration' };
      }

      const keyboard = {
        keyboard_type: actionData.keyboard_type,
        buttons: buttons,
        resize_keyboard: actionData.resize_keyboard,
        one_time_keyboard: actionData.one_time_keyboard
      };

      // Сохраняем клавиатуру в контекст для использования другими узлами
      context.keyboard = keyboard;
      return { success: true, keyboard: keyboard };
    } catch (error) {
      console.error('Ошибка создания клавиатуры:', error);
      return { success: false, error: error.message };
    }
  }

  async executeDeleteMessage(actionData, message, context) {
    try {
      let targetMessageId;
      let targetChatId = message.chat.id;

      switch (actionData.target) {
        case 'current_message':
          targetMessageId = message.message_id;
          break;
        case 'reply_message':
          if (message.reply_to_message) {
            targetMessageId = message.reply_to_message.message_id;
          } else {
            return { success: false, error: 'No reply message to delete' };
          }
          break;
        case 'by_id':
          targetMessageId = parseInt(actionData.message_id);
          if (!targetMessageId) {
            return { success: false, error: 'Invalid message ID' };
          }
          break;
        default:
          return { success: false, error: 'Invalid target type' };
      }

      if (actionData.delay && actionData.delay > 0) {
        setTimeout(async () => {
          try {
            await this.telegramBot.deleteMessage(targetChatId, targetMessageId);
          } catch (error) {
            console.error('Ошибка отложенного удаления сообщения:', error);
          }
        }, actionData.delay * 1000);
        return { success: true, delayed: true };
      } else {
        await this.telegramBot.deleteMessage(targetChatId, targetMessageId);
        return { success: true };
      }
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      return { success: false, error: error.message };
    }
  }

  async executeAdminAction(actionData, message, context) {
    try {
      // Проверяем права бота
      const botMember = await this.telegramBot.getChatMember(message.chat.id, this.telegramBot.options.polling.params.bot_id);
      if (!['administrator', 'creator'].includes(botMember.status)) {
        return { success: false, error: 'Bot is not an administrator' };
      }

      let targetUserId;
      switch (actionData.target_user) {
        case 'message_author':
          targetUserId = message.from.id;
          break;
        case 'reply_user':
          if (message.reply_to_message) {
            targetUserId = message.reply_to_message.from.id;
          } else {
            return { success: false, error: 'No reply message to get user from' };
          }
          break;
        case 'by_id':
          targetUserId = parseInt(actionData.user_id);
          if (!targetUserId) {
            return { success: false, error: 'Invalid user ID' };
          }
          break;
        default:
          return { success: false, error: 'Invalid target user type' };
      }

      const duration = actionData.duration ? Date.now() / 1000 + actionData.duration * 60 : undefined;

      switch (actionData.action) {
        case 'kick_user':
          await this.telegramBot.kickChatMember(message.chat.id, targetUserId);
          break;
        case 'ban_user':
          await this.telegramBot.kickChatMember(message.chat.id, targetUserId, { until_date: duration });
          break;
        case 'unban_user':
          await this.telegramBot.unbanChatMember(message.chat.id, targetUserId);
          break;
        case 'mute_user':
          await this.telegramBot.restrictChatMember(message.chat.id, targetUserId, {
            can_send_messages: false,
            until_date: duration
          });
          break;
        case 'unmute_user':
          await this.telegramBot.restrictChatMember(message.chat.id, targetUserId, {
            can_send_messages: true
          });
          break;
        default:
          return { success: false, error: 'Unknown admin action' };
      }

      return { success: true, action: actionData.action, targetUserId };
    } catch (error) {
      console.error('Ошибка выполнения админского действия:', error);
      return { success: false, error: error.message };
    }
  }

  async executeDelayAction(actionData, message, context) {
    try {
      let delayMs;
      switch (actionData.delay_type) {
        case 'seconds':
          delayMs = actionData.duration * 1000;
          break;
        case 'minutes':
          delayMs = actionData.duration * 60 * 1000;
          break;
        case 'hours':
          delayMs = actionData.duration * 60 * 60 * 1000;
          break;
        default:
          delayMs = actionData.duration * 1000;
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return { success: true, delayed: delayMs };
    } catch (error) {
      console.error('Ошибка задержки:', error);
      return { success: false, error: error.message };
    }
  }

  async executeForwardMessage(actionData, message, context) {
    try {
      const targetChatId = actionData.target_chat;
      if (!targetChatId) {
        return { success: false, error: 'No target chat specified' };
      }

      let sourceMessageId;
      switch (actionData.source_message) {
        case 'current_message':
          sourceMessageId = message.message_id;
          break;
        case 'reply_message':
          if (message.reply_to_message) {
            sourceMessageId = message.reply_to_message.message_id;
          } else {
            return { success: false, error: 'No reply message to forward' };
          }
          break;
        default:
          sourceMessageId = message.message_id;
      }

      const options = {
        disable_notification: actionData.disable_notification || false
      };

      const forwardedMessage = await this.telegramBot.forwardMessage(
        targetChatId,
        message.chat.id,
        sourceMessageId,
        options
      );

      return { success: true, messageId: forwardedMessage.message_id };
    } catch (error) {
      console.error('Ошибка пересылки сообщения:', error);
      return { success: false, error: error.message };
    }
  }

  async executeEditMessage(actionData, message, context) {
    try {
      const newText = this.replaceVariables(actionData.new_text, message, context);
      const messageId = actionData.message_id ? parseInt(actionData.message_id) : message.message_id;

      const options = {
        parse_mode: actionData.parse_mode !== 'none' ? actionData.parse_mode : undefined
      };

      await this.telegramBot.editMessageText(newText, {
        chat_id: message.chat.id,
        message_id: messageId,
        ...options
      });

      return { success: true, messageId };
    } catch (error) {
      console.error('Ошибка редактирования сообщения:', error);
      return { success: false, error: error.message };
    }
  }

  // Методы для работы с узлами данных

  async executeSaveVariable(actionData, message, context) {
    try {
      const variableName = actionData.variable_name;
      let value = this.replaceVariables(actionData.value, message, context);

      // Приведение типов
      switch (actionData.data_type) {
        case 'number':
          value = Number(value);
          if (isNaN(value)) {
            return { success: false, error: 'Invalid number value' };
          }
          break;
        case 'boolean':
          value = value === 'true' || value === '1' || value === 'yes';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (error) {
            return { success: false, error: 'Invalid JSON value' };
          }
          break;
        default:
          value = String(value);
      }

      // Сохранение в зависимости от области видимости
      switch (actionData.scope) {
        case 'user':
          this.setUserSession(message.from.id, variableName, value);
          break;
        case 'chat':
          this.setChatData(message.chat.id, variableName, value);
          break;
        case 'global':
          this.setGlobalData(variableName, value);
          break;
      }

      return { success: true, variableName, value, scope: actionData.scope };
    } catch (error) {
      console.error('Ошибка сохранения переменной:', error);
      return { success: false, error: error.message };
    }
  }

  async executeLoadVariable(actionData, message, context) {
    try {
      const variableName = actionData.variable_name;
      let value;

      // Загрузка в зависимости от области видимости
      switch (actionData.scope) {
        case 'user':
          value = this.getUserSession(message.from.id, variableName);
          break;
        case 'chat':
          value = this.getChatData(message.chat.id, variableName);
          break;
        case 'global':
          value = this.getGlobalData(variableName);
          break;
      }

      if (value === undefined || value === null) {
        if (actionData.default_value) {
          value = this.replaceVariables(actionData.default_value, message, context);
          return { success: true, variableName, value, isDefault: true };
        } else {
          return { success: false, error: 'Variable not found', variableName };
        }
      }

      // Добавляем значение в контекст
      context[variableName] = value;
      return { success: true, variableName, value };
    } catch (error) {
      console.error('Ошибка загрузки переменной:', error);
      return { success: false, error: error.message };
    }
  }

  async executeCounter(actionData, message, context) {
    try {
      const counterName = actionData.counter_name;
      let currentValue = 0;

      // Получаем текущее значение счетчика
      switch (actionData.scope) {
        case 'user':
          currentValue = this.getUserSession(message.from.id, counterName) || 0;
          break;
        case 'chat':
          currentValue = this.getChatData(message.chat.id, counterName) || 0;
          break;
        case 'global':
          currentValue = this.getGlobalData(counterName) || 0;
          break;
      }

      let newValue = currentValue;

      // Выполняем операцию
      switch (actionData.operation) {
        case 'increment':
          newValue = currentValue + (actionData.value || 1);
          break;
        case 'decrement':
          newValue = currentValue - (actionData.value || 1);
          break;
        case 'set':
          newValue = actionData.value || 0;
          break;
        case 'reset':
          newValue = 0;
          break;
      }

      // Проверяем границы
      if (actionData.min_value !== undefined && newValue < actionData.min_value) {
        newValue = actionData.min_value;
      }
      if (actionData.max_value !== undefined && newValue > actionData.max_value) {
        newValue = actionData.max_value;
      }

      // Сохраняем новое значение
      switch (actionData.scope) {
        case 'user':
          this.setUserSession(message.from.id, counterName, newValue);
          break;
        case 'chat':
          this.setChatData(message.chat.id, counterName, newValue);
          break;
        case 'global':
          this.setGlobalData(counterName, newValue);
          break;
      }

      return { success: true, counterName, oldValue: currentValue, newValue, operation: actionData.operation };
    } catch (error) {
      console.error('Ошибка работы со счетчиком:', error);
      return { success: false, error: error.message };
    }
  }

  async executeDatabaseQuery(actionData, message, context) {
    try {
      // Упрощенная реализация базы данных через файловую систему
      const table = actionData.table || 'default';
      const operation = actionData.operation;

      // Путь к файлу "таблицы"
      const tablePath = path.join(this.dataDir, `table_${table}.json`);

      let tableData = [];

      // Загружаем существующие данные
      try {
        const fileContent = await fs.readFile(tablePath, 'utf8');
        tableData = JSON.parse(fileContent);
      } catch (error) {
        // Файл не существует, создаем пустую таблицу
        tableData = [];
      }

      let conditions = {};
      let data = {};

      try {
        if (actionData.conditions) {
          conditions = JSON.parse(this.replaceVariables(actionData.conditions, message, context));
        }
        if (actionData.data) {
          data = JSON.parse(this.replaceVariables(actionData.data, message, context));
        }
      } catch (parseError) {
        return { success: false, error: 'Invalid JSON in conditions or data' };
      }

      let result = [];
      let affectedRows = 0;

      switch (operation) {
        case 'select':
          result = tableData.filter(row => this.matchesConditions(row, conditions));
          if (actionData.limit && actionData.limit > 0) {
            result = result.slice(0, actionData.limit);
          }
          break;

        case 'insert':
          const newRow = {
            id: Date.now(), // Простой ID
            created_at: new Date().toISOString(),
            ...data
          };
          tableData.push(newRow);
          await fs.writeFile(tablePath, JSON.stringify(tableData, null, 2));
          result = [newRow];
          affectedRows = 1;
          break;

        case 'update':
          for (let i = 0; i < tableData.length; i++) {
            if (this.matchesConditions(tableData[i], conditions)) {
              tableData[i] = { ...tableData[i], ...data, updated_at: new Date().toISOString() };
              result.push(tableData[i]);
              affectedRows++;
            }
          }
          if (affectedRows > 0) {
            await fs.writeFile(tablePath, JSON.stringify(tableData, null, 2));
          }
          break;

        case 'delete':
          const originalLength = tableData.length;
          tableData = tableData.filter(row => !this.matchesConditions(row, conditions));
          affectedRows = originalLength - tableData.length;
          if (affectedRows > 0) {
            await fs.writeFile(tablePath, JSON.stringify(tableData, null, 2));
          }
          break;

        default:
          return { success: false, error: 'Unknown database operation' };
      }

      if (result.length === 0 && operation === 'select') {
        return { success: true, result: [], isEmpty: true, operation };
      }

      return { success: true, result, affectedRows, operation, table };
    } catch (error) {
      console.error('Ошибка выполнения запроса к БД:', error);
      return { success: false, error: error.message };
    }
  }

  // Вспомогательный метод для проверки условий
  matchesConditions(row, conditions) {
    for (const [key, value] of Object.entries(conditions)) {
      if (row[key] !== value) {
        return false;
      }
    }
    return true;
  }

  async executeRandomGenerator(actionData, message, context) {
    try {
      let result;

      switch (actionData.type) {
        case 'number':
          const min = actionData.min_number || 1;
          const max = actionData.max_number || 100;
          result = Math.floor(Math.random() * (max - min + 1)) + min;
          break;

        case 'string':
          const length = actionData.string_length || 8;
          const chars = actionData.string_chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          result = '';
          for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          break;

        case 'choice':
          const choices = actionData.choices.split('\n').filter(choice => choice.trim());
          if (choices.length === 0) {
            return { success: false, error: 'No choices provided' };
          }
          result = choices[Math.floor(Math.random() * choices.length)].trim();
          break;

        case 'boolean':
          result = Math.random() < 0.5;
          break;

        default:
          return { success: false, error: 'Unknown generation type' };
      }

      return { success: true, result, type: actionData.type };
    } catch (error) {
      console.error('Ошибка генерации случайного значения:', error);
      return { success: false, error: error.message };
    }
  }

  async executeDataTransformer(actionData, message, context) {
    try {
      let inputData = this.replaceVariables(actionData.input_data, message, context);
      let result;

      switch (actionData.operation) {
        case 'json_parse':
          try {
            result = JSON.parse(inputData);
          } catch (error) {
            return { success: false, error: 'Invalid JSON for parsing' };
          }
          break;

        case 'json_stringify':
          try {
            result = JSON.stringify(inputData);
          } catch (error) {
            return { success: false, error: 'Cannot stringify data' };
          }
          break;

        case 'to_upper':
          result = String(inputData).toUpperCase();
          break;

        case 'to_lower':
          result = String(inputData).toLowerCase();
          break;

        case 'trim':
          result = String(inputData).trim();
          break;

        case 'split':
          const separator = actionData.separator || ',';
          result = String(inputData).split(separator);
          break;

        case 'join':
          if (Array.isArray(inputData)) {
            const separator = actionData.separator || ',';
            result = inputData.join(separator);
          } else {
            return { success: false, error: 'Input data is not an array for join operation' };
          }
          break;

        default:
          return { success: false, error: 'Unknown transformation operation' };
      }

      // Сохраняем результат в целевую переменную
      if (actionData.target_variable) {
        context[actionData.target_variable] = result;
      }

      return { success: true, result, operation: actionData.operation };
    } catch (error) {
      console.error('Ошибка преобразования данных:', error);
      return { success: false, error: error.message };
    }
  }

  async executeDataValidator(actionData, message, context) {
    try {
      const inputValue = this.replaceVariables(actionData.input_value, message, context);
      let isValid = false;

      switch (actionData.validation_type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          isValid = emailRegex.test(inputValue);
          break;

        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          isValid = phoneRegex.test(inputValue.replace(/[\s\-\(\)]/g, ''));
          break;

        case 'url':
          try {
            new URL(inputValue);
            isValid = true;
          } catch (error) {
            isValid = false;
          }
          break;

        case 'number':
          isValid = !isNaN(Number(inputValue)) && isFinite(Number(inputValue));
          break;

        case 'length':
          const length = String(inputValue).length;
          const minLength = actionData.min_length || 0;
          const maxLength = actionData.max_length || Infinity;
          isValid = length >= minLength && length <= maxLength;
          break;

        case 'regex':
          if (actionData.regex_pattern) {
            try {
              const regex = new RegExp(actionData.regex_pattern);
              isValid = regex.test(inputValue);
            } catch (error) {
              return { success: false, error: 'Invalid regex pattern' };
            }
          } else {
            return { success: false, error: 'No regex pattern provided' };
          }
          break;

        default:
          return { success: false, error: 'Unknown validation type' };
      }

      return { success: true, isValid, inputValue, validationType: actionData.validation_type };
    } catch (error) {
      console.error('Ошибка валидации данных:', error);
      return { success: false, error: error.message };
    }
  }

  // Вспомогательные методы для работы с данными

  setChatData(chatId, key, value) {
    if (!this.chatData) {
      this.chatData = new Map();
    }
    if (!this.chatData.has(chatId)) {
      this.chatData.set(chatId, {});
    }
    this.chatData.get(chatId)[key] = value;
  }

  getChatData(chatId, key) {
    if (!this.chatData || !this.chatData.has(chatId)) {
      return undefined;
    }
    return this.chatData.get(chatId)[key];
  }

  setGlobalData(key, value) {
    if (!this.globalData) {
      this.globalData = {};
    }
    this.globalData[key] = value;
  }

  getGlobalData(key) {
    if (!this.globalData) {
      return undefined;
    }
    return this.globalData[key];
  }

  // Integration execution methods

  async executeHttpRequest(actionData, message, context) {
    try {
      const url = this.replaceVariables(actionData.url, message, context);
      const method = actionData.method || 'GET';

      let headers = {};
      if (actionData.headers) {
        try {
          headers = JSON.parse(actionData.headers);
        } catch (error) {
          console.error('Ошибка парсинга заголовков:', error);
        }
      }

      const options = {
        method: method,
        headers: headers,
        timeout: (actionData.timeout || 30) * 1000
      };

      if (actionData.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = this.replaceVariables(actionData.body, message, context);
      }

      const response = await fetch(url, options);
      const data = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      return {
        success: true,
        status: response.status,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      console.error('Ошибка HTTP запроса:', error);
      return { success: false, error: error.message };
    }
  }

  async executeWeatherApi(actionData, message, context) {
    try {
      const apiKey = actionData.api_key;
      if (!apiKey) {
        return { success: false, error: 'API key is required' };
      }

      const city = this.replaceVariables(actionData.city, message, context);
      const units = actionData.units || 'metric';
      const lang = actionData.lang || 'ru';

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}&lang=${lang}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const weatherInfo = {
          city: data.name,
          country: data.sys.country,
          temperature: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          wind_speed: data.wind.speed,
          icon: data.weather[0].icon
        };

        return { success: true, weather: weatherInfo };
      } else {
        return { success: false, error: data.message || 'Weather API error' };
      }
    } catch (error) {
      console.error('Ошибка Weather API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeNewsApi(actionData, message, context) {
    try {
      const apiKey = actionData.api_key;
      if (!apiKey) {
        return { success: false, error: 'API key is required' };
      }

      const query = this.replaceVariables(actionData.query, message, context);
      const country = actionData.country || 'ru';
      const category = actionData.category || 'general';
      const pageSize = actionData.page_size || 5;

      let url;
      if (query && query.trim()) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${pageSize}&apiKey=${apiKey}`;
      } else {
        url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=${pageSize}&apiKey=${apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const articles = data.articles.map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          urlToImage: article.urlToImage
        }));

        return { success: true, articles: articles, totalResults: data.totalResults };
      } else {
        return { success: false, error: data.message || 'News API error' };
      }
    } catch (error) {
      console.error('Ошибка News API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeCurrencyApi(actionData, message, context) {
    try {
      const baseCurrency = actionData.base_currency || 'USD';
      const targetCurrency = actionData.target_currency || 'RUB';
      const amount = actionData.amount || 1;

      // Используем бесплатный API exchangerate-api.com
      const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.rates[targetCurrency]) {
        const rate = data.rates[targetCurrency];
        const convertedAmount = (amount * rate).toFixed(2);

        return {
          success: true,
          rate: rate,
          amount: amount,
          convertedAmount: convertedAmount,
          baseCurrency: baseCurrency,
          targetCurrency: targetCurrency,
          date: data.date
        };
      } else {
        return { success: false, error: 'Currency not found or API error' };
      }
    } catch (error) {
      console.error('Ошибка Currency API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeTranslateApi(actionData, message, context) {
    try {
      const apiKey = actionData.api_key;
      if (!apiKey) {
        return { success: false, error: 'API key is required' };
      }

      const text = this.replaceVariables(actionData.text, message, context);
      const sourceLang = actionData.source_lang || 'auto';
      const targetLang = actionData.target_lang || 'en';

      // Используем Google Translate API
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? undefined : sourceLang,
          target: targetLang,
          format: 'text'
        })
      });

      const data = await response.json();

      if (response.ok && data.data && data.data.translations) {
        const translation = data.data.translations[0];
        return {
          success: true,
          translatedText: translation.translatedText,
          detectedSourceLanguage: translation.detectedSourceLanguage,
          originalText: text
        };
      } else {
        return { success: false, error: data.error?.message || 'Translation API error' };
      }
    } catch (error) {
      console.error('Ошибка Translate API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeQrGenerator(actionData, message, context) {
    try {
      const text = this.replaceVariables(actionData.text, message, context);
      const size = actionData.size || '200x200';
      const format = actionData.format || 'png';

      // Используем бесплатный QR Server API
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&format=${format}&data=${encodeURIComponent(text)}`;

      return {
        success: true,
        qrUrl: url,
        text: text,
        size: size,
        format: format
      };
    } catch (error) {
      console.error('Ошибка QR Generator:', error);
      return { success: false, error: error.message };
    }
  }

  async executeJokeApi(actionData, message, context) {
    try {
      const category = actionData.category || 'Programming';
      const type = actionData.type || 'single';
      const lang = actionData.lang || 'en';

      const url = `https://v2.jokeapi.dev/joke/${category}?type=${type}&lang=${lang}`;

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && !data.error) {
        let joke;
        if (data.type === 'single') {
          joke = data.joke;
        } else {
          joke = `${data.setup}\n\n${data.delivery}`;
        }

        return {
          success: true,
          joke: joke,
          category: data.category,
          type: data.type,
          id: data.id
        };
      } else {
        return { success: false, error: data.message || 'Joke API error' };
      }
    } catch (error) {
      console.error('Ошибка Joke API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeCatApi(actionData, message, context) {
    try {
      const breed = actionData.breed || '';
      const limit = actionData.limit || 1;

      let url = `https://api.thecatapi.com/v1/images/search?limit=${limit}`;
      if (breed) {
        url += `&breed_ids=${breed}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.length > 0) {
        const cats = data.map(cat => ({
          id: cat.id,
          url: cat.url,
          width: cat.width,
          height: cat.height,
          breeds: cat.breeds || []
        }));

        return {
          success: true,
          cats: cats,
          count: cats.length
        };
      } else {
        return { success: false, error: 'Cat API error or no cats found' };
      }
    } catch (error) {
      console.error('Ошибка Cat API:', error);
      return { success: false, error: error.message };
    }
  }

  async executeWebhookSender(actionData, message, context) {
    try {
      const webhookUrl = actionData.webhook_url;
      if (!webhookUrl) {
        return { success: false, error: 'Webhook URL is required' };
      }

      const method = actionData.method || 'POST';
      const payload = this.replaceVariables(actionData.payload, message, context);
      const secret = actionData.secret;

      const headers = {
        'Content-Type': 'application/json'
      };

      if (secret) {
        headers['X-Webhook-Secret'] = secret;
      }

      const response = await fetch(webhookUrl, {
        method: method,
        headers: headers,
        body: payload
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      console.error('Ошибка Webhook Sender:', error);
      return { success: false, error: error.message };
    }
  }

  async executeScheduler(actionData, message, context) {
    try {
      const scheduleType = actionData.schedule_type || 'once';
      const datetime = actionData.datetime;
      const timezone = actionData.timezone || 'Europe/Moscow';
      const actionDataToSchedule = actionData.action_data;

      // Упрощенная реализация - в реальности нужна система планировщика
      console.log(`Запланировано действие: ${scheduleType} на ${datetime} (${timezone})`);
      console.log(`Данные действия: ${actionDataToSchedule}`);

      return {
        success: true,
        scheduled: true,
        scheduleType: scheduleType,
        datetime: datetime,
        timezone: timezone
      };
    } catch (error) {
      console.error('Ошибка Scheduler:', error);
      return { success: false, error: error.message };
    }
  }

  async executeNotificationSender(actionData, message, context) {
    try {
      const service = actionData.service || 'telegram';
      const recipient = actionData.recipient;
      const title = this.replaceVariables(actionData.title, message, context);
      const messageText = this.replaceVariables(actionData.message, message, context);
      const priority = actionData.priority || 'normal';

      // Упрощенная реализация - в реальности нужны интеграции с сервисами
      console.log(`Отправка уведомления через ${service}:`);
      console.log(`Получатель: ${recipient}`);
      console.log(`Заголовок: ${title}`);
      console.log(`Сообщение: ${messageText}`);
      console.log(`Приоритет: ${priority}`);

      return {
        success: true,
        service: service,
        recipient: recipient,
        title: title,
        message: messageText,
        priority: priority
      };
    } catch (error) {
      console.error('Ошибка Notification Sender:', error);
      return { success: false, error: error.message };
    }
  }

}

module.exports = NodeProcessor; 