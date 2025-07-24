# Документ дизайна

## Обзор

Конструктор ботов - это инновационная веб-платформа для создания Telegram-ботов без программирования, объединяющая лучшие практики от ведущих решений рынка. Система использует **прогрессивный подход сложности**: от простых блоков (как ManyBot) до продвинутой логики (как Node-RED), с готовыми бизнес-сценариями (как SendPulse) и мощными интеграциями (как Make.com).

## Технические решения

### Выбранный стек технологий

**Frontend:**
- **TypeScript** - статическая типизация для предотвращения ошибок в сложной логике визуального редактора
- **React** - современная библиотека для создания пользовательских интерфейсов
- **Vite** - быстрая сборка и hot reload для эффективной разработки
- **CSS Modules** - локальная область видимости стилей, простая интеграция с существующим кодом
- **React Flow** - мощная библиотека для создания визуальных редакторов с drag-and-drop
- **Jest + React Testing Library** - стандарт индустрии для тестирования React приложений

**Backend (без изменений):**
- **Node.js + Express** - существующий сервер остается без изменений
- **Файловая система JSON** - текущая система хранения данных
- **Статическая раздача** - React build будет собираться в public/ папку

**Преимущества выбранного подхода:**
- Минимальные изменения в backend архитектуре
- Современный и надежный frontend стек
- Отличная поддержка TypeScript в React Flow
- Простая интеграция с существующим Express сервером

**Ключевые принципы:**
- **Простота для новичков** - интуитивный drag-and-drop интерфейс
- **Мощность для профи** - сложная логика, циклы, API интеграции  
- **Русскоязычность** - полная локализация и поддержка
- **Внутреннее использование** - оптимизация для локального развертывания без продакшн-инфраструктуры

**Трехуровневая архитектура сложности:**
1. **Уровень "Быстрый старт"** - простые блоки за 5 минут
2. **Уровень "Бизнес-сценарии"** - готовые шаблоны за 30 минут
3. **Уровень "Без ограничений"** - полная гибкость для экспертов
- **Открытость** - возможность самостоятельного развертывания
- **Модульность** - расширяемая архитектура блоков

## Архитектура

### Трехуровневая архитектура сложности

```
┌─────────────────────────────────────────────────────────────┐
│                    УРОВЕНЬ 3: ПРОФИ                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Кастомные   │  │ API         │  │ Сложная     │         │
│  │ функции     │  │ интеграции  │  │ логика      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  УРОВЕНЬ 2: БИЗНЕС                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Готовые     │  │ CRM         │  │ Воронки     │         │
│  │ сценарии    │  │ интеграции  │  │ продаж      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 УРОВЕНЬ 1: НОВИЧКИ                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Простые     │  │ Сообщения   │  │ Кнопки      │         │
│  │ триггеры    │  │ и медиа     │  │ и меню      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Визуальный интерфейс (вдохновлен лучшими практиками)

```
┌─────────────────┐ ┌─────────────────────────────┐ ┌─────────────────┐
│  БИБЛИОТЕКА     │ │       РАБОЧАЯ ОБЛАСТЬ       │ │   НАСТРОЙКИ     │
│   БЛОКОВ        │ │        (Canvas)             │ │    БЛОКА        │
│                 │ │                             │ │                 │
│ 🟦 Триггеры     │ │  ┌─[Команда]─┐              │ │ ┌─────────────┐ │
│ 🟨 Условия      │ │  │  /start   │              │ │ │ Команда:    │ │
│ 🟩 Действия     │ │  └─────┬─────┘              │ │ │ /start      │ │
│ 🟪 Данные       │ │        │                    │ │ │             │ │
│ 🟧 Интеграции   │ │        ▼                    │ │ │ Описание:   │ │
│ 📦 Сценарии     │ │  ┌─[Сообщение]─┐           │ │ │ Приветствие │ │
│                 │ │  │ Привет!     │           │ │ └─────────────┘ │
│ 🔍 [Поиск...]   │ │  └─────────────┘           │ │                 │
└─────────────────┘ └─────────────────────────────┘ └─────────────────┘
```

### Система типизированных связей (как в Node-RED)

```
Типы соединений:
━━━━━ Основной поток (толстая синяя линия)
┅┅┅┅┅ Условный переход (пунктирная желтая)
~~~~~ Передача данных (волнистая зеленая)
××××× Обработка ошибок (красная)
▓▓▓▓▓ Событийная связь (фиолетовая)
```

### Компонентная архитектура

**Frontend (React + TypeScript + Vite):**
- **React Flow Editor:** Визуальный редактор на базе React Flow для drag-and-drop интерфейса
- **TypeScript:** Статическая типизация для предотвращения ошибок в сложной логике визуального редактора
- **CSS Modules:** Локальная область видимости стилей, легкая интеграция с существующим кодом
- **Vite:** Быстрая сборка и hot reload для современной разработки
- **Jest + React Testing Library:** Стандарт индустрии для тестирования React компонентов
- **Двухоконный интерфейс:** Дашборд + редактор для лучшего UX

**Backend (Node.js + Express):**
- **Node Engine:** Система выполнения узлов с типизацией
- **Template Manager:** Управление шаблонами и сценариями  
- **Integration Hub:** Подключение внешних API и сервисов
- **Analytics Engine:** Сбор метрик и аналитика использования
- **Static Files:** Раздача React build из public/ (минимальные изменения в архитектуре)

**Bot Runtime (Производительная среда):**
- **Multi-Bot Manager:** Управление множественными ботами
- **Context Manager:** Управление состоянием и переменными
- **Event Router:** Маршрутизация событий между узлами
- **Debug Interface:** Интерфейс отладки в реальном времени

## Компоненты и интерфейсы

### Система узлов (вдохновлена Node-RED + улучшения)

**Базовый интерфейс узла:**
```javascript
interface BaseNode {
  id: string;
  type: string;
  category: 'triggers' | 'conditions' | 'actions' | 'data' | 'integrations' | 'scenarios';
  complexity: 'beginner' | 'business' | 'advanced';
  
