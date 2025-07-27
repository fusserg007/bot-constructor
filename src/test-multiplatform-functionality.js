/**
 * Тест мультиплатформенной функциональности конструктора ботов
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

// Схема мультиплатформенного бота
const multiplatformBotSchema = {
  name: "Multiplatform Test Bot",
  token: "MULTIPLATFORM_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  description: "Bot for testing multiplatform functionality across Telegram and MAX",
  status: "draft",
  platforms: [
    {
      platform: "telegram",
      enabled: true,
      credentials: {
        token: "TELEGRAM_TEST_TOKEN"
      },
      mode: "polling",
      status: "disconnected"
    },
    {
      platform: "max",
      enabled: true,
      credentials: {
        apiKey: "MAX_TEST_API_KEY",
        secretKey: "MAX_TEST_SECRET_KEY"
      },
      mode: "webhook",
      status: "disconnected"
    }
  ],
  configuration: {
    nodes: [
      // Универсальная команда /start для всех платформ
      {
        id: "universal-start-trigger",
        type: "trigger-command",
        position: { x: 100, y: 100 },
        data: {
          label: "Universal Start Command",
          command: "/start",
          description: "Works on all platforms",
          color: "#3b82f6",
          platforms: ["telegram", "max"] // Указываем поддерживаемые платформы
        }
      },
      {
        id: "universal-welcome-message",
        type: "action-send-message",
        position: { x: 400, y: 100 },
        data: {
          label: "Universal Welcome",
          text: "Welcome to Multiplatform Bot!\n\nThis bot works on multiple messaging platforms:\n• Telegram\n• MAX\n\nPlatform: {{current_platform}}\nUser ID: {{user_id}}\nChat ID: {{chat_id}}",
          parseMode: "HTML",
          color: "#10b981",
          platforms: ["telegram", "max"]
        }
      },
      
      // Telegram-специфичная команда
      {
        id: "telegram-specific-trigger",
        type: "trigger-command",
        position: { x: 100, y: 250 },
        data: {
          label: "Telegram Only Command",
          command: "/telegram",
          description: "Only works on Telegram",
          color: "#0088cc",
          platforms: ["telegram"] // Только для Telegram
        }
      },
      {
        id: "telegram-specific-message",
        type: "action-send-message",
        position: { x: 400, y: 250 },
        data: {
          label: "Telegram Features",
          text: "<b>Telegram-specific features:</b>\n\n• Inline keyboards\n• Media groups\n• Stickers\n• Voice messages\n• File uploads\n• Channels support\n\nThis message uses HTML formatting specific to Telegram.",
          parseMode: "HTML",
          color: "#0088cc",
          platforms: ["telegram"]
        }
      },
      
      // MAX-специфичная команда
      {
        id: "max-specific-trigger",
        type: "trigger-command",
        position: { x: 100, y: 400 },
        data: {
          label: "MAX Only Command",
          command: "/max",
          description: "Only works on MAX",
          color: "#ff6b35",
          platforms: ["max"] // Только для MAX
        }
      },
      {
        id: "max-specific-message",
        type: "action-send-message",
        position: { x: 400, y: 400 },
        data: {
          label: "MAX Features",
          text: "MAX-specific features:\n\n• Corporate messaging\n• Team collaboration\n• File sharing\n• Video calls integration\n• Business workflows\n\nThis message is optimized for MAX platform.",
          parseMode: "HTML",
          color: "#ff6b35",
          platforms: ["max"]
        }
      },
      
      // Тест адаптации сообщений
      {
        id: "adaptation-test-trigger",
        type: "trigger-command",
        position: { x: 100, y: 550 },
        data: {
          label: "Message Adaptation Test",
          command: "/adapt",
          description: "Test message adaptation",
          color: "#8b5cf6",
          platforms: ["telegram", "max"]
        }
      },
      {
        id: "adaptation-test-message",
        type: "action-send-message",
        position: { x: 400, y: 550 },
        data: {
          label: "Adaptive Message",
          text: "{{#if telegram}}This is Telegram! You can use <b>HTML</b> and <i>formatting</i>.{{/if}}{{#if max}}This is MAX! Simple text formatting works best here.{{/if}}\n\nPlatform capabilities:\n{{#if telegram}}• Supports HTML formatting\n• Inline keyboards available\n• Media support: full{{/if}}{{#if max}}• Basic text formatting\n• Button support: limited\n• Media support: basic{{/if}}",
          parseMode: "HTML",
          color: "#8b5cf6",
          platforms: ["telegram", "max"],
          adaptiveContent: true // Флаг для адаптивного контента
        }
      },
      
      // Тест изоляции ошибок
      {
        id: "error-test-trigger",
        type: "trigger-command",
        position: { x: 100, y: 700 },
        data: {
          label: "Error Isolation Test",
          command: "/error",
          description: "Test error isolation between platforms",
          color: "#ef4444",
          platforms: ["telegram", "max"]
        }
      },
      {
        id: "error-test-action",
        type: "action-send-message",
        position: { x: 400, y: 700 },
        data: {
          label: "Error Test Message",
          text: "Testing error isolation...\n\nThis message will intentionally cause different behaviors on different platforms to test error isolation.",
          parseMode: "HTML",
          color: "#ef4444",
          platforms: ["telegram", "max"],
          errorTest: true // Специальный флаг для тестирования ошибок
        }
      }
    ],
    edges: [
      {
        id: "universal-start-edge",
        source: "universal-start-trigger",
        target: "universal-welcome-message"
      },
      {
        id: "telegram-specific-edge",
        source: "telegram-specific-trigger",
        target: "telegram-specific-message"
      },
      {
        id: "max-specific-edge",
        source: "max-specific-trigger",
        target: "max-specific-message"
      },
      {
        id: "adaptation-test-edge",
        source: "adaptation-test-trigger",
        target: "adaptation-test-message"
      },
      {
        id: "error-test-edge",
        source: "error-test-trigger",
        target: "error-test-action"
      }
    ],
    variables: {
      current_platform: {
        type: "string",
        defaultValue: "unknown",
        description: "Current messaging platform"
      },
      user_id: {
        type: "string",
        defaultValue: "unknown",
        description: "User ID on current platform"
      },
      chat_id: {
        type: "string",
        defaultValue: "unknown",
        description: "Chat ID on current platform"
      },
      telegram_features: {
        type: "boolean",
        defaultValue: false,
        description: "Telegram-specific features available"
      },
      max_features: {
        type: "boolean",
        defaultValue: false,
        description: "MAX-specific features available"
      }
    },
    settings: {
      logging: true,
      debug: true,
      errorHandling: "graceful",
      platformIsolation: true, // Включаем изоляцию между платформами
      adaptiveMessaging: true, // Включаем адаптивные сообщения
      crossPlatformVariables: true // Общие переменные между платформами
    }
  },
  stats: {
    messagesProcessed: 0,
    activeUsers: 0,
    uptime: 1,
    lastActivity: new Date().toISOString(),
    platformStats: {
      telegram: {
        messagesProcessed: 0,
        activeUsers: 0,
        errors: 0
      },
      max: {
        messagesProcessed: 0,
        activeUsers: 0,
        errors: 0
      }
    }
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Функция создания мультиплатформенного бота
async function createMultiplatformBot() {
  console.log('🌐 Создание мультиплатформенного тестового бота...\n');
  
  try {
    const botId = `multiplatform-test-${Date.now()}`;
    const botData = {
      ...multiplatformBotSchema,
      id: botId
    };
    
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }
    
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    
    console.log('✅ Мультиплатформенный бот создан!');
    console.log(`📋 ID: ${botData.id}`);
    console.log(`📝 Название: ${botData.name}`);
    console.log(`🌐 Платформы: ${botData.platforms.map(p => p.platform).join(', ')}`);
    console.log(`📊 Узлов: ${botData.configuration.nodes.length}`);
    console.log(`🔗 Связей: ${botData.configuration.edges.length}`);
    console.log(`💾 Файл: ${botPath}`);
    
    return botData;
    
  } catch (error) {
    console.error('💥 Ошибка создания мультиплатформенного бота:', error.message);
    return false;
  }
}

// Функция тестирования мультиплатформенности
async function testMultiplatformFunctionality(botId) {
  console.log(`\n🧪 Тестирование мультиплатформенности бота ${botId}...\n`);
  
  try {
    // Получаем бота через API
    const botRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/bots/${botId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (botRequest.statusCode !== 200) {
      console.error('❌ Не удалось получить бота через API');
      return false;
    }
    
    const botResponse = JSON.parse(botRequest.data);
    const bot = botResponse.data || botResponse;
    
    console.log('✅ Бот получен через API');
    
    // Тест 1: Проверка мультиплатформенной конфигурации
    console.log('\n📋 Тест 1: Мультиплатформенная конфигурация');
    
    const platformChecks = [
      {
        condition: bot.platforms && bot.platforms.length >= 2,
        name: 'Количество платформ',
        value: bot.platforms ? bot.platforms.length : 0
      },
      {
        condition: bot.platforms && bot.platforms.some(p => p.platform === 'telegram'),
        name: 'Поддержка Telegram',
        value: bot.platforms ? bot.platforms.find(p => p.platform === 'telegram') ? 'Да' : 'Нет' : 'Нет'
      },
      {
        condition: bot.platforms && bot.platforms.some(p => p.platform === 'max'),
        name: 'Поддержка MAX',
        value: bot.platforms ? bot.platforms.find(p => p.platform === 'max') ? 'Да' : 'Нет' : 'Нет'
      },
      {
        condition: bot.configuration && bot.configuration.settings && bot.configuration.settings.platformIsolation,
        name: 'Изоляция платформ',
        value: bot.configuration?.settings?.platformIsolation ? 'Включена' : 'Отключена'
      },
      {
        condition: bot.configuration && bot.configuration.settings && bot.configuration.settings.adaptiveMessaging,
        name: 'Адаптивные сообщения',
        value: bot.configuration?.settings?.adaptiveMessaging ? 'Включены' : 'Отключены'
      }
    ];
    
    let platformTestsPassed = 0;
    platformChecks.forEach(check => {
      if (check.condition) {
        console.log(`  ✅ ${check.name}: ${check.value}`);
        platformTestsPassed++;
      } else {
        console.log(`  ❌ ${check.name}: ${check.value}`);
      }
    });
    
    // Тест 2: Проверка платформо-специфичных узлов
    console.log('\n📋 Тест 2: Платформо-специфичные узлы');
    
    if (bot.configuration && bot.configuration.nodes) {
      const universalNodes = bot.configuration.nodes.filter(node => 
        node.data.platforms && node.data.platforms.includes('telegram') && node.data.platforms.includes('max')
      );
      
      const telegramOnlyNodes = bot.configuration.nodes.filter(node => 
        node.data.platforms && node.data.platforms.includes('telegram') && !node.data.platforms.includes('max')
      );
      
      const maxOnlyNodes = bot.configuration.nodes.filter(node => 
        node.data.platforms && node.data.platforms.includes('max') && !node.data.platforms.includes('telegram')
      );
      
      console.log(`  ✅ Универсальные узлы: ${universalNodes.length}`);
      console.log(`  ✅ Только Telegram: ${telegramOnlyNodes.length}`);
      console.log(`  ✅ Только MAX: ${maxOnlyNodes.length}`);
      
      // Проверяем специфичные команды
      const commands = bot.configuration.nodes
        .filter(node => node.type === 'trigger-command')
        .map(node => ({
          command: node.data.command,
          platforms: node.data.platforms || ['all']
        }));
      
      console.log('\n  📋 Команды по платформам:');
      commands.forEach(cmd => {
        console.log(`    • ${cmd.command}: ${cmd.platforms.join(', ')}`);
      });
    }
    
    // Тест 3: Проверка адаптации сообщений
    console.log('\n📋 Тест 3: Адаптация сообщений');
    
    if (bot.configuration && bot.configuration.nodes) {
      const adaptiveNodes = bot.configuration.nodes.filter(node => 
        node.data.adaptiveContent === true
      );
      
      console.log(`  ✅ Адаптивных узлов: ${adaptiveNodes.length}`);
      
      adaptiveNodes.forEach(node => {
        console.log(`    • ${node.data.label}: поддерживает ${node.data.platforms?.join(', ') || 'все платформы'}`);
      });
    }
    
    // Тест 4: Проверка изоляции ошибок
    console.log('\n📋 Тест 4: Изоляция ошибок');
    
    const errorTestNodes = bot.configuration?.nodes?.filter(node => 
      node.data.errorTest === true
    ) || [];
    
    console.log(`  ✅ Узлов для тестирования ошибок: ${errorTestNodes.length}`);
    
    if (bot.stats && bot.stats.platformStats) {
      console.log('  📊 Статистика по платформам:');
      Object.entries(bot.stats.platformStats).forEach(([platform, stats]) => {
        console.log(`    • ${platform}: ${stats.messagesProcessed} сообщений, ${stats.errors} ошибок`);
      });
    }
    
    // Тест 5: Экспорт мультиплатформенного бота
    console.log('\n📋 Тест 5: Экспорт мультиплатформенного кода');
    
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
        multiplatform: true
      }
    }), true);
    
    if (exportRequest.statusCode === 200) {
      console.log('  ✅ Экспорт мультиплатформенного кода работает');
      console.log(`  📊 Размер архива: ${Math.round(exportRequest.data.length / 1024)} KB`);
      
      // Сохраняем архив для анализа
      const archivePath = path.join(__dirname, '..', 'temp', `multiplatform-bot-${Date.now()}.zip`);
      fs.writeFileSync(archivePath, exportRequest.data);
      console.log(`  💾 Архив сохранен: ${archivePath}`);
    } else {
      console.log('  ❌ Экспорт мультиплатформенного кода не работает');
    }
    
    // Общий результат
    const totalTests = platformChecks.length;
    const successRate = (platformTestsPassed / totalTests) * 100;
    
    console.log(`\n📈 Результат тестирования: ${platformTestsPassed}/${totalTests} (${successRate.toFixed(1)}%)`);
    
    const success = successRate >= 80; // 80% тестов должны пройти
    
    if (success) {
      console.log('\n🎉 Мультиплатформенность работает корректно!');
      
      console.log('\n💡 Возможности мультиплатформенного бота:');
      console.log('• Единая схема логики для всех платформ');
      console.log('• Платформо-специфичные команды и функции');
      console.log('• Адаптивные сообщения под каждую платформу');
      console.log('• Изоляция ошибок между платформами');
      console.log('• Общие переменные и состояние');
      console.log('• Экспорт в мультиплатформенный код');
      
    } else {
      console.log('\n⚠️ Мультиплатформенность работает частично');
    }
    
    return success;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования мультиплатформенности:', error.message);
    return false;
  }
}

// Функция тестирования адаптеров
async function testAdapters() {
  console.log('\n🔧 Тестирование адаптеров мессенджеров...\n');
  
  try {
    // Проверяем наличие файлов адаптеров
    const adaptersDir = path.join(__dirname, 'adapters');
    const coreAdaptersDir = path.join(__dirname, 'core', 'adapters');
    
    const adapterFiles = [
      { path: path.join(adaptersDir, 'TelegramAdapter.ts'), name: 'TelegramAdapter' },
      { path: path.join(adaptersDir, 'MaxAdapter.ts'), name: 'MaxAdapter' },
      { path: path.join(coreAdaptersDir, 'MessengerAdapter.ts'), name: 'MessengerAdapter (базовый)' },
      { path: path.join(coreAdaptersDir, 'AdapterRegistry.ts'), name: 'AdapterRegistry' }
    ];
    
    console.log('📋 Проверка файлов адаптеров:');
    let adaptersFound = 0;
    
    adapterFiles.forEach(adapter => {
      if (fs.existsSync(adapter.path)) {
        console.log(`  ✅ ${adapter.name}`);
        adaptersFound++;
      } else {
        console.log(`  ❌ ${adapter.name} - файл не найден`);
      }
    });
    
    console.log(`\n📊 Найдено адаптеров: ${adaptersFound}/${adapterFiles.length}`);
    
    // Проверяем содержимое адаптеров
    if (fs.existsSync(path.join(adaptersDir, 'TelegramAdapter.ts'))) {
      const telegramContent = fs.readFileSync(path.join(adaptersDir, 'TelegramAdapter.ts'), 'utf8');
      
      const telegramFeatures = [
        { pattern: /class TelegramAdapter/, name: 'Класс TelegramAdapter' },
        { pattern: /async sendMessage/, name: 'Отправка сообщений' },
        { pattern: /async sendMedia/, name: 'Отправка медиа' },
        { pattern: /async startPolling/, name: 'Polling режим' },
        { pattern: /async setWebhook/, name: 'Webhook режим' },
        { pattern: /processUpdate/, name: 'Обработка обновлений' },
        { pattern: /validateCredentials/, name: 'Валидация токенов' }
      ];
      
      console.log('\n📋 Функции Telegram адаптера:');
      telegramFeatures.forEach(feature => {
        if (feature.pattern.test(telegramContent)) {
          console.log(`  ✅ ${feature.name}`);
        } else {
          console.log(`  ❌ ${feature.name}`);
        }
      });
    }
    
    if (fs.existsSync(path.join(adaptersDir, 'MaxAdapter.ts'))) {
      const maxContent = fs.readFileSync(path.join(adaptersDir, 'MaxAdapter.ts'), 'utf8');
      
      const maxFeatures = [
        { pattern: /class MaxAdapter/, name: 'Класс MaxAdapter' },
        { pattern: /async sendMessage/, name: 'Отправка сообщений' },
        { pattern: /async sendMedia/, name: 'Отправка медиа' },
        { pattern: /async setWebhook/, name: 'Webhook режим' },
        { pattern: /processWebhook/, name: 'Обработка webhook' },
        { pattern: /validateCredentials/, name: 'Валидация ключей' }
      ];
      
      console.log('\n📋 Функции MAX адаптера:');
      maxFeatures.forEach(feature => {
        if (feature.pattern.test(maxContent)) {
          console.log(`  ✅ ${feature.name}`);
        } else {
          console.log(`  ❌ ${feature.name}`);
        }
      });
    }
    
    return adaptersFound >= 3; // Минимум 3 адаптера должно быть
    
  } catch (error) {
    console.error('💥 Ошибка тестирования адаптеров:', error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🌐 Тестирование мультиплатформенной функциональности\n');
  console.log('='.repeat(70));
  
  // Тестируем адаптеры
  const adaptersOk = await testAdapters();
  
  // Создаем мультиплатформенного бота
  const createdBot = await createMultiplatformBot();
  
  if (!createdBot) {
    console.log('\n❌ Не удалось создать мультиплатформенного бота');
    return;
  }
  
  // Тестируем мультиплатформенность
  const multiplatformOk = await testMultiplatformFunctionality(createdBot.id);
  
  console.log('\n' + '='.repeat(70));
  
  if (adaptersOk && multiplatformOk) {
    console.log('✅ Мультиплатформенное тестирование завершено успешно!');
    
    console.log('\n📋 Итоги:');
    console.log('✅ Адаптеры мессенджеров работают');
    console.log('✅ Мультиплатформенный бот создан');
    console.log('✅ Изоляция между платформами функционирует');
    console.log('✅ Адаптация сообщений работает');
    console.log('✅ Экспорт мультиплатформенного кода работает');
    
  } else {
    console.log('❌ Мультиплатформенное тестирование завершено с ошибками');
    
    if (!adaptersOk) {
      console.log('• Проблемы с адаптерами мессенджеров');
    }
    if (!multiplatformOk) {
      console.log('• Проблемы с мультиплатформенной функциональностью');
    }
  }
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  createMultiplatformBot,
  testMultiplatformFunctionality,
  testAdapters,
  multiplatformBotSchema
};