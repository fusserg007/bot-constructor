/**
 * Простой тестовый бот
 * Базовый бот для тестирования с командой /start
 * 
 * Сгенерировано автоматически из конструктора ботов
 * Дата: 26.07.2025, 20:00:10
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.json');

// Создаем бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Состояние пользователей
const userStates = new Map();

// Переменные бота
const botVariables = {
  "uptime": {
    "type": "string",
    "defaultValue": "0 минут"
  },
  "message_count": {
    "type": "number",
    "defaultValue": 0
  },
  "user_count": {
    "type": "number",
    "defaultValue": 0
  },
  "last_update": {
    "type": "string",
    "defaultValue": "26.07.2025, 19:16:45"
  }
};

// Обработчики команд

bot.onText(/\/start/,  async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(`📨 Команда /start от пользователя ${userId}`);
  
  try {
    // Отправляем сообщение: Приветственное сообщение
    updateUserState(userId);
    const message = replaceVariables(`👋 Привет! Я простой тестовый бот.

✅ Команда /start работает корректно!

📝 Доступные команды:
/start - показать это сообщение
/help - получить справку
/status - проверить статус бота`, userId);
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML' 
    });
    console.log('✅ Отправлено сообщение');
  } catch (error) {
    console.error('Ошибка обработки команды /start:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});

bot.onText(/\/help/,  async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(`📨 Команда /help от пользователя ${userId}`);
  
  try {
    // Отправляем сообщение: Справочное сообщение
    updateUserState(userId);
    const message = replaceVariables(`📖 <b>Справка по боту</b>

Это простой тестовый бот для проверки базовой функциональности.

<b>Команды:</b>
/start - приветствие
/help - эта справка
/status - статус системы

<b>Возможности:</b>
✅ Обработка команд
✅ Отправка сообщений
✅ HTML форматирование

<i>Бот создан в конструкторе ботов</i>`, userId);
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML' 
    });
    console.log('✅ Отправлено сообщение');
  } catch (error) {
    console.error('Ошибка обработки команды /help:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});

bot.onText(/\/status/,  async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(`📨 Команда /status от пользователя ${userId}`);
  
  try {
    // Отправляем сообщение: Статусное сообщение
    updateUserState(userId);
    const message = replaceVariables(`📊 <b>Статус бота</b>

🟢 Статус: Активен
⏰ Время работы: {{uptime}}
💬 Обработано сообщений: {{message_count}}
👥 Активных пользователей: {{user_count}}

🔧 Версия: 1.0.0
📅 Последнее обновление: {{last_update}}`, userId);
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'HTML' 
    });
    console.log('✅ Отправлено сообщение');
  } catch (error) {
    console.error('Ошибка обработки команды /status:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке команды.');
  }
});

// Вспомогательные функции
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
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), variable.defaultValue);
  }
  
  // Заменяем пользовательские переменные
  const userState = userStates.get(userId);
  if (userState) {
    result = result.replace(/{{message_count}}/g, userState.messageCount);
    result = result.replace(/{{user_count}}/g, userStates.size);
  }
  
  return result;
}

// Запуск бота
console.log('🤖 Бот запущен!');
console.log('Название:', config.name);
console.log('Описание:', config.description);

bot.on('polling_error', (error) => {
  console.error('Ошибка polling:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});
