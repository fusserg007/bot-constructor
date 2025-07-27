/**
 * Менеджер polling для мультиплатформенного конструктора ботов
 * Обеспечивает оптимизированный polling для каждого мессенджера
 */

import { MessengerAdapter } from '../adapters/MessengerAdapter';
import { MessengerPlatform } from '../types';

export interface PollingConfig {
  interval: number; // Интервал в миллисекундах
  timeout: number; // Таймаут запроса в миллисекундах
  maxRetries: number; // Максимальное количество попыток
  backoffMultiplier: number; // Множитель для экспоненциального backoff
  enabled: boolean; // Включен ли polling
}

export interface PollingStats {
  platform: MessengerPlatform;
  isActive: boolean;
  requestCount: number;
  errorCount: number;
  lastPollTime: string | null;
  averageResponseTime: number;
  uptime: number; // В миллисекундах
}

export class PollingManager {
  private static instance: PollingManager;
  private pollingInstances: Map<string, PollingInstance> = new Map();
  private defaultConfigs: Map<MessengerPlatform, PollingConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Получить экземпляр менеджера (Singleton)
   */
  static getInstance(): PollingManager {
    if (!PollingManager.instance) {
      PollingManager.instance = new PollingManager();
    }
    return PollingManager.instance;
  }

  /**
   * Инициализация конфигураций по умолчанию для каждой платформы
   */
  private initializeDefaultConfigs(): void {
    // Telegram - быстрый polling
    this.defaultConfigs.set('telegram', {
      interval: 1000, // 1 секунда
      timeout: 30000, // 30 секунд (long polling)
      maxRetries: 3,
      backoffMultiplier: 2,
      enabled: true
    });

    // MAX - средний polling
    this.defaultConfigs.set('max', {
      interval: 2000, // 2 секунды
      timeout: 15000, // 15 секунд
      maxRetries: 3,
      backoffMultiplier: 2,
      enabled: true
    });

    // WhatsApp - медленный polling
    this.defaultConfigs.set('whatsapp', {
      interval: 5000, // 5 секунд
      timeout: 10000, // 10 секунд
      maxRetries: 2,
      backoffMultiplier: 1.5,
      enabled: true
    });

    // Discord - быстрый polling
    this.defaultConfigs.set('discord', {
      interval: 1500, // 1.5 секунды
      timeout: 20000, // 20 секунд
      maxRetries: 3,
      backoffMultiplier: 2,
      enabled: true
    });
  }

  /**
   * Запустить polling для адаптера
   */
  startPolling(
    adapterId: string,
    adapter: MessengerAdapter,
    customConfig?: Partial<PollingConfig>
  ): void {
    if (this.pollingInstances.has(adapterId)) {
      console.warn(`Polling already active for adapter: ${adapterId}`);
      return;
    }

    const platform = adapter.getPlatform();
    const defaultConfig = this.defaultConfigs.get(platform);
    
    if (!defaultConfig) {
      throw new Error(`No default polling config for platform: ${platform}`);
    }

    const config: PollingConfig = { ...defaultConfig, ...customConfig };
    
    if (!config.enabled) {
      console.log(`Polling disabled for adapter: ${adapterId}`);
      return;
    }

    const pollingInstance = new PollingInstance(adapterId, adapter, config);
    this.pollingInstances.set(adapterId, pollingInstance);
    
    pollingInstance.start();
    console.log(`Started polling for adapter: ${adapterId} (${platform})`);
  }

  /**
   * Остановить polling для адаптера
   */
  stopPolling(adapterId: string): void {
    const pollingInstance = this.pollingInstances.get(adapterId);
    
    if (pollingInstance) {
      pollingInstance.stop();
      this.pollingInstances.delete(adapterId);
      console.log(`Stopped polling for adapter: ${adapterId}`);
    }
  }

  /**
   * Остановить все polling
   */
  stopAllPolling(): void {
    for (const [adapterId, pollingInstance] of this.pollingInstances) {
      pollingInstance.stop();
      console.log(`Stopped polling for adapter: ${adapterId}`);
    }
    this.pollingInstances.clear();
  }

  /**
   * Получить статистику polling
   */
  getPollingStats(adapterId?: string): PollingStats[] {
    if (adapterId) {
      const instance = this.pollingInstances.get(adapterId);
      return instance ? [instance.getStats()] : [];
    }

    return Array.from(this.pollingInstances.values()).map(instance => instance.getStats());
  }

