/**
 * Менеджер документации и системы помощи
 */

export interface NodeDocumentation {
  nodeType: string;
  name: string;
  description: string;
  category: 'trigger' | 'action' | 'condition' | 'data' | 'integration';
  icon: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  properties: NodeProperty[];
  examples: NodeExample[];
  bestPractices: string[];
  commonIssues: CommonIssue[];
  relatedNodes: string[];
  tags: string[];
  version: string;
  lastUpdated: string;
}

export interface NodeInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface NodeOutput {
  name: string;
  type: string;
  description: string;
}

export interface NodeProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface NodeExample {
  title: string;
  description: string;
  schema: any;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface CommonIssue {
  problem: string;
  solution: string;
  category: 'configuration' | 'connection' | 'data' | 'performance';
}

export class DocumentationManager {
  private static instance: DocumentationManager;
  private nodeDocumentation: Map<string, NodeDocumentation> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  private constructor() {
    this.initializeNodeDocumentation();
    this.buildSearchIndex();
  }

  static getInstance(): DocumentationManager {
    if (!DocumentationManager.instance) {
      DocumentationManager.instance = new DocumentationManager();
    }
    return DocumentationManager.instance;
  }  /**

   * Получить документацию для узла
   */
  getNodeDocumentation(nodeType: string): NodeDocumentation | undefined {
    return this.nodeDocumentation.get(nodeType);
  }

  /**
   * Получить всю документацию
   */
  getAllDocumentation(): NodeDocumentation[] {
    return Array.from(this.nodeDocumentation.values());
  }

  /**
   * Получить документацию по категории
   */
  getDocumentationByCategory(category: string): NodeDocumentation[] {
    return Array.from(this.nodeDocumentation.values())
      .filter(doc => doc.category === category);
  }

