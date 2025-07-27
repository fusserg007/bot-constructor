/**
 * Система обработки ошибок с изоляцией
 * Обеспечивает надежность выполнения схем
 */

export interface ErrorContext {
  executionId: string;
  nodeId: string;
  nodeType: string;
  userId: string;
  platform: string;
  timestamp: number;
  schemaId: string;
}

export interface ErrorInfo {
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecoveryStrategy {
  canRecover(errorInfo: ErrorInfo): boolean;
  recover(errorInfo: ErrorInfo): Promise<boolean>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private maxErrorLogSize: number = 10000;
  private errorStats: Map<string, number> = new Map();

  private constructor() {
    this.initializeRecoveryStrategies();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Обработать ошибку
   */
  async handleError(error: Error, context: ErrorContext): Promise<{
    handled: boolean;
    recovered: boolean;
    shouldRetry: boolean;
    fallbackAction?: any;
  }> {
    const severity = this.determineSeverity(error, context);
    const recoverable = this.isRecoverable(error, context);
    
    const errorInfo: ErrorInfo = {
      error,
      context,
      severity,
      recoverable,
      retryCount: 0,
      maxRetries: this.getMaxRetries(severity)
    };

    // Логируем ошибку
    this.logError(errorInfo);

    // Обновляем статистику
    this.updateErrorStats(error, context);

    // Пытаемся восстановиться
    let recovered = false;
    if (recoverable) {
      recovered = await this.attemptRecovery(errorInfo);
    }

    // Определяем, нужно ли повторить попытку
    const shouldRetry = !recovered && 
                       errorInfo.retryCount < errorInfo.maxRetries && 
                       this.shouldRetry(error, context);

    return {
      handled: true,
      recovered,
      shouldRetry,
      fallbackAction: this.getFallbackAction(error, context)
    };
  }

  /**
   * Выполнить код с обработкой ошибок
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3
  ): Promise<T | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const result = await this.handleError(lastError, {
          ...context,
          timestamp: Date.now()
        });

        if (result.recovered) {
          // Если восстановились, пробуем еще раз
          continue;
        }

        if (!result.shouldRetry || attempt >= maxRetries) {
          break;
        }

        // Ждем перед повторной попыткой
        await this.delay(this.getRetryDelay(attempt));
      }
    }

    // Если все попытки исчерпаны, возвращаем null
    console.error(`Операция не удалась после ${maxRetries + 1} попыток:`, lastError);
    return null;
  }

  /**
   * Получить статистику ошибок
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByNode: Record<string, number>;
    errorsByPlatform: Record<string, number>;
    recentErrors: ErrorInfo[];
  } {
    const errorsByType: Record<string, number> = {};
    const errorsByNode: Record<string, number> = {};
    const errorsByPlatform: Record<string, number> = {};

    this.errorLog.forEach(errorInfo => {
      const errorType = errorInfo.error.constructor.name;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      
      errorsByNode[errorInfo.context.nodeType] = (errorsByNode[errorInfo.context.nodeType] || 0) + 1;
      
      errorsByPlatform[errorInfo.context.platform] = (errorsByPlatform[errorInfo.context.platform] || 0) + 1;
    });

    // Последние 50 ошибок
    const recentErrors = this.errorLog.slice(-50);

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsByNode,
      errorsByPlatform,
      recentErrors
    };
  }

  /**
   * Очистить лог ошибок
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.errorStats.clear();
  }

  /**
   * Зарегистрировать стратегию восстановления
   */
  registerRecoveryStrategy(errorType: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * Определить серьезность ошибки
   */
  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Критические ошибки
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'critical';
    }

    // Высокая серьезность
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'high';
    }

    // Средняя серьезность
    if (error.message.includes('validation') || error.message.includes('format')) {
      return 'medium';
    }

    // Низкая серьезность
    return 'low';
  }

  /**
   * Проверить, можно ли восстановиться от ошибки
   */
  private isRecoverable(error: Error, context: ErrorContext): boolean {
    // Некоторые ошибки невосстановимы
    if (error.name === 'SyntaxError' || error.name === 'ReferenceError') {
      return false;
    }

    // Сетевые ошибки обычно восстановимы
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return true;
    }

    // Ошибки валидации могут быть восстановимы
    if (error.message.includes('validation')) {
      return true;
    }

    return false;
  }

  /**
   * Получить максимальное количество повторов
   */
  private getMaxRetries(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (severity) {
      case 'low': return 3;
      case 'medium': return 2;
      case 'high': return 1;
      case 'critical': return 0;
      default: return 1;
    }
  }

  /**
   * Попытаться восстановиться от ошибки
   */
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<boolean> {
    const errorType = errorInfo.error.constructor.name;
    const strategy = this.recoveryStrategies.get(errorType);

    if (strategy && strategy.canRecover(errorInfo)) {
      try {
        return await strategy.recover(errorInfo);
      } catch (recoveryError) {
        console.error('Ошибка при восстановлении:', recoveryError);
        return false;
      }
    }

    return false;
  }

  /**
   * Проверить, нужно ли повторить попытку
   */
  private shouldRetry(error: Error, context: ErrorContext): boolean {
    // Не повторяем для критических ошибок
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return false;
    }

    // Повторяем для сетевых ошибок
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Получить действие по умолчанию
   */
  private getFallbackAction(error: Error, context: ErrorContext): any {
    return {
      type: 'send_message',
      data: {
        message: 'Произошла ошибка при выполнении команды. Попробуйте позже.',
        options: {}
      },
      nodeId: context.nodeId
    };
  }

  /**
   * Получить задержку перед повтором
   */
  private getRetryDelay(attempt: number): number {
    // Экспоненциальная задержка: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Логировать ошибку
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);

    // Ограничиваем размер лога
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.splice(0, this.errorLog.length - this.maxErrorLogSize);
    }

    // Выводим в консоль для отладки
    console.error(`[${errorInfo.severity.toUpperCase()}] Ошибка в узле ${errorInfo.context.nodeType}:`, {
      error: errorInfo.error.message,
      context: errorInfo.context,
      recoverable: errorInfo.recoverable
    });
  }

  /**
   * Обновить статистику ошибок
   */
  private updateErrorStats(error: Error, context: ErrorContext): void {
    const key = `${context.nodeType}:${error.name}`;
    this.errorStats.set(key, (this.errorStats.get(key) || 0) + 1);
  }

  /**
   * Инициализировать стратегии восстановления
   */
  private initializeRecoveryStrategies(): void {
    // Стратегия для сетевых ошибок
    this.registerRecoveryStrategy('NetworkError', {
      canRecover: (errorInfo) => errorInfo.retryCount < 3,
      recover: async (errorInfo) => {
        // Ждем и пробуем снова
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
    });

    // Стратегия для ошибок валидации
    this.registerRecoveryStrategy('ValidationError', {
      canRecover: (errorInfo) => true,
      recover: async (errorInfo) => {
        // Используем значения по умолчанию
        return true;
      }
    });
  }
}