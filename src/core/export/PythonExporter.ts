/**
 * Экспорт схемы бота в Python код
 */

export interface PythonExportOptions {
  includeComments: boolean;
  minify: boolean;
  platform: string;
  outputDir: string;
  multiplatform?: boolean;
  includeIntegrations?: boolean;
  includeAdvancedFeatures?: boolean;
  generateTests?: boolean;
  generateDocumentation?: boolean;
  pythonVersion?: '3.8' | '3.9' | '3.10' | '3.11';
  useAsyncio?: boolean;
  includeTypeHints?: boolean;
}

export interface PythonExportResult {
  success: boolean;
  files: PythonExportedFile[];
  error?: string;
}

export interface PythonExportedFile {
  path: string;
  content: string;
  type: 'py' | 'txt' | 'md' | 'json' | 'yml';
}

export class PythonExporter {
  private botSchema: any;
  private options: PythonExportOptions;

  constructor(botSchema: any, options: Partial<PythonExportOptions> = {}) {
    this.botSchema = botSchema;
    this.options = {
      includeComments: true,
      minify: false,
      platform: 'telegram',
      outputDir: './exported-bot-python',
      multiplatform: false,
      includeIntegrations: true,
      includeAdvancedFeatures: true,
      generateTests: false,
      generateDocumentation: true,
      pythonVersion: '3.9',
      useAsyncio: true,
      includeTypeHints: true,
      ...options
    };
  }

