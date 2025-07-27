/**
 * Менеджер шаблонов - система управления готовыми шаблонами ботов
 */
import { BotSchema } from '../types';

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'entertainment' | 'utility' | 'education' | 'support' | 'ecommerce' | 'social';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  platforms: string[];
  schema: BotSchema;
  preview?: {
    image?: string;
    demo?: string;
    features: string[];
  };
  author?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: BotTemplate[];
}

export class TemplateManager {
  private static instance: TemplateManager;
  private templates: Map<string, BotTemplate> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();

  private constructor() {
    this.initializeDefaultTemplates();
  }

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Получить все шаблоны
   */
  getAllTemplates(): BotTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Получить шаблон по ID
   */
  getTemplate(id: string): BotTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Получить шаблоны по категории
   */
  getTemplatesByCategory(category: string): BotTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  /**
   * Поиск шаблонов
   */
  searchTemplates(query: string, filters?: {
    category?: string;
    difficulty?: string;
    platform?: string;
    tags?: string[];
  }): BotTemplate[] {
    let results = Array.from(this.templates.values());

    // Поиск по тексту
    if (query) {
      const searchQuery = query.toLowerCase();
      results = results.filter(template => 
        template.name.toLowerCase().includes(searchQuery) ||
        template.description.toLowerCase().includes(searchQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery))
      );
    }

    // Фильтры
    if (filters) {
      if (filters.category) {
        results = results.filter(template => template.category === filters.category);
      }
      if (filters.difficulty) {
        results = results.filter(template => template.difficulty === filters.difficulty);
      }
      if (filters.platform) {
        results = results.filter(template => 
          template.platforms.includes(filters.platform!)
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(template =>
          filters.tags!.some(tag => template.tags.includes(tag))
        );
      }
    }

    return results;
  }

  /**
   * Получить все категории
   */
  getAllCategories(): TemplateCategory[] {
    return Array.from(this.categories.values());
  }

  /**
   * Добавить новый шаблон
   */
  addTemplate(template: BotTemplate): void {
    this.templates.set(template.id, template);
    
    // Добавляем в категорию
    const category = this.categories.get(template.category);
    if (category) {
      category.templates.push(template);
    }
  }

  /**
   * Клонировать шаблон для создания нового бота
   */
  cloneTemplate(templateId: string, newBotName: string): BotSchema | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const clonedSchema: BotSchema = {
      ...template.schema,
      id: `bot_${Date.now()}`,
      name: newBotName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return clonedSchema;
  }

  /**
   * Инициализация стандартных шаблонов
   */
  private initializeDefaultTemplates(): void {
    // Инициализируем категории
    this.initializeCategories();
    
    // Добавляем готовые шаблоны
    this.addWelcomeBotTemplate();
    this.addFAQBotTemplate();
    this.addSupportBotTemplate();
    this.addQuizBotTemplate();
    this.addShopBotTemplate();
  }

