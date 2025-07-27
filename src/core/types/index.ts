/**
 * Основные типы для мультиплатформенного конструктора ботов
 */

// Платформы мессенджеров
export type MessengerPlatform = 'telegram' | 'max' | 'whatsapp' | 'discord';

// Типы узлов
export type NodeType = 
  // Триггеры
  | 'trigger-command'
  | 'trigger-message' 
  | 'trigger-callback'
  | 'trigger-inline-query'
  | 'trigger-join-group'
  | 'trigger-leave-group'
  | 'trigger-schedule'
  // Действия
  | 'action-send-message'
  | 'action-send-photo'
  | 'action-send-video'
  | 'action-send-audio'
  | 'action-send-document'
  | 'action-send-keyboard'
  | 'action-edit-message'
  | 'action-delete-message'
  | 'action-delay'
  | 'action-forward-message'
  | 'action-ban-user'
  | 'action-mute-user'
  // Условия
  | 'condition-text-contains'
  | 'condition-text-equals'
  | 'condition-user-role'
  | 'condition-variable'
  | 'condition-time-range'
  | 'condition-user-in-list'
  | 'condition-message-length'
  | 'condition-regex-match'
  | 'condition-counter'
  | 'condition-random'
  // Данные
  | 'data-variable-set'
  | 'data-variable-get'
  | 'data-save'
  | 'data-load'
  | 'data-counter-increment'
  | 'data-counter-decrement'
  | 'data-counter-reset'
  | 'data-array-add'
  | 'data-array-remove'
  | 'data-random-choice'
  | 'data-timestamp'
  // Интеграции
  | 'integration-http'
  | 'integration-webhook'
  | 'integration-database'
  | 'integration-email'
  | 'integration-json-parse'
  | 'integration-csv-parse'
  | 'integration-xml-parse'
  | 'integration-html-parse'
  | 'integration-yaml-parse'
  | 'integration-web-scraping'
  | 'integration-api-auth'
  | 'integration-file-upload'
  // Сценарии
  | 'scenario-welcome'
  | 'scenario-support'
  | 'scenario-faq'
  | 'scenario-survey'
  | 'scenario-quiz'
  | 'scenario-booking'
  | 'scenario-moderation';

// Категории узлов
export type NodeCategory = 'triggers' | 'actions' | 'conditions' | 'data' | 'integrations';

// Порт узла
export interface NodePort {
  id: string;
  name: string;
  type: 'control' | 'data';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
}

// Данные узла
export interface NodeData {
  label: string;
  config: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
}

// Узел схемы
export interface Node {
  id: string;
  type: NodeType;
  category: NodeCategory;
  position: { x: number; y: number };
  data: NodeData;
  platforms?: MessengerPlatform[]; // Ограничение по платформам
}

// Соединение между узлами
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

// Переменная
export interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  defaultValue: any;
  scope: 'global' | 'user' | 'chat';
}

// Настройки бота
export interface BotSettings {
  name: string;
  description: string;
  platforms: MessengerPlatform[];
  mode: 'polling' | 'webhook';
  variables: Record<string, Variable>;
}

// Схема бота
export interface BotSchema {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, Variable>;
  settings: BotSettings;
  version: string;
  createdAt: string;
  updatedAt: string;
}

// Статистика бота
export interface BotStats {
  messagesProcessed: number;
  activeUsers: number;
  errorCount: number;
  lastActivity: string | null;
}

// Бот
export interface Bot {
  id: string;
  name: string;
  description: string;
  platforms: MessengerPlatform[];
  status: 'active' | 'inactive' | 'draft';
  stats: BotStats;
  schema: BotSchema;
  createdAt: string;
  updatedAt: string;
}

// Учетные данные платформы
export interface PlatformCredentials {
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
  discord?: {
    token: string;
    clientId: string;
  };
}

// Возможности платформы
export interface PlatformCapabilities {
  supportsInlineButtons: boolean;
  supportsMedia: boolean;
  supportsFiles: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  maxMessageLength: number;
  supportedMediaTypes: string[];
}

// Входящее сообщение
export interface IncomingMessage {
  id: string;
  platform: MessengerPlatform;
  chatId: string;
  userId: string;
  text?: string;
  type: 'text' | 'photo' | 'video' | 'audio' | 'document' | 'sticker';
  data?: any;
  timestamp: string;
}

// Callback запрос
export interface CallbackQuery {
  id: string;
  platform: MessengerPlatform;
  chatId: string;
  userId: string;
  data: string;
  messageId?: string;
  timestamp: string;
}

// Сообщение для отправки
export interface Message {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: InlineButton[];
  disablePreview?: boolean;
}

// Медиа сообщение
export interface MediaMessage {
  type: 'photo' | 'video' | 'audio' | 'document';
  url?: string;
  file?: Buffer;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: InlineButton[];
}

// Inline кнопка
export interface InlineButton {
  text: string;
  callbackData?: string;
  url?: string;
}

// Webhook запрос
export interface WebhookRequest {
  platform: MessengerPlatform;
  body: any;
  headers: Record<string, string>;
}

// Событие триггера
export interface TriggerEvent {
  type: 'message' | 'command' | 'callback';
  platform: MessengerPlatform;
  chatId: string;
  userId: string;
  data: any;
  timestamp: string;
}

// Результат выполнения
export interface ExecutionResult {
  success: boolean;
  actions: ExecutionAction[];
  errors: ExecutionError[];
  variables: Record<string, any>;
}

// Действие выполнения
export interface ExecutionAction {
  type: 'send_message' | 'send_media' | 'set_variable' | 'http_request';
  platform: MessengerPlatform;
  chatId: string;
  data: any;
}

// Ошибка выполнения
export interface ExecutionError {
  nodeId: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

// Результат валидации
export interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    errorCount: number;
    warningCount: number;
    totalIssues: number;
  };
}

// Ошибка валидации
export interface ValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  connectionId?: string;
  context?: string;
}

// Результат экспорта
export interface ExportResult {
  success: boolean;
  files: ExportFile[];
  errors: string[];
}

// Файл экспорта
export interface ExportFile {
  name: string;
  content: string;
  type: 'javascript' | 'python' | 'json' | 'markdown';
}