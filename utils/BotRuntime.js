const fs = require('fs').promises;
const path = require('path');
const NodeProcessor = require('./NodeProcessor');
// Конвертер схем удален - используется только новый формат
const Logger = require('./Logger');
const MessengerAdapterFactory = require('./MessengerAdapterFactory');

/**
 * Среда выполнения ботов
 */
class BotRuntime {
  constructor() {
    this.activeBots = new Map(); // Map<botId, MessengerAdapter>
    this.botConfigs = new Map(); // Map<botId, botConfig>
    this.nodeProcessors = new Map(); // Map<botId, NodeProcessor>
    this.webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com';
    this.usePolling = process.env.USE_POLLING !== 'false';
    this.botsDir = path.join(__dirname, '..', 'data', 'bots');
    this.schemasDir = path.join(__dirname, '..', 'data', 'visual_schemas');
    // Конвертер схем удален - используется только новый формат
    this.logger = new Logger();
    this.healthCheckInterval = null;
    this.healthCheckIntervalMs = 30 * 60 * 1000; // 30 минут
  }

  async loadAllBots() {
    try {
      console.log('🤖 Загрузка ботов...');
      
      const files = await fs.readdir(this.botsDir);
      let loadedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('bot_')) {
          try {
            const botPath = path.join(this.botsDir, file);
            const botData = await fs.readFile(botPath, 'utf8');
            const bot = JSON.parse(botData);

            if (bot.status === 'active' && bot.token) {
              await this.loadBot(bot.id, bot);
              loadedCount++;
            }
          } catch (error) {
            console.error(`Ошибка загрузки бота ${file}:`, error.message);
          }
        }
      }

      console.log(`✅ Загружено ${loadedCount} активных ботов`);
      
      // Запускаем мониторинг здоровья ботов
      if (loadedCount > 0) {
        this.startHealthCheck();
      }
      