  // Визуальные свойства
  position: { x: number, y: number };
  size: { width: number, height: number };
  color: string;
  icon: string;
  
  // Логические свойства
  inputs: NodePort[];
  outputs: NodePort[];
  config: NodeConfig;
  
  // Мета-информация
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
}
```

**Типизированные порты (как в Node-RED):**
```javascript
interface NodePort {
  id: string;
  name: string;
  type: 'control' | 'data' | 'event' | 'error';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  multiple: boolean; // Может ли принимать множественные соединения
}
```

### Frontend компоненты (React + TypeScript)

**1. React Flow визуальный редактор**
```typescript
interface ReactFlowEditor {
  canvas: ReactFlowInstance;
  nodeLibrary: NodeLibraryPanel;
  propertyPanel: PropertyPanel;
  
  // React Flow возможности
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  // Кастомные типы узлов
  nodeTypes: Record<string, ComponentType<NodeProps>>;
  edgeTypes: Record<string, ComponentType<EdgeProps>>;
}
```

**2. Библиотека узлов (TypeScript)**
```typescript
interface NodeLibrary {
  // Категории узлов
  triggerNodes: NodeDefinition[];
  actionNodes: NodeDefinition[];
  conditionNodes: NodeDefinition[];
  dataNodes: NodeDefinition[];
  
  // Поиск и фильтрация
  search: (query: string) => NodeDefinition[];
  filterByCategory: (category: NodeCategory) => NodeDefinition[];
  
  // React Flow интеграция
  createNode: (type: string, position: XYPosition) => Node;
  getNodeComponent: (type: string) => ComponentType<NodeProps>;
}
```

**3. Система готовых сценариев (TypeScript)**
```typescript
interface ScenarioLibrary {
  categories: {
    moderation: ModerationScenarios;
    ecommerce: EcommerceScenarios;
    support: SupportScenarios;
    marketing: MarketingScenarios;
    games: GameScenarios;
  };
  
  applyScenario: (scenarioId: string, customization?: Partial<Scenario>) => Promise<void>;
  customizeScenario: (scenario: Scenario) => Scenario;
  saveAsTemplate: (nodes: Node[], edges: Edge[]) => Promise<void>;
}
```

## Уникальные инновации нашего конструктора

### 1. Прогрессивная сложность (Progressive Complexity)
```
Новичок → Бизнес-пользователь → Продвинутый разработчик
   │              │                        │
   ▼              ▼                        ▼
