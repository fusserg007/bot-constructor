/**
 * Создание демонстрационного бота для тестирования системы
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Функция для HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Схема демонстрационного бота
const demoBotSchema = {
  name: "Demo Bot",
  token: "DEMO_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  description: "Simple demonstration bot showcasing basic functionality",
  status: "draft",
  platforms: [
    {
      platform: "telegram",
      enabled: true,
      credentials: {
        token: "DEMO_TOKEN"
      },
      mode: "polling",
      status: "disconnected"
    }
  ],
  configuration: {
    nodes: [
      // Команда /start
      {
        id: "start-trigger",
        type: "trigger-command",
        position: { x: 100, y: 100 },
        data: {
          label: "Start Command",
          command: "/start",
          description: "Welcome new users",
          color: "#3b82f6"
        }
      },
      {
        id: "welcome-message",
        type: "action-send-message",
        position: { x: 400, y: 100 },
        data: {
          label: "Welcome Message",
          text: "Welcome to Demo Bot!\n\nI'm a simple bot created to demonstrate the bot constructor capabilities.\n\nAvailable commands:\n/start - Show this message\n/help - Get help\n/about - About this bot\n/stats - Show statistics",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      
      // Команда /help
      {
        id: "help-trigger",
        type: "trigger-command",
        position: { x: 100, y: 250 },
        data: {
          label: "Help Command",
          command: "/help",
          description: "Show help information",
          color: "#3b82f6"
        }
      },
      {
        id: "help-message",
        type: "action-send-message",
        position: { x: 400, y: 250 },
        data: {
          label: "Help Message",
          text: "<b>Demo Bot Help</b>\n\nThis bot demonstrates basic functionality of the bot constructor.\n\n<b>Commands:</b>\n/start - Welcome message\n/help - This help\n/about - Information about the bot\n/stats - Usage statistics\n\n<b>Features:</b>\n• Command handling\n• Message sending\n• Variable replacement\n• User state management\n\n<i>Built with Bot Constructor</i>",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      
      // Команда /about
      {
        id: "about-trigger",
        type: "trigger-command",
        position: { x: 100, y: 400 },
        data: {
          label: "About Command",
          command: "/about",
          description: "Information about the bot",
          color: "#3b82f6"
        }
      },
      {
        id: "about-message",
        type: "action-send-message",
        position: { x: 400, y: 400 },
        data: {
          label: "About Message",
          text: "<b>About Demo Bot</b>\n\n<b>Name:</b> {{bot_name}}\n<b>Version:</b> {{bot_version}}\n<b>Created:</b> {{creation_date}}\n<b>Platform:</b> Multi-platform\n\n<b>Purpose:</b>\nThis bot serves as a demonstration of the bot constructor's capabilities. It shows how easy it is to create functional bots using visual programming.\n\n<b>Technology:</b>\n• Visual node-based editor\n• Multi-platform support\n• Real-time testing\n• Code export functionality",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      
      // Команда /stats
      {
        id: "stats-trigger",
        type: "trigger-command",
        position: { x: 100, y: 550 },
        data: {
          label: "Stats Command",
          command: "/stats",
          description: "Show bot statistics",
          color: "#3b82f6"
        }
      },
      {
        id: "stats-message",
        type: "action-send-message",
        position: { x: 400, y: 550 },
        data: {
          label: "Stats Message",
          text: "<b>Bot Statistics</b>\n\n<b>Status:</b> Active\n<b>Uptime:</b> {{uptime}}\n<b>Messages processed:</b> {{message_count}}\n<b>Active users:</b> {{user_count}}\n<b>Your messages:</b> {{user_message_count}}\n\n<b>Performance:</b>\n• Response time: < 100ms\n• Success rate: 99.9%\n• Memory usage: Low\n\n<b>Last updated:</b> {{last_update}}",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      
      // Обработка неизвестных команд
      {
        id: "unknown-trigger",
        type: "trigger-message",
        position: { x: 100, y: 700 },
        data: {
          label: "Unknown Command Handler",
          description: "Handle unknown commands",
          color: "#f59e0b"
        }
      },
      {
        id: "unknown-message",
        type: "action-send-message",
        position: { x: 400, y: 700 },
        data: {
          label: "Unknown Command Response",
          text: "I don't understand that command.\n\nTry one of these:\n/start - Welcome message\n/help - Get help\n/about - About this bot\n/stats - Show statistics\n\nOr just send me any message and I'll respond!",
          parseMode: "HTML",
          color: "#ef4444"
        }
      }
    ],
    edges: [
      {
        id: "start-to-welcome",
        source: "start-trigger",
        target: "welcome-message",
        sourceHandle: "output",
        targetHandle: "input"
      },
      {
        id: "help-to-help-msg",
        source: "help-trigger",
        target: "help-message",
        sourceHandle: "output",
        targetHandle: "input"
      },
      {
        id: "about-to-about-msg",
        source: "about-trigger",
        target: "about-message",
        sourceHandle: "output",
        targetHandle: "input"
      },
      {
        id: "stats-to-stats-msg",
        source: "stats-trigger",
        target: "stats-message",
        sourceHandle: "output",
        targetHandle: "input"
      },
      {
        id: "unknown-to-unknown-msg",
        source: "unknown-trigger",
        target: "unknown-message",
        sourceHandle: "output",
        targetHandle: "input"
      }
    ],
    variables: {
      bot_name: {
        type: "string",
        defaultValue: "Demo Bot",
        description: "Bot name"
      },
      bot_version: {
        type: "string",
        defaultValue: "1.0.0",
        description: "Bot version"
      },
      creation_date: {
        type: "string",
        defaultValue: new Date().toLocaleDateString('en-US'),
        description: "Creation date"
      },
      uptime: {
        type: "string",
        defaultValue: "0 minutes",
        description: "Bot uptime"
      },
      message_count: {
        type: "number",
        defaultValue: 0,
        description: "Total messages processed"
      },
      user_count: {
        type: "number",
        defaultValue: 0,
        description: "Total users"
      },
      user_message_count: {
        type: "number",
        defaultValue: 0,
        description: "User's message count"
      },
      last_update: {
        type: "string",
        defaultValue: new Date().toLocaleString('en-US'),
        description: "Last update time"
      }
    },
    settings: {
      logging: true,
      debug: true,
      errorHandling: "graceful",
      rateLimit: {
        enabled: true,
        maxRequests: 30,
        windowMs: 60000
      }
    }
  },
  stats: {
    messagesProcessed: 0,
    activeUsers: 0,
    uptime: 1,
    lastActivity: new Date().toISOString()
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Функция создания демо-бота напрямую через файловую систему
async function createDemoBot() {
  console.log('🤖 Создание демонстрационного бота...\n');
  
  try {
    // Создаем уникальный ID для бота
    const botId = `demo-bot-${Date.now()}`;
    
    // Обновляем схему с ID
    const botData = {
      ...demoBotSchema,
      id: botId
    };
    
    // Путь к файлу бота
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
      console.log('✅ Создана директория для ботов');
    }
    
    // Сохраняем бота в файл
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    
    console.log('✅ Демо-бот создан успешно!');
    console.log(`📋 ID: ${botData.id}`);
    console.log(`📝 Название: ${botData.name}`);
    console.log(`📄 Описание: ${botData.description}`);
    console.log(`📊 Узлов в схеме: ${botData.configuration.nodes.length}`);
    console.log(`🔗 Связей: ${botData.configuration.edges.length}`);
    console.log(`⚙️ Переменных: ${Object.keys(botData.configuration.variables).length}`);
    console.log(`💾 Файл: ${botPath}`);
    
    return botData;
    
  } catch (error) {
    console.error('💥 Ошибка создания демо-бота:', error.message);
    return false;
  }
}

// Функция тестирования демо-бота
async function testDemoBot(botId) {
  console.log(`\n🧪 Тестирование демо-бота ${botId}...\n`);
  
  try {
    // Получаем информацию о боте
    const botRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/bots/${botId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (botRequest.statusCode === 200) {
      const bot = JSON.parse(botRequest.data);
      console.log('✅ Бот найден в системе');
      
      // Проверяем структуру бота
      const checks = [
        { condition: bot.name === 'Demo Bot', name: 'Название бота' },
        { condition: bot.configuration && bot.configuration.nodes && bot.configuration.nodes.length === 10, name: 'Количество узлов' },
        { condition: bot.configuration && bot.configuration.edges && bot.configuration.edges.length === 5, name: 'Количество связей' },
        { condition: bot.configuration && bot.configuration.variables && Object.keys(bot.configuration.variables).length === 8, name: 'Количество переменных' },
        { condition: bot.platforms && bot.platforms.length === 1, name: 'Количество платформ' },
        { condition: bot.platforms && bot.platforms[0] && bot.platforms[0].platform === 'telegram', name: 'Платформа Telegram' }
      ];
      
      checks.forEach(check => {
        if (check.condition) {
          console.log(`✅ ${check.name}`);
        } else {
          console.log(`❌ ${check.name}`);
        }
      });
      
      // Проверяем команды
      const commands = bot.configuration && bot.configuration.nodes 
        ? bot.configuration.nodes
            .filter(node => node.type === 'trigger-command')
            .map(node => node.data.command)
        : [];
      
      console.log('\n📋 Доступные команды:');
      commands.forEach(command => {
        console.log(`  • ${command}`);
      });
      
      return true;
    } else {
      console.error('❌ Бот не найден');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
    return false;
  }
}

// Функция экспорта демо-бота
async function exportDemoBot(botId) {
  console.log(`\n📦 Экспорт демо-бота ${botId}...\n`);
  
  try {
    // Экспортируем в Node.js
    console.log('🚀 Экспорт в Node.js...');
    
    const exportRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/export/${botId}/nodejs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ 
      options: {
        includeComments: true,
        minify: false
      }
    }), true);
    
    if (exportRequest.statusCode === 200) {
      console.log('✅ Экспорт в Node.js успешен');
      
      // Сохраняем архив
      const archivePath = path.join(__dirname, '..', 'temp', `demo-bot-nodejs-${Date.now()}.zip`);
      fs.writeFileSync(archivePath, exportRequest.data);
      console.log(`💾 Архив сохранен: ${archivePath}`);
      
      return true;
    } else {
      console.log('❌ Ошибка экспорта в Node.js:', exportRequest.statusCode);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Ошибка экспорта:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🎯 Создание и тестирование демонстрационного бота\n');
  console.log('='.repeat(60));
  
  // Создаем демо-бота
  const createdBot = await createDemoBot();
  
  if (!createdBot) {
    console.log('\n❌ Не удалось создать демо-бота');
    return;
  }
  
  // Тестируем демо-бота
  const testSuccess = await testDemoBot(createdBot.id);
  
  if (!testSuccess) {
    console.log('\n❌ Тестирование демо-бота не прошло');
    return;
  }
  
  // Экспортируем демо-бота
  const exportSuccess = await exportDemoBot(createdBot.id);
  
  if (exportSuccess) {
    console.log('\n🎉 Демонстрационный бот создан и протестирован успешно!');
    
    console.log('\n📋 Итоги:');
    console.log(`✅ Бот создан: ${createdBot.name}`);
    console.log(`✅ ID: ${createdBot.id}`);
    console.log('✅ Структура проверена');
    console.log('✅ Экспорт работает');
    
    console.log('\n💡 Для тестирования бота:');
    console.log('1. Откройте Dashboard в браузере');
    console.log('2. Найдите "Demo Bot" в списке');
    console.log('3. Нажмите "Edit" для редактирования');
    console.log('4. Настройте токен Telegram в "Platforms"');
    console.log('5. Экспортируйте и запустите бота');
    
  } else {
    console.log('\n⚠️ Демо-бот создан, но экспорт не удался');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Создание демо-бота завершено');
}

// Запуск создания демо-бота
if (require.main === module) {
  main();
}

module.exports = {
  createDemoBot,
  testDemoBot,
  exportDemoBot,
  demoBotSchema
};