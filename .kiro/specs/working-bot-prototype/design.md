# Дизайн мультиплатформенного конструктора ботов

## Обзор

Система представляет собой мультиплатформенный конструктор ботов с визуальным интерфейсом, позволяющий создавать ботов для различных мессенджеров используя единую схему логики. Архитектура основана на модульном подходе с адаптерами для каждого мессенджера и визуальным редактором в стиле N8N.

## Архитектура

### Высокоуровневая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Dashboard      │  │  Visual Editor  │  │  Bot Settings   │ │
│  │                 │  │  (React Flow)   │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP API
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API Routes    │  │  Schema Engine  │  │  Bot Runtime    │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Messenger Adapters                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Telegram       │  │      MAX        │  │   WhatsApp      │ │
│  │  Adapter        │  │    Adapter      │  │   Adapter       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ Webhooks/Polling
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                External Messenger APIs                     │
│     Telegram Bot API    │    MAX API    │   WhatsApp API    │
└─────────────────────────────────────────────────────────────┘
```

### Модульная архитектура

Система построена на принципе модульности:

1. **Core Engine** - основная логика обработки схем
2. **Messenger Adapters** - изолированные модули для каждого мессенджера
3. **Visual Editor** - независимый React компонент
4. **Data Layer** - унифицированное хранение данных
5. **Runtime Engine** - выполнение логики ботов

## Компоненты и интерфейсы

### 1. Frontend Components

#### Dashboard Component
```typescript
interface DashboardProps {
  bots: Bot[];
  onCreateBot: () => void;
  onEditBot: (botId: string) => void;
  onDeleteBot: (botId: string) => void;
}

interface Bot {
  id: string;
  name: string;
  description: string;
  platforms: MessengerPlatform[];
  status: 'active' | 'inactive' | 'draft';
  stats: BotStats;
  createdAt: string;
  updatedAt: string;
}
```

#### Visual Editor Component
```typescript
interface VisualEditorProps {
  botId: string;
  schema: BotSchema;
  onSave: (schema: BotSchema) => void;
  onValidate: (schema: BotSchema) => ValidationResult;
}

interface BotSchema {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, Variable>;
  settings: BotSettings;
}
```

#### Node Library Component
```typescript
interface NodeLibraryProps {
  categories: NodeCategory[];
  onNodeDrag: (nodeType: string) => void;
  platformFilter?: MessengerPlatform[];
}

interface NodeCategory {
  id: string;
  name: string;
  icon: string;
  nodes: NodeTemplate[];
}
```

### 2. Backend API Interfaces

#### Bot Management API
```typescript
// GET /api/bots
interface GetBotsResponse {
  success: boolean;
  data: {
    bots: Bot[];
    total: number;
  };
}

// POST /api/bots
interface CreateBotRequest {
  name: string;
  description: string;
  platforms: MessengerPlatform[];
  template?: string;
}

// PUT /api/bots/:id/schema
interface UpdateSchemaRequest {
  schema: BotSchema;
  validate?: boolean;
}
```

#### Messenger Configuration API
```typescript
// POST /api/bots/:id/platforms
interface AddPlatformRequest {
  platform: MessengerPlatform;
  credentials: PlatformCredentials;
  mode: 'polling' | 'webhook';
}

interface PlatformCredentials {
  telegram?: {
    token: string;
  };
  max?: {
    apiKey: string;
    secretKey: string;
  };
  whatsapp?: {
    phoneNumberId: string;
    accessToken: string;
  };
}
```

### 3. Messenger Adapter Interface

```typescript
interface MessengerAdapter {
  platform: MessengerPlatform;
  
  // Инициализация
  initialize(credentials: PlatformCredentials): Promise<void>;
  
  // Отправка сообщений
  sendMessage(chatId: string, message: Message): Promise<void>;
  sendMedia(chatId: string, media: MediaMessage): Promise<void>;
  
  // Получение сообщений
  startPolling?(): void;
  stopPolling?(): void;
  handleWebhook?(request: WebhookRequest): Promise<void>;
  
  // Обработка событий
  onMessage(handler: (message: IncomingMessage) => void): void;
  onCallback(handler: (callback: CallbackQuery) => void): void;
  
  // Валидация
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;
  
  // Специфичные функции
  getCapabilities(): PlatformCapabilities;
}
```

### 4. Schema Engine Interface

```typescript
interface SchemaEngine {
  // Выполнение схемы
  executeSchema(schema: BotSchema, trigger: TriggerEvent): Promise<ExecutionResult>;
  
  // Валидация
  validateSchema(schema: BotSchema): ValidationResult;
  
  // Конвертация
  convertLegacySchema(legacySchema: any): BotSchema;
  
  // Экспорт
  exportToCode(schema: BotSchema, platform: 'nodejs' | 'python'): ExportResult;
}

interface TriggerEvent {
  type: 'message' | 'command' | 'callback';
  platform: MessengerPlatform;
  chatId: string;
  userId: string;
  data: any;
}
```

## Модели данных

### Основные модели

```typescript
// Узел схемы
interface Node {
  id: string;
  type: NodeType;
  category: NodeCategory;
  position: { x: number; y: number };
  data: NodeData;
  platforms?: MessengerPlatform[]; // Ограничение по платформам
}

