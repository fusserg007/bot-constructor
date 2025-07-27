/**
 * Система помощи и документации для конструктора ботов
 * Предоставляет контекстные подсказки, примеры и поиск по документации
 */

export interface NodeHelpInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  examples: NodeExample[];
  bestPractices: string[];
  commonIssues: CommonIssue[];
  relatedNodes: string[];
  platforms: string[];
}

export interface NodeExample {
  title: string;
  description: string;
  config: Record<string, any>;
  useCase: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface CommonIssue {
  problem: string;
  solution: string;
  prevention: string;
}

export interface SearchResult {
  type: 'node' | 'template' | 'example' | 'guide';
  id: string;
  title: string;
  description: string;
  relevance: number;
  category?: string;
}

export class HelpSystem {
  private nodeHelp: Map<string, NodeHelpInfo> = new Map();
  private searchIndex: Map<string, SearchResult[]> = new Map();

  constructor() {
    this.initializeNodeHelp();
    this.buildSearchIndex();
  }

  /**
   * Получить справку по узлу
   */
  getNodeHelp(nodeType: string): NodeHelpInfo | null {
    return this.nodeHelp.get(nodeType) || null;
  }

  /**
   * Поиск по документации
   */
  search(query: string, filters?: {
    type?: string[];
    category?: string[];
    difficulty?: string[];
  }): SearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const results: SearchResult[] = [];
    
    // Поиск по ключевым словам
    for (const [keyword, searchResults] of this.searchIndex) {
      if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
        results.push(...searchResults);
      }
    }

    // Применение фильтров
    let filteredResults = results;
    if (filters) {
      filteredResults = results.filter(result => {
        if (filters.type && !filters.type.includes(result.type)) return false;
        if (filters.category && result.category && !filters.category.includes(result.category)) return false;
        return true;
      });
    }