  /**
   * Обновить конфигурацию polling
   */
  updatePollingConfig(adapterId: string, config: Partial<PollingConfig>): void {
    const pollingInstance = this.pollingInstances.get(adapterId);
    
    if (pollingInstance) {
      pollingInstance.updateConfig(config);
      console.log(`Updated polling config for adapter: ${adapterId}`);
    }
  }

  /**
   * Проверить, активен ли polling для адаптера
   */
  isPollingActive(adapterId: string): boolean {
    const pollingInstance = this.pollingInstances.get(adapterId);
    return pollingInstance ? pollingInstance.isActive() : false;
  }

  /**
   * Получить общую статистику всех polling
   */
  getOverallStats(): {
    totalActive: number;
    totalRequests: number;
    totalErrors: number;
    averageUptime: number;
    platformStats: Record<MessengerPlatform, number>;
  } {
    const stats = this.getPollingStats();
    const platformStats: Record<MessengerPlatform, number> = {} as any;

    // Инициализируем счетчики платформ
    for (const platform of this.defaultConfigs.keys()) {
      platformStats[platform] = 0;
    }

    let totalRequests = 0;
    let totalErrors = 0;
    let totalUptime = 0;

    stats.forEach(stat => {
      platformStats[stat.platform]++;
      totalRequests += stat.requestCount;
      totalErrors += stat.errorCount;
      totalUptime += stat.uptime;
    });

    return {
      totalActive: stats.filter(s => s.isActive).length,
      totalRequests,
      totalErrors,
      averageUptime: stats.length > 0 ? totalUptime / stats.length : 0,
      platformStats
    };
  }

  /**
   * Перезапустить polling для адаптера
   */
  restartPolling(adapterId: string): void {
    const pollingInstance = this.pollingInstances.get(adapterId);
    
    if (pollingInstance) {
      const adapter = (pollingInstance as any).adapter;
      const config = (pollingInstance as any).config;
      
      this.stopPolling(adapterId);
      
      // Небольшая задержка перед перезапуском
      setTimeout(() => {
        this.startPolling(adapterId, adapter, config);
      }, 1000);
      
      console.log(`Restarting polling for adapter: ${adapterId}`);
    }
  }

  /**
   * Получить конфигурацию polling для адаптера
   */
  getPollingConfig(adapterId: string): PollingConfig | null {
    const pollingInstance = this.pollingInstances.get(adapterId);
    return pollingInstance ? (pollingInstance as any).config : null;
  }

  /**
   * Установить конфигурацию по умолчанию для платформы
   */
  setDefaultConfig(platform: MessengerPlatform, config: PollingConfig): void {
    this.defaultConfigs.set(platform, config);
    console.log(`Updated default polling config for platform: ${platform}`);
  }

  /**
   * Получить конфигурацию по умолчанию для платформы
   */
  getDefaultConfig(platform: MessengerPlatform): PollingConfig | null {
    return this.defaultConfigs.get(platform) || null;
  }

  /**
   * Приостановить polling для адаптера
   */
  pausePolling(adapterId: string): void {
    const pollingInstance = this.pollingInstances.get(adapterId);
    
    if (pollingInstance && pollingInstance.isActive()) {
      pollingInstance.stop();
      console.log(`Paused polling for adapter: ${adapterId}`);
    }
  }

  /**
   * Возобновить polling для адаптера
   */
  resumePolling(adapterId: string): void {
    const pollingInstance = this.pollingInstances.get(adapterId);
    
    if (pollingInstance && !pollingInstance.isActive()) {
      pollingInstance.start();
      console.log(`Resumed polling for adapter: ${adapterId}`);
    }
  }

  /**
   * Получить список всех адаптеров с polling
   */
  getPollingAdapters(): string[] {
    return Array.from(this.pollingInstances.keys());
  }

  /**
   * Проверить здоровье polling системы
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getPollingStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Проверяем каждый адаптер
    stats.forEach(stat => {
      // Высокий процент ошибок
      const errorRate = stat.requestCount > 0 ? (stat.errorCount / stat.requestCount) * 100 : 0;
      if (errorRate > 10) {
        issues.push(`High error rate for ${stat.platform}: ${errorRate.toFixed(1)}%`);
        recommendations.push(`Check ${stat.platform} adapter configuration and network connectivity`);
      }

      // Медленное время ответа
      if (stat.averageResponseTime > 10000) {
        issues.push(`Slow response time for ${stat.platform}: ${stat.averageResponseTime}ms`);
        recommendations.push(`Consider increasing timeout or checking ${stat.platform} API status`);
      }

      // Неактивные адаптеры
      if (!stat.isActive) {
        issues.push(`Polling inactive for ${stat.platform}`);
        recommendations.push(`Restart polling for ${stat.platform} adapter`);
      }
    });

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}

/**
 * Экземпляр polling для конкретного адаптера
 */
class PollingInstance {
  private adapterId: string;
  private adapter: MessengerAdapter;
  private config: PollingConfig;
  private isRunning: boolean = false;
  private pollingTimer?: NodeJS.Timeout;
  private retryCount: number = 0;
  private stats: PollingStats;
  private startTime: number = 0;
  private responseTimes: number[] = [];

