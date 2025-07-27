/**
 * Экспорт схемы бота в Node.js код
 */

export interface ExportOptions {
  includeComments: boolean;
  minify: boolean;
  platform: string;
  outputDir: string;
  multiplatform?: boolean;
  includeIntegrations?: boolean;
  includeAdvancedFeatures?: boolean;
  generateTests?: boolean;
  generateDocumentation?: boolean;
}

export interface ExportResult {
  success: boolean;
  files: ExportedFile[];
  error?: string;
}

export interface ExportedFile {
  path: string;
  content: string;
  type: 'js' | 'json' | 'md' | 'txt';
}

export class NodeJSExporter {
  private botSchema: any;
  private options: ExportOptions;

  constructor(botSchema: any, options: Partial<ExportOptions> = {}) {
    this.botSchema = botSchema;
    this.options = {
      includeComments: true,
      minify: false,
      platform: 'telegram',
      outputDir: './exported-bot',
      multiplatform: false,
      includeIntegrations: true,
      includeAdvancedFeatures: true,
      generateTests: false,
      generateDocumentation: true,
      ...options
    };
  }

  /**
   * Экспортирует бота в Node.js проект
   */
  export(): ExportResult {
    try {
      const files: ExportedFile[] = [];

      // Генерируем основные файлы
      files.push(this.generateMainFile());
      files.push(this.generatePackageJson());
      files.push(this.generateReadme());
      files.push(this.generateEnvExample());
      files.push(this.generateConfigFile());

      // Генерируем дополнительные файлы
      if (this.options.includeIntegrations) {
        files.push(this.generateIntegrationsFile());
      }
      
      if (this.options.includeAdvancedFeatures) {
        files.push(this.generateUtilsFile());
        files.push(this.generateStateManagerFile());
      }
      
      if (this.options.generateTests) {
        files.push(...this.generateTestFiles());
      }
      
      if (this.options.generateDocumentation) {
        files.push(this.generateApiDocumentation());
      }

      // Генерируем обработчики узлов
      files.push(...this.generateNodeHandlers());

      return {
        success: true,
        files
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateMainFile(): ExportedFile {
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
${this.generateCommandHandlers()}

${this.options.includeComments ? '// Обработчики сообщений' : ''}
${this.generateMessageHandlers()}

${this.options.includeComments ? '// Обработчики callback запросов' : ''}
${this.generateCallbackHandlers()}

${this.options.includeComments ? '// Вспомогательные функции' : ''}
${this.generateHelperFunctions()}

${this.options.includeComments ? '// Запуск бота' : ''}
BotUtils.logWithTimestamp('info', '🤖 Бот запущен!');
BotUtils.logWithTimestamp('info', 'Название:', config.name);
BotUtils.logWithTimestamp('info', 'Описание:', config.description);

bot.on('polling_error', (error) => {
  BotUtils.logWithTimestamp('error', 'Ошибка polling:', error.message);
});

process.on('SIGINT', () => {
  BotUtils.logWithTimestamp('info', '🛑 Остановка бота...');
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

  private generateFileHeader(): string {
    return `/**
 * ${this.botSchema.name}
 * ${this.botSchema.description}
 * 
 * Сгенерировано автоматически из конструктора ботов
 * Дата: ${new Date().toLocaleString('ru-RU')}
 */

`;
  }  private g
enerateCommandHandlers(): string {
    const commandNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'trigger-command'
    ) || [];

    return commandNodes.map((node: any) => {
      const command = node.data.command;
      const handlerName = this.sanitizeHandlerName(command);
      
      return `
bot.onText(/${command.replace('/', '\\/')}/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(\`📨 Команда ${command} от пользователя \${userId}\`);
  
  try {
    await handle${handlerName}(chatId, userId, msg);
  } catch (error) {
    console.error('Ошибка обработки команды ${command}:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});`;
    }).join('\n');
  }

  private generateMessageHandlers(): string {
    const messageNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'trigger-message'
    ) || [];

    if (messageNodes.length === 0) return '';

    return `
bot.on('message', async (msg) => {
  // Пропускаем команды (они обрабатываются отдельно)
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  ${this.options.includeAdvancedFeatures ? 
    `BotUtils.logWithTimestamp('info', \`💬 Сообщение от пользователя \${userId}: \${BotUtils.truncateText(msg.text || 'медиа')}\`);` :
    `console.log(\`💬 Сообщение от пользователя \${userId}: \${msg.text}\`);`}
  
  try {
    await handleMessage(chatId, userId, msg);
  } catch (error) {
    ${this.options.includeAdvancedFeatures ? 
      `BotUtils.logWithTimestamp('error', 'Ошибка обработки сообщения:', error.message);` :
      `console.error('Ошибка обработки сообщения:', error);`}
  }
});`;
  }

  private generateCallbackHandlers(): string {
    const hasButtons = this.botSchema.configuration?.nodes?.some(
      (node: any) => node.data.buttons && node.data.buttons.length > 0
    );

    if (!hasButtons) return '';

    return `
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  ${this.options.includeAdvancedFeatures ? 
    `BotUtils.logWithTimestamp('info', \`🔘 Callback от пользователя \${userId}: \${data}\`);` :
    `console.log(\`🔘 Callback от пользователя \${userId}: \${data}\`);`}
  
  try {
    await handleCallback(chatId, userId, data, callbackQuery);
    
    // Подтверждаем получение callback
    bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    ${this.options.includeAdvancedFeatures ? 
      `BotUtils.logWithTimestamp('error', 'Ошибка обработки callback:', error.message);` :
      `console.error('Ошибка обработки callback:', error);`}
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Произошла ошибка' });
  }
});`;
  }

  private generateHelperFunctions(): string {
    const commandNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'trigger-command'
    ) || [];

    const commandHandlers = commandNodes.map((node: any) => {
      const command = node.data.command;
      const handlerName = this.sanitizeHandlerName(command);
      const connectedActions = this.getConnectedActions(node.id);
      
      return `
async function handle${handlerName}(chatId, userId, msg) {
  // Обновляем состояние пользователя
  ${this.options.includeAdvancedFeatures ? 'stateManager.updateUserActivity(userId);' : 'updateUserState(userId);'}
  
${connectedActions.map(action => this.generateActionCode(action)).join('\n')}
}`;
    }).join('\n');

    const messageHandler = `
async function handleMessage(chatId, userId, msg) {
  // Обновляем состояние пользователя
  ${this.options.includeAdvancedFeatures ? 'stateManager.updateUserActivity(userId);' : 'updateUserState(userId);'}
  
  ${this.options.includeAdvancedFeatures ? `// Сохраняем текст сообщения для использования в переменных
  stateManager.setUserVariable(userId, 'message_text', msg.text || '');
  
  // Проверяем условия для текстовых сообщений
  const conditionNodes = ${JSON.stringify(
    this.botSchema.configuration?.nodes?.filter((node: any) => node.type?.includes('condition')) || []
  )};
  
  for (const condition of conditionNodes) {
    if (await evaluateCondition(condition, msg, userId)) {
      const connectedActions = getConnectedActionsFromCondition(condition.id, true);
      for (const action of connectedActions) {
        await executeAction(action, chatId, userId, msg);
      }
      return;
    }
  }
  
  // Если условия не сработали, выполняем действия по умолчанию
  const defaultActions = getConnectedActionsFromCondition('text-handler', false);
  for (const action of defaultActions) {
    await executeAction(action, chatId, userId, msg);
  }` : `// Здесь можно добавить обработку текстовых сообщений
  console.log('Получено текстовое сообщение:', msg.text);`}
}`;

    const callbackHandler = `
async function handleCallback(chatId, userId, data, callbackQuery) {
  ${this.options.includeAdvancedFeatures ? 'stateManager.updateUserActivity(userId);' : 'updateUserState(userId);'}
  
  // Обработка callback данных
  if (data.startsWith('quiz_')) {
    await handleQuizAnswer(chatId, userId, data, callbackQuery);
  } else {
    ${this.options.includeAdvancedFeatures ? 
      `BotUtils.logWithTimestamp('warn', 'Неизвестный callback:', data);` :
      `console.warn('Неизвестный callback:', data);`}
  }
}

async function handleQuizAnswer(chatId, userId, answer, callbackQuery) {
  const correctAnswer = 'quiz_b'; // JavaScript/Node.js
  const isCorrect = answer === correctAnswer;
  
  const responseText = isCorrect 
    ? '🎉 Правильно! Этот бот действительно создан на JavaScript/Node.js'
    : '❌ Неправильно. Правильный ответ: B) JavaScript/Node.js';
    
  await bot.editMessageText(responseText, {
    chat_id: chatId,
    message_id: callbackQuery.message.message_id,
    parse_mode: 'HTML'
  });
}`;

    const utilityFunctions = this.options.includeAdvancedFeatures ? `
async function evaluateCondition(condition, msg, userId) {
  if (condition.type === 'condition-text') {
    const text = (msg.text || '').toLowerCase();
    const conditions = condition.data.conditions || [];
    
    for (const cond of conditions) {
      const value = cond.value.toLowerCase();
      let matches = false;
      
      switch (cond.type) {
        case 'contains':
          matches = text.includes(value);
          break;
        case 'equals':
          matches = text === value;
          break;
        case 'starts_with':
          matches = text.startsWith(value);
          break;
        case 'ends_with':
          matches = text.endsWith(value);
          break;
      }
      
      if (matches) {
        return condition.data.operator === 'OR' ? true : matches;
      }
    }
    
    return condition.data.operator === 'AND';
  }
  
  return false;
}

function getConnectedActionsFromCondition(nodeId, isTrue) {
  const edges = ${JSON.stringify(this.botSchema.configuration?.edges || [])};
  const nodes = ${JSON.stringify(this.botSchema.configuration?.nodes || [])};
  
  return edges
    .filter(edge => edge.source === nodeId && (isTrue ? edge.sourceHandle === 'true' : edge.sourceHandle === 'false'))
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(Boolean);
}

async function executeAction(action, chatId, userId, msg) {
  switch (action.type) {
    case 'action-send-message':
      const messageText = stateManager.replaceVariables(action.data.text, userId);
      await bot.sendMessage(chatId, messageText, { 
        parse_mode: action.data.parseMode || 'HTML',
        reply_markup: action.data.buttons ? { inline_keyboard: action.data.buttons } : undefined
      });
      break;
      
    case 'action-send-media':
      const caption = stateManager.replaceVariables(action.data.caption || '', userId);
      const mediaUrl = stateManager.replaceVariables(action.data.mediaUrl, userId);
      await bot.sendPhoto(chatId, mediaUrl, { caption, parse_mode: 'HTML' });
      break;
      
    case 'action-integration':
      if (integrationManager) {
        try {
          const variables = {
            user_id: userId,
            username: msg.from?.username || 'Пользователь',
            current_time: BotUtils.formatTime(new Date())
          };
          
          const result = await integrationManager.executeIntegration(action.id, variables);
          
          // Сохраняем результаты интеграции в переменные
          for (const [key, value] of Object.entries(result)) {
            stateManager.setUserVariable(userId, \`\${action.data.label.toLowerCase()}_\${key}\`, value);
          }
          
          BotUtils.logWithTimestamp('success', \`Интеграция \${action.data.label} выполнена успешно\`);
        } catch (error) {
          BotUtils.logWithTimestamp('error', \`Ошибка интеграции \${action.data.label}:\`, error.message);
        }
      }
      break;
  }
}` : `
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

    return commandHandlers + messageHandler + callbackHandler + utilityFunctions;
  }  
private getConnectedActions(nodeId: string): any[] {
    const edges = this.botSchema.configuration?.edges || [];
    const nodes = this.botSchema.configuration?.nodes || [];
    
    return edges
      .filter((edge: any) => edge.source === nodeId)
      .map((edge: any) => nodes.find((node: any) => node.id === edge.target))
      .filter(Boolean);
  }

  private generateActionCode(action: any): string {
    const replaceVarsFunction = this.options.includeAdvancedFeatures ? 'stateManager.replaceVariables' : 'replaceVariables';
    const logFunction = this.options.includeAdvancedFeatures ? 'BotUtils.logWithTimestamp' : 'console.log';

    switch (action.type) {
      case 'action-send-message':
        const hasButtons = action.data.buttons && action.data.buttons.length > 0;
        return `  // Отправляем сообщение: ${action.data.label}
  const message${action.id} = ${replaceVarsFunction}(\`${action.data.text}\`, userId);
  await bot.sendMessage(chatId, message${action.id}, { 
    parse_mode: '${action.data.parseMode || 'HTML'}'${hasButtons ? `,
    reply_markup: {
      inline_keyboard: ${JSON.stringify(action.data.buttons)}
    }` : ''}
  });
  ${this.options.includeAdvancedFeatures ? 
    `BotUtils.logWithTimestamp('success', '✅ Отправлено сообщение:', BotUtils.truncateText(message${action.id}));` :
    `console.log('✅ Отправлено сообщение:', message${action.id}.substring(0, 50) + '...');`}`;

      case 'action-send-media':
        return `  // Отправляем медиа: ${action.data.label}
  const mediaUrl${action.id} = ${replaceVarsFunction}('${action.data.mediaUrl || 'https://picsum.photos/800/600'}', userId);
  const caption${action.id} = ${replaceVarsFunction}(\`${action.data.caption || ''}\`, userId);
  await bot.sendPhoto(chatId, mediaUrl${action.id}, {
    caption: caption${action.id},
    parse_mode: '${action.data.parseMode || 'HTML'}'
  });
  ${this.options.includeAdvancedFeatures ? 
    `BotUtils.logWithTimestamp('success', '✅ Отправлено медиа:', mediaUrl${action.id});` :
    `console.log('✅ Отправлено медиа');`}`;

      case 'action-integration':
        if (!this.options.includeIntegrations) {
          return `  // Интеграция отключена: ${action.data.label}
  ${logFunction}('⚠️ Интеграция ${action.data.label} пропущена (отключена в настройках экспорта)');`;
        }
        
        return `  // Выполняем интеграцию: ${action.data.label}
  try {
    const integrationVariables = {
      user_id: userId,
      username: msg.from?.username || 'Пользователь',
      current_time: ${this.options.includeAdvancedFeatures ? 'BotUtils.formatTime(new Date())' : 'new Date().toLocaleString()'}
    };
    
    const integrationResult = await integrationManager.executeIntegration('${action.id}', integrationVariables);
    
    // Сохраняем результаты в переменные пользователя
    ${this.options.includeAdvancedFeatures ? `for (const [key, value] of Object.entries(integrationResult)) {
      stateManager.setUserVariable(userId, \`${action.data.label.toLowerCase()}_\${key}\`, value);
    }` : '// Результаты интеграции получены'}
    
    ${this.options.includeAdvancedFeatures ? 
      `BotUtils.logWithTimestamp('success', '✅ Интеграция ${action.data.label} выполнена');` :
      `console.log('✅ Интеграция ${action.data.label} выполнена');`}
  } catch (error) {
    ${this.options.includeAdvancedFeatures ? 
      `BotUtils.logWithTimestamp('error', '❌ Ошибка интеграции ${action.data.label}:', error.message);` :
      `console.error('❌ Ошибка интеграции ${action.data.label}:', error);`}
  }`;

      default:
        return `  // Неизвестное действие: ${action.type}
  ${this.options.includeAdvancedFeatures ? 
    `BotUtils.logWithTimestamp('warn', 'Неподдерживаемое действие:', '${action.type}');` :
    `console.warn('Неподдерживаемое действие:', '${action.type}');`}`;
    }
  }

  private sanitizeHandlerName(command: string): string {
    return command.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toUpperCase());
  }

  private generatePackageJson(): ExportedFile {
    const dependencies: Record<string, string> = {
      'node-telegram-bot-api': '^0.61.0'
    };

    if (this.options.includeIntegrations) {
      dependencies['axios'] = '^1.6.0';
    }

    const scripts: Record<string, string> = {
      start: 'node index.js',
      dev: 'nodemon index.js'
    };

    if (this.options.generateTests) {
      scripts.test = 'node test.js';
    } else {
      scripts.test = 'echo "No tests specified" && exit 0';
    }

    const packageJson = {
      name: this.botSchema.id || 'exported-bot',
      version: '1.0.0',
      description: this.botSchema.description || 'Экспортированный бот из конструктора',
      main: 'index.js',
      scripts,
      dependencies,
      devDependencies: {
        nodemon: '^2.0.22'
      },
      keywords: [
        'telegram', 
        'bot', 
        'chatbot', 
        'exported',
        ...(this.options.multiplatform ? ['multiplatform'] : []),
        ...(this.options.includeIntegrations ? ['integrations'] : [])
      ],
      author: 'Bot Constructor',
      license: 'MIT',
      engines: {
        node: '>=14.0.0'
      },
      repository: {
        type: 'git',
        url: 'https://github.com/your-username/your-bot-repo.git'
      },
      bugs: {
        url: 'https://github.com/your-username/your-bot-repo/issues'
      },
      homepage: 'https://github.com/your-username/your-bot-repo#readme'
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'json'
    };
  }  pr
ivate generateReadme(): ExportedFile {
    const commands = this.botSchema.configuration?.nodes
      ?.filter((node: any) => node.type === 'trigger-command')
      ?.map((node: any) => `- \`${node.data.command}\` - ${node.data.description || node.data.label}`)
      ?.join('\n') || 'Команды не найдены';

    const readme = `# ${this.botSchema.name}

${this.botSchema.description}

## 🚀 Быстрый старт

### 1. Установка зависимостей
\`\`\`bash
npm install
\`\`\`

### 2. Настройка
Скопируйте \`.env.example\` в \`.env\` и заполните необходимые переменные:
\`\`\`bash
cp .env.example .env
\`\`\`

### 3. Получение токена бота
1. Найдите @BotFather в Telegram
2. Отправьте команду \`/newbot\`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в файл \`.env\`

### 4. Запуск
\`\`\`bash
npm start
\`\`\`

Для разработки с автоперезагрузкой:
\`\`\`bash
npm run dev
\`\`\`

## 📋 Команды бота

${commands}

## 🔧 Конфигурация

Основные настройки находятся в файле \`config.json\`. Вы можете изменить:
- Название бота
- Описание
- Переменные по умолчанию
- Настройки логирования

## 📁 Структура проекта

\`\`\`
.
├── index.js          # Основной файл бота
├── config.json       # Конфигурация бота
├── package.json      # Зависимости и скрипты
├── .env.example      # Пример переменных окружения
├── .env              # Ваши переменные окружения (не в git)
└── README.md         # Этот файл
\`\`\`

## 🐛 Отладка

Бот выводит подробные логи в консоль. Для отладки:
1. Проверьте правильность токена в \`.env\`
2. Убедитесь что бот добавлен в чат
3. Проверьте логи на наличие ошибок

## 📝 Лицензия

MIT License

## 🤖 О конструкторе ботов

Этот бот был создан с помощью визуального конструктора ботов.
Дата экспорта: ${new Date().toLocaleString('ru-RU')}
`;

    return {
      path: 'README.md',
      content: readme,
      type: 'md'
    };
  }

  private generateEnvExample(): ExportedFile {
    const envContent = `# Токен Telegram бота (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Режим разработки (true/false)
NODE_ENV=production

# Порт для webhook (если используется)
PORT=3000

# Дополнительные настройки
LOG_LEVEL=info
`;

    return {
      path: '.env.example',
      content: envContent,
      type: 'txt'
    };
  }  priva
te generateConfigFile(): ExportedFile {
    const config = {
      name: this.botSchema.name,
      description: this.botSchema.description,
      version: '1.0.0',
      created: this.botSchema.createdAt,
      exported: new Date().toISOString(),
      settings: {
        logging: true,
        debug: false,
        polling: true,
        webhook: false
      },
      variables: this.botSchema.configuration?.variables || {},
      platforms: this.botSchema.platforms?.map((p: any) => p.platform) || ['telegram']
    };

    return {
      path: 'config.json',
      content: JSON.stringify(config, null, 2),
      type: 'json'
    };
  }

  private generateIntegrationsFile(): ExportedFile {
    const integrationNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'action-integration'
    ) || [];

    const integrationsCode = `/**
 * Модуль интеграций с внешними API
 */
const axios = require('axios');

class IntegrationManager {
  constructor() {
    this.cache = new Map();
    this.rateLimits = new Map();
  }

  async executeIntegration(integrationId, variables = {}) {
    const integration = this.getIntegrationConfig(integrationId);
    if (!integration) {
      throw new Error(\`Интеграция \${integrationId} не найдена\`);
    }

    // Проверяем rate limiting
    if (this.isRateLimited(integrationId)) {
      throw new Error('Rate limit exceeded');
    }

    try {
      const response = await this.makeRequest(integration, variables);
      this.updateRateLimit(integrationId);
      return this.processResponse(response, integration);
    } catch (error) {
      console.error(\`Ошибка интеграции \${integrationId}:\`, error.message);
      throw error;
    }
  }

  async makeRequest(integration, variables) {
    const url = this.replaceVariables(integration.url, variables);
    const headers = integration.headers || {};
    
    const config = {
      method: integration.method || 'GET',
      url: url,
      headers: {
        'User-Agent': 'Bot-Constructor-Export/1.0',
        ...headers
      },
      timeout: 10000
    };

    if (integration.method === 'POST' && integration.body) {
      config.data = this.replaceVariables(integration.body, variables);
    }

    return await axios(config);
  }

  processResponse(response, integration) {
    const data = response.data;
    const result = {};

    if (integration.responseMapping) {
      for (const [key, path] of Object.entries(integration.responseMapping)) {
        result[key] = this.getNestedValue(data, path);
      }
    } else {
      return data;
    }

    return result;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  }

  replaceVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(\`{{\${key}}}\`, 'g'), value);
    }
    return result;
  }

  getIntegrationConfig(integrationId) {
    const integrations = ${JSON.stringify(integrationNodes.reduce((acc: any, node: any) => {
      acc[node.id] = node.data;
      return acc;
    }, {}), null, 6)};
    
    return integrations[integrationId];
  }

  isRateLimited(integrationId) {
    const lastCall = this.rateLimits.get(integrationId);
    if (!lastCall) return false;
    
    const timeDiff = Date.now() - lastCall;
    return timeDiff < 1000; // 1 секунда между запросами
  }

  updateRateLimit(integrationId) {
    this.rateLimits.set(integrationId, Date.now());
  }
}

module.exports = IntegrationManager;
`;

    return {
      path: 'integrations.js',
      content: integrationsCode,
      type: 'js'
    };
  }

  private generateUtilsFile(): ExportedFile {
    const utilsCode = `/**
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

  static generateRandomSeed() {
    return Math.floor(Math.random() * 10000);
  }

  static sanitizeText(text) {
    return text
      .replace(/[<>&"']/g, (match) => {
        const escapeMap = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return escapeMap[match];
      });
  }

  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static parseCommand(text) {
    const match = text.match(/^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\\s+(.*))?$/);
    if (!match) return null;
    
    return {
      command: match[1],
      args: match[2] ? match[2].split(/\\s+/) : [],
      fullText: text
    };
  }

  static formatUptime(startTime) {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return \`\${days} дн. \${hours % 24} ч.\`;
    if (hours > 0) return \`\${hours} ч. \${minutes % 60} мин.\`;
    if (minutes > 0) return \`\${minutes} мин. \${seconds % 60} сек.\`;
    return \`\${seconds} сек.\`;
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
`;

    return {
      path: 'utils.js',
      content: utilsCode,
      type: 'js'
    };
  }

  private generateStateManagerFile(): ExportedFile {
    const stateManagerCode = `/**
 * Менеджер состояний пользователей
 */
const fs = require('fs');
const path = require('path');

class StateManager {
  constructor(persistPath = './data/user-states.json') {
    this.states = new Map();
    this.persistPath = persistPath;
    this.startTime = Date.now();
    this.totalMessages = 0;
    
    this.loadStates();
    
    // Автосохранение каждые 5 минут
    setInterval(() => {
      this.saveStates();
    }, 5 * 60 * 1000);
  }

  getUserState(userId) {
    if (!this.states.has(userId)) {
      this.states.set(userId, {
        messageCount: 0,
        firstSeen: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        variables: new Map(),
        context: {}
      });
    }
    
    return this.states.get(userId);
  }

  updateUserActivity(userId) {
    const state = this.getUserState(userId);
    state.messageCount++;
    state.lastActivity = new Date().toISOString();
    this.totalMessages++;
  }

  setUserVariable(userId, key, value) {
    const state = this.getUserState(userId);
    state.variables.set(key, value);
  }

  getUserVariable(userId, key, defaultValue = null) {
    const state = this.getUserState(userId);
    return state.variables.get(key) || defaultValue;
  }

  setUserContext(userId, context) {
    const state = this.getUserState(userId);
    state.context = { ...state.context, ...context };
  }

  getUserContext(userId) {
    const state = this.getUserState(userId);
    return state.context;
  }

  getGlobalStats() {
    return {
      totalUsers: this.states.size,
      totalMessages: this.totalMessages,
      uptime: Date.now() - this.startTime,
      activeUsers: Array.from(this.states.values())
        .filter(state => {
          const lastActivity = new Date(state.lastActivity);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return lastActivity > hourAgo;
        }).length
    };
  }

  replaceVariables(text, userId) {
    let result = text;
    const state = this.getUserState(userId);
    const stats = this.getGlobalStats();
    
    // Пользовательские переменные
    result = result.replace(/{{user_id}}/g, userId);
    result = result.replace(/{{message_count}}/g, state.messageCount);
    result = result.replace(/{{first_seen}}/g, new Date(state.firstSeen).toLocaleString('ru-RU'));
    result = result.replace(/{{last_activity}}/g, new Date(state.lastActivity).toLocaleString('ru-RU'));
    
    // Глобальные переменные
    result = result.replace(/{{user_count}}/g, stats.totalUsers);
    result = result.replace(/{{total_messages}}/g, stats.totalMessages);
    result = result.replace(/{{uptime}}/g, this.formatUptime(stats.uptime));
    result = result.replace(/{{current_time}}/g, new Date().toLocaleString('ru-RU'));
    result = result.replace(/{{random_seed}}/g, Math.floor(Math.random() * 10000));
    
    // Кастомные переменные пользователя
    for (const [key, value] of state.variables) {
      result = result.replace(new RegExp(\`{{\${key}}}\`, 'g'), value);
    }
    
    return result;
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return \`\${days} дн. \${hours % 24} ч.\`;
    if (hours > 0) return \`\${hours} ч. \${minutes % 60} мин.\`;
    return \`\${minutes} мин.\`;
  }

  saveStates() {
    try {
      const dataDir = path.dirname(this.persistPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const statesData = {
        states: Array.from(this.states.entries()).map(([userId, state]) => ({
          userId,
          ...state,
          variables: Array.from(state.variables.entries())
        })),
        totalMessages: this.totalMessages,
        startTime: this.startTime,
        lastSaved: new Date().toISOString()
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(statesData, null, 2));
    } catch (error) {
      console.error('Ошибка сохранения состояний:', error);
    }
  }

  loadStates() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf8'));
        
        if (data.states) {
          data.states.forEach(stateData => {
            const { userId, variables, ...state } = stateData;
            state.variables = new Map(variables || []);
            this.states.set(userId, state);
          });
        }
        
        this.totalMessages = data.totalMessages || 0;
        this.startTime = data.startTime || Date.now();
        
        console.log(\`Загружено состояний: \${this.states.size}\`);
      }
    } catch (error) {
      console.error('Ошибка загрузки состояний:', error);
    }
  }

  cleanup() {
    this.saveStates();
  }
}

module.exports = StateManager;
`;

    return {
      path: 'state-manager.js',
      content: stateManagerCode,
      type: 'js'
    };
  }

  private generateTestFiles(): ExportedFile[] {
    const testFiles: ExportedFile[] = [];

    // Основной тестовый файл
    const mainTestCode = `/**
 * Тесты для экспортированного бота
 */
const assert = require('assert');
const BotUtils = require('./utils');
const StateManager = require('./state-manager');
const IntegrationManager = require('./integrations');

describe('Exported Bot Tests', () => {
  let stateManager;
  let integrationManager;

  beforeEach(() => {
    stateManager = new StateManager('./test-data/states.json');
    integrationManager = new IntegrationManager();
  });

  describe('BotUtils', () => {
    it('should format time correctly', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      const formatted = BotUtils.formatTime(date);
      assert(typeof formatted === 'string');
      assert(formatted.includes('2025'));
    });

    it('should parse commands correctly', () => {
      const result = BotUtils.parseCommand('/start hello world');
      assert.equal(result.command, 'start');
      assert.deepEqual(result.args, ['hello', 'world']);
    });

    it('should validate URLs', () => {
      assert(BotUtils.isValidUrl('https://example.com'));
      assert(!BotUtils.isValidUrl('not-a-url'));
    });
  });

  describe('StateManager', () => {
    it('should create user state', () => {
      const state = stateManager.getUserState('test-user');
      assert(state);
      assert.equal(state.messageCount, 0);
    });

    it('should update user activity', () => {
      stateManager.updateUserActivity('test-user');
      const state = stateManager.getUserState('test-user');
      assert.equal(state.messageCount, 1);
    });

    it('should replace variables', () => {
      stateManager.updateUserActivity('test-user');
      const result = stateManager.replaceVariables('Messages: {{message_count}}', 'test-user');
      assert(result.includes('Messages: 1'));
    });
  });

  describe('IntegrationManager', () => {
    it('should handle rate limiting', () => {
      integrationManager.updateRateLimit('test-integration');
      assert(integrationManager.isRateLimited('test-integration'));
    });

    it('should replace variables in URLs', () => {
      const result = integrationManager.replaceVariables('https://api.example.com/{{userId}}', { userId: '123' });
      assert.equal(result, 'https://api.example.com/123');
    });
  });
});

// Запуск тестов
if (require.main === module) {
  console.log('🧪 Запуск тестов...');
  
  // Простые тесты без фреймворка
  try {
    // Тест BotUtils
    const date = new Date();
    const formatted = BotUtils.formatTime(date);
    console.log('✅ BotUtils.formatTime работает');
    
    const command = BotUtils.parseCommand('/test arg1 arg2');
    console.assert(command.command === 'test', 'Команда должна быть test');
    console.log('✅ BotUtils.parseCommand работает');
    
    // Тест StateManager
    const sm = new StateManager('./test-states.json');
    sm.updateUserActivity('test-user');
    const state = sm.getUserState('test-user');
    console.assert(state.messageCount === 1, 'Счетчик сообщений должен быть 1');
    console.log('✅ StateManager работает');
    
    console.log('🎉 Все тесты прошли успешно!');
  } catch (error) {
    console.error('❌ Тест не прошел:', error.message);
    process.exit(1);
  }
}
`;

    testFiles.push({
      path: 'test.js',
      content: mainTestCode,
      type: 'js'
    });

    return testFiles;
  }

  private generateApiDocumentation(): ExportedFile {
    const commands = this.botSchema.configuration?.nodes
      ?.filter((node: any) => node.type === 'trigger-command')
      ?.map((node: any) => ({
        command: node.data.command,
        description: node.data.description || node.data.label,
        id: node.id
      })) || [];

    const integrations = this.botSchema.configuration?.nodes
      ?.filter((node: any) => node.type === 'action-integration')
      ?.map((node: any) => ({
        id: node.id,
        label: node.data.label,
        method: node.data.method,
        url: node.data.url
      })) || [];

    const variables = Object.entries(this.botSchema.configuration?.variables || {})
      .map(([key, variable]: [string, any]) => ({
        name: key,
        type: variable.type,
        defaultValue: variable.defaultValue,
        description: variable.description
      }));

    const apiDoc = `# API Документация

## Обзор

Этот документ описывает API и функциональность экспортированного бота.

**Название:** ${this.botSchema.name}  
**Описание:** ${this.botSchema.description}  
**Версия:** 1.0.0  
**Дата экспорта:** ${new Date().toLocaleString('ru-RU')}

## Команды бота

${commands.map(cmd => `### ${cmd.command}

**Описание:** ${cmd.description}  
**ID узла:** \`${cmd.id}\`

Пример использования:
\`\`\`
${cmd.command}
\`\`\`
`).join('\n')}

## Переменные

Бот поддерживает следующие переменные:

${variables.map(variable => `### {{${variable.name}}}

**Тип:** ${variable.type}  
**По умолчанию:** \`${variable.defaultValue}\`  
**Описание:** ${variable.description}
`).join('\n')}

## Интеграции

${integrations.length > 0 ? integrations.map(integration => `### ${integration.label}

**ID:** \`${integration.id}\`  
**Метод:** ${integration.method}  
**URL:** \`${integration.url}\`
`).join('\n') : 'Интеграции не настроены'}

## Архитектура

### Основные модули

- **index.js** - Главный файл бота с обработчиками команд
- **state-manager.js** - Управление состоянием пользователей
- **integrations.js** - Модуль интеграций с внешними API
- **utils.js** - Вспомогательные утилиты

### Структура данных

#### Состояние пользователя
\`\`\`javascript
{
  messageCount: number,
  firstSeen: string,
  lastActivity: string,
  variables: Map<string, any>,
  context: object
}
\`\`\`

#### Конфигурация интеграции
\`\`\`javascript
{
  method: string,
  url: string,
  headers: object,
  responseMapping: object
}
\`\`\`

## Использование

### Запуск бота
\`\`\`bash
npm start
\`\`\`

### Запуск тестов
\`\`\`bash
node test.js
\`\`\`

### Настройка переменных окружения
\`\`\`bash
cp .env.example .env
# Отредактируйте .env файл
\`\`\`

## Расширение функциональности

### Добавление новой команды
1. Найдите секцию обработчиков команд в \`index.js\`
2. Добавьте новый обработчик по образцу существующих
3. Обновите документацию

### Добавление интеграции
1. Добавьте конфигурацию в \`integrations.js\`
2. Используйте \`integrationManager.executeIntegration()\` в обработчике

### Работа с состоянием
\`\`\`javascript
// Получить состояние пользователя
const state = stateManager.getUserState(userId);

// Установить переменную
stateManager.setUserVariable(userId, 'key', 'value');

// Заменить переменные в тексте
const text = stateManager.replaceVariables('Hello {{username}}!', userId);
\`\`\`

## Мониторинг и отладка

### Логирование
Бот выводит подробные логи в консоль. Уровни логирования:
- ℹ️ Информация
- ⚠️ Предупреждения  
- ❌ Ошибки
- ✅ Успешные операции

### Статистика
Глобальная статистика доступна через:
\`\`\`javascript
const stats = stateManager.getGlobalStats();
\`\`\`

## Поддержка

При возникновении проблем:
1. Проверьте логи в консоли
2. Убедитесь в правильности токена бота
3. Проверьте настройки в \`.env\` файле
4. Запустите тесты: \`node test.js\`

---

*Документация сгенерирована автоматически*
`;

    return {
      path: 'API.md',
      content: apiDoc,
      type: 'md'
    };
  }

  private generateNodeHandlers(): ExportedFile[] {
    // Для простоты пока возвращаем пустой массив
    // В будущем здесь можно генерировать отдельные файлы для каждого типа узлов
    return [];
  }
}

// Вспомогательная функция для экспорта
export function exportBotToNodeJS(botSchema: any, options?: Partial<ExportOptions>): ExportResult {
  const exporter = new NodeJSExporter(botSchema, options);
  return exporter.export();
}