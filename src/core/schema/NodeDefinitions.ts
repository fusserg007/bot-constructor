/**
 * Определения всех типов узлов для конструктора ботов
 */

import { NodeTypeDefinition } from './NodeTypes';

// Триггер: Команда
export const TriggerCommandNode: NodeTypeDefinition = {
  type: 'trigger-command',
  name: 'Команда',
  metadata: {
    category: 'triggers',
    subcategory: 'user-input',
    icon: '⚡',
    color: '#4CAF50',
    description: 'Запускается при получении команды от пользователя',
    supportedPlatforms: 'all',
    version: '1.0.0',
    examples: [
      {
        title: 'Команда /start',
        description: 'Обработка команды запуска бота',
        config: { command: '/start', caseSensitive: false }
      }
    ]
  },
  inputs: [],
  outputs: [
    {
      id: 'trigger',
      name: 'Триггер',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: true,
      description: 'Выполняется при срабатывании команды'
    },
    {
      id: 'message',
      name: 'Сообщение',
      type: 'data',
      direction: 'output',
      dataType: 'object',
      required: false,
      description: 'Данные входящего сообщения'
    },
    {
      id: 'user',
      name: 'Пользователь',
      type: 'data',
      direction: 'output',
      dataType: 'object',
      required: false,
      description: 'Информация о пользователе'
    }
  ],
  configFields: {
    command: {
      type: 'text',
      label: 'Команда',
      description: 'Команда для обработки (например: /start, /help)',
      required: true,
      placeholder: '/start',
      validation: {
        pattern: '^/[a-zA-Z0-9_]+$'
      }
    },
    caseSensitive: {
      type: 'boolean',
      label: 'Учитывать регистр',
      description: 'Различать заглавные и строчные буквы',
      defaultValue: false
    },
    description: {
      type: 'textarea',
      label: 'Описание',
      description: 'Описание команды для пользователей',
      placeholder: 'Запуск бота'
    }
  },
  defaultConfig: {
    command: '/start',
    caseSensitive: false,
    description: ''
  }
};

// Триггер: Текстовое сообщение
export const TriggerMessageNode: NodeTypeDefinition = {
  type: 'trigger-message',
  name: 'Текстовое сообщение',
  metadata: {
    category: 'triggers',
    subcategory: 'user-input',
    icon: '💬',
    color: '#2196F3',
    description: 'Запускается при получении текстового сообщения',
    supportedPlatforms: 'all',
    version: '1.0.0'
  },
  inputs: [],
  outputs: [
    {
      id: 'trigger',
      name: 'Триггер',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: true
    },
    {
      id: 'text',
      name: 'Текст',
      type: 'data',
      direction: 'output',
      dataType: 'string',
      required: false
    },
    {
      id: 'message',
      name: 'Сообщение',
      type: 'data',
      direction: 'output',
      dataType: 'object',
      required: false
    }
  ],
  configFields: {
    pattern: {
      type: 'text',
      label: 'Шаблон',
      description: 'Регулярное выражение или точный текст',
      placeholder: 'привет|hello|hi'
    },
    matchType: {
      type: 'select',
      label: 'Тип совпадения',
      options: [
        { value: 'exact', label: 'Точное совпадение' },
        { value: 'contains', label: 'Содержит' },
        { value: 'regex', label: 'Регулярное выражение' },
        { value: 'any', label: 'Любое сообщение' }
      ],
      defaultValue: 'any'
    },
    caseSensitive: {
      type: 'boolean',
      label: 'Учитывать регистр',
      defaultValue: false
    }
  },
  defaultConfig: {
    pattern: '',
    matchType: 'any',
    caseSensitive: false
  }
};