Простые        Готовые               Кастомная
блоки          сценарии              логика
```

**Адаптивный интерфейс:**
- Показывает только нужные блоки для текущего уровня
- Постепенно открывает новые возможности
- Подсказки и обучающие материалы

### 2. Умные подсказки и автодополнение
```javascript
interface SmartSuggestions {
  // Предлагает следующие блоки на основе контекста
  suggestNextNodes: (currentNode: BaseNode) => Suggestion[];
  
  // Автоматически создает связи между совместимыми блоками
  autoConnect: (sourceNode: BaseNode, targetNode: BaseNode) => boolean;
  
  // Валидирует схему в реальном времени
  validateSchema: (nodes: BaseNode[]) => ValidationResult[];
  
  // Предлагает оптимизации
  suggestOptimizations: (schema: BotSchema) => Optimization[];
}
```

### 3. Живая отладка (Live Debug)
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 [Команда /start] ──► 🟡 [Проверка пользователя] ──► │
│                                    │                   │
│ Выполнено: 15:30:45               ▼                   │
│ Пользователь: @john_doe     🟢 [Отправить приветствие] │
│ Данные: {user_id: 123456}                             │
└─────────────────────────────────────────────────────────┘
```

### 4. Экспорт готового кода
```javascript
interface CodeExporter {
  // Генерирует готовый Node.js проект
  exportToNodeJS: (schema: BotSchema) => ProjectFiles;
  
  // Создает Docker-контейнер
  exportToDocker: (schema: BotSchema) => DockerConfig;
  
  // Генерирует документацию
  generateDocs: (schema: BotSchema) => Documentation;
}
```

### Backend API endpoints (расширенные)

**Умные возможности:**
- `POST /api/suggestions/next-nodes` - предложения следующих блоков
- `POST /api/validation/schema` - валидация схемы бота
- `POST /api/optimization/analyze` - анализ и оптимизация
- `GET /api/compatibility/:nodeType` - совместимые блоки

**Отладка и тестирование:**
- `POST /bots/:id/debug/start` - начать отладочную сессию
- `GET /bots/:id/debug/step` - пошаговое выполнение
- `GET /bots/:id/debug/variables` - просмотр переменных
- `POST /bots/:id/test/message` - тестовое сообщение

**Экспорт и развертывание:**
- `POST /bots/:id/export/nodejs` - экспорт в Node.js
- `POST /bots/:id/export/docker` - создание Docker-образа
- `POST /bots/:id/deploy/cloud` - развертывание в облаке
- `GET /bots/:id/export/docs` - генерация документации

**Сообщество и шаблоны:**
- `GET /community/templates` - шаблоны от сообщества
- `POST /community/templates` - поделиться шаблоном
- `GET /community/templates/:id/rating` - рейтинг шаблона
- `POST /community/templates/:id/fork` - создать копию шаблона

### Bot Runtime интерфейсы

**Webhook обработчик:**
```javascript
interface WebhookHandler {
  route: (update: TelegramUpdate) => BotInstance;
  process: (botId: string, update: TelegramUpdate) => void;
  log: (botId: string, event: LogEvent) => void;
}
```

**Экземпляр бота:**
```javascript
interface BotInstance {
  id: string;
  token: string;
  config: BotConfiguration;
  handlers: MessageHandler[];
  state: BotState;
}
```

## Модели данных (JSON файлы)

### Структура файловой системы
```
/data
  /users
    - user_123456.json (telegramId как имя файла)
  /bots  
    - bot_uuid1.json
    - bot_uuid2.json
  /templates
    - template_moderation.json
    - template_shop.json
  /logs
    - bot_uuid1_2024-01.json (логи по месяцам)
```

### Пользователь (users/user_123456.json)
```javascript
{
  telegramId: 123456,
  username: "john_doe",
  firstName: "John",
  lastName: "Doe",
  subscription: {
    plan: "free", // 'free' | 'premium'
    expiresAt: "2024-12-31T23:59:59Z",
    botsLimit: 1
  },
  bots: ["bot_uuid1", "bot_uuid2"], // список ID ботов
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-20T15:45:00Z"
}
```

