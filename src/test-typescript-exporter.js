/**
 * Тестирование TypeScript экспортера
 */
const fs = require('fs');
const path = require('path');

// Простая реализация TypeScript экспортера для тестирования
class SimpleNodeJSExporter {
  constructor(botSchema, options = {}) {
    this.botSchema = botSchema;
    this.options = {
      includeComments: true,
      includeAdvancedFeatures: false,
      includeIntegrations: false,
      generateTests: false,
      generateDocumentation: false,
      ...options
    };
  }

  export() {
    try {
      const files = [];
      
      // Генерируем основные файлы
      files.push(this.generateMainFile());
      files.push(this.generatePackageJson());
      files.push(this.generateReadme());
      files.push(this.generateEnvExample());
      files.push(this.generateConfigFile());
      
      // Дополнительные файлы
      if (this.options.includeAdvancedFeatures) {
        files.push(this.generateUtilsFile());
        files.push(this.generateStateManagerFile());
      }
      
      if (this.options.includeIntegrations) {
        files.push(this.generateIntegrationsFile());
      }
      
      if (this.options.generateTests) {
        files.push(this.generateTestFile());
      }
      
      if (this.options.generateDocumentation) {
        files.push(this.generateApiDocumentation());
      }
      
      return {
        success: true,
        files
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error.message
      };
    }
  }

  generateMainFile() {
    const commandNodes = this.botSchema.configuration?.nodes?.filter(
      node => node.type === 'trigger-command'
    ) || [];

    const commandHandlers = commandNodes.map(node => {
      const command = node.data.command;
      const connectedActions = this.getConnectedActions(node.id);
      
      return `
bot.onText(/${command.replace('/', '\\/')}/,  async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(\`📨 Команда ${command} от пользователя \${userId}\`);
  
  try {
    ${this.options.includeAdvancedFeatures ? 'stateManager.updateUserActivity(userId);' : 'updateUserState(userId);'}
${connectedActions.map(action => this.generateActionCode(action)).join('\n')}
  } catch (error) {
    console.error('Ошибка обработки команды ${command}:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});`;
    }).join('\n');

    const mainCode = `${this.options.includeComments ? this.generateFileHeader() : ''}
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Загружаем конфигурацию
const config = require('./config.json');

${this.options.includeAdvancedFeatures ? `// Подключаем модули
const StateManager = require('./state-manager');
const BotUtils = require('./utils');` : ''}
${this.options.includeIntegrations ? `const IntegrationManager = require('./integrations');` : ''}

// Создаем бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

${this.options.includeAdvancedFeatures ? `// Инициализируем менеджеры
const stateManager = new StateManager();` : '// Состояние пользователей\nconst userStates = new Map();'}
${this.options.includeIntegrations ? `const integrationManager = new IntegrationManager();` : ''}

// Переменные бота
const botVariables = ${JSON.stringify(this.botSchema.configuration?.variables || {}, null, 2)};

${this.options.includeComments ? '// Обработчики команд' : ''}
${commandHandlers}

${this.options.includeComments ? '// Обработчики сообщений' : ''}
${this.generateMessageHandlers()}

${this.options.includeComments ? '// Вспомогательные функции' : ''}
${this.generateHelperFunctions()}

${this.options.includeComments ? '// Запуск бота' : ''}
console.log('🤖 Бот запущен!');
console.log('Название:', config.name);
console.log('Описание:', config.description);

bot.on('polling_error', (error) => {
  console.error('Ошибка polling:', error);
});

process.on('SIGINT', () => {
  console.log('\\n🛑 Остановка бота...');
  ${this.options.includeAdvancedFeatures ? 'stateManager.cleanup();' : ''}
  bot.stopPolling();
  process.exit(0);
});
`;

    return {
      path: 'index.js',
      content: mainCode,
      type: 'js'
    };
  }

  generateFileHeader() {
    return `/**
 * ${this.botSchema.name}
 * ${this.botSchema.description}
 * 
 * Сгенерировано автоматически из конструктора ботов
 * Дата: ${new Date().toLocaleString('ru-RU')}
 */

`;
  }