    // Сортировка по релевантности
    return filteredResults
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20); // Ограничиваем результаты
  }

  /**
   * Получить примеры для узла
   */
  getNodeExamples(nodeType: string, difficulty?: string): NodeExample[] {
    const helpInfo = this.getNodeHelp(nodeType);
    if (!helpInfo) return [];

    let examples = helpInfo.examples;
    if (difficulty) {
      examples = examples.filter(ex => ex.difficulty === difficulty);
    }

    return examples;
  }

  /**
   * Получить связанные узлы
   */
  getRelatedNodes(nodeType: string): NodeHelpInfo[] {
    const helpInfo = this.getNodeHelp(nodeType);
    if (!helpInfo) return [];

    return helpInfo.relatedNodes
      .map(id => this.getNodeHelp(id))
      .filter(Boolean) as NodeHelpInfo[];
  }

  /**
   * Получить рекомендации для решения задачи
   */
  getRecommendations(task: string, platform?: string): SearchResult[] {
    const taskKeywords = this.extractKeywords(task);
    const results: SearchResult[] = [];

    for (const keyword of taskKeywords) {
      const searchResults = this.search(keyword);
      results.push(...searchResults);
    }

    // Фильтрация по платформе
    if (platform) {
      return results.filter(result => {
        const nodeHelp = this.getNodeHelp(result.id);
        return !nodeHelp || nodeHelp.platforms.includes(platform) || nodeHelp.platforms.includes('all');
      });
    }

    return results;
  }

  private initializeNodeHelp(): void {
    // Триггеры
    this.nodeHelp.set('trigger-command', {
      id: 'trigger-command',
      title: 'Триггер команды',
      description: 'Запускает выполнение схемы при получении команды от пользователя (например, /start, /help)',
      category: 'triggers',
      examples: [
        {
          title: 'Команда приветствия',
          description: 'Базовая команда /start для приветствия новых пользователей',
          config: { command: '/start', description: 'Начать работу с ботом' },
          useCase: 'Первое знакомство пользователя с ботом',
          difficulty: 'beginner'
        },
        {
          title: 'Команда помощи',
          description: 'Команда /help для показа доступных функций',
          config: { command: '/help', description: 'Показать справку' },
          useCase: 'Предоставление справочной информации',
          difficulty: 'beginner'
        },
        {
          title: 'Команда с параметрами',
          description: 'Команда с дополнительными параметрами',
          config: { command: '/search', description: 'Поиск по базе данных', parameters: true },
          useCase: 'Команды требующие дополнительного ввода',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Используйте понятные названия команд (/start, /help, /settings)',
        'Добавляйте описания к командам для автоматического меню',
        'Не создавайте слишком много команд - это запутает пользователей',
        'Группируйте связанные функции под одной командой с подменю'
      ],
      commonIssues: [
        {
          problem: 'Команда не срабатывает',
          solution: 'Проверьте правильность написания команды (должна начинаться с /)',
          prevention: 'Используйте валидацию при создании команд'
        },
        {
          problem: 'Конфликт команд между ботами',
          solution: 'Используйте уникальные префиксы для команд каждого бота',
          prevention: 'Планируйте структуру команд заранее'
        }
      ],
      relatedNodes: ['action-send-message', 'condition-user-role', 'data-variable'],
      platforms: ['telegram', 'max', 'discord']
    });

    this.nodeHelp.set('trigger-message', {
      id: 'trigger-message',
      title: 'Триггер сообщения',
      description: 'Запускается при получении любого текстового сообщения от пользователя',
      category: 'triggers',
      examples: [
        {
          title: 'Обработка любого текста',
          description: 'Реагирует на любое сообщение пользователя',
          config: { pattern: '*', caseSensitive: false },
          useCase: 'Универсальный обработчик сообщений',
          difficulty: 'beginner'
        },
        {
          title: 'Поиск ключевых слов',
          description: 'Реагирует на сообщения содержащие определенные слова',
          config: { pattern: 'помощь|help|справка', caseSensitive: false },
          useCase: 'Автоматическое предложение помощи',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Используйте паттерны для фильтрации нужных сообщений',
        'Комбинируйте с условными блоками для сложной логики',
        'Не забывайте про регистр символов при поиске'
      ],
      commonIssues: [
        {
          problem: 'Триггер срабатывает слишком часто',
          solution: 'Добавьте более специфичные паттерны или условия',
          prevention: 'Тестируйте паттерны на разных типах сообщений'
        }
      ],
      relatedNodes: ['condition-text-contains', 'action-send-message', 'data-variable'],
      platforms: ['telegram', 'max', 'whatsapp', 'discord']
    });

    // Действия
    this.nodeHelp.set('action-send-message', {
      id: 'action-send-message',
      title: 'Отправить сообщение',
      description: 'Отправляет текстовое сообщение пользователю с возможностью добавления кнопок',
      category: 'actions',
      examples: [
        {
          title: 'Простое сообщение',
          description: 'Отправка обычного текстового сообщения',
          config: { text: 'Привет! Как дела?', parseMode: 'HTML' },
          useCase: 'Базовое общение с пользователем',
          difficulty: 'beginner'
        },
        {
          title: 'Сообщение с кнопками',
          description: 'Сообщение с inline кнопками для выбора',
          config: {
            text: 'Выберите действие:',
            buttons: [
              [{ text: 'Помощь', callback_data: 'help' }],
              [{ text: 'Настройки', callback_data: 'settings' }]
            ]
          },
          useCase: 'Создание интерактивных меню',
          difficulty: 'intermediate'
        },
        {
          title: 'Сообщение с переменными',
          description: 'Использование переменных в тексте сообщения',
          config: { text: 'Привет, {{user_name}}! Ваш баланс: {{balance}} руб.', parseMode: 'HTML' },
          useCase: 'Персонализированные сообщения',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Используйте HTML разметку для форматирования текста',
        'Группируйте кнопки логически (не более 3-4 в ряду)',
        'Добавляйте эмодзи для улучшения восприятия',
        'Используйте переменные для персонализации'
      ],
      commonIssues: [
        {
          problem: 'Сообщение не отправляется',
          solution: 'Проверьте корректность HTML разметки и длину сообщения',
          prevention: 'Используйте валидацию HTML и ограничения по длине'
        },
        {
          problem: 'Кнопки не работают',
          solution: 'Убедитесь что есть обработчик для callback_data',
          prevention: 'Создавайте обработчики callback сразу при создании кнопок'
        }
      ],
      relatedNodes: ['trigger-callback', 'condition-text-contains', 'data-variable'],
      platforms: ['telegram', 'max', 'whatsapp', 'discord']
    });

    // Условия
    this.nodeHelp.set('condition-text-contains', {
      id: 'condition-text-contains',
      title: 'Условие: текст содержит',
      description: 'Проверяет содержит ли текст сообщения определенные слова или фразы',
      category: 'conditions',
      examples: [
        {
          title: 'Поиск ключевого слова',
          description: 'Проверка наличия слова в сообщении',
          config: { pattern: 'помощь', caseSensitive: false },
          useCase: 'Автоматическое предложение помощи',
          difficulty: 'beginner'
        },
        {
          title: 'Множественные варианты',
          description: 'Проверка нескольких вариантов слов',
          config: { pattern: 'да|yes|согласен|ok', caseSensitive: false },
          useCase: 'Обработка подтверждений пользователя',
          difficulty: 'intermediate'
        }
      ],
      bestPractices: [
        'Используйте регулярные выражения для сложных паттернов',
        'Учитывайте разные варианты написания слов',
        'Комбинируйте несколько условий для точности'
      ],
      commonIssues: [
        {
          problem: 'Условие не срабатывает',
          solution: 'Проверьте правильность регулярного выражения',
          prevention: 'Тестируйте паттерны на реальных примерах'
        }
      ],
      relatedNodes: ['trigger-message', 'action-send-message', 'data-variable'],
      platforms: ['telegram', 'max', 'whatsapp', 'discord']
    });

    // Интеграции
    this.nodeHelp.set('integration-http', {
      id: 'integration-http',
      title: 'HTTP запрос',
      description: 'Выполняет HTTP запрос к внешнему API и обрабатывает ответ',
      category: 'integrations',
      examples: [
        {
          title: 'GET запрос',
          description: 'Получение данных с внешнего API',
          config: {
            url: 'https://api.example.com/users/{{user_id}}',
            method: 'GET',
            headers: { 'Authorization': 'Bearer {{api_token}}' }
          },
          useCase: 'Получение информации о пользователе',
          difficulty: 'intermediate'
        },
        {
          title: 'POST запрос с данными',
          description: 'Отправка данных на внешний сервер',
          config: {
            url: 'https://api.example.com/orders',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { user_id: '{{user_id}}', product: '{{product}}' }
          },
          useCase: 'Создание заказа через API',
          difficulty: 'advanced'
        }
      ],
      bestPractices: [
        'Всегда обрабатывайте ошибки HTTP запросов',
        'Используйте переменные для динамических данных',
        'Добавляйте таймауты для запросов',
        'Кэшируйте результаты когда это возможно'
      ],
      commonIssues: [
        {
          problem: 'Запрос возвращает ошибку 401',
          solution: 'Проверьте правильность токена авторизации',
          prevention: 'Используйте валидные токены и обновляйте их вовремя'
        },
        {
          problem: 'Запрос слишком долго выполняется',
          solution: 'Добавьте таймаут и обработку ошибок',
          prevention: 'Устанавливайте разумные таймауты для всех запросов'
        }
      ],
      relatedNodes: ['data-variable', 'condition-text-contains', 'action-send-message'],
      platforms: ['all']
    });
  }

  private buildSearchIndex(): void {
    // Индексация узлов
    for (const [nodeType, helpInfo] of this.nodeHelp) {
      const keywords = [
        helpInfo.title.toLowerCase(),
        helpInfo.description.toLowerCase(),
        helpInfo.category.toLowerCase(),
        ...helpInfo.bestPractices.map(bp => bp.toLowerCase()),
        ...helpInfo.examples.map(ex => ex.title.toLowerCase() + ' ' + ex.description.toLowerCase())
      ];

      for (const keyword of keywords) {
        const words = keyword.split(/\s+/);
        for (const word of words) {
          if (word.length > 2) { // Игнорируем короткие слова
            if (!this.searchIndex.has(word)) {
              this.searchIndex.set(word, []);
            }
            this.searchIndex.get(word)!.push({
              type: 'node',
              id: nodeType,
              title: helpInfo.title,
              description: helpInfo.description,
              relevance: this.calculateRelevance(word, keyword),
              category: helpInfo.category
            });
          }
        }
      }
    }
  }

  private calculateRelevance(searchWord: string, content: string): number {
    // Экранируем специальные символы регулярных выражений
    const escapedWord = searchWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurrences = (content.match(new RegExp(escapedWord, 'gi')) || []).length;
    const position = content.toLowerCase().indexOf(searchWord.toLowerCase());
    
    let relevance = occurrences * 10;
    if (position === 0) relevance += 20; // Бонус за начало строки
    if (position < 50) relevance += 10; // Бонус за раннее появление
    
    return relevance;
  }

  private extractKeywords(text: string): string[] {
    const commonWords = ['и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'к', 'the', 'a', 'an', 'and', 'or', 'but'];
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
  }
}

// Экспорт синглтона
export const helpSystem = new HelpSystem();