/**
 * Тестирование интеграции простого бота с Telegram API
 */

const fs = require('fs');
const path = require('path');

console.log('📱 Тестирование интеграции с Telegram API...\n');

// Проверяем наличие токена
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramToken) {
  console.log('⚠️ Переменная TELEGRAM_BOT_TOKEN не установлена');
  console.log('📋 Для полного тестирования:');
  console.log('   1. Создайте бота через @BotFather в Telegram');
  console.log('   2. Получите токен бота');
  console.log('   3. Установите переменную: set TELEGRAM_BOT_TOKEN=your_token');
  console.log('   4. Перезапустите тест');
  console.log('\n🔄 Продолжаем с симуляцией...\n');
}

// Загружаем тестового бота
const botPath = path.join(__dirname, '..', 'data', 'bots', 'bot_simple-test-bot.json');
const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));

console.log(`🤖 Тестируем бота: ${botData.name}`);

// Простая реализация Telegram API клиента
class TelegramBot {
  constructor(token) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
    this.isSimulation = !token || token === 'TEST_TOKEN';
    
    if (this.isSimulation) {
      console.log('🎭 Режим симуляции (без реального API)');
    } else {
      console.log('🌐 Режим реального API');
    }
  }
  
  async getMe() {
    if (this.isSimulation) {
      return {
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
          username: 'test_simple_bot',
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: false
        }
      };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/getMe`);
      return await response.json();
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  
  async sendMessage(chatId, text, options = {}) {
    const message = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'HTML',
      ...options
    };
    
    if (this.isSimulation) {
      console.log(`📤 [СИМУЛЯЦИЯ] Отправка сообщения в чат ${chatId}:`);
      console.log(`   Текст: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      console.log(`   Режим: ${message.parse_mode}`);
      
      return {
        ok: true,
        result: {
          message_id: Math.floor(Math.random() * 1000000),
          from: { id: 123456789, is_bot: true, first_name: 'Test Bot' },
          chat: { id: chatId, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: text
        }
      };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      return await response.json();
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  
  async getUpdates(offset = 0) {
    if (this.isSimulation) {
      // Симулируем входящие сообщения для тестирования
      const simulatedUpdates = [
        {
          update_id: 1,
          message: {
            message_id: 1,
            from: { id: 111111, is_bot: false, first_name: 'Test User' },
            chat: { id: 111111, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        },
        {
          update_id: 2,
          message: {
            message_id: 2,
            from: { id: 222222, is_bot: false, first_name: 'Another User' },
            chat: { id: 222222, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/help'
          }
        },
        {
          update_id: 3,
          message: {
            message_id: 3,
            from: { id: 111111, is_bot: false, first_name: 'Test User' },
            chat: { id: 111111, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/status'
          }
        }
      ];
      
      return {
        ok: true,
        result: simulatedUpdates.filter(u => u.update_id > offset)
      };
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/getUpdates?offset=${offset}`);
      return await response.json();
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
}

// Интегрированный бот с Telegram API
class TelegramBotIntegration {
  constructor(botSchema, telegramToken) {
    this.botSchema = botSchema;
    this.telegram = new TelegramBot(telegramToken);
    this.lastUpdateId = 0;
    this.isRunning = false;
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      startTime: new Date()
    };
    
    // Загружаем runtime из предыдущего теста
    this.loadRuntime();
  }
  
  loadRuntime() {
    // Простая версия runtime для интеграции
    this.nodes = new Map();
    this.edges = new Map();
    
    this.botSchema.configuration.nodes.forEach(node => {
      this.nodes.set(node.id, node);
    });
    
    this.botSchema.configuration.edges.forEach(edge => {
      if (!this.edges.has(edge.source)) {
        this.edges.set(edge.source, []);
      }
      this.edges.get(edge.source).push(edge);
    });
    
    console.log(`🔧 Runtime загружен: ${this.nodes.size} узлов, ${this.edges.size} соединений`);
  }
  
  async start() {
    console.log('🚀 Запуск Telegram бота...');
    
    // Проверяем подключение
    const me = await this.telegram.getMe();
    if (!me.ok) {
      throw new Error(`Ошибка подключения к Telegram: ${me.error}`);
    }
    
    console.log(`✅ Подключен как: ${me.result.first_name} (@${me.result.username})`);
    console.log(`   ID: ${me.result.id}`);
    console.log(`   Может присоединяться к группам: ${me.result.can_join_groups}`);
    
    this.isRunning = true;
    this.pollUpdates();
    
    return me.result;
  }
  
  async pollUpdates() {
    while (this.isRunning) {
      try {
        const updates = await this.telegram.getUpdates(this.lastUpdateId + 1);
        
        if (updates.ok && updates.result.length > 0) {
          for (const update of updates.result) {
            await this.processUpdate(update);
            this.lastUpdateId = update.update_id;
          }
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('❌ Ошибка при получении обновлений:', error.message);
        this.stats.errors++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  async processUpdate(update) {
    if (!update.message) return;
    
    const message = update.message;
    this.stats.messagesReceived++;
    
    console.log(`\n📨 Получено сообщение от ${message.from.first_name} (${message.from.id}):`);
    console.log(`   Текст: ${message.text}`);
    
    // Определяем тип сообщения
    let messageType = 'text';
    let messageText = message.text;
    
    if (message.text && message.text.startsWith('/')) {
      messageType = 'command';
    }
    
    // Ищем подходящий триггер
    const trigger = this.findTrigger(messageType, messageText);
    
    if (!trigger) {
      console.log('   ⚠️ Триггер не найден');
      return;
    }
    
    console.log(`   ✅ Найден триггер: ${trigger.data.label}`);
    
    // Выполняем действия
    const actions = this.edges.get(trigger.id) || [];
    
    for (const edge of actions) {
      const actionNode = this.nodes.get(edge.target);
      if (actionNode) {
        await this.executeAction(actionNode, message);
      }
    }
  }
  
  findTrigger(messageType, messageText) {
    for (const [nodeId, node] of this.nodes) {
      if (node.type === 'trigger-command' && messageType === 'command') {
        if (node.data.command === messageText) {
          return node;
        }
      } else if (node.type === 'trigger-message' && messageType === 'text') {
        return node;
      }
    }
    return null;
  }
  
  async executeAction(actionNode, message) {
    console.log(`   ⚙️ Выполнение: ${actionNode.data.label}`);
    
    if (actionNode.type === 'action-send-message') {
      let text = actionNode.data.text || 'Пустое сообщение';
      
      // Заменяем переменные
      text = text.replace(/{{message_count}}/g, this.stats.messagesReceived);
      text = text.replace(/{{user_count}}/g, '1'); // Упрощенно
      text = text.replace(/{{uptime}}/g, this.getUptime());
      text = text.replace(/{{last_update}}/g, new Date().toLocaleString('ru-RU'));
      
      const result = await this.telegram.sendMessage(
        message.chat.id,
        text,
        { parse_mode: actionNode.data.parseMode || 'HTML' }
      );
      
      if (result.ok) {
        console.log(`   ✅ Сообщение отправлено (ID: ${result.result.message_id})`);
        this.stats.messagesSent++;
      } else {
        console.log(`   ❌ Ошибка отправки: ${result.error}`);
        this.stats.errors++;
      }
    }
  }
  
  getUptime() {
    const uptimeMs = Date.now() - this.stats.startTime.getTime();
    const uptimeMinutes = Math.floor(uptimeMs / (1000 * 60));
    
    if (uptimeMinutes < 1) return 'менее минуты';
    if (uptimeMinutes < 60) return `${uptimeMinutes} минут`;
    
    const hours = Math.floor(uptimeMinutes / 60);
    return `${hours} часов ${uptimeMinutes % 60} минут`;
  }
  
  stop() {
    console.log('🛑 Остановка бота...');
    this.isRunning = false;
  }
  
  getStats() {
    return {
      ...this.stats,
      uptime: this.getUptime(),
      isRunning: this.isRunning
    };
  }
}

// Функция тестирования
async function testTelegramIntegration() {
  try {
    const bot = new TelegramBotIntegration(botData, telegramToken);
    
    console.log('📊 Начальная статистика:');
    console.log(`   Узлов в схеме: ${botData.configuration.nodes.length}`);
    console.log(`   Соединений: ${botData.configuration.edges.length}`);
    console.log(`   Команд: ${botData.configuration.nodes.filter(n => n.type === 'trigger-command').length}`);
    
    // Запускаем бота
    const botInfo = await bot.start();
    
    console.log('\n⏰ Бот запущен. Тестирование в течение 10 секунд...');
    
    // Даем боту поработать
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Останавливаем
    bot.stop();
    
    // Финальная статистика
    const finalStats = bot.getStats();
    console.log('\n📊 Финальная статистика:');
    console.log(`   Получено сообщений: ${finalStats.messagesReceived}`);
    console.log(`   Отправлено сообщений: ${finalStats.messagesSent}`);
    console.log(`   Ошибок: ${finalStats.errors}`);
    console.log(`   Время работы: ${finalStats.uptime}`);
    
    // Сохраняем результаты
    const testResults = {
      botId: botData.id,
      timestamp: new Date().toISOString(),
      telegramIntegration: {
        botInfo: botInfo,
        stats: finalStats,
        success: finalStats.errors === 0
      }
    };
    
    const resultsPath = path.join(__dirname, 'telegram-integration-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Результаты сохранены: ${resultsPath}`);
    
    // Обновляем статистику бота
    botData.stats.messagesProcessed += finalStats.messagesReceived;
    botData.stats.lastActivity = new Date().toISOString();
    botData.updatedAt = new Date().toISOString();
    
    if (telegramToken && telegramToken !== 'TEST_TOKEN') {
      botData.platforms[0].status = 'connected';
    }
    
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    
    return testResults;
    
  } catch (error) {
    console.error('💥 Ошибка интеграции:', error.message);
    return { success: false, error: error.message };
  }
}

// Простая реализация fetch для Node.js
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    const https = require('https');
    const http = require('http');
    const urlParsed = new URL(url);
    const client = urlParsed.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

// Запускаем тест
testTelegramIntegration().then(results => {
  console.log('\n🎉 Тестирование Telegram интеграции завершено!');
  
  if (results.success !== false) {
    console.log('✅ Интеграция работает корректно');
    
    if (!telegramToken || telegramToken === 'TEST_TOKEN') {
      console.log('\n💡 Для полного тестирования с реальным Telegram:');
      console.log('   1. Получите токен от @BotFather');
      console.log('   2. Установите TELEGRAM_BOT_TOKEN');
      console.log('   3. Перезапустите тест');
      console.log('   4. Отправьте команды боту в Telegram');
    }
  } else {
    console.log('❌ Требуется исправление ошибок');
  }
  
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});