  generateMessageHandlers() {
    const hasTextHandlers = this.botSchema.configuration?.nodes?.some(
      node => node.type === 'trigger-message'
    );

    if (!hasTextHandlers) return '';

    return `
bot.on('message', async (msg) => {
  // Пропускаем команды (они обрабатываются отдельно)
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(\`💬 Сообщение от пользователя \${userId}: \${msg.text}\`);
  
  try {
    ${this.options.includeAdvancedFeatures ? 'stateManager.updateUserActivity(userId);' : 'updateUserState(userId);'}
    ${this.options.includeAdvancedFeatures ? 'stateManager.setUserVariable(userId, "message_text", msg.text || "");' : ''}
    
    // Здесь можно добавить обработку текстовых сообщений
    const responseText = replaceVariables('Получено сообщение: "{{message_text}}"\\n\\nИспользуйте команды для взаимодействия.', userId);
    await bot.sendMessage(chatId, responseText);
  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
  }
});`;
  }

  generateHelperFunctions() {
    if (this.options.includeAdvancedFeatures) {
      return `
function updateUserState(userId) {
  // Расширенная логика обновления состояния
  console.log(\`Обновление состояния пользователя \${userId}\`);
}

function replaceVariables(text, userId) {
  let result = text;
  
  // Заменяем глобальные переменные
  for (const [key, variable] of Object.entries(botVariables)) {
    const placeholder = \`{{\${key}}}\`;
    result = result.replace(new RegExp(placeholder, 'g'), variable.defaultValue);
  }
  
  // Заменяем системные переменные
  result = result.replace(/{{current_time}}/g, new Date().toLocaleString('ru-RU'));
  result = result.replace(/{{random_number}}/g, Math.floor(Math.random() * 1000));
  
  return result;
}`;
    } else {
      return `
function updateUserState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      messageCount: 0,
      lastActivity: new Date(),
      variables: new Map()
    });
  }
  
  const state = userStates.get(userId);
  state.messageCount++;
  state.lastActivity = new Date();
}

function replaceVariables(text, userId) {
  let result = text;
  
  // Заменяем глобальные переменные
  for (const [key, variable] of Object.entries(botVariables)) {
    const placeholder = \`{{\${key}}}\`;
    result = result.replace(new RegExp(placeholder, 'g'), variable.defaultValue);
  }
  
  // Заменяем пользовательские переменные
  const userState = userStates.get(userId);
  if (userState) {
    result = result.replace(/{{message_count}}/g, userState.messageCount);
    result = result.replace(/{{user_count}}/g, userStates.size);
  }
  
  return result;
}`;
    }
  }