  /**
   * Поиск по документации
   */
  searchDocumentation(query: string): NodeDocumentation[] {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const results = new Set<string>();

    searchTerms.forEach(term => {
      const matchingNodes = this.searchIndex.get(term);
      if (matchingNodes) {
        matchingNodes.forEach(nodeType => results.add(nodeType));
      }
    });

    return Array.from(results)
      .map(nodeType => this.nodeDocumentation.get(nodeType))
      .filter((doc): doc is NodeDocumentation => doc !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Получить связанные узлы
   */
  getRelatedNodes(nodeType: string): NodeDocumentation[] {
    const doc = this.nodeDocumentation.get(nodeType);
    if (!doc) return [];

    return doc.relatedNodes
      .map(relatedType => this.nodeDocumentation.get(relatedType))
      .filter((doc): doc is NodeDocumentation => doc !== undefined);
  }

  /**
   * Получить примеры для узла
   */
  getNodeExamples(nodeType: string, difficulty?: string): NodeExample[] {
    const doc = this.nodeDocumentation.get(nodeType);
    if (!doc) return [];

    if (difficulty) {
      return doc.examples.filter(example => example.difficulty === difficulty);
    }

    return doc.examples;
  }

  /**
   * Получить лучшие практики
   */
  getBestPractices(nodeType: string): string[] {
    const doc = this.nodeDocumentation.get(nodeType);
    return doc?.bestPractices || [];
  }

  /**
   * Получить частые проблемы
   */
  getCommonIssues(nodeType: string, category?: string): CommonIssue[] {
    const doc = this.nodeDocumentation.get(nodeType);
    if (!doc) return [];

    if (category) {
      return doc.commonIssues.filter(issue => issue.category === category);
    }

    return doc.commonIssues;
  }  /**
   
* Построить поисковый индекс
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();

    this.nodeDocumentation.forEach((doc, nodeType) => {
      const searchableText = [
        doc.name,
        doc.description,
        ...doc.tags,
        ...doc.bestPractices,
        ...doc.examples.map(ex => ex.title + ' ' + ex.description)
      ].join(' ').toLowerCase();

      const words = searchableText.split(/\s+/).filter(word => word.length > 2);
      
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(nodeType);
      });
    });
  }

  /**
   * Инициализация документации узлов
   */
  private initializeNodeDocumentation(): void {
    // Триггеры
    this.addTriggerDocumentation();
    
    // Действия
    this.addActionDocumentation();
    
    // Условия
    this.addConditionDocumentation();
    
    // Данные
    this.addDataDocumentation();
    
    // Интеграции
    this.addIntegrationDocumentation();
  }

  /**
   * Добавить документацию триггеров
   */
  private addTriggerDocumentation(): void {
    // Триггер команды
    this.nodeDocumentation.set('trigger-command', {
      nodeType: 'trigger-command',
      name: 'Триггер команды',
      description: 'Запускает выполнение схемы при получении определенной команды от пользователя',
      category: 'trigger',
      icon: '⚡',
      inputs: [],
      outputs: [
        {
          name: 'output',
          type: 'flow',
          description: 'Выход для продолжения выполнения схемы'
        }
      ],
      properties: [
        {
          name: 'command',
          type: 'string',
          required: true,
          description: 'Команда, которая запускает триггер (например: /start, /help)',
          defaultValue: '/start'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'Описание команды для пользователей'
        }
      ],
      examples: [
        {
          title: 'Простая команда старта',
          description: 'Базовый триггер для команды /start',
          schema: {
            command: '/start',
            description: 'Начать работу с ботом'
          },
          explanation: 'Этот триггер активируется когда пользователь отправляет команду /start',
          difficulty: 'beginner'
        }
      ],
      bestPractices: [
        'Используйте понятные названия команд',
        'Добавляйте описания для команд',
        'Команды должны начинаться с символа /',
        'Избегайте слишком длинных команд'
      ],
      commonIssues: [
        {
          problem: 'Команда не срабатывает',
          solution: 'Проверьте, что команда начинается с символа / и написана правильно',
          category: 'configuration'
        }
      ],
      relatedNodes: ['action-send-message', 'condition-text-contains'],
      tags: ['команда', 'триггер', 'старт', 'начало'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });

    // Триггер сообщения
    this.nodeDocumentation.set('trigger-message', {
      nodeType: 'trigger-message',
      name: 'Триггер сообщения',
      description: 'Запускается при получении текстового сообщения от пользователя',
      category: 'trigger',
      icon: '💬',
      inputs: [],
      outputs: [
        {
          name: 'output',
          type: 'flow',
          description: 'Выход для продолжения выполнения'
        }
      ],
      properties: [
        {
          name: 'patterns',
          type: 'textarea',
          required: false,
          description: 'Паттерны текста для фильтрации сообщений (по одному на строку)'
        },
        {
          name: 'caseSensitive',
          type: 'boolean',
          required: false,
          description: 'Учитывать регистр при сравнении',
          defaultValue: false
        }
      ],
      examples: [
        {
          title: 'Реакция на приветствие',
          description: 'Триггер срабатывает на слова приветствия',
          schema: {
            patterns: ['привет', 'hello', 'hi'],
            caseSensitive: false
          },
          explanation: 'Бот будет реагировать на любое сообщение содержащее слова приветствия',
          difficulty: 'beginner'
        }
      ],
      bestPractices: [
        'Используйте простые и понятные паттерны',
        'Учитывайте различные варианты написания',
        'Не делайте паттерны слишком широкими'
      ],
      commonIssues: [
        {
          problem: 'Триггер срабатывает слишком часто',
          solution: 'Сделайте паттерны более специфичными',
          category: 'configuration'
        }
      ],
      relatedNodes: ['condition-text-contains', 'action-send-message'],
      tags: ['сообщение', 'текст', 'паттерн', 'фильтр'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  }  /**

   * Добавить документацию действий
   */
  private addActionDocumentation(): void {
    // Отправка сообщения
    this.nodeDocumentation.set('action-send-message', {
      nodeType: 'action-send-message',
      name: 'Отправить сообщение',
      description: 'Отправляет текстовое сообщение пользователю',
      category: 'action',
      icon: '📤',
      inputs: [
        {
          name: 'input',
          type: 'flow',
          required: true,
          description: 'Входящий поток выполнения'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'flow',
          description: 'Выходящий поток после отправки сообщения'
        }
      ],
      properties: [
        {
          name: 'message',
          type: 'textarea',
          required: true,
          description: 'Текст сообщения для отправки. Поддерживает переменные {{variable}}'
        },
        {
          name: 'parseMode',
          type: 'select',
          required: false,
          description: 'Режим форматирования текста',
          defaultValue: 'text',
          options: ['text', 'markdown', 'html']
        }
      ],
      examples: [
        {
          title: 'Простое приветствие',
          description: 'Отправка приветственного сообщения',
          schema: {
            message: 'Добро пожаловать, {{userName}}!'
          },
          explanation: 'Отправляет персонализированное приветствие используя переменную userName',
          difficulty: 'beginner'
        },
        {
          title: 'Форматированное сообщение',
          description: 'Сообщение с markdown форматированием',
          schema: {
            message: '*Важно!* Ваш заказ №{{orderNumber}} готов к выдаче.',
            parseMode: 'markdown'
          },
          explanation: 'Использует markdown для выделения важной информации',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Используйте переменные для персонализации',
        'Делайте сообщения краткими и понятными',
        'Проверяйте корректность markdown/html разметки',
        'Избегайте слишком длинных сообщений'
      ],
      commonIssues: [
        {
          problem: 'Переменные не заменяются',
          solution: 'Проверьте правильность написания переменных в формате {{variableName}}',
          category: 'configuration'
        },
        {
          problem: 'Markdown не работает',
          solution: 'Убедитесь что parseMode установлен в "markdown"',
          category: 'configuration'
        }
      ],
      relatedNodes: ['action-send-media', 'action-send-keyboard', 'action-set-variable'],
      tags: ['сообщение', 'текст', 'отправка', 'переменные', 'форматирование'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });

    // Запрос ввода
    this.nodeDocumentation.set('action-request-input', {
      nodeType: 'action-request-input',
      name: 'Запросить ввод',
      description: 'Запрашивает ввод данных от пользователя и сохраняет в переменную',
      category: 'action',
      icon: '📝',
      inputs: [
        {
          name: 'input',
          type: 'flow',
          required: true,
          description: 'Входящий поток выполнения'
        }
      ],
      outputs: [],
      properties: [
        {
          name: 'message',
          type: 'textarea',
          required: true,
          description: 'Сообщение с просьбой ввести данные'
        },
        {
          name: 'variable',
          type: 'string',
          required: true,
          description: 'Имя переменной для сохранения введенных данных'
        },
        {
          name: 'inputType',
          type: 'select',
          required: false,
          description: 'Тип ожидаемых данных',
          defaultValue: 'text',
          options: ['text', 'number', 'email', 'phone']
        }
      ],
      examples: [
        {
          title: 'Запрос имени',
          description: 'Простой запрос имени пользователя',
          schema: {
            message: 'Как вас зовут?',
            variable: 'userName',
            inputType: 'text'
          },
          explanation: 'Запрашивает имя и сохраняет в переменную userName',
          difficulty: 'beginner'
        }
      ],
      bestPractices: [
        'Четко формулируйте что нужно ввести',
        'Используйте понятные имена переменных',
        'Указывайте правильный тип данных',
        'Добавляйте примеры ввода в сообщении'
      ],
      commonIssues: [
        {
          problem: 'Данные не сохраняются',
          solution: 'Проверьте правильность имени переменной',
          category: 'configuration'
        }
      ],
      relatedNodes: ['action-set-variable', 'condition-variable-compare'],
      tags: ['ввод', 'переменная', 'данные', 'пользователь'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Добавить документацию условий
   */
  private addConditionDocumentation(): void {
    // Условие по тексту
    this.nodeDocumentation.set('condition-text-contains', {
      nodeType: 'condition-text-contains',
      name: 'Условие по тексту',
      description: 'Проверяет содержит ли текст определенный паттерн',
      category: 'condition',
      icon: '🔍',
      inputs: [
        {
          name: 'input',
          type: 'flow',
          required: true,
          description: 'Входящий поток выполнения'
        }
      ],
      outputs: [
        {
          name: 'true',
          type: 'flow',
          description: 'Выход если условие выполнено'
        },
        {
          name: 'false',
          type: 'flow',
          description: 'Выход если условие не выполнено'
        }
      ],
      properties: [
        {
          name: 'pattern',
          type: 'string',
          required: true,
          description: 'Паттерн для поиска в тексте'
        },
        {
          name: 'caseSensitive',
          type: 'boolean',
          required: false,
          description: 'Учитывать регистр',
          defaultValue: false
        },
        {
          name: 'matchType',
          type: 'select',
          required: false,
          description: 'Тип сравнения',
          defaultValue: 'contains',
          options: ['contains', 'equals', 'startsWith', 'endsWith', 'regex']
        }
      ],
      examples: [
        {
          title: 'Проверка приветствия',
          description: 'Проверяет содержит ли сообщение приветствие',
          schema: {
            pattern: 'привет',
            caseSensitive: false,
            matchType: 'contains'
          },
          explanation: 'Если сообщение содержит слово "привет", выполнение пойдет по ветке true',
          difficulty: 'beginner'
        }
      ],
      bestPractices: [
        'Используйте простые и понятные паттерны',
        'Тестируйте регулярные выражения перед использованием',
        'Учитывайте различные варианты написания'
      ],
      commonIssues: [
        {
          problem: 'Условие не срабатывает',
          solution: 'Проверьте правильность паттерна и настройки регистра',
          category: 'configuration'
        }
      ],
      relatedNodes: ['trigger-message', 'condition-variable-compare'],
      tags: ['условие', 'текст', 'паттерн', 'сравнение'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Добавить документацию узлов данных
   */
  private addDataDocumentation(): void {
    // Математические операции
    this.nodeDocumentation.set('data-math', {
      nodeType: 'data-math',
      name: 'Математические операции',
      description: 'Выполняет математические вычисления с числами',
      category: 'data',
      icon: '🧮',
      inputs: [
        {
          name: 'input',
          type: 'flow',
          required: true,
          description: 'Входящий поток выполнения'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'flow',
          description: 'Выходящий поток после вычисления'
        }
      ],
      properties: [
        {
          name: 'operation',
          type: 'select',
          required: true,
          description: 'Математическая операция',
          options: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'abs']
        },
        {
          name: 'operand1',
          type: 'string',
          required: true,
          description: 'Первый операнд (число или переменная)'
        },
        {
          name: 'operand2',
          type: 'string',
          required: false,
          description: 'Второй операнд (для бинарных операций)'
        },
        {
          name: 'resultVariable',
          type: 'string',
          required: true,
          description: 'Переменная для сохранения результата'
        }
      ],
      examples: [
        {
          title: 'Сложение чисел',
          description: 'Складывает два числа',
          schema: {
            operation: 'add',
            operand1: '10',
            operand2: '5',
            resultVariable: 'sum'
          },
          explanation: 'Складывает 10 и 5, результат сохраняется в переменную sum',
          difficulty: 'beginner'
        }
      ],
      bestPractices: [
        'Проверяйте что операнды являются числами',
        'Используйте понятные имена для переменных результата',
        'Избегайте деления на ноль'
      ],
      commonIssues: [
        {
          problem: 'Ошибка "не число"',
          solution: 'Убедитесь что операнды содержат числовые значения',
          category: 'data'
        }
      ],
      relatedNodes: ['action-set-variable', 'condition-variable-compare'],
      tags: ['математика', 'вычисления', 'числа', 'операции'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Добавить документацию интеграций
   */
  private addIntegrationDocumentation(): void {
    // REST API
    this.nodeDocumentation.set('integration-rest-api', {
      nodeType: 'integration-rest-api',
      name: 'REST API запрос',
      description: 'Выполняет HTTP запрос к внешнему API',
      category: 'integration',
      icon: '🌐',
      inputs: [
        {
          name: 'input',
          type: 'flow',
          required: true,
          description: 'Входящий поток выполнения'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'flow',
          description: 'Выходящий поток после запроса'
        }
      ],
      properties: [
        {
          name: 'url',
          type: 'string',
          required: true,
          description: 'URL для запроса'
        },
        {
          name: 'method',
          type: 'select',
          required: false,
          description: 'HTTP метод',
          defaultValue: 'GET',
          options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
        },
        {
          name: 'responseVariable',
          type: 'string',
          required: false,
          description: 'Переменная для сохранения ответа',
          defaultValue: 'apiResponse'
        }
      ],
      examples: [
        {
          title: 'Получение данных',
          description: 'Простой GET запрос',
          schema: {
            url: 'https://api.example.com/users',
            method: 'GET',
            responseVariable: 'users'
          },
          explanation: 'Получает список пользователей и сохраняет в переменную users',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Всегда проверяйте статус ответа',
        'Используйте HTTPS для безопасности',
        'Добавляйте обработку ошибок',
        'Устанавливайте разумные таймауты'
      ],
      commonIssues: [
        {
          problem: 'Таймаут запроса',
          solution: 'Увеличьте значение timeout или проверьте доступность API',
          category: 'connection'
        }
      ],
      relatedNodes: ['data-json', 'condition-variable-compare'],
      tags: ['api', 'http', 'запрос', 'интеграция', 'внешний'],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  }
}