  constructor(adapterId: string, adapter: MessengerAdapter, config: PollingConfig) {
    this.adapterId = adapterId;
    this.adapter = adapter;
    this.config = config;
    this.stats = {
      platform: adapter.getPlatform(),
      isActive: false,
      requestCount: 0,
      errorCount: 0,
      lastPollTime: null,
      averageResponseTime: 0,
      uptime: 0
    };
  }

  /**
   * Запустить polling
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.stats.isActive = true;
    this.startTime = Date.now();
    this.retryCount = 0;
    
    this.scheduleNextPoll();
  }

  /**
   * Остановить polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stats.isActive = false;
    
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Проверить, активен ли polling
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(newConfig: Partial<PollingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Если polling отключен, останавливаем его
    if (!this.config.enabled && this.isRunning) {
      this.stop();
    }
    
    // Если polling включен и не запущен, запускаем его
    if (this.config.enabled && !this.isRunning) {
      this.start();
    }
  }

  /**
   * Получить статистику
   */
  getStats(): PollingStats {
    // Обновляем uptime
    if (this.startTime > 0) {
      this.stats.uptime = Date.now() - this.startTime;
    }

    // Обновляем среднее время ответа
    if (this.responseTimes.length > 0) {
      this.stats.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }

    return { ...this.stats };
  }

  /**
   * Запланировать следующий poll
   */
  private scheduleNextPoll(): void {
    if (!this.isRunning) {
      return;
    }

    const delay = this.calculateDelay();
    
    this.pollingTimer = setTimeout(() => {
      this.performPoll();
    }, delay);
  }

  /**
   * Вычислить задержку до следующего poll
   */
  private calculateDelay(): number {
    if (this.retryCount === 0) {
      return this.config.interval;
    }

    // Экспоненциальный backoff при ошибках
    const backoffDelay = this.config.interval * Math.pow(this.config.backoffMultiplier, this.retryCount - 1);
    return Math.min(backoffDelay, 30000); // Максимум 30 секунд
  }

  /**
   * Выполнить polling
   */
  private async performPoll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();
    this.stats.requestCount++;
    this.stats.lastPollTime = new Date().toISOString();

    try {
      // Проверяем, поддерживает ли адаптер polling
      const capabilities = this.adapter.getCapabilities();
      if (!capabilities.supportsPolling) {
        throw new Error(`Adapter ${this.adapterId} does not support polling`);
      }

      // Выполняем polling через адаптер
      // Используем метод pollUpdates если он есть, иначе fallback на startPolling
      if (typeof (this.adapter as any).pollUpdates === 'function') {
        await (this.adapter as any).pollUpdates();
      } else if (typeof this.adapter.startPolling === 'function') {
        // Для адаптеров, которые не имеют отдельного метода pollUpdates
        console.warn(`Adapter ${this.adapterId} uses legacy polling method`);
      } else {
        throw new Error(`Adapter ${this.adapterId} has no polling method available`);
      }
      
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      
      // Ограничиваем размер массива времен ответа
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-50);
      }

      // Сбрасываем счетчик ошибок при успешном запросе
      this.retryCount = 0;

    } catch (error) {
      this.stats.errorCount++;
      this.retryCount++;

      console.error(`Polling error for adapter ${this.adapterId}:`, error);

      // Эмитим событие ошибки через адаптер
      if (typeof (this.adapter as any).emitError === 'function') {
        (this.adapter as any).emitError(error);
      }

      // Если превышено максимальное количество попыток, останавливаем polling
      if (this.retryCount >= this.config.maxRetries) {
        console.error(`Max retries exceeded for adapter ${this.adapterId}, stopping polling`);
        this.stop();
        return;
      }
    }

    // Планируем следующий poll
    this.scheduleNextPoll();
  }
}

export { PollingInstance };