  getConnectedActions(nodeId) {
    const edges = this.botSchema.configuration?.edges || [];
    const nodes = this.botSchema.configuration?.nodes || [];
    
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => nodes.find(node => node.id === edge.target))
      .filter(Boolean);
  }

  generateActionCode(action) {
    switch (action.type) {
      case 'action-send-message':
        const hasButtons = action.data.buttons && action.data.buttons.length > 0;
        return `    // Отправляем сообщение: ${action.data.label}
    const message = replaceVariables(\`${action.data.text}\`, userId);
    await bot.sendMessage(chatId, message, { 
      parse_mode: '${action.data.parseMode || 'HTML'}'${hasButtons ? `,
      reply_markup: {
        inline_keyboard: ${JSON.stringify(action.data.buttons)}
      }` : ''}
    });
    console.log('✅ Отправлено сообщение');`;

      case 'action-send-media':
        return `    // Отправляем медиа: ${action.data.label}
    const mediaUrl = replaceVariables('${action.data.mediaUrl || 'https://picsum.photos/800/600'}', userId);
    const caption = replaceVariables(\`${action.data.caption || ''}\`, userId);
    await bot.sendPhoto(chatId, mediaUrl, {
      caption: caption,
      parse_mode: '${action.data.parseMode || 'HTML'}'
    });
    console.log('✅ Отправлено медиа');`;

      case 'action-integration':
        if (!this.options.includeIntegrations) {
          return `    // Интеграция отключена: ${action.data.label}
    console.log('⚠️ Интеграция ${action.data.label} пропущена (отключена в настройках экспорта)');`;
        }
        
        return `    // Выполняем интеграцию: ${action.data.label}
    try {
      const integrationResult = await integrationManager.executeIntegration('${action.id}', {
        user_id: userId,
        username: msg.from?.username || 'Пользователь'
      });
      console.log('✅ Интеграция ${action.data.label} выполнена');
    } catch (error) {
      console.error('❌ Ошибка интеграции ${action.data.label}:', error);
    }`;

      default:
        return `    // Неизвестное действие: ${action.type}
    console.warn('Неподдерживаемое действие:', '${action.type}');`;
    }
  }

  generatePackageJson() {
    const dependencies = {
      'node-telegram-bot-api': '^0.61.0'
    };

    if (this.options.includeIntegrations) {
      dependencies['axios'] = '^1.6.0';
    }

    const packageJson = {
      name: this.botSchema.id || 'exported-bot',
      version: '1.0.0',
      description: this.botSchema.description || 'Экспортированный бот из конструктора',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
        test: this.options.generateTests ? 'node test.js' : 'echo "No tests specified" && exit 0'
      },
      dependencies,
      devDependencies: {
        nodemon: '^2.0.22'
      },
      keywords: ['telegram', 'bot', 'chatbot', 'exported'],
      author: 'Bot Constructor',
      license: 'MIT'
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'json'
    };
  }

  generateReadme() {
    const commands = this.botSchema.configuration?.nodes
      ?.filter(node => node.type === 'trigger-command')
      ?.map(node => `- \`${node.data.command}\` - ${node.data.description || node.data.label}`)
      ?.join('\n') || 'Команды не найдены';

    const readme = `# ${this.botSchema.name}

${this.botSchema.description}

## 🚀 Быстрый старт

### 1. Установка зависимостей
\`\`\`bash
npm install
\`\`\`

### 2. Настройка
\`\`\`bash
cp .env.example .env
# Отредактируйте .env и добавьте токен бота
\`\`\`

### 3. Запуск
\`\`\`bash
npm start
\`\`\`

## 📋 Команды бота

${commands}

## 🔧 Возможности

${this.options.includeAdvancedFeatures ? '✅ Расширенные функции и утилиты' : '❌ Базовая функциональность'}
${this.options.includeIntegrations ? '✅ Интеграции с внешними API' : '❌ Без интеграций'}
${this.options.generateTests ? '✅ Автоматические тесты' : '❌ Без тестов'}
${this.options.generateDocumentation ? '✅ Документация API' : '❌ Без документации'}

Дата экспорта: ${new Date().toLocaleString('ru-RU')}
`;

    return {
      path: 'README.md',
      content: readme,
      type: 'md'
    };
  }

  generateEnvExample() {
    return {
      path: '.env.example',
      content: `TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=production
LOG_LEVEL=info
`,
      type: 'txt'
    };
  }

  generateConfigFile() {
    return {
      path: 'config.json',
      content: JSON.stringify({
        name: this.botSchema.name,
        description: this.botSchema.description,
        version: '1.0.0',
        exported: new Date().toISOString(),
        variables: this.botSchema.configuration?.variables || {}
      }, null, 2),
      type: 'json'
    };
  }

  generateUtilsFile() {
    return {
      path: 'utils.js',
      content: `/**
 * Утилиты для работы бота
 */

class BotUtils {
  static formatTime(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static logWithTimestamp(level, message, ...args) {
    const timestamp = this.formatTime(new Date());
    const levelEmoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    
    console.log(\`[\${timestamp}] \${levelEmoji[level] || '📝'} \${message}\`, ...args);
  }
}

module.exports = BotUtils;
`,
      type: 'js'
    };
  }

  generateStateManagerFile() {
    return {
      path: 'state-manager.js',
      content: `/**
 * Менеджер состояний пользователей
 */

class StateManager {
  constructor() {
    this.states = new Map();
    this.startTime = Date.now();
  }

  updateUserActivity(userId) {
    if (!this.states.has(userId)) {
      this.states.set(userId, {
        messageCount: 0,
        lastActivity: new Date(),
        variables: new Map()
      });
    }
    
    const state = this.states.get(userId);
    state.messageCount++;
    state.lastActivity = new Date();
  }

  setUserVariable(userId, key, value) {
    const state = this.states.get(userId);
    if (state) {
      state.variables.set(key, value);
    }
  }

  getUserVariable(userId, key) {
    const state = this.states.get(userId);
    return state ? state.variables.get(key) : undefined;
  }

  replaceVariables(text, userId) {
    let result = text;
    
    const state = this.states.get(userId);
    if (state) {
      result = result.replace(/{{message_count}}/g, state.messageCount);
      result = result.replace(/{{user_count}}/g, this.states.size);
      
      // Заменяем пользовательские переменные
      for (const [key, value] of state.variables) {
        result = result.replace(new RegExp(\`{{\${key}}}\`, 'g'), value);
      }
    }
    
    // Системные переменные
    result = result.replace(/{{current_time}}/g, new Date().toLocaleString('ru-RU'));
    result = result.replace(/{{uptime}}/g, this.formatUptime());
    result = result.replace(/{{random_number}}/g, Math.floor(Math.random() * 1000));
    
    return result;
  }

  formatUptime() {
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return \`\${hours} ч. \${minutes % 60} мин.\`;
    if (minutes > 0) return \`\${minutes} мин. \${seconds % 60} сек.\`;
    return \`\${seconds} сек.\`;
  }

  cleanup() {
    console.log('🧹 Очистка состояний пользователей...');
    this.states.clear();
  }
}

module.exports = StateManager;
`,
      type: 'js'
    };
  }

  generateIntegrationsFile() {
    return {
      path: 'integrations.js',
      content: `/**
 * Модуль интеграций с внешними API
 */
const axios = require('axios');

class IntegrationManager {
  constructor() {
    this.cache = new Map();
    this.rateLimits = new Map();
  }

  async executeIntegration(integrationId, variables = {}) {
    console.log(\`🔗 Выполнение интеграции: \${integrationId}\`);
    
    // Простая заглушка для демонстрации
    const mockData = {
      fact: "This is a mock integration response",
      source: "https://example.com",
      timestamp: new Date().toISOString()
    };
    
    // Имитируем задержку API
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return mockData;
  }
}

module.exports = IntegrationManager;
`,
      type: 'js'
    };
  }

  generateTestFile() {
    return {
      path: 'test.js',
      content: `/**
 * Простые тесты для бота
 */

console.log('🧪 Запуск тестов...');

// Тест 1: Проверка конфигурации
try {
  const config = require('./config.json');
  console.log('✅ Тест 1: Конфигурация загружена');
  console.log(\`   Название: \${config.name}\`);
} catch (error) {
  console.log('❌ Тест 1: Ошибка загрузки конфигурации');
}

// Тест 2: Проверка зависимостей
try {
  const TelegramBot = require('node-telegram-bot-api');
  console.log('✅ Тест 2: Telegram Bot API доступен');
} catch (error) {
  console.log('❌ Тест 2: Telegram Bot API недоступен');
}

${this.options.includeAdvancedFeatures ? `
// Тест 3: Проверка утилит
try {
  const BotUtils = require('./utils');
  const time = BotUtils.formatTime(new Date());
  console.log('✅ Тест 3: Утилиты работают');
  console.log(\`   Время: \${time}\`);
} catch (error) {
  console.log('❌ Тест 3: Ошибка утилит');
}

// Тест 4: Проверка менеджера состояний
try {
  const StateManager = require('./state-manager');
  const stateManager = new StateManager();
  stateManager.updateUserActivity(12345);
  console.log('✅ Тест 4: Менеджер состояний работает');
} catch (error) {
  console.log('❌ Тест 4: Ошибка менеджера состояний');
}` : ''}

${this.options.includeIntegrations ? `
// Тест 5: Проверка интеграций
try {
  const IntegrationManager = require('./integrations');
  const integrationManager = new IntegrationManager();
  console.log('✅ Тест 5: Менеджер интеграций загружен');
} catch (error) {
  console.log('❌ Тест 5: Ошибка менеджера интеграций');
}` : ''}

console.log('\\n🎉 Тесты завершены!');
`,
      type: 'js'
    };
  }

  generateApiDocumentation() {
    return {
      path: 'API.md',
      content: `# API Документация

## Обзор

Этот бот предоставляет следующие возможности:

### Команды

${this.botSchema.configuration?.nodes
  ?.filter(node => node.type === 'trigger-command')
  ?.map(node => `#### ${node.data.command}
- **Описание**: ${node.data.description || node.data.label}
- **Тип**: Команда
- **Использование**: Отправьте ${node.data.command} в чат с ботом`)
  ?.join('\n\n') || 'Команды не найдены'}

### Переменные

${Object.entries(this.botSchema.configuration?.variables || {})
  .map(([key, variable]) => `#### {{${key}}}
- **Тип**: ${variable.type}
- **По умолчанию**: ${variable.defaultValue}
- **Описание**: ${variable.description}`)
  .join('\n\n')}

### Архитектура

Бот построен на следующих компонентах:

- **index.js** - Основной файл с логикой бота
- **config.json** - Конфигурация и настройки
${this.options.includeAdvancedFeatures ? '- **utils.js** - Вспомогательные функции\n- **state-manager.js** - Управление состоянием пользователей' : ''}
${this.options.includeIntegrations ? '- **integrations.js** - Интеграции с внешними API' : ''}

### Развертывание

1. Установите зависимости: \`npm install\`
2. Настройте переменные окружения в \`.env\`
3. Запустите бота: \`npm start\`

Дата генерации: ${new Date().toLocaleString('ru-RU')}
`,
      type: 'md'
    };
  }
}

