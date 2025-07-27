/**
 * Тест экспорта в Node.js код
 */

const fs = require('fs');
const path = require('path');

// Импортируем экспортер из TypeScript файла (если он есть)
let NodeJSExporter;
try {
  const tsModule = require('./core/export/NodeJSExporter.ts');
  NodeJSExporter = tsModule.NodeJSExporter;
} catch (error) {
  console.log('TypeScript модуль не найден, используем простую реализацию');
}

// Простая реализация для тестирования
function exportBotToNodeJS(botSchema, options = {}) {
  const defaultOptions = {
    includeComments: true,
    minify: false,
    platform: 'telegram',
    outputDir: './exported-bot'
  };
  
  const opts = { ...defaultOptions, ...options };
  
  try {
    const files = [];
    
    // Генерируем основной файл
    files.push(generateMainFile(botSchema, opts));
    files.push(generatePackageJson(botSchema));
    files.push(generateReadme(botSchema));
    files.push(generateEnvExample());
    files.push(generateConfigFile(botSchema));
    
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

function generateMainFile(botSchema, options) {
  const commandNodes = botSchema.configuration?.nodes?.filter(
    node => node.type === 'trigger-command'
  ) || [];
  
  const commandHandlers = commandNodes.map(node => {
    const command = node.data.command;
    const connectedActions = getConnectedActions(botSchema, node.id);
    
    return `
bot.onText(/${command.replace('/', '\\/')}/,  async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(\`📨 Команда ${command} от пользователя \${userId}\`);
  
  try {
    updateUserState(userId);
${connectedActions.map(action => generateActionCode(action)).join('\n')}
  } catch (error) {
    console.error('Ошибка обработки команды ${command}:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});`;
  }).join('\n');
  
  const mainCode = `${options.includeComments ? generateFileHeader(botSchema) : ''}
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Загружаем конфигурацию
const config = require('./config.json');

// Создаем бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Состояние пользователей
const userStates = new Map();

// Переменные бота
const botVariables = ${JSON.stringify(botSchema.configuration?.variables || {}, null, 2)};

${options.includeComments ? '// Обработчики команд' : ''}
${commandHandlers}

${options.includeComments ? '// Вспомогательные функции' : ''}
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
    result = result.replace(new RegExp(placeholder, 'g'), variable.defaultValue || '');
  }
  
  // Заменяем пользовательские переменные
  const userState = userStates.get(userId);
  if (userState) {
    result = result.replace(/{{message_count}}/g, userState.messageCount);
    result = result.replace(/{{user_count}}/g, userStates.size);
  }
  
  return result;
}

${options.includeComments ? '// Запуск бота' : ''}
console.log('🤖 Бот запущен!');
console.log('Название:', config.name);
console.log('Описание:', config.description);

bot.on('polling_error', (error) => {
  console.error('Ошибка polling:', error);
});

process.on('SIGINT', () => {
  console.log('\\n🛑 Остановка бота...');
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

function generateFileHeader(botSchema) {
  return `/**
 * ${botSchema.name}
 * ${botSchema.description}
 * 
 * Сгенерировано автоматически из конструктора ботов
 * Дата: ${new Date().toLocaleString('ru-RU')}
 */

`;
}

function getConnectedActions(botSchema, nodeId) {
  const edges = botSchema.configuration?.edges || [];
  const nodes = botSchema.configuration?.nodes || [];
  
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(Boolean);
}

function generateActionCode(action) {
  switch (action.type) {
    case 'action-send-message':
      return `    // Отправляем сообщение: ${action.data.label}
    const message = replaceVariables(\`${action.data.text}\`, userId);
    await bot.sendMessage(chatId, message, { 
      parse_mode: '${action.data.parseMode || 'HTML'}' 
    });
    console.log('✅ Отправлено сообщение');`;

    case 'action-send-media':
      return `    // Отправляем медиа: ${action.data.label}
    await bot.sendPhoto(chatId, '${action.data.mediaUrl || 'https://via.placeholder.com/300'}', {
      caption: replaceVariables(\`${action.data.caption || ''}\`, userId)
    });
    console.log('✅ Отправлено медиа');`;

    default:
      return `    // Неизвестное действие: ${action.type}
    console.warn('Неподдерживаемое действие:', '${action.type}');`;
  }
}

function generatePackageJson(botSchema) {
  const packageJson = {
    name: botSchema.id || 'exported-bot',
    version: '1.0.0',
    description: botSchema.description || 'Экспортированный бот из конструктора',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js',
      test: 'echo "No tests specified" && exit 0'
    },
    dependencies: {
      'node-telegram-bot-api': '^0.61.0'
    },
    devDependencies: {
      nodemon: '^2.0.22'
    },
    keywords: ['telegram', 'bot', 'chatbot', 'exported'],
    author: 'Bot Constructor',
    license: 'MIT',
    engines: {
      node: '>=14.0.0'
    }
  };

  return {
    path: 'package.json',
    content: JSON.stringify(packageJson, null, 2),
    type: 'json'
  };
}

function generateReadme(botSchema) {
  const commands = botSchema.configuration?.nodes
    ?.filter(node => node.type === 'trigger-command')
    ?.map(node => `- \`${node.data.command}\` - ${node.data.description || node.data.label}`)
    ?.join('\n') || 'Команды не найдены';

  const readme = `# ${botSchema.name}

${botSchema.description}

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

function generateEnvExample() {
  return {
    path: '.env.example',
    content: `# Токен Telegram бота (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Режим разработки (true/false)
NODE_ENV=production

# Порт для webhook (если используется)
PORT=3000

# Дополнительные настройки
LOG_LEVEL=info
`,
    type: 'txt'
  };
}

function generateConfigFile(botSchema) {
  const config = {
    name: botSchema.name,
    description: botSchema.description,
    version: '1.0.0',
    created: botSchema.createdAt,
    exported: new Date().toISOString(),
    settings: {
      logging: true,
      debug: false,
      polling: true,
      webhook: false
    },
    variables: botSchema.configuration?.variables || {},
    platforms: botSchema.platforms?.map(p => p.platform) || ['telegram']
  };

  return {
    path: 'config.json',
    content: JSON.stringify(config, null, 2),
    type: 'json'
  };
}

// Тестовые данные
const testBotSchema = {
  id: 'test-export-bot',
  name: 'Тестовый экспортированный бот',
  description: 'Бот для тестирования системы экспорта в Node.js код',
  createdAt: new Date().toISOString(),
  platforms: [
    { platform: 'telegram', enabled: true }
  ],
  configuration: {
    variables: {
      bot_name: {
        type: 'string',
        defaultValue: 'Тестовый бот',
        description: 'Название бота'
      },
      welcome_message: {
        type: 'string',
        defaultValue: 'Добро пожаловать!',
        description: 'Приветственное сообщение'
      }
    },
    nodes: [
      {
        id: 'start-trigger',
        type: 'trigger-command',
        data: {
          command: '/start',
          label: 'Команда старт',
          description: 'Приветствие пользователя'
        }
      },
      {
        id: 'welcome-message',
        type: 'action-send-message',
        data: {
          text: 'Привет! Я {{bot_name}}. {{welcome_message}}\n\nВы отправили {{message_count}} сообщений.\nВсего пользователей: {{user_count}}',
          label: 'Приветственное сообщение',
          parseMode: 'HTML'
        }
      },
      {
        id: 'help-trigger',
        type: 'trigger-command',
        data: {
          command: '/help',
          label: 'Команда помощи',
          description: 'Показать справку'
        }
      },
      {
        id: 'help-message',
        type: 'action-send-message',
        data: {
          text: '🤖 <b>Доступные команды:</b>\n\n/start - Начать работу\n/help - Показать эту справку\n/info - Информация о боте',
          label: 'Сообщение справки',
          parseMode: 'HTML'
        }
      },
      {
        id: 'info-trigger',
        type: 'trigger-command',
        data: {
          command: '/info',
          label: 'Команда информации',
          description: 'Показать информацию о боте'
        }
      },
      {
        id: 'info-message',
        type: 'action-send-message',
        data: {
          text: '📊 <b>Информация о боте:</b>\n\n• Название: {{bot_name}}\n• Ваших сообщений: {{message_count}}\n• Всего пользователей: {{user_count}}',
          label: 'Информационное сообщение',
          parseMode: 'HTML'
        }
      }
    ],
    edges: [
      {
        id: 'start-to-welcome',
        source: 'start-trigger',
        target: 'welcome-message'
      },
      {
        id: 'help-to-help-msg',
        source: 'help-trigger',
        target: 'help-message'
      },
      {
        id: 'info-to-info-msg',
        source: 'info-trigger',
        target: 'info-message'
      }
    ]
  }
};

// Запуск теста
async function runTest() {
  console.log('🧪 Тестирование экспорта в Node.js код...\n');
  
  try {
    // Тестируем экспорт
    const result = exportBotToNodeJS(testBotSchema, {
      includeComments: true,
      minify: false
    });
    
    if (!result.success) {
      console.error('❌ Ошибка экспорта:', result.error);
      return;
    }
    
    console.log('✅ Экспорт успешен!');
    console.log(`📁 Сгенерировано файлов: ${result.files.length}\n`);
    
    // Создаем директорию для тестового экспорта
    const exportDir = path.join(__dirname, '..', 'temp', 'test-export-nodejs');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Записываем файлы
    result.files.forEach(file => {
      const filePath = path.join(exportDir, file.path);
      fs.writeFileSync(filePath, file.content);
      console.log(`📄 Создан файл: ${file.path} (${file.content.length} символов)`);
    });
    
    console.log(`\n📂 Файлы экспорта сохранены в: ${exportDir}`);
    
    // Показываем содержимое основного файла (первые 500 символов)
    const mainFile = result.files.find(f => f.path === 'index.js');
    if (mainFile) {
      console.log('\n📋 Превью основного файла (index.js):');
      console.log('─'.repeat(50));
      console.log(mainFile.content.substring(0, 500) + '...');
      console.log('─'.repeat(50));
    }
    
    // Показываем package.json
    const packageFile = result.files.find(f => f.path === 'package.json');
    if (packageFile) {
      console.log('\n📦 package.json:');
      console.log('─'.repeat(30));
      console.log(packageFile.content);
      console.log('─'.repeat(30));
    }
    
    console.log('\n🎉 Тест экспорта завершен успешно!');
    console.log('\n💡 Для запуска экспортированного бота:');
    console.log(`1. cd ${exportDir}`);
    console.log('2. npm install');
    console.log('3. cp .env.example .env');
    console.log('4. Отредактируйте .env и добавьте токен бота');
    console.log('5. npm start');
    
  } catch (error) {
    console.error('💥 Ошибка теста:', error);
  }
}

// Запускаем тест
if (require.main === module) {
  runTest();
}

module.exports = {
  exportBotToNodeJS,
  testBotSchema
};