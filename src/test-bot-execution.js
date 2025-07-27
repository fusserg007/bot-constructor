/**
 * Тестирование выполнения простого бота через систему runtime
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Тестирование выполнения простого бота...\n');

// Загружаем созданного бота
const botPath = path.join(__dirname, '..', 'data', 'bots', 'bot_simple-test-bot.json');

if (!fs.existsSync(botPath)) {
  console.error('❌ Тестовый бот не найден. Сначала запустите: node src/test-simple-bot.js');
  process.exit(1);
}

const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));
console.log(`✅ Загружен бот: ${botData.name} (ID: ${botData.id})`);

// Симулируем систему выполнения ботов
class SimpleBotRuntime {
  constructor(botSchema) {
    this.botSchema = botSchema;
    this.nodes = new Map();
    this.edges = new Map();
    this.variables = new Map();
    this.userStates = new Map();
    
    this.initializeBot();
  }
  
  initializeBot() {
    // Индексируем узлы
    this.botSchema.configuration.nodes.forEach(node => {
      this.nodes.set(node.id, node);
    });
    
    // Индексируем соединения
    this.botSchema.configuration.edges.forEach(edge => {
      if (!this.edges.has(edge.source)) {
        this.edges.set(edge.source, []);
      }
      this.edges.get(edge.source).push(edge);
    });
    
    // Инициализируем переменные
    Object.entries(this.botSchema.configuration.variables || {}).forEach(([key, variable]) => {
      this.variables.set(key, variable.defaultValue);
    });
    
    console.log(`🔧 Бот инициализирован:`);
    console.log(`   Узлов: ${this.nodes.size}`);
    console.log(`   Соединений: ${this.edges.size}`);
    console.log(`   Переменных: ${this.variables.size}`);
  }
  
  async processMessage(message) {
    const { type, text, userId, chatId } = message;
    
    console.log(`\n📨 Обработка сообщения:`);
    console.log(`   Тип: ${type}`);
    console.log(`   Текст: ${text}`);
    console.log(`   Пользователь: ${userId}`);
    
    // Обновляем состояние пользователя
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        messageCount: 0,
        lastActivity: new Date(),
        variables: new Map()
      });
    }
    
    const userState = this.userStates.get(userId);
    userState.messageCount++;
    userState.lastActivity = new Date();
    
    // Ищем подходящие триггеры
    const matchingTriggers = this.findMatchingTriggers(message);
    
    if (matchingTriggers.length === 0) {
      console.log(`   ⚠️ Не найдено подходящих триггеров`);
      return { success: false, reason: 'No matching triggers' };
    }
    
    // Выполняем первый подходящий триггер
    const trigger = matchingTriggers[0];
    console.log(`   ✅ Найден триггер: ${trigger.data.label}`);
    
    return await this.executeTrigger(trigger, message);
  }
  
  findMatchingTriggers(message) {
    const triggers = [];
    
    for (const [nodeId, node] of this.nodes) {
      if (node.type === 'trigger-command' && message.type === 'command') {
        if (node.data.command === message.text) {
          triggers.push(node);
        }
      } else if (node.type === 'trigger-message' && message.type === 'text') {
        // Простая проверка на соответствие текста
        triggers.push(node);
      }
    }
    
    return triggers;
  }
  
  async executeTrigger(triggerNode, message) {
    console.log(`   🎯 Выполнение триггера: ${triggerNode.id}`);
    
    // Находим соединенные узлы
    const connections = this.edges.get(triggerNode.id) || [];
    
    if (connections.length === 0) {
      console.log(`   ⚠️ Нет соединений для триггера`);
      return { success: false, reason: 'No connections' };
    }
    
    const results = [];
    
    for (const connection of connections) {
      const targetNode = this.nodes.get(connection.target);
      if (targetNode) {
        const result = await this.executeNode(targetNode, message);
        results.push(result);
      }
    }
    
    return {
      success: true,
      trigger: triggerNode.data.label,
      results: results
    };
  }
  
  async executeNode(node, message) {
    console.log(`   ⚙️ Выполнение узла: ${node.data.label} (${node.type})`);
    
    switch (node.type) {
      case 'action-send-message':
        return this.executeSendMessage(node, message);
      
      case 'condition-text-contains':
        return this.executeTextCondition(node, message);
      
      default:
        console.log(`   ⚠️ Неизвестный тип узла: ${node.type}`);
        return { success: false, reason: 'Unknown node type' };
    }
  }
  
  executeSendMessage(node, message) {
    let text = node.data.text || 'Пустое сообщение';
    
    // Заменяем переменные
    for (const [key, value] of this.variables) {
      const placeholder = `{{${key}}}`;
      text = text.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Заменяем пользовательские переменные
    const userState = this.userStates.get(message.userId);
    if (userState) {
      text = text.replace(/{{message_count}}/g, userState.messageCount);
      text = text.replace(/{{user_count}}/g, this.userStates.size);
      text = text.replace(/{{uptime}}/g, this.calculateUptime());
    }
    
    console.log(`   💬 Отправка сообщения (${text.length} символов)`);
    
    // Симулируем отправку
    return {
      success: true,
      type: 'send_message',
      text: text,
      parseMode: node.data.parseMode || 'HTML',
      chatId: message.chatId
    };
  }
  
  executeTextCondition(node, message) {
    const condition = node.data.condition || '';
    const value = node.data.value || '';
    const messageText = message.text || '';
    
    let result = false;
    
    switch (condition) {
      case 'contains':
        result = messageText.toLowerCase().includes(value.toLowerCase());
        break;
      case 'equals':
        result = messageText.toLowerCase() === value.toLowerCase();
        break;
      case 'starts_with':
        result = messageText.toLowerCase().startsWith(value.toLowerCase());
        break;
      default:
        result = false;
    }
    
    console.log(`   🔍 Условие "${condition}" с "${value}": ${result}`);
    
    return {
      success: true,
      type: 'condition',
      result: result,
      condition: condition,
      value: value
    };
  }
  
  calculateUptime() {
    const startTime = new Date(this.botSchema.createdAt);
    const now = new Date();
    const uptimeMs = now - startTime;
    const uptimeMinutes = Math.floor(uptimeMs / (1000 * 60));
    
    if (uptimeMinutes < 60) {
      return `${uptimeMinutes} минут`;
    } else if (uptimeMinutes < 1440) {
      const hours = Math.floor(uptimeMinutes / 60);
      return `${hours} часов`;
    } else {
      const days = Math.floor(uptimeMinutes / 1440);
      return `${days} дней`;
    }
  }
  
  getStats() {
    return {
      totalUsers: this.userStates.size,
      totalMessages: Array.from(this.userStates.values())
        .reduce((sum, state) => sum + state.messageCount, 0),
      uptime: this.calculateUptime(),
      nodesCount: this.nodes.size,
      edgesCount: this.edges.size
    };
  }
}

// Создаем runtime для бота
const runtime = new SimpleBotRuntime(botData);

// Тестовые сообщения
const testMessages = [
  {
    type: 'command',
    text: '/start',
    userId: 'user1',
    chatId: 'chat1'
  },
  {
    type: 'command',
    text: '/help',
    userId: 'user1',
    chatId: 'chat1'
  },
  {
    type: 'command',
    text: '/status',
    userId: 'user2',
    chatId: 'chat2'
  },
  {
    type: 'command',
    text: '/unknown',
    userId: 'user1',
    chatId: 'chat1'
  },
  {
    type: 'text',
    text: 'Привет, бот!',
    userId: 'user3',
    chatId: 'chat3'
  }
];

// Выполняем тесты
async function runTests() {
  console.log('\n🧪 Запуск тестов выполнения:\n');
  
  const results = [];
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n--- Тест ${i + 1}/${testMessages.length} ---`);
    
    try {
      const result = await runtime.processMessage(message);
      results.push({ message, result, success: true });
      
      if (result.success) {
        console.log(`   ✅ Успешно: ${result.trigger || 'Обработано'}`);
        if (result.results) {
          result.results.forEach(r => {
            if (r.type === 'send_message') {
              console.log(`   📤 Ответ: ${r.text.substring(0, 50)}...`);
            }
          });
        }
      } else {
        console.log(`   ❌ Ошибка: ${result.reason}`);
      }
    } catch (error) {
      console.log(`   💥 Исключение: ${error.message}`);
      results.push({ message, error: error.message, success: false });
    }
  }
  
  // Статистика
  console.log('\n📊 Статистика выполнения:');
  const stats = runtime.getStats();
  console.log(`   Пользователей: ${stats.totalUsers}`);
  console.log(`   Сообщений: ${stats.totalMessages}`);
  console.log(`   Время работы: ${stats.uptime}`);
  console.log(`   Узлов: ${stats.nodesCount}`);
  console.log(`   Соединений: ${stats.edgesCount}`);
  
  // Результаты тестов
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n🎯 Результаты тестирования:');
  console.log(`   ✅ Успешных: ${successful}`);
  console.log(`   ❌ Неудачных: ${failed}`);
  console.log(`   📈 Успешность: ${(successful / results.length * 100).toFixed(1)}%`);
  
  // Сохраняем результаты
  const testResults = {
    botId: botData.id,
    timestamp: new Date().toISOString(),
    tests: results,
    stats: stats,
    summary: {
      total: results.length,
      successful: successful,
      failed: failed,
      successRate: successful / results.length
    }
  };
  
  const resultsPath = path.join(__dirname, 'bot-execution-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Результаты сохранены: ${resultsPath}`);
  
  // Обновляем статистику бота
  botData.stats.messagesProcessed += stats.totalMessages;
  botData.stats.activeUsers = stats.totalUsers;
  botData.stats.lastActivity = new Date().toISOString();
  botData.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
  console.log(`✅ Статистика бота обновлена`);
  
  return testResults;
}

// Запускаем тесты
runTests().then(results => {
  console.log('\n🎉 Тестирование выполнения завершено!');
  
  if (results.summary.successRate >= 0.8) {
    console.log('✅ Бот работает корректно (успешность >= 80%)');
  } else {
    console.log('⚠️ Требуется доработка (успешность < 80%)');
  }
  
  console.log('\n📋 Следующие шаги:');
  console.log('   1. Интегрировать с реальным Telegram API');
  console.log('   2. Добавить обработку ошибок');
  console.log('   3. Реализовать персистентное хранение состояний');
  console.log('   4. Добавить мониторинг производительности');
  
}).catch(error => {
  console.error('💥 Ошибка при тестировании:', error);
  process.exit(1);
});