// Действие: Отправить сообщение
export const ActionSendMessageNode: NodeTypeDefinition = {
  type: 'action-send-message',
  name: 'Отправить сообщение',
  metadata: {
    category: 'actions',
    subcategory: 'messaging',
    icon: '📤',
    color: '#FF9800',
    description: 'Отправляет текстовое сообщение пользователю',
    supportedPlatforms: 'all',
    version: '1.0.0'
  },
  inputs: [
    {
      id: 'trigger',
      name: 'Выполнить',
      type: 'control',
      direction: 'input',
      dataType: 'any',
      required: true
    },
    {
      id: 'text',
      name: 'Текст',
      type: 'data',
      direction: 'input',
      dataType: 'string',
      required: false,
      description: 'Динамический текст сообщения'
    },
    {
      id: 'chatId',
      name: 'ID чата',
      type: 'data',
      direction: 'input',
      dataType: 'string',
      required: false,
      description: 'ID чата для отправки (по умолчанию текущий)'
    }
  ],
  outputs: [
    {
      id: 'success',
      name: 'Успех',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'error',
      name: 'Ошибка',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'messageId',
      name: 'ID сообщения',
      type: 'data',
      direction: 'output',
      dataType: 'string',
      required: false
    }
  ],
  configFields: {
    text: {
      type: 'textarea',
      label: 'Текст сообщения',
      description: 'Текст для отправки. Поддерживает переменные: {{variable}}',
      required: true,
      placeholder: 'Привет! Как дела?'
    },
    parseMode: {
      type: 'select',
      label: 'Режим разметки',
      options: [
        { value: 'none', label: 'Без разметки' },
        { value: 'HTML', label: 'HTML' },
        { value: 'Markdown', label: 'Markdown' }
      ],
      defaultValue: 'HTML'
    },
    disablePreview: {
      type: 'boolean',
      label: 'Отключить превью ссылок',
      defaultValue: false
    },
    buttons: {
      type: 'json',
      label: 'Кнопки',
      description: 'JSON массив кнопок',
      placeholder: '[{"text": "Кнопка", "callbackData": "button_1"}]'
    }
  },
  defaultConfig: {
    text: 'Привет!',
    parseMode: 'HTML',
    disablePreview: false,
    buttons: []
  }
};

// Условие: Содержит текст
export const ConditionTextContainsNode: NodeTypeDefinition = {
  type: 'condition-text-contains',
  name: 'Содержит текст',
  metadata: {
    category: 'conditions',
    subcategory: 'text',
    icon: '🔍',
    color: '#9C27B0',
    description: 'Проверяет, содержит ли текст определенную строку',
    supportedPlatforms: 'all',
    version: '1.0.0'
  },
  inputs: [
    {
      id: 'trigger',
      name: 'Проверить',
      type: 'control',
      direction: 'input',
      dataType: 'any',
      required: true
    },
    {
      id: 'text',
      name: 'Текст',
      type: 'data',
      direction: 'input',
      dataType: 'string',
      required: true,
      description: 'Текст для проверки'
    }
  ],
  outputs: [
    {
      id: 'true',
      name: 'Да',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'false',
      name: 'Нет',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'result',
      name: 'Результат',
      type: 'data',
      direction: 'output',
      dataType: 'boolean',
      required: false
    }
  ],
  configFields: {
    searchText: {
      type: 'text',
      label: 'Искомый текст',
      description: 'Текст или регулярное выражение для поиска',
      required: true,
      placeholder: 'привет'
    },
    matchType: {
      type: 'select',
      label: 'Тип поиска',
      options: [
        { value: 'contains', label: 'Содержит' },
        { value: 'exact', label: 'Точное совпадение' },
        { value: 'regex', label: 'Регулярное выражение' },
        { value: 'startsWith', label: 'Начинается с' },
        { value: 'endsWith', label: 'Заканчивается на' }
      ],
      defaultValue: 'contains'
    },
    caseSensitive: {
      type: 'boolean',
      label: 'Учитывать регистр',
      defaultValue: false
    }
  },
  defaultConfig: {
    searchText: '',
    matchType: 'contains',
    caseSensitive: false
  }
};