### Бот (bots/bot_uuid1.json)
```javascript
{
  id: "bot_uuid1",
  userId: 123456,
  name: "Мой первый бот",
  description: "Бот для модерации группы",
  token: "encrypted_bot_token",
  status: "active", // 'draft' | 'active' | 'paused'
  configuration: {
    nodes: [
      {
        id: "node1",
        type: "trigger", // 'trigger' | 'action' | 'condition'
        position: { x: 100, y: 50 },
        data: {
          triggerType: "message",
          filters: ["text"]
        },
        connections: ["node2"]
      }
    ],
    variables: {},
    settings: {
      welcomeMessage: "Добро пожаловать!",
      adminIds: [123456]
    }
  },
  template: {
    id: "moderation",
    category: "community",
    customizations: {}
  },
  stats: {
    messagesProcessed: 150,
    activeUsers: 25,
    lastActivity: "2024-01-20T12:00:00Z"
  },
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-20T15:45:00Z"
}
```

### Шаблон (templates/template_moderation.json)
```javascript
{
  id: "moderation",
  name: "Модерационный бот",
  description: "Автоматическая модерация сообщений в группе",
  category: "community",
  isPremium: false,
  configuration: {
    nodes: [
      {
        id: "trigger1",
        type: "trigger",
        position: { x: 50, y: 50 },
        data: { triggerType: "new_member" },
        connections: ["action1"]
      },
      {
        id: "action1", 
        type: "action",
        position: { x: 200, y: 50 },
        data: { 
          actionType: "send_message",
          message: "Добро пожаловать в группу!"
        },
        connections: []
      }
    ],
    defaultSettings: {
      deleteSpam: true,
      muteTime: 300
    }
  },
  preview: {
    screenshots: ["moderation_preview.png"],
    demoBot: "@demo_moderation_bot"
  },
  usage: {
    installs: 0,
    rating: 0
  },
  createdAt: "2024-01-01T00:00:00Z"
}
```

## Обработка ошибок

### Уровни обработки ошибок

**1. Frontend уровень:**
- Валидация пользовательского ввода
- Обработка сетевых ошибок
- Уведомления пользователю через toast/modal

**2. Backend API уровень:**
- Валидация запросов (joi/yup)
- Обработка ошибок базы данных
- Стандартизированные HTTP коды ответов
- Логирование ошибок

**3. Bot Runtime уровень:**
- Обработка ошибок Telegram API
- Fallback сценарии для ботов
- Автоматический перезапуск при критических ошибках

### Стратегии восстановления

**Telegram API недоступен:**
- Очередь сообщений с повторными попытками
- Уведомление владельца бота через платформу

**База данных недоступна:**
- Кэширование критических данных в памяти
- Graceful degradation функциональности

**Ошибки в логике бота:**
- Автоматический откат к последней рабочей версии
- Уведомление пользователя с предложением исправления

## Стратегия тестирования

### Unit тестирование
- Тестирование бизнес-логики API
- Тестирование компонентов генерации кода
- Покрытие критических функций > 80%

### Integration тестирование
- Тестирование API endpoints
- Тестирование взаимодействия с MongoDB
- Тестирование Telegram webhook'ов

### E2E тестирование
- Создание бота через UI
- Тестирование работы бота в Telegram
- Проверка биллинга и подписок

### Тестирование производительности
- Нагрузочное тестирование API
- Тестирование обработки множественных webhook'ов
- Мониторинг использования памяти и CPU

### Стратегия развертывания

**Среда разработки (Raspberry Pi):**
- Docker Compose для всех сервисов
- Автоматическая перезагрузка при изменениях
- Тестовые данные и моки

**Продакшн среда (VPS):**
- Docker контейнеры с оркестрацией
- NGINX как reverse proxy
- SSL сертификаты (уже настроены)
- Автоматические бэкапы MongoDB
- Мониторинг и алерты

**CI/CD пайплайн:**
- Git hooks для автоматического тестирования
- Автоматическое развертывание на Raspberry Pi
- Ручное развертывание в продакшн после тестирования