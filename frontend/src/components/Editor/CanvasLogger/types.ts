// Типы для системы логирования канваса

export type CanvasLogAction = 
  | 'NODE_EXPAND'
  | 'NODE_COLLAPSE'
  | 'DRAG_START'
  | 'DRAG_END'
  | 'DROP_SUCCESS'
  | 'DROP_FAILED'
  | 'CONNECTION_CREATE'
  | 'CONNECTION_DELETE'
  | 'NODE_ADD'
  | 'NODE_DELETE'
  | 'NODE_UPDATE'
  | 'VALIDATION_ERROR'
  | 'VALIDATION_WARNING'
  | 'SAVE_START'
  | 'SAVE_SUCCESS'
  | 'SAVE_ERROR'
  | 'LIBRARY_OPEN'
  | 'LIBRARY_CLOSE'
  | 'GROUP_CREATE'
  | 'GROUP_DELETE'
  | 'PORT_HOVER'
  | 'PORT_CLICK'
  | 'PORTS_HOVER_START'
  | 'PORT_CONNECTION_ATTEMPT'
  | 'GROUP_UPDATE';

export interface CanvasLogEntry {
  timestamp: string;
  action: CanvasLogAction;
  details: string;
  nodeId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  error?: boolean;
  metadata?: Record<string, any>;
}

export interface CanvasLoggerConfig {
  enabled: boolean;
  maxEntries: number;
  logToConsole: boolean;
  logToFile: boolean;
  clearOnRestart: boolean;
}