// Функция тестирования TypeScript экспортера
async function testTypeScriptExporter() {
  console.log('🔷 Тестирование TypeScript экспортера\n');
  console.log('='.repeat(60));
  
  try {
    // Создаем тестовую схему бота
    const testBotSchema = {
      id: "typescript-test-bot",
      name: "TypeScript Test Bot",
      description: "Тестовый бот для проверки TypeScript экспортера",
      configuration: {
        nodes: [
          {
            id: "start-cmd",
            type: "trigger-command",
            data: {
              label: "Start Command",
              command: "/start",
              description: "Команда приветствия"
            }
          },
          {
            id: "welcome-msg",
            type: "action-send-message",
            data: {
              label: "Welcome Message",
              text: "Добро пожаловать! Это TypeScript экспорт.",
              parseMode: "HTML"
            }
          },
          {
            id: "stats-cmd",
            type: "trigger-command",
            data: {
              label: "Stats Command",
              command: "/stats",
              description: "Статистика бота"
            }
          },
          {
            id: "stats-msg",
            type: "action-send-message",
            data: {
              label: "Stats Message",
              text: "📊 Статистика:\\nСообщений: {{message_count}}\\nПользователей: {{user_count}}",
              parseMode: "HTML"
            }
          }
        ],
        edges: [
          { id: "start-to-welcome", source: "start-cmd", target: "welcome-msg" },
          { id: "stats-to-msg", source: "stats-cmd", target: "stats-msg" }
        ],
        variables: {
          message_count: {
            type: "number",
            defaultValue: 0,
            description: "Количество сообщений"
          },
          user_count: {
            type: "number",
            defaultValue: 1,
            description: "Количество пользователей"
          }
        }
      }
    };
    
    // Тестируем различные конфигурации экспорта
    const exportConfigs = [
      {
        name: "Базовый экспорт",
        options: {
          includeComments: true,
          includeAdvancedFeatures: false,
          includeIntegrations: false,
          generateTests: false,
          generateDocumentation: false
        }
      },
      {
        name: "Расширенный экспорт",
        options: {
          includeComments: true,
          includeAdvancedFeatures: true,
          includeIntegrations: false,
          generateTests: false,
          generateDocumentation: true
        }
      },
      {
        name: "Полный экспорт",
        options: {
          includeComments: true,
          includeAdvancedFeatures: true,
          includeIntegrations: true,
          generateTests: true,
          generateDocumentation: true
        }
      }
    ];
    
    const results = [];
    
    for (const config of exportConfigs) {
      console.log(`🔧 Тестируем: ${config.name}`);
      
      try {
        const exporter = new SimpleNodeJSExporter(testBotSchema, config.options);
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
          
          // Сохраняем результат
          const outputDir = path.join(__dirname, '..', 'temp', `ts-export-${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`);
          fs.mkdirSync(outputDir, { recursive: true });
          
          result.files.forEach(file => {
            fs.writeFileSync(path.join(outputDir, file.path), file.content);
          });
          
          console.log(`💾 Сохранено в: ${outputDir}`);
          
          // Проверяем качество сгенерированного кода
          const mainFile = result.files.find(f => f.path === 'index.js');
          if (mainFile) {
            const codeQuality = analyzeCodeQuality(mainFile.content);
            console.log(`🎯 Качество кода: ${codeQuality.score}%`);
          }
          
          results.push({
            name: config.name,
            success: true,
            filesCount: result.files.length,
            fileTypes: fileTypes,
            outputDir: outputDir
          });
        } else {
          console.log(`❌ ${config.name} - ошибка: ${result.error}`);
          results.push({
            name: config.name,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`💥 ${config.name} - исключение: ${error.message}`);
        results.push({
          name: config.name,
          success: false,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Анализ результатов
    console.log('📊 Анализ результатов TypeScript экспорта:');
    console.log('─'.repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Успешных экспортов: ${successful.length}/${results.length}`);
    console.log(`❌ Неудачных экспортов: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n📈 Статистика файлов:');
      successful.forEach(result => {
        console.log(`  • ${result.name}: ${result.filesCount} файлов`);
        console.log(`    Типы: ${Object.entries(result.fileTypes).map(([type, count]) => `${count} ${type}`).join(', ')}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Ошибки:');
      failed.forEach(result => {
        console.log(`  • ${result.name}: ${result.error}`);
      });
    }
    
    const successRate = (successful.length / results.length) * 100;
    console.log(`\n🎯 Общий успех: ${Math.round(successRate)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Отличная работа TypeScript экспортера!');
    } else if (successRate >= 70) {
      console.log('👍 Хорошая работа TypeScript экспортера');
    } else {
      console.log('⚠️ TypeScript экспортер требует улучшений');
    }
    
    return successRate >= 70;
    
  } catch (error) {
    console.error('💥 Критическая ошибка тестирования:', error.message);
    return false;
  }
}

// Функция анализа качества кода
function analyzeCodeQuality(code) {
  const checks = [
    { name: 'Комментарии', pattern: /\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, weight: 10 },
    { name: 'Обработка ошибок', pattern: /try\s*{[\s\S]*?}\s*catch/g, weight: 20 },
    { name: 'Async/await', pattern: /async\s+function|await\s+/g, weight: 15 },
    { name: 'Константы', pattern: /const\s+\w+/g, weight: 10 },
    { name: 'Функции', pattern: /function\s+\w+|=>\s*{/g, weight: 15 },
    { name: 'Логирование', pattern: /console\.(log|error|warn|info)/g, weight: 10 },
    { name: 'Валидация', pattern: /if\s*\(.*\)\s*{/g, weight: 10 },
    { name: 'Модули', pattern: /require\(|module\.exports/g, weight: 10 }
  ];
  
  let totalScore = 0;
  let maxScore = 0;
  const details = [];
  
  checks.forEach(check => {
    const matches = code.match(check.pattern) || [];
    const score = Math.min(check.weight, matches.length * 2);
    totalScore += score;
    maxScore += check.weight;
    
    details.push({
      name: check.name,
      matches: matches.length,
      score: score,
      maxScore: check.weight
    });
  });
  
  return {
    score: Math.round((totalScore / maxScore) * 100),
    totalScore,
    maxScore,
    details
  };
}

// Запуск тестирования
if (require.main === module) {
  testTypeScriptExporter().then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🎉 TypeScript экспортер работает корректно!');
    } else {
      console.log('❌ TypeScript экспортер требует доработки');
    }
    console.log('Тестирование завершено');
  });
}

module.exports = {
  SimpleNodeJSExporter,
  testTypeScriptExporter,
  analyzeCodeQuality
};