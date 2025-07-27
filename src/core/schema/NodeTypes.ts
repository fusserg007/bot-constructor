/**
 * Детальные типы узлов для визуального редактора
 */

import { MessengerPlatform } from '../types';

// Базовые типы данных
export type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

// Типы портов
export type PortType = 'control' | 'data';

// Направление порта
export type PortDirection = 'input' | 'output';

// Порт узла
export interface NodePort {
  id: string;
  name: string;
  type: PortType;
  direction: PortDirection;
  dataType: DataType;
  required: boolean;
  multiple?: boolean; // Может ли принимать множественные соединения
  description?: string;
}

// Конфигурация поля
export interface FieldConfig {
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'code';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>; // Для select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string; // Кастомная функция валидации
  };
  placeholder?: string;
  hint?: string;
}

// Конфигурация узла
export interface NodeConfig {
  [key: string]: any;
}

// Метаданные узла
export interface NodeMetadata {
  category: 'triggers' | 'actions' | 'conditions' | 'data' | 'integrations' | 'flow';
  subcategory?: string;
  icon: string;
  color: string;
  description: string;
  documentation?: string;
  examples?: Array<{
    title: string;
    description: string;
    config: NodeConfig;
  }>;
  supportedPlatforms: MessengerPlatform[] | 'all';
  version: string;
  deprecated?: boolean;
  experimental?: boolean;
}

// Определение типа узла
export interface NodeTypeDefinition {
  type: string;
  name: string;
  metadata: NodeMetadata;
  inputs: NodePort[];
  outputs: NodePort[];
  configFields: Record<string, FieldConfig>;
  defaultConfig: NodeConfig;
  validation?: {
    required?: string[];
    custom?: string; // Кастомная функция валидации
  };
}

// Экземпляр узла
export interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: NodeConfig;
  metadata?: {
    label?: string;
    notes?: string;
    disabled?: boolean;
    breakpoint?: boolean;
  };
}

// Соединение между узлами
export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  metadata?: {
    label?: string;
    color?: string;
    animated?: boolean;
  };
}

// Группа узлов
export interface NodeGroup {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  collapsed?: boolean;
}

// Переменная схемы
export interface SchemaVariable {
  id: string;
  name: string;
  type: DataType;
  scope: 'global' | 'user' | 'chat' | 'session';
  defaultValue: any;
  description?: string;
  persistent?: boolean; // Сохраняется ли между сессиями
}

// Константа схемы
export interface SchemaConstant {
  id: string;
  name: string;
  value: any;
  type: DataType;
  description?: string;
}

// Настройки схемы
export interface SchemaSettings {
  name: string;
  description: string;
  version: string;
  platforms: MessengerPlatform[];
  mode: 'polling' | 'webhook' | 'hybrid';
  timeout: number; // Таймаут выполнения в секундах
  maxExecutionDepth: number; // Максимальная глубина выполнения
  errorHandling: 'stop' | 'continue' | 'retry';
  retryAttempts: number;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeUserData: boolean;
    retention: number; // Дни хранения логов
  };
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
  };
}

// Полная схема бота
export interface BotSchema {
  id: string;
  settings: SchemaSettings;
  nodes: NodeInstance[];
  connections: NodeConnection[];
  groups: NodeGroup[];
  variables: Record<string, SchemaVariable>;
  constants: Record<string, SchemaConstant>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    tags?: string[];
    thumbnail?: string; // Base64 изображение превью
  };
}

// Результат валидации схемы
export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationError[];
  stats: {
    nodeCount: number;
    connectionCount: number;
    variableCount: number;
    groupCount: number;
    complexity: number; // Оценка сложности схемы
  };
}

// Ошибка валидации схемы
export interface SchemaValidationError {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'node' | 'connection' | 'variable' | 'schema' | 'platform';
  message: string;
  details?: string;
  nodeId?: string;
  connectionId?: string;
  suggestions?: string[];
  fixable?: boolean; // Может ли быть исправлена автоматически
}

// Контекст выполнения
export interface ExecutionContext {
  botId: string;
  schemaId: string;
  platform: MessengerPlatform;
  chatId: string;
  userId: string;
  messageId?: string;
  variables: Record<string, any>;
  constants: Record<string, any>;
  sessionData: Record<string, any>;
  startTime: string;
  traceId: string;
}

// Результат выполнения узла
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  outputs: Record<string, any>;
  actions: ExecutionAction[];
  errors: ExecutionError[];
  executionTime: number; // Время выполнения в мс
  nextNodes: string[]; // ID следующих узлов для выполнения
}

// Действие выполнения
export interface ExecutionAction {
  id: string;
  type: 'send_message' | 'send_media' | 'set_variable' | 'http_request' | 'delay' | 'log';
  platform: MessengerPlatform;
  chatId: string;
  data: any;
  priority: number;
  delay?: number; // Задержка в мс
}

// Ошибка выполнения
export interface ExecutionError {
  id: string;
  nodeId: string;
  type: 'validation' | 'runtime' | 'platform' | 'timeout' | 'permission';
  message: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  recoverable: boolean;
  context?: Record<string, any>;
}

// Трассировка выполнения
export interface ExecutionTrace {
  traceId: string;
  botId: string;
  schemaId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  steps: ExecutionStep[];
  totalExecutionTime?: number;
  context: ExecutionContext;
}

// Шаг выполнения
export interface ExecutionStep {
  stepId: string;
  nodeId: string;
  nodeType: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  actions: ExecutionAction[];
  errors: ExecutionError[];
  executionTime?: number;
}

export default {
  NodePort,
  FieldConfig,
  NodeConfig,
  NodeMetadata,
  NodeTypeDefinition,
  NodeInstance,
  NodeConnection,
  NodeGroup,
  SchemaVariable,
  SchemaConstant,
  SchemaSettings,
  BotSchema,
  SchemaValidationResult,
  SchemaValidationError,
  ExecutionContext,
  NodeExecutionResult,
  ExecutionAction,
  ExecutionError,
  ExecutionTrace,
  ExecutionStep
};