      return loadedCount;
    } catch (error) {
      console.error('Ошибка загрузки ботов:', error);
      return 0;
    }
  }

  async loadBot(botId, botConfig) {
    try {
      if (!botConfig.token) {
        throw new Error('Отсутствует токен бота');
      }

      if (!botConfig.messengerType) {
        // Для обратной совместимости - если не указан тип, считаем Telegram
        botConfig.messengerType = 'telegram';
      }

      console.log(`🔄 Загрузка ${botConfig.messengerType.toUpperCase()} бота ${botConfig.name}...`);
      
      // Проверяем, использует ли бот визуальную схему
      if (botConfig.visualSchemaId || botConfig.useVisualEditor) {
        console.log(`🎨 Бот ${botConfig.name} использует визуальную схему`);
        
        // Загружаем и конвертируем визуальную схему
        await this.loadAndConvertVisualSchema(botId, botConfig);
        
        // Определяем, использовать ли NodeProcessor
        botConfig.useNodeProcessor = true;
      }

      // Создаем адаптер для мессенджера
      const adapter = MessengerAdapterFactory.createAdapter(botConfig.messengerType, {
        token: botConfig.token,
        botId: botId,
        usePolling: this.usePolling,
        webhookUrl: this.webhookUrl,
        onMessage: (message) => this.processMessage(botId, message)
      });

      // Инициализируем адаптер
      const initialized = await adapter.initialize();
      if (!initialized) {
        throw new Error(`Не удалось инициализировать ${botConfig.messengerType} адаптер`);
      }

      // Запускаем адаптер
      const started = await adapter.start();
      if (!started) {
        throw new Error(`Не удалось запустить ${botConfig.messengerType} бота`);
      }

      // Сохраняем адаптер и конфигурацию
      this.activeBots.set(botId, adapter);
      this.botConfigs.set(botId, botConfig);

      console.log(`✅ ${botConfig.messengerType.toUpperCase()} бот ${botConfig.name} (${botId}) загружен`);
      return adapter;
    } catch (error) {
      console.error(`Ошибка загрузки бота ${botId}:`, error.message);
      throw error;
    }
  }

  async stopBot(botId) {
    try {
      const botInstance = this.activeBots.get(botId);
      if (!botInstance) {
        return false;
      }

      if (botInstance.mode === 'polling') {
        botInstance.telegramBot.stopPolling();
      } else {
        await botInstance.telegramBot.deleteWebHook();
      }
      
      this.activeBots.delete(botId);
      this.botConfigs.delete(botId);

      console.log(`🛑 Бот ${botInstance.config.name} (${botId}) остановлен`);
      return true;
    } catch (error) {
      console.error(`Ошибка остановки бота ${botId}:`, error.message);
      return false;
    }
  }

  async reloadBot(botId) {
    try {
      console.log(`🔄 Перезагрузка бота ${botId}...`);
      
      // Останавливаем бота
      await this.stopBot(botId);
      
      // Загружаем обновленную конфигурацию
      const botPath = path.join(this.botsDir, `bot_${botId}.json`);
      const botData = await fs.readFile(botPath, 'utf8');
      const botConfig = JSON.parse(botData);

      if (botConfig.status === 'active' && botConfig.token) {
        await this.loadBot(botId, botConfig);
        console.log(`✅ Бот ${botId} успешно перезагружен`);
        return true;
      }
      
      console.log(`⚠️ Бот ${botId} не активен или не имеет токена`);
      return false;
    } catch (error) {
      console.error(`Ошибка перезагрузки бота ${botId}:`, error.message);
      return false;
    }
  }

  /**
   * Автоматически перезапускает бота при изменении конфигурации
   * @param {string} botId - ID бота
   * @returns {boolean} Успешность перезапуска
   */
  async autoRestartBot(botId) {
    try {
      const adapter = this.activeBots.get(botId);
      if (!adapter) {
        console.log(`Бот ${botId} не активен, пропускаем перезапуск`);
        return false;
      }

      console.log(`🔄 Автоматический перезапуск бота ${botId} из-за изменения конфигурации`);
      
      const result = await this.reloadBot(botId);
      
      if (result) {
        // Логируем успешный перезапуск
        await this.logger.logBotEvent(botId, 'auto_restart', {
          reason: 'configuration_changed',
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Ошибка автоматического перезапуска бота ${botId}:`, error);
      return false;
    }
  }

  /**
   * Запускает периодическую проверку здоровья ботов
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log(`🏥 Запуск мониторинга здоровья ботов (каждые ${this.healthCheckIntervalMs / 60000} минут)`);
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckIntervalMs);

    // Выполняем первую проверку через 5 минут после запуска
    setTimeout(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * Останавливает периодическую проверку здоровья ботов
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🏥 Мониторинг здоровья ботов остановлен');
    }
  }

  /**
   * Выполняет проверку здоровья всех активных ботов
   */
  async performHealthCheck() {
    try {
      console.log('🏥 Выполнение проверки здоровья ботов...');
      
      const BotDeploymentManager = require('./BotDeploymentManager');
      const deploymentManager = new BotDeploymentManager();
      
      // Проверяем валидность токенов
      const tokenValidation = await deploymentManager.validateAllActiveTokens();
      
      console.log(`🏥 Проверка токенов: ${tokenValidation.valid} валидных, ${tokenValidation.invalid} недействительных`);
      
      if (tokenValidation.invalid > 0) {
        console.log('⚠️ Найдены боты с недействительными токенами:', tokenValidation.errors);
        
        // Автоматически деактивируем ботов с недействительными токенами
        const deactivationResult = await deploymentManager.deactivateInvalidBots();
        
        if (deactivationResult.success && deactivationResult.deactivated > 0) {
          console.log(`🛑 Автоматически деактивировано ${deactivationResult.deactivated} ботов`);
          
          // Останавливаем деактивированных ботов в runtime
          for (const bot of deactivationResult.bots) {
            await this.stopBot(bot.botId);
          }
        }
      }
      
      // Проверяем состояние адаптеров
      let healthyBots = 0;
      let unhealthyBots = 0;
      
      for (const [botId, adapter] of this.activeBots) {
        try {
          const isHealthy = adapter.isActive && adapter.isHealthy();
          
          if (isHealthy) {
            healthyBots++;
          } else {
            unhealthyBots++;
            console.log(`⚠️ Бот ${botId} не отвечает, попытка перезапуска...`);
            
            // Пытаемся перезапустить нездоровый бот
            const restarted = await this.autoRestartBot(botId);
            if (restarted) {
              console.log(`✅ Бот ${botId} успешно перезапущен`);
            } else {
              console.log(`❌ Не удалось перезапустить бот ${botId}`);
            }
          }
        } catch (error) {
          unhealthyBots++;
          console.error(`Ошибка проверки здоровья бота ${botId}:`, error);
        }
      }
      
      console.log(`🏥 Проверка завершена: ${healthyBots} здоровых, ${unhealthyBots} проблемных ботов`);
      
      // Логируем результаты проверки
      await this.logger.logSystemEvent('health_check', {
        totalBots: this.activeBots.size,
        healthyBots,
        unhealthyBots,
        tokenValidation: {
          valid: tokenValidation.valid,
          invalid: tokenValidation.invalid
        }
      });
      
    } catch (error) {
      console.error('Ошибка проверки здоровья ботов:', error);
    }
  }



  async executeNodeFlow(botInstance, message) {
    const config = botInstance.config.configuration;
    if (!config || !config.nodes) return;

    const triggers = config.nodes.filter(node => node.type === 'trigger');
    
    for (const trigger of triggers) {
      if (await this.checkTrigger(trigger, message)) {
        await this.executeNode(botInstance, trigger, message);
      }
    }
  }

  async checkTrigger(trigger, message) {
    const triggerData = trigger.data;

    switch (triggerData.triggerType) {
      case 'command':
        return message.text && message.text.startsWith(triggerData.command);
      case 'message':
        if (triggerData.filters) {
          return triggerData.filters.some(filter => {
            switch (filter) {
              case 'contains_links':
                return message.text && (message.text.includes('http') || message.text.includes('www.'));
              default:
                return message.text && message.text.includes(filter);
            }
          });
        }
        return true;
      case 'new_chat_members':
        return message.new_chat_members && message.new_chat_members.length > 0;
      default:
        return false;
    }
  }

  async executeNode(botInstance, node, message, context = {}) {
    try {
      switch (node.type) {
        case 'trigger':
          if (node.connections && node.connections.length > 0) {
            for (const connectionId of node.connections) {
              const nextNode = this.findNodeById(botInstance.config.configuration, connectionId);
              if (nextNode) {
                await this.executeNode(botInstance, nextNode, message, context);
              }
            }
          }
          break;

        case 'action':
          await this.executeAction(botInstance, node, message, context);
          break;

        case 'condition':
          const conditionResult = await this.evaluateCondition(node, message, context);
          await this.executeConditionalFlow(botInstance, node, message, context, conditionResult);
          break;
      }
    } catch (error) {
      console.error(`Ошибка выполнения узла ${node.id}:`, error.message);
    }
  }

  async executeAction(botInstance, node, message, context) {
    const actionData = node.data;

    try {
      switch (actionData.actionType) {
        case 'send_message':
          let messageText = this.replaceVariables(actionData.message, message, context);
          
          const sendOptions = {};
          if (actionData.keyboard) {
            sendOptions.reply_markup = {
              keyboard: actionData.keyboard,
              resize_keyboard: true,
              one_time_keyboard: true
            };
          }

          console.log(`📤 Отправка сообщения: "${messageText}"`);
          await botInstance.telegramBot.sendMessage(message.chat.id, messageText, sendOptions);
          
          // Логируем отправленное сообщение
          await this.logger.logAction(botInstance.id, 'send_message', {
            messageText: messageText.substring(0, 200),
            chatId: message.chat.id,
            userId: message.from.id
          });
          break;

        case 'delete_message':
          if (message.message_id) {
            await botInstance.telegramBot.deleteMessage(message.chat.id, message.message_id);
            await this.logger.logAction(botInstance.id, 'delete_message', {
              messageId: message.message_id,
              chatId: message.chat.id,
              userId: message.from.id
            });
          }
          break;
      }

      if (node.connections && node.connections.length > 0) {
        for (const connectionId of node.connections) {
          const nextNode = this.findNodeById(botInstance.config.configuration, connectionId);
          if (nextNode) {
            await this.executeNode(botInstance, nextNode, message, context);
          }
        }
      }
    } catch (error) {
      await this.logger.logError(botInstance.id, error, {
        context: 'executeAction',
        actionType: actionData.actionType,
        nodeId: node.id
      });
      throw error;
    }
  }

  async evaluateCondition(node, message, context) {
    const conditionData = node.data;

    switch (conditionData.conditionType) {
      case 'user_is_admin':
        return message.from.id === message.chat.id;
      case 'text_contains':
        return message.text && message.text.toLowerCase().includes(conditionData.text.toLowerCase());
      default:
        return false;
    }
  }

  async executeConditionalFlow(botInstance, node, message, context, conditionResult) {
    const connections = node.connections;
    
    if (typeof connections === 'object' && !Array.isArray(connections)) {
      const branch = conditionResult ? connections.true : connections.false;
      if (branch && Array.isArray(branch)) {
        for (const connectionId of branch) {
          const nextNode = this.findNodeById(botInstance.config.configuration, connectionId);
          if (nextNode) {
            await this.executeNode(botInstance, nextNode, message, context);
          }
        }
      }
    }
  }

  findNodeById(configuration, nodeId) {
    return configuration.nodes.find(node => node.id === nodeId);
  }

  async updateBotStats(botId, stats) {
    try {
      const botPath = path.join(this.botsDir, `bot_${botId}.json`);
      const botData = await fs.readFile(botPath, 'utf8');
      const bot = JSON.parse(botData);

      bot.stats = {
        messagesProcessed: stats.messagesProcessed,
        activeUsers: stats.activeUsers.size,
        lastActivity: stats.lastActivity
      };
      bot.updatedAt = new Date().toISOString();

      await fs.writeFile(botPath, JSON.stringify(bot, null, 2));
    } catch (error) {
      console.error(`Ошибка обновления статистики бота ${botId}:`, error.message);
    }
  }

  getRuntimeStats() {
    const stats = {
      activeBots: this.activeBots.size,
      totalMessages: 0,
      totalErrors: 0,
      messengerTypes: {}
    };

    for (const [botId, adapter] of this.activeBots) {
      const adapterStats = adapter.getStats();
      stats.totalMessages += adapterStats.messagesReceived + adapterStats.messagesSent;
      stats.totalErrors += adapterStats.errors;
      
      // Подсчитываем боты по типам мессенджеров
      const messengerType = adapter.type;
      stats.messengerTypes[messengerType] = (stats.messengerTypes[messengerType] || 0) + 1;
    }

    return stats;
  }

  getBotInfo(botId) {
    const adapter = this.activeBots.get(botId);
    const botConfig = this.botConfigs.get(botId);
    
    if (!adapter || !botConfig) {
      return null;
    }

    return {
      id: botId,
      name: botConfig.name,
      messengerType: adapter.type,
      isActive: adapter.isActive,
      stats: adapter.getStats(),
      config: {
        messagesProcessed: botInstance.stats.messagesProcessed,
        activeUsers: botInstance.stats.activeUsers.size,
        lastActivity: botInstance.stats.lastActivity
      },
      webhookPath: botInstance.webhookPath
    };
  }
  /**
   * Замена переменных в тексте
   */
  replaceVariables(text, message, context) {
    let result = text;
    
    // Системные переменные
    result = result.replace(/{user_name}/g, message.from.first_name || 'Пользователь');
    result = result.replace(/{user_id}/g, message.from.id);
    result = result.replace(/{username}/g, message.from.username || 'неизвестно');
    result = result.replace(/{chat_id}/g, message.chat.id);
    result = result.replace(/{message_text}/g, message.text || '');
    result = result.replace(/{date}/g, new Date().toLocaleDateString());
    result = result.replace(/{time}/g, new Date().toLocaleTimeString());
    
    // Специальная логика для игр
    if (text.includes('{user_choice}') || text.includes('{bot_choice}')) {
      const gameResult = this.playRockPaperScissors(message.text);
      result = result.replace(/{user_choice}/g, gameResult.userChoice);
      result = result.replace(/{bot_choice}/g, gameResult.botChoice);
      result = result.replace(/{result}/g, gameResult.result);
      result = result.replace(/{user_score}/g, gameResult.userScore);
      result = result.replace(/{bot_score}/g, gameResult.botScore);
    }
    
    // Переменные из контекста
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * Логика игры камень-ножницы-бумага
   */
  playRockPaperScissors(userText) {
    const choices = ['🗿 Камень', '✂️ Ножницы', '📄 Бумага'];
    const userChoice = userText;
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    
    let result = '';
    
    // Определяем результат
    if (userChoice === botChoice) {
      result = '🤝 Ничья!';
    } else if (
      (userChoice === '🗿 Камень' && botChoice === '✂️ Ножницы') ||
      (userChoice === '✂️ Ножницы' && botChoice === '📄 Бумага') ||
      (userChoice === '📄 Бумага' && botChoice === '🗿 Камень')
    ) {
      result = '🎉 Вы выиграли!';
    } else {
      result = '😔 Вы проиграли!';
    }
    
    return {
      userChoice: userChoice,
      botChoice: botChoice,
      result: result,
      userScore: 0, // Можно добавить счетчик позже
      botScore: 0
    };
  }

  /**
   * Удаление сообщения
   */
  async deleteMessage(botInstance, message) {
    try {
      await botInstance.telegramBot.deleteMessage(message.chat.id, message.message_id);
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
    }
  }

  /**
   * Сохранение данных
   */
  async saveData(botInstance, actionData, message, context) {
    console.log(`💾 Сохранение данных: ${actionData.dataType}`, {
      userId: message.from.id,
      data: context
    });
  }

  /**
   * Загружает и конвертирует визуальную схему для бота
   * @param {string} botId - ID бота
   * @param {Object} botConfig - Конфигурация бота
   */
  async loadAndConvertVisualSchema(botId, botConfig) {
    try {
      if (!botConfig.visualSchemaId) {
        console.log(`Бот ${botId} не имеет визуальной схемы`);
        return;
      }

      // Загружаем визуальную схему
      const schemaPath = path.join(this.schemasDir, `schema_${botConfig.visualSchemaId}.json`);
      
      try {
        await fs.access(schemaPath);
      } catch (err) {
        console.error(`Визуальная схема ${botConfig.visualSchemaId} не найдена`);
        return;
      }
      
      const schemaData = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaData);
      
      console.log(`📊 Загружена визуальная схема с ${schema.nodes?.length || 0} узлами и ${schema.connections?.length || 0} соединениями`);
      
      // Схема уже в новом формате, конвертация не нужна
      const executableConfig = schema;
      
      // Обновляем конфигурацию бота
      botConfig.configuration = executableConfig;
      botConfig.visualSchema = schema; // Сохраняем оригинальную схему для отладки
      
      console.log(`✅ Визуальная схема конвертирована в исполняемую конфигурацию`);
    } catch (error) {
      console.error(`Ошибка загрузки визуальной схемы для бота ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Загружает визуальную схему для бота
   * @param {string} botId - ID бота
   * @param {string} userId - ID пользователя
   * @returns {Object|null} - Визуальная схема или null
   */
  async loadVisualSchema(botId, userId) {
    try {
      // Получаем конфигурацию бота
      const botPath = path.join(this.botsDir, userId, `${botId}.json`);
      
      try {
        await fs.access(botPath);
      } catch (err) {
        console.error(`Бот ${botId} не найден`);
        return null;
      }
      
      const botData = await fs.readFile(botPath, 'utf8');
      const bot = JSON.parse(botData);
      
      // Проверяем наличие ID визуальной схемы
      if (!bot.visualSchemaId) {
        console.log(`Бот ${botId} не имеет визуальной схемы`);
        return null;
      }
      
      // Загружаем визуальную схему
      const schemaPath = path.join(this.schemasDir, userId, `${bot.visualSchemaId}.json`);
      
      try {
        await fs.access(schemaPath);
      } catch (err) {
        console.error(`Визуальная схема ${bot.visualSchemaId} не найдена`);
        return null;
      }
      
      const schemaData = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaData);
      
      return schema;
    } catch (error) {
      console.error(`Ошибка загрузки визуальной схемы для бота ${botId}:`, error);
      return null;
    }
  }

  /**
   * Обновляет конфигурацию бота из визуальной схемы
   * @param {string} botId - ID бота
   * @param {string} userId - ID пользователя
   * @returns {boolean} - Успешность обновления
   */
  async updateBotFromVisualSchema(botId, userId) {
    try {
      // Загружаем визуальную схему
      const schema = await this.loadVisualSchema(botId, userId);
      
      if (!schema) {
        return false;
      }
      
      // Схема уже в новом формате, конвертация не нужна
      const executableSchema = schema;
      
      // Обновляем конфигурацию бота
      const botPath = path.join(this.botsDir, userId, `${botId}.json`);
      const botData = await fs.readFile(botPath, 'utf8');
      const bot = JSON.parse(botData);
      
      bot.configuration = executableSchema;
      bot.updatedAt = new Date().toISOString();
      
      await fs.writeFile(botPath, JSON.stringify(bot, null, 2));
      
      // Если бот активен, перезагружаем его
      if (this.activeBots.has(botId)) {
        await this.reloadBot(botId);
      }
      
      return true;
    } catch (error) {
      console.error(`Ошибка обновления бота ${botId} из визуальной схемы:`, error);
      return false;
    }
  }

  /**
   * Создает NodeProcessor для бота
   * @param {Object} botInstance - Экземпляр бота
   * @returns {NodeProcessor} - Процессор узлов
   */
  createNodeProcessor(botConfig) {
    const processor = new NodeProcessor(botConfig);
    return processor;
  }

  /**
   * Обрабатывает сообщение с использованием NodeProcessor
   * @param {Object} botInstance - Экземпляр бота
   * @param {Object} message - Сообщение
   */
  async processMessageWithNodeProcessor(botId, message) {
    const adapter = this.activeBots.get(botId);
    const botConfig = this.botConfigs.get(botId);
    
    if (!adapter || !botConfig) {
      console.error(`Бот ${botId} не найден`);
      return;
    }
    
    try {
      let processor = this.nodeProcessors.get(botId);
      
      if (!processor) {
        processor = this.createNodeProcessor(botConfig);
        this.nodeProcessors.set(botId, processor);
        await processor.init();
      }
      
      await processor.processTriggers(message);
    } catch (error) {
      console.error(`Ошибка обработки сообщения для бота ${botId}:`, error);
    }
  }

  /**
   * Обрабатывает сообщение в зависимости от типа конфигурации бота
   * @param {Object} botInstance - Экземпляр бота
   * @param {Object} message - Сообщение
   */
  async processMessage(botId, message) {
    const adapter = this.activeBots.get(botId);
    const botConfig = this.botConfigs.get(botId);
    
    if (!adapter || !botConfig) {
      console.error(`Бот ${botId} не найден`);
      return;
    }
    try {
      // Логируем входящее сообщение
      await this.logger.logMessage(
        botId, 
        message.userId, 
        message.text, 
        message.type
      );

      // Обновляем статистику адаптера
      adapter.updateStats('messagesReceived');

      // Проверяем, использует ли бот NodeProcessor (для визуальных схем)
      if (botConfig.useNodeProcessor) {
        await this.processMessageWithNodeProcessor(botId, message);
      } else {
        // Используем старый метод обработки
        await this.processMessageLegacy(botId, message);
      }
    } catch (error) {
      console.error(`Ошибка обработки сообщения для бота ${botId}:`, error);
      await this.logger.logError(botId, error, { 
        context: 'processMessage',
        userId: message.from?.id || message.userId,
        messageText: message.text?.substring(0, 100)
      });
    }
  }

  /**
   * Старый метод обработки сообщений (для обратной совместимости)
   * @param {Object} botInstance - Экземпляр бота
   * @param {Object} message - Сообщение
   */
  async processMessageLegacy(botId, message) {
    const adapter = this.activeBots.get(botId);
    const botConfig = this.botConfigs.get(botId);
    
    if (!adapter || !botConfig) {
      console.error(`Бот ${botId} не найден`);
      return;
    }
    
    if (!botConfig.configuration || !botConfig.configuration.nodes) {
      console.log(`Бот ${botId} не имеет конфигурации узлов`);
      return;
    }
    
    const triggers = botConfig.configuration.nodes.filter(node => node.type === 'trigger');
    
    for (const trigger of triggers) {
      if (await this.checkTrigger(trigger, message)) {
        await this.executeNode(botConfig, trigger, message);
      }
    }
  }
}

module.exports = BotRuntime;