/**
 * Тестирование экспорта бота в Python код
 */

const fs = require('fs');
const path = require('path');

console.log('🐍 Тестирование экспорта в Python...\n');

// Загружаем тестового бота
const botPath = path.join(__dirname, '..', 'data', 'bots', 'bot_simple-test-bot.json');

if (!fs.existsSync(botPath)) {
  console.error('❌ Тестовый бот не найден. Сначала запустите: node src/test-simple-bot.js');
  process.exit(1);
}

const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));
console.log(`🤖 Экспортируем бота: ${botData.name}`);

// Экспорт в Python
function exportBotToPython(botSchema, options = {}) {
  const defaultOptions = {
    includeComments: true,
    useAsyncio: true,
    framework: 'pyTelegramBotAPI'
  };
  
  const opts = { ...defaultOptions, ...options };
  
  try {
    const files = [];
    
    // Генерируем основные файлы
    files.push(generateMainPythonFile(botSchema, opts));
    files.push(generateRequirementsTxt(botSchema));
    files.push(generatePythonReadme(botSchema));
    files.push(generateEnvFile());
    files.push(generateConfigPy(botSchema));
    files.push(generateRunScript());
    
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

function generateMainPythonFile(botSchema, options) {
  const commandNodes = botSchema.configuration?.nodes?.filter(
    node => node.type === 'trigger-command'
  ) || [];
  
  const commandHandlers = commandNodes.map(node => {
    const command = node.data.command.replace('/', '');
    const connectedActions = getConnectedActions(botSchema, node.id);
    
    return `
@bot.message_handler(commands=['${command}'])
def handle_${command}(message):
    """Обработчик команды /${command}"""
    chat_id = message.chat.id
    user_id = message.from_user.id
    
    logger.info(f"📨 Команда /${command} от пользователя {user_id}")
    
    try:
        # Обновляем состояние пользователя
        update_user_state(user_id)
        
${connectedActions.map(action => generatePythonActionCode(action)).join('\n')}
        
    except Exception as e:
        logger.error(f"Ошибка обработки команды /${command}: {e}")
        bot.send_message(chat_id, "Произошла ошибка при обработке команды.")`;
  }).join('\n');
  
  const mainCode = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${botSchema.name}
${botSchema.description}

Сгенерировано автоматически из конструктора ботов
Дата: ${new Date().toLocaleString('ru-RU')}
"""

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict

import telebot
from telebot import types

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Загружаем конфигурацию
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# Создаем бота
bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
if not bot_token:
    raise ValueError("TELEGRAM_BOT_TOKEN не установлен в переменных окружения")

bot = telebot.TeleBot(bot_token)

# Состояние пользователей
user_states: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
    'message_count': 0,
    'last_activity': datetime.now(),
    'variables': {}
})

# Переменные бота
bot_variables = ${JSON.stringify(botSchema.configuration?.variables || {}, null, 4).replace(/"/g, "'")}

# Время запуска бота
start_time = datetime.now()

${options.includeComments ? '# Обработчики команд' : ''}
${commandHandlers}

${options.includeComments ? '# Вспомогательные функции' : ''}
def update_user_state(user_id: int) -> None:
    """Обновляет состояние пользователя"""
    state = user_states[user_id]
    state['message_count'] += 1
    state['last_activity'] = datetime.now()

def replace_variables(text: str, user_id: int) -> str:
    """Заменяет переменные в тексте"""
    result = text
    
    # Заменяем глобальные переменные
    for key, variable in bot_variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(variable.get('defaultValue', '')))
    
    # Заменяем пользовательские переменные
    state = user_states[user_id]
    result = result.replace('{{message_count}}', str(state['message_count']))
    result = result.replace('{{user_count}}', str(len(user_states)))
    
    # Время работы
    uptime = datetime.now() - start_time
    uptime_str = f"{uptime.days} дней {uptime.seconds // 3600} часов"
    result = result.replace('{{uptime}}', uptime_str)
    
    return result

def get_bot_stats() -> Dict[str, Any]:
    """Возвращает статистику бота"""
    uptime = datetime.now() - start_time
    return {
        'total_users': len(user_states),
        'total_messages': sum(state['message_count'] for state in user_states.values()),
        'uptime_seconds': uptime.total_seconds(),
        'uptime_str': f"{uptime.days} дней {uptime.seconds // 3600} часов"
    }

${options.includeComments ? '# Обработчик ошибок' : ''}
@bot.message_handler(func=lambda message: True)
def handle_unknown_message(message):
    """Обработчик неизвестных сообщений"""
    logger.info(f"💬 Неизвестное сообщение от {message.from_user.id}: {message.text}")
    # Здесь можно добавить обработку текстовых сообщений

${options.includeComments ? '# Запуск бота' : ''}
def main():
    """Основная функция запуска бота"""
    logger.info("🤖 Бот запущен!")
    logger.info(f"Название: {config['name']}")
    logger.info(f"Описание: {config['description']}")
    
    try:
        bot.polling(none_stop=True, interval=0, timeout=20)
    except KeyboardInterrupt:
        logger.info("\\n🛑 Остановка бота...")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
    finally:
        bot.stop_polling()

if __name__ == '__main__':
    main()
`;

  return {
    path: 'main.py',
    content: mainCode,
    type: 'py'
  };
}

function getConnectedActions(botSchema, nodeId) {
  const edges = botSchema.configuration?.edges || [];
  const nodes = botSchema.configuration?.nodes || [];
  
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(Boolean);
}

function generatePythonActionCode(action) {
  switch (action.type) {
    case 'action-send-message':
      return `        # Отправляем сообщение: ${action.data.label}
        message_text = replace_variables("""${action.data.text}""", user_id)
        bot.send_message(
            chat_id, 
            message_text, 
            parse_mode='${action.data.parseMode || 'HTML'}'
        )
        logger.info("✅ Отправлено сообщение")`;

    default:
      return `        # Неизвестное действие: ${action.type}
        logger.warning(f"Неподдерживаемое действие: ${action.type}")`;
  }
}

function generateRequirementsTxt(botSchema) {
  const requirements = `# Зависимости для ${botSchema.name}
# Сгенерировано автоматически ${new Date().toLocaleString('ru-RU')}

pyTelegramBotAPI==4.14.0
python-dotenv==1.0.0
requests==2.31.0

# Дополнительные зависимости для разработки
pytest==7.4.3
black==23.11.0
flake8==6.1.0
`;

  return {
    path: 'requirements.txt',
    content: requirements,
    type: 'txt'
  };
}

function generatePythonReadme(botSchema) {
  const commands = botSchema.configuration?.nodes
    ?.filter(node => node.type === 'trigger-command')
    ?.map(node => `- \`${node.data.command}\` - ${node.data.description || node.data.label}`)
    ?.join('\n') || 'Команды не найдены';

  const readme = `# ${botSchema.name}

${botSchema.description}

## 🚀 Быстрый старт

### 1. Установка Python
Убедитесь что у вас установлен Python 3.8 или выше:
\`\`\`bash
python --version
\`\`\`

### 2. Создание виртуального окружения
\`\`\`bash
python -m venv venv

# Windows
venv\\Scripts\\activate

# Linux/Mac
source venv/bin/activate
\`\`\`

### 3. Установка зависимостей
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 4. Настройка
Скопируйте \`.env.example\` в \`.env\` и заполните токен бота:
\`\`\`bash
cp .env.example .env
\`\`\`

### 5. Запуск
\`\`\`bash
python main.py
\`\`\`

Или используйте скрипт запуска:
\`\`\`bash
# Windows
run.bat

# Linux/Mac
./run.sh
\`\`\`

## 📋 Команды бота

${commands}

## 🔧 Настройка

1. Получите токен бота у @BotFather в Telegram
2. Добавьте токен в файл \`.env\`
3. При необходимости отредактируйте \`config.json\`

## 📁 Структура проекта

\`\`\`
.
├── main.py              # Основной файл бота
├── config.json          # Конфигурация бота
├── requirements.txt     # Python зависимости
├── .env.example         # Пример переменных окружения
├── .env                 # Ваши переменные окружения (не в git)
├── run.py              # Скрипт запуска (Windows)
├── run.sh              # Скрипт запуска (Linux/Mac)
└── README.md           # Этот файл
\`\`\`

## 🐛 Отладка

Логи сохраняются в файл \`bot.log\`. Для отладки:
1. Проверьте правильность токена в \`.env\`
2. Убедитесь что все зависимости установлены
3. Проверьте логи на наличие ошибок

## 🧪 Тестирование

\`\`\`bash
# Установка тестовых зависимостей
pip install pytest

# Запуск тестов
pytest
\`\`\`

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

function generateEnvFile() {
  return {
    path: '.env.example',
    content: `# Токен Telegram бота (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Режим разработки (development/production)
ENVIRONMENT=production

# Уровень логирования (DEBUG/INFO/WARNING/ERROR)
LOG_LEVEL=INFO
`,
    type: 'txt'
  };
}

function generateConfigPy(botSchema) {
  const config = {
    name: botSchema.name,
    description: botSchema.description,
    version: '1.0.0',
    exported: new Date().toISOString(),
    variables: botSchema.configuration?.variables || {},
    settings: {
      polling_interval: 0,
      timeout: 20,
      logging: true
    }
  };

  return {
    path: 'config.json',
    content: JSON.stringify(config, null, 2),
    type: 'json'
  };
}

function generateRunScript() {
  const windowsScript = `@echo off
echo 🤖 Запуск бота...

REM Проверяем наличие виртуального окружения
if not exist "venv" (
    echo Создание виртуального окружения...
    python -m venv venv
)

REM Активируем виртуальное окружение
call venv\\Scripts\\activate

REM Устанавливаем зависимости
echo Установка зависимостей...
pip install -r requirements.txt

REM Запускаем бота
echo Запуск бота...
python main.py

pause
`;

  return {
    path: 'run.bat',
    content: windowsScript,
    type: 'bat'
  };
}

// Выполняем экспорт
console.log('📋 Анализ бота:');
console.log(`   Узлов: ${botData.configuration.nodes.length}`);
console.log(`   Соединений: ${botData.configuration.edges.length}`);
console.log(`   Команд: ${botData.configuration.nodes.filter(n => n.type === 'trigger-command').length}`);
console.log(`   Переменных: ${Object.keys(botData.configuration.variables || {}).length}`);

const exportResult = exportBotToPython(botData);

if (!exportResult.success) {
  console.error('❌ Ошибка экспорта:', exportResult.error);
  process.exit(1);
}

console.log('\n✅ Экспорт в Python успешен!');
console.log(`   Сгенерировано файлов: ${exportResult.files.length}`);

// Создаем директорию для экспорта
const exportDir = path.join(__dirname, '..', 'exported-bots', `${botData.id}-python`);
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// Записываем файлы
exportResult.files.forEach(file => {
  const filePath = path.join(exportDir, file.path);
  fs.writeFileSync(filePath, file.content);
  console.log(`   📄 ${file.path} (${file.content.length} символов)`);
});

console.log(`\n📁 Файлы сохранены в: ${exportDir}`);

// Анализируем сгенерированный код
console.log('\n🔍 Анализ сгенерированного Python кода:');

const mainFile = exportResult.files.find(f => f.path === 'main.py');
if (mainFile) {
  const lines = mainFile.content.split('\n').length;
  const functions = (mainFile.content.match(/def \w+/g) || []).length;
  const handlers = (mainFile.content.match(/@bot\.message_handler/g) || []).length;
  const imports = (mainFile.content.match(/^import |^from /gm) || []).length;
  
  console.log(`   Строк кода: ${lines}`);
  console.log(`   Функций: ${functions}`);
  console.log(`   Обработчиков: ${handlers}`);
  console.log(`   Импортов: ${imports}`);
}

const reqFile = exportResult.files.find(f => f.path === 'requirements.txt');
if (reqFile) {
  const packages = reqFile.content.split('\n').filter(line => 
    line.trim() && !line.startsWith('#')
  ).length;
  
  console.log(`   Python пакетов: ${packages}`);
}

// Проверяем валидность Python кода
console.log('\n🧪 Проверка валидности:');

// Простая проверка синтаксиса Python (базовая)
const pythonSyntaxCheck = (code) => {
  // Проверяем базовые элементы Python синтаксиса
  const issues = [];
  
  if (!code.includes('def ')) issues.push('Нет функций');
  if (!code.includes('import ')) issues.push('Нет импортов');
  if (code.includes('\t') && code.includes('    ')) issues.push('Смешанные отступы');
  
  return issues;
};

const syntaxIssues = pythonSyntaxCheck(mainFile.content);
if (syntaxIssues.length === 0) {
  console.log('   ✅ Базовая структура Python корректна');
} else {
  console.log('   ⚠️ Потенциальные проблемы:', syntaxIssues.join(', '));
}

// Проверяем JSON файлы
try {
  exportResult.files
    .filter(f => f.type === 'json')
    .forEach(f => {
      JSON.parse(f.content);
      console.log(`   ✅ ${f.path} - валидный JSON`);
    });
} catch (error) {
  console.log('   ❌ Ошибка JSON:', error.message);
}

// Создаем инструкции по запуску
const instructions = `
📋 Инструкции по запуску экспортированного Python бота:

1. Перейдите в директорию:
   cd ${exportDir}

2. Создайте виртуальное окружение:
   python -m venv venv

3. Активируйте виртуальное окружение:
   # Windows:
   venv\\Scripts\\activate
   # Linux/Mac:
   source venv/bin/activate

4. Установите зависимости:
   pip install -r requirements.txt

5. Настройте токен бота:
   cp .env.example .env
   # Отредактируйте .env и добавьте ваш TELEGRAM_BOT_TOKEN

6. Запустите бота:
   python main.py

   # Или используйте скрипт:
   run.bat  (Windows)

🔧 Дополнительная настройка:
- Отредактируйте config.json для изменения настроек
- Модифицируйте main.py для добавления новой функциональности
- Проверьте README.md для подробных инструкций
- Логи сохраняются в файл bot.log
`;

console.log(instructions);

// Сохраняем инструкции
fs.writeFileSync(path.join(exportDir, 'INSTRUCTIONS.txt'), instructions);

console.log('\n🎉 Экспорт в Python завершен успешно!');

// Экспортируем для использования в других тестах
module.exports = {
  exportBotToPython,
  generateMainPythonFile,
  generateRequirementsTxt,
  generatePythonReadme
};