// Переменная
export const DataVariableNode: NodeTypeDefinition = {
  type: 'data-variable',
  name: 'Переменная',
  metadata: {
    category: 'data',
    subcategory: 'storage',
    icon: '📦',
    color: '#607D8B',
    description: 'Сохраняет и получает значения переменных',
    supportedPlatforms: 'all',
    version: '1.0.0'
  },
  inputs: [
    {
      id: 'get',
      name: 'Получить',
      type: 'control',
      direction: 'input',
      dataType: 'any',
      required: false
    },
    {
      id: 'set',
      name: 'Установить',
      type: 'control',
      direction: 'input',
      dataType: 'any',
      required: false
    },
    {
      id: 'value',
      name: 'Значение',
      type: 'data',
      direction: 'input',
      dataType: 'any',
      required: false
    }
  ],
  outputs: [
    {
      id: 'output',
      name: 'Значение',
      type: 'data',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'success',
      name: 'Успех',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    }
  ],
  configFields: {
    variableName: {
      type: 'text',
      label: 'Имя переменной',
      description: 'Уникальное имя переменной',
      required: true,
      placeholder: 'userName',
      validation: {
        pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
      }
    },
    scope: {
      type: 'select',
      label: 'Область видимости',
      options: [
        { value: 'global', label: 'Глобальная' },
        { value: 'user', label: 'Пользователь' },
        { value: 'chat', label: 'Чат' },
        { value: 'session', label: 'Сессия' }
      ],
      defaultValue: 'user'
    },
    dataType: {
      type: 'select',
      label: 'Тип данных',
      options: [
        { value: 'string', label: 'Строка' },
        { value: 'number', label: 'Число' },
        { value: 'boolean', label: 'Логический' },
        { value: 'object', label: 'Объект' },
        { value: 'array', label: 'Массив' }
      ],
      defaultValue: 'string'
    },
    defaultValue: {
      type: 'text',
      label: 'Значение по умолчанию',
      description: 'Значение, если переменная не установлена'
    }
  },
  defaultConfig: {
    variableName: '',
    scope: 'user',
    dataType: 'string',
    defaultValue: ''
  }
};

// HTTP запрос
export const IntegrationHttpNode: NodeTypeDefinition = {
  type: 'integration-http',
  name: 'HTTP запрос',
  metadata: {
    category: 'integrations',
    subcategory: 'api',
    icon: '🌐',
    color: '#795548',
    description: 'Выполняет HTTP запрос к внешнему API',
    supportedPlatforms: 'all',
    version: '1.0.0'
  },
  inputs: [
    {
      id: 'trigger',
      name: 'Выполнить',
      type: 'control',
      direction: 'input',
      dataType: 'any',
      required: true
    },
    {
      id: 'url',
      name: 'URL',
      type: 'data',
      direction: 'input',
      dataType: 'string',
      required: false
    },
    {
      id: 'body',
      name: 'Тело запроса',
      type: 'data',
      direction: 'input',
      dataType: 'object',
      required: false
    }
  ],
  outputs: [
    {
      id: 'success',
      name: 'Успех',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'error',
      name: 'Ошибка',
      type: 'control',
      direction: 'output',
      dataType: 'any',
      required: false
    },
    {
      id: 'response',
      name: 'Ответ',
      type: 'data',
      direction: 'output',
      dataType: 'object',
      required: false
    },
    {
      id: 'statusCode',
      name: 'Код ответа',
      type: 'data',
      direction: 'output',
      dataType: 'number',
      required: false
    }
  ],
  configFields: {
    method: {
      type: 'select',
      label: 'HTTP метод',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' }
      ],
      defaultValue: 'GET'
    },
    url: {
      type: 'text',
      label: 'URL',
      description: 'URL для запроса. Поддерживает переменные: {{variable}}',
      required: true,
      placeholder: 'https://api.example.com/data'
    },
    headers: {
      type: 'json',
      label: 'Заголовки',
      description: 'HTTP заголовки в формате JSON',
      placeholder: '{"Content-Type": "application/json"}'
    },
    timeout: {
      type: 'number',
      label: 'Таймаут (сек)',
      defaultValue: 30,
      validation: { min: 1, max: 300 }
    },
    retries: {
      type: 'number',
      label: 'Количество повторов',
      defaultValue: 0,
      validation: { min: 0, max: 5 }
    }
  },
  defaultConfig: {
    method: 'GET',
    url: '',
    headers: {},
    timeout: 30,
    retries: 0
  }
};

// Экспорт всех определений
export const NodeDefinitions: Record<string, NodeTypeDefinition> = {
  'trigger-command': TriggerCommandNode,
  'trigger-message': TriggerMessageNode,
  'action-send-message': ActionSendMessageNode,
  'condition-text-contains': ConditionTextContainsNode,
  'data-variable': DataVariableNode,
  'integration-http': IntegrationHttpNode
};

export default NodeDefinitions;