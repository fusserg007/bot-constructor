/**
 * Создание и тестирование простого бота с командой /start
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 Создание простого тестового бота...\n');

// Создаем простую схему бота с командой /start
const simpleBotSchema = {
  id: 'simple-test-bot',
  name: 'Простой тестовый бот',
  description: 'Базовый бот для тестирования с командой /start',
  status: 'draft',
  platforms: [
    {
      platform: 'telegram',
      enabled: true,
      credentials: {
        token: process.env.TELEGRAM_BOT_TOKEN || 'TEST_TOKEN'
      },
      mode: 'polling',
      status: 'disconnected'
    }
  ],
  configuration: {
    nodes: [
      {
        id: 'start-trigger',
        type: 'trigger-command',
        position: { x: 100, y: 100 },
        data: {
          label: 'Команда /start',
          command: '/start',
          description: 'Приветствие нового пользователя',
          icon: '⚡',
          color: '#3b82f6'
        }
      },
      {
        id: 'welcome-message',
        type: 'action-send-message',
        position: { x: 400, y: 100 },
        data: {
          label: 'Приветственное сообщение',
          text: '👋 Привет! Я простой тестовый бот.\n\n✅ Команда /start работает корректно!\n\n📝 Доступные команды:\n/start - показать это сообщение\n/help - получить справку\n/status - проверить статус бота',
          parseMode: 'HTML',
          icon: '💬',
          color: '#10b981'
        }
      },
      {
        id: 'help-trigger',
        type: 'trigger-command',
        position: { x: 100, y: 250 },
        data: {
          label: 'Команда /help',
          command: '/help',
          description: 'Справка по боту',
          icon: '❓',
          color: '#3b82f6'
        }
      },
      {
        id: 'help-message',
        type: 'action-send-message',
        position: { x: 400, y: 250 },
        data: {
          label: 'Справочное сообщение',
          text: '📖 <b>Справка по боту</b>\n\nЭто простой тестовый бот для проверки базовой функциональности.\n\n<b>Команды:</b>\n/start - приветствие\n/help - эта справка\n/status - статус системы\n\n<b>Возможности:</b>\n✅ Обработка команд\n✅ Отправка сообщений\n✅ HTML форматирование\n\n<i>Бот создан в конструкторе ботов</i>',
          parseMode: 'HTML',
          icon: '📚',
          color: '#10b981'
        }
      },
      {
        id: 'status-trigger',
        type: 'trigger-command',
        position: { x: 100, y: 400 },
        data: {
          label: 'Команда /status',
          command: '/status',
          description: 'Статус бота',
          icon: '📊',
          color: '#3b82f6'
        }
      },
      {
        id: 'status-message',
        type: 'action-send-message',
        position: { x: 400, y: 400 },
        data: {
          label: 'Статусное сообщение',
          text: '📊 <b>Статус бота</b>\n\n🟢 Статус: Активен\n⏰ Время работы: {{uptime}}\n💬 Обработано сообщений: {{message_count}}\n👥 Активных пользователей: {{user_count}}\n\n🔧 Версия: 1.0.0\n📅 Последнее обновление: {{last_update}}',
          parseMode: 'HTML',
          icon: '📈',
          color: '#10b981'
        }
      }
    ],
    edges: [
      {
        id: 'start-to-welcome',
        source: 'start-trigger',
        target: 'welcome-message',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'help-to-help-msg',
        source: 'help-trigger',
        target: 'help-message',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'status-to-status-msg',
        source: 'status-trigger',
        target: 'status-message',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ],
    variables: {
      uptime: { type: 'string', defaultValue: '0 минут' },
      message_count: { type: 'number', defaultValue: 0 },
      user_count: { type: 'number', defaultValue: 0 },
      last_update: { type: 'string', defaultValue: new Date().toLocaleString('ru-RU') }
    },
    settings: {
      logging: true,
      debug: true,
      errorHandling: 'graceful'
    }
  },
  stats: {
    messagesProcessed: 0,
    activeUsers: 0,
    uptime: 1.0,
    lastActivity: new Date().toISOString()
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Убеждаемся что директория существует
const botsDir = path.join(__dirname, '..', 'data', 'bots');
if (!fs.existsSync(botsDir)) {
  fs.mkdirSync(botsDir, { recursive: true });
}

// Сохраняем бота
const botPath = path.join(botsDir, `bot_${simpleBotSchema.id}.json`);
fs.writeFileSync(botPath, JSON.stringify(simpleBotSchema, null, 2));

console.log('✅ Простой тестовый бот создан:');
console.log(`   ID: ${simpleBotSchema.id}`);
console.log(`   Название: ${simpleBotSchema.name}`);
console.log(`   Узлов в схеме: ${simpleBotSchema.configuration.nodes.length}`);
console.log(`   Соединений: ${simpleBotSchema.configuration.edges.length}`);
console.log(`   Файл: ${botPath}`);

// Валидируем схему
console.log('\n🔍 Валидация схемы бота:');

// Проверяем наличие обязательных узлов
const nodes = simpleBotSchema.configuration.nodes;
const edges = simpleBotSchema.configuration.edges;

const triggerNodes = nodes.filter(n => n.type.startsWith('trigger-'));
const actionNodes = nodes.filter(n => n.type.startsWith('action-'));

console.log(`   Триггеров: ${triggerNodes.length}`);
console.log(`   Действий: ${actionNodes.length}`);

// Проверяем соединения
let validConnections = 0;
edges.forEach(edge => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  
  if (sourceNode && targetNode) {
    validConnections++;
    console.log(`   ✅ ${sourceNode.data.label} → ${targetNode.data.label}`);
  } else {
    console.log(`   ❌ Неверное соединение: ${edge.source} → ${edge.target}`);
  }
});

console.log(`   Валидных соединений: ${validConnections}/${edges.length}`);

// Проверяем команды
const commands = triggerNodes
  .filter(n => n.type === 'trigger-command')
  .map(n => n.data.command);

console.log(`   Команды: ${commands.join(', ')}`);

// Создаем тестовый сценарий
console.log('\n🧪 Создание тестового сценария:');

const testScenario = {
  name: 'Тест простого бота',
  description: 'Проверка базовой функциональности',
  tests: [
    {
      name: 'Команда /start',
      input: { type: 'command', command: '/start', userId: 'test-user-1' },
      expectedOutput: {
        type: 'message',
        text: expect => expect.includes('Привет! Я простой тестовый бот')
      }
    },
    {
      name: 'Команда /help',
      input: { type: 'command', command: '/help', userId: 'test-user-1' },
      expectedOutput: {
        type: 'message',
        text: expect => expect.includes('Справка по боту')
      }
    },
    {
      name: 'Команда /status',
      input: { type: 'command', command: '/status', userId: 'test-user-1' },
      expectedOutput: {
        type: 'message',
        text: expect => expect.includes('Статус бота')
      }
    },
    {
      name: 'Неизвестная команда',
      input: { type: 'command', command: '/unknown', userId: 'test-user-1' },
      expectedOutput: {
        type: 'no_response'
      }
    }
  ]
};

// Сохраняем тестовый сценарий
const testPath = path.join(__dirname, 'simple-bot-test-scenario.json');
fs.writeFileSync(testPath, JSON.stringify(testScenario, null, 2));

console.log(`✅ Тестовый сценарий сохранен: ${testPath}`);

// Создаем логгер для бота
console.log('\n📝 Настройка логирования:');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const botLogger = {
  logFile: path.join(logDir, `bot_${simpleBotSchema.id}.log`),
  
  log: function(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      botId: simpleBotSchema.id,
      message,
      context
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  },
  
  info: function(message, context) { this.log('info', message, context); },
  warn: function(message, context) { this.log('warn', message, context); },
  error: function(message, context) { this.log('error', message, context); },
  debug: function(message, context) { this.log('debug', message, context); }
};

// Инициализируем лог
botLogger.info('Простой тестовый бот создан', {
  botId: simpleBotSchema.id,
  nodesCount: nodes.length,
  edgesCount: edges.length,
  commands: commands
});

console.log(`✅ Логирование настроено: ${botLogger.logFile}`);

// Создаем простой симулятор выполнения
console.log('\n🎮 Симуляция выполнения команд:');

function simulateCommand(command, userId = 'test-user') {
  botLogger.info(`Получена команда: ${command}`, { userId, command });
  
  // Находим соответствующий триггер
  const triggerNode = nodes.find(n => 
    n.type === 'trigger-command' && n.data.command === command
  );
  
  if (!triggerNode) {
    botLogger.warn(`Неизвестная команда: ${command}`, { userId, command });
    return { success: false, error: 'Команда не найдена' };
  }
  
  // Находим соединенное действие
  const edge = edges.find(e => e.source === triggerNode.id);
  if (!edge) {
    botLogger.error(`Нет соединения для триггера: ${triggerNode.id}`, { userId, command });
    return { success: false, error: 'Нет соединенного действия' };
  }
  
  const actionNode = nodes.find(n => n.id === edge.target);
  if (!actionNode) {
    botLogger.error(`Не найдено действие: ${edge.target}`, { userId, command });
    return { success: false, error: 'Действие не найдено' };
  }
  
  // Симулируем выполнение действия
  let responseText = actionNode.data.text;
  
  // Заменяем переменные
  const variables = simpleBotSchema.configuration.variables;
  for (const [key, variable] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    if (responseText.includes(placeholder)) {
      responseText = responseText.replace(new RegExp(placeholder, 'g'), variable.defaultValue);
    }
  }
  
  botLogger.info(`Отправлено сообщение пользователю ${userId}`, {
    userId,
    command,
    triggerId: triggerNode.id,
    actionId: actionNode.id,
    messageLength: responseText.length
  });
  
  return {
    success: true,
    trigger: triggerNode.data.label,
    action: actionNode.data.label,
    response: responseText
  };
}

// Тестируем команды
const testCommands = ['/start', '/help', '/status', '/unknown'];

testCommands.forEach(command => {
  console.log(`\n🔸 Тестирование команды: ${command}`);
  const result = simulateCommand(command);
  
  if (result.success) {
    console.log(`   ✅ ${result.trigger} → ${result.action}`);
    console.log(`   📝 Ответ: ${result.response.substring(0, 100)}...`);
  } else {
    console.log(`   ❌ Ошибка: ${result.error}`);
  }
});

// Обновляем статистику бота
simpleBotSchema.stats.messagesProcessed = testCommands.length;
simpleBotSchema.stats.activeUsers = 1;
simpleBotSchema.stats.lastActivity = new Date().toISOString();
simpleBotSchema.updatedAt = new Date().toISOString();

// Сохраняем обновленного бота
fs.writeFileSync(botPath, JSON.stringify(simpleBotSchema, null, 2));

console.log('\n📊 Статистика тестирования:');
console.log(`   Команд протестировано: ${testCommands.length}`);
console.log(`   Успешных ответов: ${testCommands.filter(cmd => simulateCommand(cmd).success).length}`);
console.log(`   Логов записано: ${fs.readFileSync(botLogger.logFile, 'utf8').split('\n').length - 1}`);

console.log('\n🎉 Простой тестовый бот готов к работе!');
console.log('\n📋 Следующие шаги:');
console.log('   1. Добавьте реальный Telegram токен в переменную TELEGRAM_BOT_TOKEN');
console.log('   2. Запустите бота через панель управления');
console.log('   3. Протестируйте команды в Telegram');
console.log('   4. Проверьте логи в папке logs/');

// Экспортируем для использования в тестах
module.exports = {
  botSchema: simpleBotSchema,
  testScenario,
  simulateCommand,
  botLogger
};