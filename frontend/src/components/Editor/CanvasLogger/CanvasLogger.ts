import { CanvasLogEntry, CanvasLogAction, CanvasLoggerConfig } from './types';

class CanvasLogger {
  private static instance: CanvasLogger;
  private logs: CanvasLogEntry[] = [];
  private config: CanvasLoggerConfig = {
    enabled: true,
    maxEntries: 1000,
    logToConsole: false, // Отключено по умолчанию для production
    logToFile: true,
    clearOnRestart: true
  };

  private constructor() {
    this.initializeLogger();
  }

  public static getInstance(): CanvasLogger {
    if (!CanvasLogger.instance) {
      CanvasLogger.instance = new CanvasLogger();
    }
    return CanvasLogger.instance;
  }

  private initializeLogger(): void {
    if (this.config.clearOnRestart) {
      this.clearLogs();
    }
    
    // Логируем инициализацию
    this.log('LIBRARY_OPEN', 'Canvas logger initialized');
  }

  public log(
    action: CanvasLogAction,
    details: string,
    options?: {
      nodeId?: string;
      sourceNodeId?: string;
      targetNodeId?: string;
      error?: boolean;
      metadata?: Record<string, any>;
    }
  ): void {
    if (!this.config.enabled) return;

    const entry: CanvasLogEntry = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      details,
      ...options
    };

    // Добавляем в память
    this.logs.push(entry);

    // Ограничиваем количество записей
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Логируем в консоль если включено
    if (this.config.logToConsole) {
      const logLevel = entry.error ? 'error' : 'info';
      console[logLevel](`[${entry.timestamp}] ${entry.action}: ${entry.details}`, entry.metadata || '');
    }

    // Отправляем на сервер для записи в файл
    if (this.config.logToFile) {
      this.writeToFile(entry);
    }
  }

  private async writeToFile(entry: CanvasLogEntry): Promise<void> {
    try {
      const logLine = this.formatLogEntry(entry);
      
      // Отправляем на backend для записи в файл
      await fetch('/api/canvas-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logLine })
      });
    } catch (error) {
      // Не логируем ошибки записи в лог, чтобы избежать рекурсии
      if (this.config.logToConsole) {
        console.error('Failed to write canvas log:', error);
      }
    }
  }

  private formatLogEntry(entry: CanvasLogEntry): string {
    let logLine = `[${entry.timestamp}] ${entry.action}: ${entry.details}`;
    
    if (entry.nodeId) {
      logLine += ` (Node: ${entry.nodeId})`;
    }
    
    if (entry.sourceNodeId && entry.targetNodeId) {
      logLine += ` (${entry.sourceNodeId} → ${entry.targetNodeId})`;
    }
    
    if (entry.error) {
      logLine += ' [ERROR]';
    }
    
    return logLine;
  }

  public getLogs(): CanvasLogEntry[] {
    return [...this.logs];
  }

  public getRecentLogs(count: number = 50): CanvasLogEntry[] {
    return this.logs.slice(-count);
  }

  public clearLogs(): void {
    this.logs = [];
    
    // Очищаем файл лога на сервере
    if (this.config.logToFile) {
      fetch('/api/canvas-log/clear', { method: 'POST' }).catch(() => {
        // Игнорируем ошибки очистки
      });
    }
  }

  public updateConfig(newConfig: Partial<CanvasLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): CanvasLoggerConfig {
    return { ...this.config };
  }

  // Удобные методы для часто используемых действий
  public logNodeExpand(nodeId: string): void {
    this.log('NODE_EXPAND', `Node expanded`, { nodeId });
  }

  public logNodeCollapse(nodeId: string): void {
    this.log('NODE_COLLAPSE', `Node collapsed`, { nodeId });
  }

  public logDragStart(nodeType: string, source: string): void {
    this.log('DRAG_START', `${nodeType} component from ${source}`);
  }

  public logDropSuccess(nodeType: string, targetNodeId?: string): void {
    this.log('DROP_SUCCESS', `${nodeType} added${targetNodeId ? ` to ${targetNodeId}` : ' to canvas'}`, { nodeId: targetNodeId });
  }

  public logConnectionCreate(sourceNodeId: string, targetNodeId: string): void {
    this.log('CONNECTION_CREATE', `Connection created`, { sourceNodeId, targetNodeId });
  }

  public logValidationError(nodeId: string, error: string): void {
    this.log('VALIDATION_ERROR', `${error}`, { nodeId, error: true });
  }

  public logSaveOperation(success: boolean, details: string): void {
    const action = success ? 'SAVE_SUCCESS' : 'SAVE_ERROR';
    this.log(action, details, { error: !success });
  }
}

// Экспортируем singleton instance
export const canvasLogger = CanvasLogger.getInstance();
export default CanvasLogger;