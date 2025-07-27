/**
 * Расширенное тестирование экспорта в Node.js код
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

// Схема расширенного тестового бота
const enhancedBotSchema = {
  id: "enhanced-test-bot",
  name: "Enhanced Test Bot",
  token: "ENHANCED_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  description: "Расширенный тестовый бот для проверки всех возможностей экспорта",
  status: "draft",
  platforms: [
    {
      platform: "telegram",
      enabled: true,
      credentials: {
        token: "TELEGRAM_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
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
          description: "Команда приветствия",
          color: "#3b82f6"
        }
      },
      {
        id: "welcome-message",
        type: "action-send-message",
        position: { x: 400, y: 100 },
        data: {
          label: "Welcome Message",
          text: "🤖 Добро пожаловать в Enhanced Test Bot!\\n\\nЭтот бот демонстрирует все возможности экспорта:\\n\\n• Команды с кнопками\\n• Интеграции с API\\n• Условная логика\\n• Переменные и состояние\\n\\nВыберите действие:",
          parseMode: "HTML",
          buttons: [
            [
              { text: "📊 Статистика", callback_data: "stats" },
              { text: "🔗 API тест", callback_data: "api_test" }
            ],
            [
              { text: "❓ Викторина", callback_data: "quiz" },
              { text: "ℹ️ Помощь", callback_data: "help" }
            ]
          ],
          color: "#10b981"
        }
      },
      
      // Команда /stats
      {
        id: "stats-trigger",
        type: "trigger-command",
        position: { x: 100, y: 250 },
        data: {
          label: "Stats Command",
          command: "/stats",
          description: "Показать статистику бота",
          color: "#3b82f6"
        }
      },
      {
        id: "stats-message",
        type: "action-send-message",
        position: { x: 400, y: 250 },
        data: {
          label: "Stats Message",
          text: "📊 <b>Статистика бота</b>\\n\\n👤 Ваши сообщения: {{message_count}}\\n👥 Всего пользователей: {{user_count}}\\n⏰ Время работы: {{uptime}}\\n🕐 Текущее время: {{current_time}}\\n\\n🔢 Случайное число: {{random_number}}",
          parseMode: "HTML",
          color: "#f59e0b"
        }
      },
      
      // Команда /api
      {
        id: "api-trigger",
        type: "trigger-command",
        position: { x: 100, y: 400 },
        data: {
          label: "API Command",
          command: "/api",
          description: "Тест API интеграции",
          color: "#3b82f6"
        }
      },
      {
        id: "api-integration",
        type: "action-integration",
        position: { x: 400, y: 400 },
        data: {
          label: "Random Fact API",
          url: "https://uselessfacts.jsph.pl/random.json?language=en",
          method: "GET",
          headers: {},
          responseMapping: {
            fact: "text",
            source: "source_url"
          },
          color: "#8b5cf6"
        }
      },
      {
        id: "api-response",
        type: "action-send-message",
        position: { x: 700, y: 400 },
        data: {
          label: "API Response",
          text: "🌐 <b>Случайный факт:</b>\\n\\n{{random_fact_api_fact}}\\n\\n🔗 <a href='{{random_fact_api_source}}'>Источник</a>",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      
      // Обработчик текстовых сообщений
      {
        id: "text-handler",
        type: "trigger-message",
        position: { x: 100, y: 550 },
        data: {
          label: "Text Handler",
          description: "Обработка текстовых сообщений",
          color: "#ef4444"
        }
      },
      {
        id: "text-condition",
        type: "condition-text",
        position: { x: 400, y: 550 },
        data: {
          label: "Text Condition",
          conditions: [
            { type: "contains", value: "привет", caseSensitive: false },
            { type: "contains", value: "hello", caseSensitive: false }
          ],
          operator: "OR",
          color: "#f59e0b"
        }
      },
      {
        id: "greeting-response",
        type: "action-send-message",
        position: { x: 700, y: 500 },
        data: {
          label: "Greeting Response",
          text: "👋 Привет! Я вижу, что ты поздоровался.\\n\\nТвоё сообщение: \"{{message_text}}\"\\n\\nИспользуй команды для взаимодействия со мной!",
          parseMode: "HTML",
          color: "#10b981"
        }
      },
      {
        id: "default-response",
        type: "action-send-message",
        position: { x: 700, y: 600 },
        data: {
          label: "Default Response",
          text: "🤔 Я получил твоё сообщение: \"{{message_text}}\"\\n\\nИспользуй /help для списка команд.",
          parseMode: "HTML",
          color: "#6b7280"
        }
      },
      
      // Команда /help
      {
        id: "help-trigger",
        type: "trigger-command",
        position: { x: 100, y: 700 },
        data: {
          label: "Help Command",
          command: "/help",
          description: "Показать справку",
          color: "#3b82f6"
        }
      },
      {
        id: "help-message",
        type: "action-send-message",
        position: { x: 400, y: 700 },
        data: {
          label: "Help Message",
          text: "ℹ️ <b>Справка по боту</b>\\n\\n<b>Доступные команды:</b>\\n/start - Главное меню\\n/stats - Статистика\\n/api - Тест API\\n/help - Эта справка\\n\\n<b>Возможности:</b>\\n• Обработка текстовых сообщений\\n• Интеграция с внешними API\\n• Кнопки и callback'и\\n• Переменные и состояние\\n\\n<i>Бот создан с помощью конструктора ботов</i>",
          parseMode: "HTML",
          color: "#6366f1"
        }
      },
      
      // Медиа узел
      {
        id: "media-action",
        type: "action-send-media",
        position: { x: 100, y: 850 },
        data: {
          label: "Send Photo",
          mediaType: "photo",
          mediaUrl: "https://picsum.photos/800/600?random={{random_seed}}",
          caption: "📸 Случайное изображение\\n\\nСгенерировано: {{current_time}}\\nSeed: {{random_seed}}",
          parseMode: "HTML",
          color: "#ec4899"
        }
      }
    ],
    edges: [
      // Основные связи
      { id: "start-to-welcome", source: "start-trigger", target: "welcome-message" },
      { id: "stats-to-message", source: "stats-trigger", target: "stats-message" },
      { id: "api-to-integration", source: "api-trigger", target: "api-integration" },
      { id: "integration-to-response", source: "api-integration", target: "api-response" },
      { id: "help-to-message", source: "help-trigger", target: "help-message" },
      
      // Условная логика
      { id: "text-to-condition", source: "text-handler", target: "text-condition" },
      { id: "condition-true", source: "text-condition", target: "greeting-response", sourceHandle: "true" },
      { id: "condition-false", source: "text-condition", target: "default-response", sourceHandle: "false" }
    ],
    variables: {
      message_count: {
        type: "number",
        defaultValue: 0,
        description: "Количество сообщений пользователя"
      },
      user_count: {
        type: "number", 
        defaultValue: 1,
        description: "Общее количество пользователей"
      },
      current_time: {
        type: "string",
        defaultValue: "не определено",
        description: "Текущее время"
      },
      uptime: {
        type: "string",
        defaultValue: "0 сек",
        description: "Время работы бота"
      },
      random_number: {
        type: "number",
        defaultValue: 42,
        description: "Случайное число"
      },
      random_seed: {
        type: "number",
        defaultValue: 1000,
        description: "Seed для генерации"
      },
      message_text: {
        type: "string",
        defaultValue: "",
        description: "Текст последнего сообщения"
      }
    },
    settings: {
      logging: true,
      debug: false,
      errorHandling: true,
      stateManagement: true
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

// Функция создания расширенного тестового бота
async function createEnhancedTestBot() {
  console.log('🚀 Создание расширенного тестового бота...\n');
  
  try {
    const botId = `enhanced-test-bot-${Date.now()}`;
    const botData = {
      ...enhancedBotSchema,
      id: botId
    };
    
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }
    
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    
    console.log('✅ Расширенный тестовый бот создан!');
    console.log(`📋 ID: ${botData.id}`);
    console.log(`📝 Название: ${botData.name}`);
    console.log(`📊 Узлов: ${botData.configuration.nodes.length}`);
    console.log(`🔗 Связей: ${botData.configuration.edges.length}`);
    console.log(`🔧 Переменных: ${Object.keys(botData.configuration.variables).length}`);
    console.log(`💾 Файл: ${botPath}`);
    
    return botData;
  } catch (error) {
    console.error('💥 Ошибка создания бота:', error.message);
    return false;
  }
}

// Функция тестирования расширенного экспорта
async function testEnhancedNodeJSExport(botId) {
  console.log(`\n📦 Тестирование расширенного экспорта Node.js для бота ${botId}...\n`);
  
  const exportOptions = [
    {
      name: "Базовый экспорт",
      options: {
        includeComments: true,
        multiplatform: false,
        includeIntegrations: false,
        includeAdvancedFeatures: false
      }
    },
    {
      name: "Полный экспорт",
      options: {
        includeComments: true,
        multiplatform: true,
        includeIntegrations: true,
        includeAdvancedFeatures: true,
        generateTests: true,
        generateDocumentation: true
      }
    },
    {
      name: "Минимальный экспорт",
      options: {
        includeComments: false,
        minify: true,
        includeIntegrations: false,
        includeAdvancedFeatures: false
      }
    }
  ];
  
  const results = [];
  
  for (const exportConfig of exportOptions) {
    console.log(`🔧 Тестируем: ${exportConfig.name}`);
    
    try {
      const exportRequest = await makeRequest({
        hostname: 'localhost',
        port: 3002,
        path: `/api/export/${botId}/nodejs`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ options: exportConfig.options }));
      
      if (exportRequest.statusCode === 200) {
        console.log(`✅ ${exportConfig.name} - успешно`);
        console.log(`📊 Размер архива: ${Math.round(exportRequest.data.length / 1024)} KB`);
        
        // Сохраняем архив для анализа
        const archivePath = path.join(__dirname, '..', 'temp', `enhanced-export-${exportConfig.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.zip`);
        fs.writeFileSync(archivePath, exportRequest.data);
        
        results.push({
          name: exportConfig.name,
          success: true,
          size: exportRequest.data.length,
          path: archivePath,
          options: exportConfig.options
        });
      } else {
        console.log(`❌ ${exportConfig.name} - ошибка ${exportRequest.statusCode}`);
        results.push({
          name: exportConfig.name,
          success: false,
          error: exportRequest.statusCode
        });
      }
    } catch (error) {
      console.log(`💥 ${exportConfig.name} - исключение: ${error.message}`);
      results.push({
        name: exportConfig.name,
        success: false,
        error: error.message
      });
    }
    
    console.log(''); // Пустая строка для разделения
  }
  
  return results;
}

// Функция анализа качества экспорта
function analyzeExportQuality(results) {
  console.log('📊 Анализ качества экспорта:\n');
  console.log('─'.repeat(60));
  
  const successfulExports = results.filter(r => r.success);
  const failedExports = results.filter(r => !r.success);
  
  console.log(`✅ Успешных экспортов: ${successfulExports.length}/${results.length}`);
  console.log(`❌ Неудачных экспортов: ${failedExports.length}/${results.length}`);
  
  if (successfulExports.length > 0) {
    console.log('\n📈 Статистика размеров:');
    successfulExports.forEach(result => {
      const sizeKB = Math.round(result.size / 1024);
      const sizeCategory = sizeKB < 10 ? 'Малый' : sizeKB < 50 ? 'Средний' : 'Большой';
      console.log(`  • ${result.name}: ${sizeKB} KB (${sizeCategory})`);
    });
    
    const avgSize = Math.round(successfulExports.reduce((sum, r) => sum + r.size, 0) / successfulExports.length / 1024);
    console.log(`  📊 Средний размер: ${avgSize} KB`);
  }
  
  if (failedExports.length > 0) {
    console.log('\n❌ Ошибки экспорта:');
    failedExports.forEach(result => {
      console.log(`  • ${result.name}: ${result.error}`);
    });
  }
  
  // Оценка качества
  const qualityScore = (successfulExports.length / results.length) * 100;
  console.log(`\n🎯 Оценка качества: ${Math.round(qualityScore)}%`);
  
  if (qualityScore >= 90) {
    console.log('🎉 Отличное качество экспорта!');
  } else if (qualityScore >= 70) {
    console.log('👍 Хорошее качество экспорта');
  } else {
    console.log('⚠️ Требуется улучшение качества экспорта');
  }
  
  return qualityScore >= 70;
}

// Функция тестирования TypeScript экспортера
async function testTypeScriptExporter(botId) {
  console.log(`\n🔷 Тестирование TypeScript экспортера...\n`);
  
  try {
    // Импортируем TypeScript экспортер
    const { NodeJSExporter } = require('./core/export/NodeJSExporter.ts');
    
    // Загружаем данные бота
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));
    
    // Создаем экспортер с разными настройками
    const exportConfigs = [
      {
        name: "TypeScript Basic",
        options: {
          includeComments: true,
          includeAdvancedFeatures: false,
          includeIntegrations: false
        }
      },
      {
        name: "TypeScript Advanced",
        options: {
          includeComments: true,
          includeAdvancedFeatures: true,
          includeIntegrations: true,
          generateTests: true
        }
      }
    ];
    
    const tsResults = [];
    
    for (const config of exportConfigs) {
      console.log(`🔧 Тестируем: ${config.name}`);
      
      try {
        const exporter = new NodeJSExporter(botData, config.options);
        const result = exporter.export();
        
        if (result.success) {
          console.log(`✅ ${config.name} - успешно`);
          console.log(`📁 Файлов сгенерировано: ${result.files.length}`);
          
          // Анализируем типы файлов
          const fileTypes = result.files.reduce((acc, file) => {
            acc[file.type] = (acc[file.type] || 0) + 1;
            return acc;
          }, {});
          
          console.log(`📊 Типы файлов:`, fileTypes);
          
          // Сохраняем результат для анализа
          const outputDir = path.join(__dirname, '..', 'temp', `ts-export-${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`);
          fs.mkdirSync(outputDir, { recursive: true });
          
          result.files.forEach(file => {
            fs.writeFileSync(path.join(outputDir, file.path), file.content);
          });
          
          console.log(`💾 Сохранено в: ${outputDir}`);
          
          tsResults.push({
            name: config.name,
            success: true,
            filesCount: result.files.length,
            fileTypes: fileTypes,
            outputDir: outputDir
          });
        } else {
          console.log(`❌ ${config.name} - ошибка: ${result.error}`);
          tsResults.push({
            name: config.name,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`💥 ${config.name} - исключение: ${error.message}`);
        tsResults.push({
          name: config.name,
          success: false,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    return tsResults;
  } catch (error) {
    console.error('💥 Ошибка тестирования TypeScript экспортера:', error.message);
    return [];
  }
}

// Основная функция тестирования
async function main() {
  console.log('🚀 Расширенное тестирование экспорта в Node.js\n');
  console.log('='.repeat(70));
  
  let allTestsPassed = true;
  
  // 1. Создаем расширенный тестовый бот
  const enhancedBot = await createEnhancedTestBot();
  if (!enhancedBot) {
    allTestsPassed = false;
    console.log('❌ Не удалось создать тестовый бот');
    return;
  }
  
  // 2. Тестируем различные варианты экспорта
  const exportResults = await testEnhancedNodeJSExport(enhancedBot.id);
  const exportQuality = analyzeExportQuality(exportResults);
  if (!exportQuality) allTestsPassed = false;
  
  // 3. Тестируем TypeScript экспортер
  const tsResults = await testTypeScriptExporter(enhancedBot.id);
  if (tsResults.length > 0) {
    console.log('\n🔷 Результаты TypeScript экспорта:');
    console.log('─'.repeat(50));
    
    const tsSuccessful = tsResults.filter(r => r.success);
    console.log(`✅ Успешных TS экспортов: ${tsSuccessful.length}/${tsResults.length}`);
    
    tsSuccessful.forEach(result => {
      console.log(`  • ${result.name}: ${result.filesCount} файлов`);
    });
    
    if (tsSuccessful.length === 0) allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (allTestsPassed) {
    console.log('🎉 Все тесты расширенного экспорта прошли успешно!');
    console.log('\n📋 Результаты:');
    console.log('✅ Создание расширенного тестового бота');
    console.log('✅ Тестирование различных вариантов экспорта');
    console.log('✅ Анализ качества экспорта');
    console.log('✅ Тестирование TypeScript экспортера');
    
    console.log('\n💡 Возможности экспорта:');
    console.log('• Базовый экспорт с минимальным функционалом');
    console.log('• Полный экспорт со всеми возможностями');
    console.log('• Минимальный экспорт для продакшена');
    console.log('• TypeScript экспорт с типизацией');
    console.log('• Интеграции с внешними API');
    console.log('• Расширенные функции и утилиты');
    console.log('• Генерация тестов и документации');
  } else {
    console.log('❌ Некоторые тесты расширенного экспорта не прошли');
    console.log('⚠️ Проверьте настройки экспорта и TypeScript модули');
  }
  
  console.log('\nТестирование расширенного экспорта завершено');
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  createEnhancedTestBot,
  testEnhancedNodeJSExport,
  testTypeScriptExporter,
  analyzeExportQuality,
  enhancedBotSchema
};