  /**
   * Инициализация категорий
   */
  private initializeCategories(): void {
    const categories: TemplateCategory[] = [
      {
        id: 'business',
        name: 'Бизнес',
        description: 'Шаблоны для бизнес-процессов и автоматизации',
        icon: '💼',
        templates: []
      },
      {
        id: 'support',
        name: 'Поддержка',
        description: 'Боты для клиентской поддержки и FAQ',
        icon: '🎧',
        templates: []
      },
      {
        id: 'ecommerce',
        name: 'Электронная коммерция',
        description: 'Боты для интернет-магазинов и продаж',
        icon: '🛒',
        templates: []
      },
      {
        id: 'education',
        name: 'Образование',
        description: 'Обучающие боты и квизы',
        icon: '📚',
        templates: []
      },
      {
        id: 'utility',
        name: 'Утилиты',
        description: 'Полезные инструменты и сервисы',
        icon: '🔧',
        templates: []
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }
 
 /**
   * Шаблон приветственного бота
   */
  private addWelcomeBotTemplate(): void {
    const template: BotTemplate = {
      id: 'welcome-bot',
      name: 'Приветственный бот',
      description: 'Простой бот для приветствия новых пользователей с основными командами',
      category: 'business',
      tags: ['приветствие', 'начинающий', 'базовый'],
      difficulty: 'beginner',
      platforms: ['telegram', 'discord', 'whatsapp'],
      schema: {
        id: 'welcome-bot-schema',
        name: 'Приветственный бот',
        nodes: [
          {
            id: 'start-trigger',
            type: 'trigger-command',
            data: { command: '/start' },
            position: { x: 100, y: 100 }
          },
          {
            id: 'welcome-action',
            type: 'action-send-message',
            data: { 
              message: 'Добро пожаловать, {{userName}}! 👋\\n\\nЯ ваш помощник. Вот что я умею:\\n\\n/help - показать помощь\\n/about - информация о боте\\n/contact - связаться с поддержкой'
            },
            position: { x: 300, y: 100 }
          },
          {
            id: 'help-trigger',
            type: 'trigger-command',
            data: { command: '/help' },
            position: { x: 100, y: 250 }
          },
          {
            id: 'help-action',
            type: 'action-send-message',
            data: {
              message: '📋 Список команд:\\n\\n/start - начать работу\\n/help - эта справка\\n/about - о боте\\n/contact - связь с поддержкой\\n\\nЕсли у вас есть вопросы, просто напишите мне!'
            },
            position: { x: 300, y: 250 }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'start-trigger', target: 'welcome-action' },
          { id: 'edge-2', source: 'help-trigger', target: 'help-action' }
        ],
        variables: {},
        settings: {
          name: 'Приветственный бот',
          description: 'Базовый бот для приветствия пользователей',
          platforms: ['telegram'],
          mode: 'polling',
          variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      preview: {
        features: [
          'Приветствие новых пользователей',
          'Справочная система',
          'Информация о боте',
          'Базовые команды'
        ]
      },
      author: 'Bot Constructor Team',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addTemplate(template);
  }

  /**
   * Шаблон FAQ бота
   */
  private addFAQBotTemplate(): void {
    const template: BotTemplate = {
      id: 'faq-bot',
      name: 'FAQ бот',
      description: 'Бот для автоматических ответов на часто задаваемые вопросы',
      category: 'support',
      tags: ['faq', 'поддержка', 'автоответы'],
      difficulty: 'intermediate',
      platforms: ['telegram', 'discord'],
      schema: {
        id: 'faq-bot-schema',
        name: 'FAQ бот',
        nodes: [
          {
            id: 'message-trigger',
            type: 'trigger-message',
            data: {},
            position: { x: 100, y: 100 }
          },
          {
            id: 'faq-condition',
            type: 'condition-text-contains',
            data: {
              patterns: ['цена', 'стоимость', 'контакты', 'работа', 'доставка']
            },
            position: { x: 300, y: 100 }
          },
          {
            id: 'price-response',
            type: 'action-send-message',
            data: {
              message: '💰 Информацию о ценах можно найти на нашем сайте или уточнить у менеджера. Хотите, чтобы я связал вас со специалистом?'
            },
            position: { x: 500, y: 50 }
          },
          {
            id: 'contact-response',
            type: 'action-send-message',
            data: {
              message: '📞 Наши контакты:\\n📧 Email: support@company.com\\n📞 Телефон: +7 (999) 123-45-67\\n🌐 Сайт: www.company.com'
            },
            position: { x: 500, y: 150 }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'message-trigger', target: 'faq-condition' },
          { id: 'edge-2', source: 'faq-condition', target: 'price-response', sourceHandle: 'price' },
          { id: 'edge-3', source: 'faq-condition', target: 'contact-response', sourceHandle: 'contact' }
        ],
        variables: {},
        settings: {
          name: 'FAQ бот',
          description: 'Автоматические ответы на частые вопросы',
          platforms: ['telegram'],
          mode: 'polling',
          variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      preview: {
        features: [
          'Автоматические ответы на FAQ',
          'Распознавание ключевых слов',
          'База знаний по ключевым словам',
          'Информация о контактах и работе'
        ]
      },
      author: 'Bot Constructor Team',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addTemplate(template);
  }

  /**
   * Шаблон бота поддержки
   */
  private addSupportBotTemplate(): void {
    const template: BotTemplate = {
      id: 'support-bot',
      name: 'Бот поддержки',
      description: 'Полнофункциональный бот для клиентской поддержки с тикет-системой',
      category: 'support',
      tags: ['поддержка', 'тикеты', 'клиенты'],
      difficulty: 'advanced',
      platforms: ['telegram', 'discord', 'whatsapp'],
      schema: {
        id: 'support-bot-schema',
        name: 'Бот поддержки',
        nodes: [
          {
            id: 'start-trigger',
            type: 'trigger-command',
            data: { command: '/start' },
            position: { x: 100, y: 100 }
          },
          {
            id: 'welcome-support',
            type: 'action-send-message',
            data: {
              message: '🎧 Добро пожаловать в службу поддержки!\\n\\nВыберите, чем могу помочь:\\n\\n🎫 /ticket - создать тикет\\n❓ /faq - частые вопросы\\n📞 /contact - связаться с оператором'
            },
            position: { x: 300, y: 100 }
          },
          {
            id: 'ticket-trigger',
            type: 'trigger-command',
            data: { command: '/ticket' },
            position: { x: 100, y: 250 }
          },
          {
            id: 'ticket-form',
            type: 'action-request-input',
            data: {
              message: 'Опишите вашу проблему подробно:',
              variable: 'ticketDescription'
            },
            position: { x: 300, y: 250 }
          },
          {
            id: 'ticket-created',
            type: 'action-send-message',
            data: {
              message: '✅ Тикет создан! Номер: #{{ticketId}}\\n\\nВаше обращение принято в работу. Мы свяжемся с вами в ближайшее время.'
            },
            position: { x: 500, y: 250 }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'start-trigger', target: 'welcome-support' },
          { id: 'edge-2', source: 'ticket-trigger', target: 'ticket-form' },
          { id: 'edge-3', source: 'ticket-form', target: 'ticket-created' }
        ],
        variables: {
          ticketDescription: '',
          ticketId: ''
        },
        settings: {
          name: 'Бот поддержки',
          description: 'Система клиентской поддержки',
          platforms: ['telegram'],
          mode: 'polling',
          variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      preview: {
        features: [
          'Создание и отслеживание тикетов',
          'Сбор подробной информации о проблеме',
          'База знаний и FAQ',
          'Уведомления операторов'
        ]
      },
      author: 'Bot Constructor Team',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addTemplate(template);
  }  /
**
   * Шаблон квиз-бота
   */
  private addQuizBotTemplate(): void {
    const template: BotTemplate = {
      id: 'quiz-bot',
      name: 'Квиз-бот',
      description: 'Интерактивный бот для проведения викторин и тестов с подсчетом баллов',
      category: 'education',
      tags: ['квиз', 'викторина', 'обучение', 'тест'],
      difficulty: 'intermediate',
      platforms: ['telegram', 'discord'],
      schema: {
        id: 'quiz-bot-schema',
        name: 'Квиз-бот',
        nodes: [
          {
            id: 'start-quiz',
            type: 'trigger-command',
            data: { command: '/quiz' },
            position: { x: 100, y: 100 }
          },
          {
            id: 'quiz-intro',
            type: 'action-send-message',
            data: {
              message: '🧠 Добро пожаловать в викторину!\\n\\nВас ждет 5 вопросов на разные темы.\\nЗа каждый правильный ответ - 1 балл.\\n\\nГотовы начать? Напишите "да" для старта!'
            },
            position: { x: 300, y: 100 }
          },
          {
            id: 'start-condition',
            type: 'condition-text-contains',
            data: { pattern: 'да' },
            position: { x: 500, y: 100 }
          },
          {
            id: 'question-1',
            type: 'action-send-message',
            data: {
              message: '🌍 Вопрос 1/5:\\nКакая самая большая планета в Солнечной системе?\\n\\nA) Марс\\nB) Юпитер\\nC) Сатурн\\nD) Земля'
            },
            position: { x: 700, y: 100 }
          },
          {
            id: 'answer-1',
            type: 'condition-text-contains',
            data: { pattern: 'юпитер|b' },
            position: { x: 900, y: 100 }
          },
          {
            id: 'results-action',
            type: 'action-send-message',
            data: {
              message: '🎉 Викторина завершена!\\n\\nВаш результат: {{quizScore}}/5 баллов\\n\\nСпасибо за участие! Хотите пройти еще раз? /quiz'
            },
            position: { x: 1100, y: 100 }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'start-quiz', target: 'quiz-intro' },
          { id: 'edge-2', source: 'quiz-intro', target: 'start-condition' },
          { id: 'edge-3', source: 'start-condition', target: 'question-1', sourceHandle: 'true' },
          { id: 'edge-4', source: 'question-1', target: 'answer-1' },
          { id: 'edge-5', source: 'answer-1', target: 'results-action' }
        ],
        variables: {
          quizScore: 0
        },
        settings: {
          name: 'Квиз-бот',
          description: 'Интерактивные викторины и тесты',
          platforms: ['telegram'],
          mode: 'polling',
          variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      preview: {
        features: [
          'Интерактивные викторины',
          'Подсчет баллов',
          'Разнообразные вопросы',
          'Мотивационные сообщения'
        ]
      },
      author: 'Bot Constructor Team',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addTemplate(template);
  }

  /**
   * Шаблон бота для интернет-магазина
   */
  private addShopBotTemplate(): void {
    const template: BotTemplate = {
      id: 'shop-bot',
      name: 'Интернет-магазин бот',
      description: 'Бот для продаж с каталогом товаров, корзиной и оформлением заказов',
      category: 'ecommerce',
      tags: ['магазин', 'продажи', 'каталог', 'заказы'],
      difficulty: 'advanced',
      platforms: ['telegram', 'whatsapp'],
      schema: {
        id: 'shop-bot-schema',
        name: 'Интернет-магазин бот',
        nodes: [
          {
            id: 'start-shop',
            type: 'trigger-command',
            data: { command: '/start' },
            position: { x: 100, y: 100 }
          },
          {
            id: 'shop-menu',
            type: 'action-send-message',
            data: {
              message: '🛒 Добро пожаловать в наш магазин!\\n\\nВыберите действие:\\n\\n📱 /catalog - каталог товаров\\n🛍️ /cart - моя корзина\\n📞 /support - поддержка\\n📋 /orders - мои заказы'
            },
            position: { x: 300, y: 100 }
          },
          {
            id: 'catalog-trigger',
            type: 'trigger-command',
            data: { command: '/catalog' },
            position: { x: 100, y: 250 }
          },
          {
            id: 'catalog-display',
            type: 'action-send-message',
            data: {
              message: '📱 Каталог товаров:\\n\\n1️⃣ iPhone 15 Pro - 120,000₽\\n2️⃣ Samsung Galaxy S24 - 90,000₽\\n3️⃣ Google Pixel 8 - 70,000₽\\n\\nДля заказа напишите номер товара'
            },
            position: { x: 300, y: 250 }
          },
          {
            id: 'product-select',
            type: 'condition-text-contains',
            data: { pattern: '1|2|3' },
            position: { x: 500, y: 250 }
          },
          {
            id: 'add-to-cart',
            type: 'action-send-message',
            data: {
              message: '✅ Товар добавлен в корзину!\\n\\nДля оформления заказа: /cart\\nПродолжить покупки: /catalog'
            },
            position: { x: 700, y: 250 }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'start-shop', target: 'shop-menu' },
          { id: 'edge-2', source: 'catalog-trigger', target: 'catalog-display' },
          { id: 'edge-3', source: 'catalog-display', target: 'product-select' },
          { id: 'edge-4', source: 'product-select', target: 'add-to-cart', sourceHandle: 'true' }
        ],
        variables: {
          cart: [],
          totalAmount: 0
        },
        settings: {
          name: 'Интернет-магазин бот',
          description: 'Система продаж с каталогом и корзиной',
          platforms: ['telegram'],
          mode: 'polling',
          variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      preview: {
        features: [
          'Каталог товаров с ценами',
          'Корзина покупок',
          'Оформление заказов',
          'История покупок'
        ]
      },
      author: 'Bot Constructor Team',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addTemplate(template);
  }
}