  /**
   * Экспортирует бота в Python проект
   */
  export(): PythonExportResult {
    try {
      const files: PythonExportedFile[] = [];

      // Генерируем основные файлы
      files.push(this.generateMainFile());
      files.push(this.generateRequirementsFile());
      files.push(this.generateReadme());
      files.push(this.generateEnvExample());
      files.push(this.generateConfigFile());

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
 private generateMainFile(): PythonExportedFile {
    const imports = this.generateImports();
    const classDefinition = this.generateBotClass();
    const mainCode = this.generateMainCode();

    const content = `${this.options.includeComments ? this.generateFileHeader() : ''}
${imports}

${classDefinition}

${mainCode}
`;

    return {
      path: 'main.py',
      content,
      type: 'py'
    };
  }

  private generateFileHeader(): string {
    return `"""
${this.botSchema.name}
${this.botSchema.description}

Сгенерировано автоматически из конструктора ботов
Дата: ${new Date().toLocaleString('ru-RU')}
Python версия: ${this.options.pythonVersion}
"""

`;
  }

  private generateImports(): string {
    const baseImports = [
      'import os',
      'import json',
      'import logging',
      'from datetime import datetime',
      'from typing import Dict, List, Optional, Any',
      'from dataclasses import dataclass',
      'import telebot',
      'from telebot import types'
    ];

    if (this.options.useAsyncio) {
      baseImports.push('import asyncio');
    }

    if (this.options.includeIntegrations) {
      baseImports.push('import requests');
    }

    if (this.options.includeAdvancedFeatures) {
      baseImports.push('import sqlite3');
      baseImports.push('from pathlib import Path');
    }

    return baseImports.join('\n');
  }

  private generateBotClass(): string {
    const typeHints = this.options.includeTypeHints;
    const asyncKeyword = this.options.useAsyncio ? 'async ' : '';
    
    return `
@dataclass
class UserState:
    """Состояние пользователя"""
    user_id: int
    message_count: int = 0
    last_activity: datetime = None
    variables: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.last_activity is None:
            self.last_activity = datetime.now()
        if self.variables is None:
            self.variables = {}

class BotConstructor:
    """Основной класс бота"""
    
    def __init__(self, token${typeHints ? ': str' : ''}):
        self.bot = telebot.TeleBot(token)
        self.user_states${typeHints ? ': Dict[int, UserState]' : ''} = {}
        self.bot_variables = ${JSON.stringify(this.botSchema.configuration?.variables || {}, null, 8)}
        
        ${this.options.includeAdvancedFeatures ? 'self.setup_database()' : ''}
        self.setup_handlers()
        
        # Настройка логирования
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    ${this.options.includeAdvancedFeatures ? `def setup_database(self):
        """Настройка базы данных для хранения состояний"""
        self.db_path = Path('data/bot.db')
        self.db_path.parent.mkdir(exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_states (
                user_id INTEGER PRIMARY KEY,
                message_count INTEGER DEFAULT 0,
                last_activity TEXT,
                variables TEXT
            )
        ''')
        conn.commit()
        conn.close()` : ''}

    def setup_handlers(self):
        """Настройка обработчиков сообщений"""
        ${this.generateHandlerSetup()}

    ${this.generateCommandHandlers()}

    ${this.generateMessageHandlers()}

    ${this.generateCallbackHandlers()}

    ${this.generateHelperMethods()}

    def start_polling(self):
        """Запуск бота в режиме polling"""
        self.logger.info("🤖 Бот запущен!")
        self.logger.info(f"Название: {self.get_config_value('name', 'Неизвестно')}")
        self.logger.info(f"Описание: {self.get_config_value('description', 'Нет описания')}")
        
        try:
            self.bot.polling(none_stop=True)
        except KeyboardInterrupt:
            self.logger.info("🛑 Остановка бота...")
            ${this.options.includeAdvancedFeatures ? 'self.cleanup()' : ''}
        except Exception as e:
            self.logger.error(f"Ошибка polling: {e}")

    ${this.options.includeAdvancedFeatures ? `def cleanup(self):
        """Очистка ресурсов при остановке"""
        # Сохраняем состояния пользователей в базу данных
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for user_id, state in self.user_states.items():
            cursor.execute('''
                INSERT OR REPLACE INTO user_states 
                (user_id, message_count, last_activity, variables)
                VALUES (?, ?, ?, ?)
            ''', (
                user_id,
                state.message_count,
                state.last_activity.isoformat(),
                json.dumps(state.variables)
            ))
        
        conn.commit()
        conn.close()
        self.logger.info("✅ Состояния пользователей сохранены")` : ''}

    def get_config_value(self, key${typeHints ? ': str' : ''}, default${typeHints ? ': Any = None' : ''})${typeHints ? ' -> Any' : ''}:
        """Получение значения из конфигурации"""
        config = {
            'name': '${this.botSchema.name}',
            'description': '${this.botSchema.description}',
            'version': '1.0.0'
        }
        return config.get(key, default)
`;
  }  private
 generateHandlerSetup(): string {
    const commandNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'trigger-command'
    ) || [];

    const handlers = commandNodes.map((node: any) => {
      const command = node.data.command.replace('/', '');
      return `        self.bot.message_handler(commands=['${command}'])(self.handle_${command})`;
    }).join('\n');

    return `${handlers}
        self.bot.message_handler(content_types=['text'])(self.handle_message)
        self.bot.callback_query_handler(func=lambda call: True)(self.handle_callback)`;
  }

  private generateCommandHandlers(): string {
    const commandNodes = this.botSchema.configuration?.nodes?.filter(
      (node: any) => node.type === 'trigger-command'
    ) || [];

    return commandNodes.map((node: any) => {
      const command = node.data.command.replace('/', '');
      const connectedActions = this.getConnectedActions(node.id);
      const typeHints = this.options.includeTypeHints;
      
      return `
    def handle_${command}(self, message${typeHints ? ': types.Message' : ''}):
        """Обработчик команды ${node.data.command}"""
        chat_id = message.chat.id
        user_id = message.from_user.id
        
        self.logger.info(f"📨 Команда ${node.data.command} от пользователя {user_id}")
        
        try:
            self.update_user_state(user_id)
            ${connectedActions.map(action => this.generatePythonActionCode(action)).join('\n            ')}
        except Exception as e:
            self.logger.error(f"Ошибка обработки команды ${node.data.command}: {e}")
            self.bot.send_message(chat_id, "Произошла ошибка при обработке команды.")`;
    }).join('\n');
  }

  private generateMessageHandlers(): string {
    const typeHints = this.options.includeTypeHints;
    
    return `
    def handle_message(self, message${typeHints ? ': types.Message' : ''}):
        """Обработчик текстовых сообщений"""
        # Пропускаем команды (они обрабатываются отдельно)
        if message.text and message.text.startswith('/'):
            return
            
        chat_id = message.chat.id
        user_id = message.from_user.id
        
        self.logger.info(f"💬 Сообщение от пользователя {user_id}: {self.truncate_text(message.text or 'медиа')}")
        
        try:
            self.update_user_state(user_id)
            
            # Сохраняем текст сообщения для использования в переменных
            if user_id in self.user_states:
                self.user_states[user_id].variables['message_text'] = message.text or ''
            
            ${this.options.includeAdvancedFeatures ? `# Проверяем условия для текстовых сообщений
            condition_nodes = ${JSON.stringify(
              this.botSchema.configuration?.nodes?.filter((node: any) => node.type?.includes('condition')) || [],
              null,
              12
            )}
            
            for condition in condition_nodes:
                if self.evaluate_condition(condition, message, user_id):
                    connected_actions = self.get_connected_actions_from_condition(condition['id'], True)
                    for action in connected_actions:
                        self.execute_action(action, chat_id, user_id, message)
                    return
            
            # Если условия не сработали, выполняем действия по умолчанию
            default_actions = self.get_connected_actions_from_condition('text-handler', False)
            for action in default_actions:
                self.execute_action(action, chat_id, user_id, message)` : `# Здесь можно добавить обработку текстовых сообщений
            self.logger.info(f"Получено текстовое сообщение: {message.text}")`}
                
        except Exception as e:
            self.logger.error(f"Ошибка обработки сообщения: {e}")`;
  }

  private generateCallbackHandlers(): string {
    const typeHints = this.options.includeTypeHints;
    
    return `
    def handle_callback(self, call${typeHints ? ': types.CallbackQuery' : ''}):
        """Обработчик callback запросов"""
        chat_id = call.message.chat.id
        user_id = call.from_user.id
        data = call.data
        
        self.logger.info(f"🔘 Callback от пользователя {user_id}: {data}")
        
        try:
            self.update_user_state(user_id)
            
            # Обработка callback данных
            if data.startswith('quiz_'):
                self.handle_quiz_answer(chat_id, user_id, data, call)
            else:
                self.logger.warning(f"Неизвестный callback: {data}")
                
            # Подтверждаем получение callback
            self.bot.answer_callback_query(call.id)
            
        except Exception as e:
            self.logger.error(f"Ошибка обработки callback: {e}")
            self.bot.answer_callback_query(call.id, text="Произошла ошибка")

    def handle_quiz_answer(self, chat_id${this.options.includeTypeHints ? ': int' : ''}, user_id${this.options.includeTypeHints ? ': int' : ''}, answer${this.options.includeTypeHints ? ': str' : ''}, call${this.options.includeTypeHints ? ': types.CallbackQuery' : ''}):
        """Обработчик ответов на викторину"""
        correct_answer = 'quiz_b'  # Python
        is_correct = answer == correct_answer
        
        response_text = (
            "🎉 Правильно! Этот бот действительно создан на Python" 
            if is_correct 
            else "❌ Неправильно. Правильный ответ: B) Python"
        )
        
        self.bot.edit_message_text(
            response_text,
            chat_id=chat_id,
            message_id=call.message.message_id,
            parse_mode='HTML'
        )`;
  }  private
 generateHelperMethods(): string {
    const typeHints = this.options.includeTypeHints;
    
    return `
    def update_user_state(self, user_id${typeHints ? ': int' : ''}):
        """Обновление состояния пользователя"""
        if user_id not in self.user_states:
            self.user_states[user_id] = UserState(user_id=user_id)
        
        state = self.user_states[user_id]
        state.message_count += 1
        state.last_activity = datetime.now()

    def replace_variables(self, text${typeHints ? ': str' : ''}, user_id${typeHints ? ': int' : ''})${typeHints ? ' -> str' : ''}:
        """Замена переменных в тексте"""
        result = text
        
        # Заменяем глобальные переменные
        for key, variable in self.bot_variables.items():
            placeholder = f"{{{{{key}}}}}"
            default_value = variable.get('defaultValue', '')
            result = result.replace(placeholder, str(default_value))
        
        # Заменяем пользовательские переменные
        if user_id in self.user_states:
            state = self.user_states[user_id]
            result = result.replace('{{message_count}}', str(state.message_count))
            result = result.replace('{{user_count}}', str(len(self.user_states)))
            
            # Заменяем пользовательские переменные
            for key, value in state.variables.items():
                placeholder = f"{{{{{key}}}}}"
                result = result.replace(placeholder, str(value))
        
        return result

    def truncate_text(self, text${typeHints ? ': str' : ''}, max_length${typeHints ? ': int' : ''} = 100)${typeHints ? ' -> str' : ''}:
        """Обрезка текста до указанной длины"""
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + '...'

    ${this.options.includeAdvancedFeatures ? `def evaluate_condition(self, condition${typeHints ? ': Dict[str, Any]' : ''}, message${typeHints ? ': types.Message' : ''}, user_id${typeHints ? ': int' : ''})${typeHints ? ' -> bool' : ''}:
        """Оценка условий для текстовых сообщений"""
        if condition['type'] == 'condition-text':
            text = (message.text or '').lower()
            conditions = condition['data'].get('conditions', [])
            
            for cond in conditions:
                value = cond['value'].lower()
                matches = False
                
                if cond['type'] == 'contains':
                    matches = value in text
                elif cond['type'] == 'equals':
                    matches = text == value
                elif cond['type'] == 'starts_with':
                    matches = text.startswith(value)
                elif cond['type'] == 'ends_with':
                    matches = text.endswith(value)
                
                if matches:
                    return condition['data'].get('operator') == 'OR' or matches
            
            return condition['data'].get('operator') == 'AND'
        
        return False

    def get_connected_actions_from_condition(self, node_id${typeHints ? ': str' : ''}, is_true${typeHints ? ': bool' : ''})${typeHints ? ' -> List[Dict[str, Any]]' : ''}:
        """Получение связанных действий из условия"""
        edges = ${JSON.stringify(this.botSchema.configuration?.edges || [])}
        nodes = ${JSON.stringify(this.botSchema.configuration?.nodes || [])}
        
        connected_edges = [
            edge for edge in edges 
            if edge['source'] == node_id and 
            (edge.get('sourceHandle') == ('true' if is_true else 'false'))
        ]
        
        return [
            node for node in nodes 
            for edge in connected_edges 
            if node['id'] == edge['target']
        ]

    def execute_action(self, action${typeHints ? ': Dict[str, Any]' : ''}, chat_id${typeHints ? ': int' : ''}, user_id${typeHints ? ': int' : ''}, message${typeHints ? ': types.Message' : ''}):
        """Выполнение действия"""
        action_type = action['type']
        
        if action_type == 'action-send-message':
            message_text = self.replace_variables(action['data']['text'], user_id)
            parse_mode = action['data'].get('parseMode', 'HTML')
            
            markup = None
            if action['data'].get('buttons'):
                markup = types.InlineKeyboardMarkup()
                for row in action['data']['buttons']:
                    button_row = []
                    for button in row:
                        if isinstance(button, dict):
                            btn = types.InlineKeyboardButton(
                                text=button['text'],
                                callback_data=button.get('callback_data'),
                                url=button.get('url')
                            )
                            button_row.append(btn)
                    if button_row:
                        markup.row(*button_row)
            
            self.bot.send_message(chat_id, message_text, parse_mode=parse_mode, reply_markup=markup)
            self.logger.info(f"✅ Отправлено сообщение: {self.truncate_text(message_text)}")
            
        elif action_type == 'action-send-media':
            media_url = self.replace_variables(action['data'].get('mediaUrl', 'https://picsum.photos/800/600'), user_id)
            caption = self.replace_variables(action['data'].get('caption', ''), user_id)
            parse_mode = action['data'].get('parseMode', 'HTML')
            
            self.bot.send_photo(chat_id, media_url, caption=caption, parse_mode=parse_mode)
            self.logger.info(f"✅ Отправлено медиа: {media_url}")
            
        elif action_type == 'action-integration':
            if self.options.includeIntegrations:
                try:
                    integration_variables = {
                        'user_id': user_id,
                        'username': message.from_user.username or 'Пользователь',
                        'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    result = self.execute_integration(action['id'], integration_variables)
                    
                    # Сохраняем результаты в переменные пользователя
                    if user_id in self.user_states:
                        label = action['data']['label'].lower()
                        for key, value in result.items():
                            self.user_states[user_id].variables[f"{label}_{key}"] = value
                    
                    self.logger.info(f"✅ Интеграция {action['data']['label']} выполнена")
                except Exception as e:
                    self.logger.error(f"❌ Ошибка интеграции {action['data']['label']}: {e}")
            else:
                self.logger.warning(f"⚠️ Интеграция {action['data']['label']} пропущена (отключена)")
        else:
            self.logger.warning(f"Неподдерживаемое действие: {action_type}")` : ''}`;
  } 
 private generatePythonActionCode(action: any): string {
    const typeHints = this.options.includeTypeHints;
    
    switch (action.type) {
      case 'action-send-message':
        const hasButtons = action.data.buttons && action.data.buttons.length > 0;
        return `# Отправляем сообщение: ${action.data.label}
            message_text = self.replace_variables("${action.data.text}", user_id)
            ${hasButtons ? `
            markup = types.InlineKeyboardMarkup()
            buttons_data = ${JSON.stringify(action.data.buttons)}
            for row in buttons_data:
                button_row = []
                for button in row:
                    btn = types.InlineKeyboardButton(
                        text=button['text'],
                        callback_data=button.get('callback_data'),
                        url=button.get('url')
                    )
                    button_row.append(btn)
                if button_row:
                    markup.row(*button_row)
            
            self.bot.send_message(chat_id, message_text, parse_mode='${action.data.parseMode || 'HTML'}', reply_markup=markup)` : `
            self.bot.send_message(chat_id, message_text, parse_mode='${action.data.parseMode || 'HTML'}')`}
            self.logger.info(f"✅ Отправлено сообщение: {self.truncate_text(message_text)}")`;

      case 'action-send-media':
        return `# Отправляем медиа: ${action.data.label}
            media_url = self.replace_variables("${action.data.mediaUrl || 'https://picsum.photos/800/600'}", user_id)
            caption = self.replace_variables("${action.data.caption || ''}", user_id)
            self.bot.send_photo(chat_id, media_url, caption=caption, parse_mode='${action.data.parseMode || 'HTML'}')
            self.logger.info(f"✅ Отправлено медиа: {media_url}")`;

      case 'action-integration':
        if (!this.options.includeIntegrations) {
          return `# Интеграция отключена: ${action.data.label}
            self.logger.warning("⚠️ Интеграция ${action.data.label} пропущена (отключена в настройках экспорта)")`;
        }
        
        return `# Выполняем интеграцию: ${action.data.label}
            try:
                integration_variables = {
                    'user_id': user_id,
                    'username': message.from_user.username or 'Пользователь',
                    'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                result = self.execute_integration('${action.id}', integration_variables)
                
                # Сохраняем результаты в переменные пользователя
                if user_id in self.user_states:
                    label = "${action.data.label.toLowerCase()}"
                    for key, value in result.items():
                        self.user_states[user_id].variables[f"{label}_{key}"] = value
                
                self.logger.info("✅ Интеграция ${action.data.label} выполнена")
            except Exception as e:
                self.logger.error(f"❌ Ошибка интеграции ${action.data.label}: {e}")`;

      default:
        return `# Неизвестное действие: ${action.type}
            self.logger.warning(f"Неподдерживаемое действие: ${action.type}")`;
    }
  }

  private generateMainCode(): string {
    return `
if __name__ == "__main__":
    # Загружаем токен из переменных окружения
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        print("❌ Ошибка: Не найден TELEGRAM_BOT_TOKEN в переменных окружения")
        print("💡 Создайте файл .env и добавьте: TELEGRAM_BOT_TOKEN=your_token_here")
        exit(1)
    
    # Создаем и запускаем бота
    bot = BotConstructor(token)
    bot.start_polling()
`;
  }

  private generateRequirementsFile(): PythonExportedFile {
    const requirements = [
      'pyTelegramBotAPI==4.14.0',
      'python-dotenv==1.0.0'
    ];

    if (this.options.includeIntegrations) {
      requirements.push('requests==2.31.0');
    }

    if (this.options.includeAdvancedFeatures) {
      requirements.push('sqlite3'); // Встроенный в Python
    }

    const content = requirements.join('\n') + '\n';

    return {
      path: 'requirements.txt',
      content,
      type: 'txt'
    };
  }

  private generateReadme(): PythonExportedFile {
    const commands = this.botSchema.configuration?.nodes
      ?.filter((node: any) => node.type === 'trigger-command')
      ?.map((node: any) => `- \`${node.data.command}\` - ${node.data.description || node.data.label}`)
      ?.join('\n') || 'Команды не найдены';

    const readme = `# ${this.botSchema.name}

${this.botSchema.description}

## 🚀 Быстрый старт

### 1. Установка Python
Убедитесь, что у вас установлен Python ${this.options.pythonVersion} или выше:
\`\`\`bash
python --version
\`\`\`

### 2. Установка зависимостей
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 3. Настройка
Скопируйте \`.env.example\` в \`.env\` и заполните необходимые переменные:
\`\`\`bash
cp .env.example .env
\`\`\`

### 4. Получение токена бота
1. Найдите @BotFather в Telegram
2. Отправьте команду \`/newbot\`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен в файл \`.env\`

### 5. Запуск
\`\`\`bash
python main.py
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
├── main.py              # Основной файл бота
├── config.json          # Конфигурация бота
├── requirements.txt     # Зависимости Python
├── .env.example         # Пример переменных окружения
├── .env                 # Ваши переменные окружения (не в git)
├── data/                # Данные бота (создается автоматически)
│   └── bot.db          # База данных состояний (если включена)
└── README.md           # Этот файл
\`\`\`

## 🐛 Отладка

Бот выводит подробные логи в консоль. Для отладки:
1. Проверьте правильность токена в \`.env\`
2. Убедитесь что бот добавлен в чат
3. Проверьте логи на наличие ошибок

## 🔧 Дополнительные возможности

${this.options.includeAdvancedFeatures ? `### База данных состояний
Бот автоматически сохраняет состояния пользователей в SQLite базу данных в папке \`data/\`.

### Переменные пользователей
Система поддерживает пользовательские переменные, которые можно использовать в сообщениях.` : ''}

${this.options.includeIntegrations ? `### Интеграции
Бот поддерживает интеграции с внешними API через HTTP запросы.` : ''}

## 📝 Лицензия

MIT License

## 🤖 О конструкторе ботов

Этот бот был создан с помощью визуального конструктора ботов.
- Дата экспорта: ${new Date().toLocaleString('ru-RU')}
- Python версия: ${this.options.pythonVersion}
- Async/await: ${this.options.useAsyncio ? 'Включено' : 'Отключено'}
- Type hints: ${this.options.includeTypeHints ? 'Включены' : 'Отключены'}
`;

    return {
      path: 'README.md',
      content: readme,
      type: 'md'
    };
  } 
 private generateEnvExample(): PythonExportedFile {
    const envContent = `# Токен Telegram бота (получите у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Режим разработки (true/false)
DEBUG=false

# Уровень логирования (DEBUG, INFO, WARNING, ERROR)
LOG_LEVEL=INFO

# Дополнительные настройки
POLLING_TIMEOUT=10
`;

    return {
      path: '.env.example',
      content: envContent,
      type: 'txt'
    };
  }

  private generateConfigFile(): PythonExportedFile {
    const config = {
      name: this.botSchema.name,
      description: this.botSchema.description,
      version: '1.0.0',
      created: this.botSchema.createdAt,
      exported: new Date().toISOString(),
      python_version: this.options.pythonVersion,
      settings: {
        logging: true,
        debug: false,
        polling: true,
        webhook: false,
        use_asyncio: this.options.useAsyncio,
        include_type_hints: this.options.includeTypeHints
      },
      variables: this.botSchema.configuration?.variables || {},
      platforms: this.botSchema.platforms?.map((p: any) => p.platform) || ['telegram'],
      features: {
        integrations: this.options.includeIntegrations,
        advanced_features: this.options.includeAdvancedFeatures,
        tests: this.options.generateTests,
        documentation: this.options.generateDocumentation
      }
    };

    return {
      path: 'config.json',
      content: JSON.stringify(config, null, 2),
      type: 'json'
    };
  }

  private getConnectedActions(nodeId: string): any[] {
    const edges = this.botSchema.configuration?.edges || [];
    const nodes = this.botSchema.configuration?.nodes || [];
    
    return edges
      .filter((edge: any) => edge.source === nodeId)
      .map((edge: any) => nodes.find((node: any) => node.id === edge.target))
      .filter(Boolean);
  }
}