// Типы узлов
type NodeType = 
  | 'trigger-command'
  | 'trigger-message' 
  | 'trigger-callback'
  | 'action-send-message'
  | 'action-send-media'
  | 'condition-text-contains'
  | 'condition-user-role'
  | 'data-variable'
  | 'data-counter'
  | 'integration-http'
  | 'integration-webhook';

// Категории узлов
type NodeCategory = 'triggers' | 'actions' | 'conditions' | 'data' | 'integrations';

// Платформы мессенджеров
type MessengerPlatform = 'telegram' | 'max' | 'whatsapp' | 'discord';

// Данные узла
interface NodeData {
  label: string;
  config: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
}

// Порт узла
interface NodePort {
  id: string;
  name: string;
  type: 'control' | 'data';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
}

// Соединение между узлами
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

// Переменная
interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  defaultValue: any;
  scope: 'global' | 'user' | 'chat';
}
```

### Конфигурации узлов

```typescript
// Конфигурация триггера команды
interface CommandTriggerConfig {
  command: string;
  description?: string;
  platforms: MessengerPlatform[];
}

// Конфигурация отправки сообщения
interface SendMessageConfig {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: InlineButton[];
  platforms: MessengerPlatform[];
}

// Конфигурация HTTP интеграции
interface HttpIntegrationConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  responseMapping?: Record<string, string>;
}
```

## Обработка ошибок

### Стратегия обработки ошибок

1. **Изоляция ошибок** - ошибка в одном узле не должна останавливать выполнение других
2. **Graceful degradation** - система должна продолжать работать при недоступности отдельных компонентов
3. **Подробное логирование** - все ошибки логируются с контекстом для отладки
4. **Пользовательские уведомления** - понятные сообщения об ошибках в интерфейсе

### Типы ошибок

```typescript
interface BotError {
  id: string;
  type: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: ErrorContext;
  timestamp: string;
  resolved: boolean;
}

type ErrorType = 
  | 'validation_error'
  | 'runtime_error'
  | 'platform_error'
  | 'integration_error'
  | 'data_error';

interface ErrorContext {
  botId: string;
  nodeId?: string;
  platform?: MessengerPlatform;
  userId?: string;
  chatId?: string;
  stackTrace?: string;
}
```

## Стратегия тестирования

### Уровни тестирования

1. **Unit Tests** - тестирование отдельных компонентов и функций
2. **Integration Tests** - тестирование взаимодействия между компонентами
3. **E2E Tests** - тестирование полных пользовательских сценариев
4. **Platform Tests** - тестирование адаптеров мессенджеров

### Тестовые сценарии

```typescript
// Пример тестового сценария
describe('Bot Schema Execution', () => {
  it('should execute simple command-response flow', async () => {
    const schema = createTestSchema([
      { type: 'trigger-command', config: { command: '/start' } },
      { type: 'action-send-message', config: { text: 'Hello!' } }
    ]);
    
    const result = await schemaEngine.executeSchema(schema, {
      type: 'command',
      platform: 'telegram',
      data: { command: '/start' }
    });
    
    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('send_message');
  });
});
```

## Производительность и масштабирование

### Оптимизации

1. **Lazy Loading** - загрузка компонентов по требованию
2. **Caching** - кэширование схем и результатов валидации
3. **Connection Pooling** - пул соединений для внешних API
4. **Rate Limiting** - ограничение частоты запросов к мессенджерам

### Метрики производительности

```typescript
interface PerformanceMetrics {
  schemaExecutionTime: number;
  messageProcessingTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
}
```

## Безопасность

### Меры безопасности

1. **Валидация входных данных** - все пользовательские данные валидируются
2. **Изоляция токенов** - токены мессенджеров хранятся в зашифрованном виде
3. **Rate Limiting** - защита от злоупотреблений API
4. **Webhook Security** - проверка подписей webhook'ов
5. **CORS Policy** - настройка политик CORS для API

### Модель безопасности

```typescript
interface SecurityConfig {
  tokenEncryption: {
    algorithm: string;
    keyRotationInterval: number;
  };
  rateLimiting: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  webhookSecurity: {
    validateSignatures: boolean;
    allowedIPs?: string[];
  };
}
```

## Развертывание и мониторинг

### Архитектура развертывания

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    
  backend:
    build: ./backend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Мониторинг

```typescript
interface MonitoringMetrics {
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  application: {
    activeUsers: number;
    activeBots: number;
    messagesPerSecond: number;
    errorRate: number;
  };
  platforms: Record<MessengerPlatform, {
    status: 'online' | 'offline' | 'degraded';
    responseTime: number;
    errorCount: number;
  }>;
}
```

## Миграция и обратная совместимость

### Стратегия миграции

1. **Автоматическая миграция** - система автоматически конвертирует старые форматы
2. **Backup создание** - все данные бэкапятся перед миграцией
3. **Постепенная миграция** - поддержка старых и новых форматов параллельно
4. **Rollback возможность** - возможность отката к предыдущей версии

### Версионирование схем

```typescript
interface SchemaVersion {
  version: string;
  migrationPath: string[];
  deprecated: boolean;
  supportUntil?: string;
}

interface MigrationRule {
  fromVersion: string;
  toVersion: string;
  transform: (oldSchema: any) => BotSchema;
  validate: (newSchema: BotSchema) => boolean;
}
```