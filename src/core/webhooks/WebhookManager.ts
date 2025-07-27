/**
 * Менеджер webhook'ов для мультиплатформенного конструктора ботов
 * Обеспечивает настройку, валидацию и обработку webhook'ов
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { MessengerAdapter } from '../adapters/MessengerAdapter';
import { MessengerPlatform, WebhookRequest } from '../types';

export interface WebhookConfig {
  platform: MessengerPlatform;
  path: string; // URL путь для webhook'а
  secret?: string; // Секретный ключ для валидации
  validateSignature: boolean; // Нужно ли валидировать подпись
  maxBodySize: number; // Максимальный размер тела запроса в байтах
  timeout: number; // Таймаут обработки в миллисекундах
}

export interface WebhookStats {
  platform: MessengerPlatform;
  path: string;
  requestCount: number;
  errorCount: number;
  lastRequestTime: string | null;
  averageProcessingTime: number;
  isActive: boolean;
}

export class WebhookManager {
  private static instance: WebhookManager;
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private adapters: Map<string, MessengerAdapter> = new Map();
  private stats: Map<string, WebhookStats> = new Map();
  private processingTimes: Map<string, number[]> = new Map();

  private constructor() {}

  /**
   * Получить экземпляр менеджера (Singleton)
   */
  static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  /**
   * Зарегистрировать webhook для адаптера
   */
  registerWebhook(
    adapterId: string,
    adapter: MessengerAdapter,
    config: Partial<WebhookConfig>
  ): void {
    const platform = adapter.getPlatform();
    
    const fullConfig: WebhookConfig = {
      platform,
      path: `/webhook/${platform}/${adapterId}`,
      validateSignature: true,
      maxBodySize: 1024 * 1024, // 1MB
      timeout: 30000, // 30 секунд
      ...config
    };

    this.webhookConfigs.set(adapterId, fullConfig);
    this.adapters.set(adapterId, adapter);
    
    // Инициализируем статистику
    this.stats.set(adapterId, {
      platform,
      path: fullConfig.path,
      requestCount: 0,
      errorCount: 0,
      lastRequestTime: null,
      averageProcessingTime: 0,
      isActive: true
    });

    this.processingTimes.set(adapterId, []);

    console.log(`Registered webhook for ${adapterId} at ${fullConfig.path}`);
  }

  /**
   * Удалить webhook
   */
  unregisterWebhook(adapterId: string): void {
    this.webhookConfigs.delete(adapterId);
    this.adapters.delete(adapterId);
    this.stats.delete(adapterId);
    this.processingTimes.delete(adapterId);
    
    console.log(`Unregistered webhook for ${adapterId}`);
  }

  /**
   * Получить middleware для обработки webhook'ов
   */
  getWebhookMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const path = req.path;
      
      // Находим соответствующий webhook по пути
      const adapterId = this.findAdapterByPath(path);
      
      if (!adapterId) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const config = this.webhookConfigs.get(adapterId);
      const adapter = this.adapters.get(adapterId);
      const stats = this.stats.get(adapterId);

      if (!config || !adapter || !stats) {
        return res.status(500).json({ error: 'Webhook configuration error' });
      }

      const startTime = Date.now();
      
      try {
        // Обновляем статистику
        stats.requestCount++;
        stats.lastRequestTime = new Date().toISOString();

        // Проверяем размер тела запроса
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > config.maxBodySize) {
          stats.errorCount++;
          return res.status(413).json({ error: 'Request body too large' });
        }

        // Валидируем подпись если требуется
        if (config.validateSignature && config.secret) {
          const isValid = this.validateSignature(req, config);
          if (!isValid) {
            stats.errorCount++;
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Создаем объект webhook запроса
        const webhookRequest: WebhookRequest = {
          platform: config.platform,
          body: req.body,
          headers: req.headers as Record<string, string>,
          query: req.query as Record<string, string>
        };

        // Обрабатываем webhook через адаптер
        await adapter.handleWebhook(webhookRequest);

        // Обновляем статистику времени обработки
        const processingTime = Date.now() - startTime;
        const times = this.processingTimes.get(adapterId) || [];
        times.push(processingTime);
        
        // Ограничиваем размер массива времен
        if (times.length > 100) {
          times.splice(0, times.length - 50);
        }
        
        this.processingTimes.set(adapterId, times);
        
        // Обновляем среднее время обработки
        stats.averageProcessingTime = times.reduce((sum, time) => sum + time, 0) / times.length;

        res.status(200).json({ success: true });

      } catch (error) {
        stats.errorCount++;
        console.error(`Webhook error for ${adapterId}:`, error);
        
        res.status(500).json({ 
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Найти адаптер по пути webhook'а
   */
  private findAdapterByPath(path: string): string | null {
    for (const [adapterId, config] of this.webhookConfigs) {
      if (config.path === path) {
        return adapterId;
      }
    }
    return null;
  }

  /**
   * Валидировать подпись webhook'а
   */
  private validateSignature(req: Request, config: WebhookConfig): boolean {
    const platform = config.platform;
    
    switch (platform) {
      case 'telegram':
        return this.validateTelegramSignature(req, config.secret!);
      case 'max':
        return this.validateMaxSignature(req, config.secret!);
      default:
        console.warn(`Signature validation not implemented for platform: ${platform}`);
        return true;
    }
  }

  /**
   * Валидировать подпись Telegram webhook'а
   */
  private validateTelegramSignature(req: Request, secret: string): boolean {
    const signature = req.headers['x-telegram-bot-api-secret-token'];
    return signature === secret;
  }

  /**
   * Валидировать подпись MAX webhook'а
   */
  private validateMaxSignature(req: Request, secret: string): boolean {
    const signature = req.headers['x-max-signature'];
    const body = JSON.stringify(req.body);
    
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Получить статистику webhook'ов
   */
  getWebhookStats(adapterId?: string): WebhookStats[] {
    if (adapterId) {
      const stats = this.stats.get(adapterId);
      return stats ? [{ ...stats }] : [];
    }

    return Array.from(this.stats.values()).map(stats => ({ ...stats }));
  }

  /**
   * Получить конфигурацию webhook'а
   */
  getWebhookConfig(adapterId: string): WebhookConfig | null {
    const config = this.webhookConfigs.get(adapterId);
    return config ? { ...config } : null;
  }

  /**
   * Обновить конфигурацию webhook'а
   */
  updateWebhookConfig(adapterId: string, updates: Partial<WebhookConfig>): void {
    const config = this.webhookConfigs.get(adapterId);
    if (config) {
      const updatedConfig = { ...config, ...updates };
      this.webhookConfigs.set(adapterId, updatedConfig);
      console.log(`Updated webhook config for ${adapterId}`);
    }
  }

  /**
   * Получить общую статистику всех webhook'ов
   */
  getOverallStats(): {
    totalWebhooks: number;
    totalRequests: number;
    totalErrors: number;
    averageProcessingTime: number;
    platformStats: Record<MessengerPlatform, number>;
  } {
    const allStats = this.getWebhookStats();
    const platformStats: Record<MessengerPlatform, number> = {} as any;

    let totalRequests = 0;
    let totalErrors = 0;
    let totalProcessingTime = 0;

    allStats.forEach(stats => {
      platformStats[stats.platform] = (platformStats[stats.platform] || 0) + 1;
      totalRequests += stats.requestCount;
      totalErrors += stats.errorCount;
      totalProcessingTime += stats.averageProcessingTime;
    });

    return {
      totalWebhooks: allStats.length,
      totalRequests,
      totalErrors,
      averageProcessingTime: allStats.length > 0 ? totalProcessingTime / allStats.length : 0,
      platformStats
    };
  }

  /**
   * Автоматически настроить webhook'и для адаптера
   */
  async setupWebhookForAdapter(
    adapterId: string,
    adapter: MessengerAdapter,
    baseUrl: string,
    config?: Partial<WebhookConfig>
  ): Promise<boolean> {
    try {
      // Регистрируем webhook в нашей системе
      this.registerWebhook(adapterId, adapter, config);
      
      const webhookConfig = this.webhookConfigs.get(adapterId)!;
      const webhookUrl = `${baseUrl}${webhookConfig.path}`;

      // Настраиваем webhook в мессенджере
      const success = await adapter.setWebhook(webhookUrl);
      
      if (success) {
        console.log(`Successfully set up webhook for ${adapterId} at ${webhookUrl}`);
        return true;
      } else {
        console.error(`Failed to set up webhook for ${adapterId}`);
        this.unregisterWebhook(adapterId);
        return false;
      }
    } catch (error) {
      console.error(`Error setting up webhook for ${adapterId}:`, error);
      this.unregisterWebhook(adapterId);
      return false;
    }
  }

  /**
   * Удалить webhook из мессенджера и нашей системы
   */
  async removeWebhookForAdapter(adapterId: string): Promise<boolean> {
    const adapter = this.adapters.get(adapterId);
    
    if (!adapter) {
      console.warn(`No adapter found for ${adapterId}`);
      return false;
    }

    try {
      // Удаляем webhook из мессенджера
      const success = await adapter.deleteWebhook();
      
      // Удаляем из нашей системы независимо от результата
      this.unregisterWebhook(adapterId);
      
      if (success) {
        console.log(`Successfully removed webhook for ${adapterId}`);
      } else {
        console.warn(`Failed to remove webhook from messenger for ${adapterId}, but removed from local system`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error removing webhook for ${adapterId}:`, error);
      this.unregisterWebhook(adapterId);
      return false;
    }
  }

  /**
   * Получить статус webhook системы
   */
  getStatus(): {
    isRunning: boolean;
    adapters: Array<{
      id: string;
      platform: MessengerPlatform;
      path: string;
      status: 'active' | 'inactive' | 'error';
      lastActivity: string | null;
    }>;
  } {
    const adapters = Array.from(this.webhookConfigs.entries()).map(([id, config]) => {
      const stats = this.stats.get(id);
      return {
        id,
        platform: config.platform,
        path: config.path,
        status: stats?.isActive ? 'active' : 'inactive' as const,
        lastActivity: stats?.lastRequestTime || null
      };
    });

    return {
      isRunning: adapters.length > 0,
      adapters
    };
  }

  /**
   * Обработать webhook напрямую (для тестирования)
   */
  async handleWebhook(adapterId: string, webhookRequest: WebhookRequest): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    const stats = this.stats.get(adapterId);

    if (!adapter || !stats) {
      throw new Error(`Webhook adapter ${adapterId} not found`);
    }

    const startTime = Date.now();

    try {
      stats.requestCount++;
      stats.lastRequestTime = new Date().toISOString();

      await adapter.handleWebhook(webhookRequest);

      // Обновляем статистику времени обработки
      const processingTime = Date.now() - startTime;
      const times = this.processingTimes.get(adapterId) || [];
      times.push(processingTime);
      
      if (times.length > 100) {
        times.splice(0, times.length - 50);
      }
      
      this.processingTimes.set(adapterId, times);
      stats.averageProcessingTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    } catch (error) {
      stats.errorCount++;
      throw error;
    }
  }

  /**
   * Проверить здоровье webhook системы
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const allStats = this.getWebhookStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    allStats.forEach(stats => {
      // Высокий процент ошибок
      const errorRate = stats.requestCount > 0 ? (stats.errorCount / stats.requestCount) * 100 : 0;
      if (errorRate > 5) {
        issues.push(`High error rate for ${stats.platform}: ${errorRate.toFixed(1)}%`);
        recommendations.push(`Check ${stats.platform} webhook configuration and signature validation`);
      }

      // Медленная обработка
      if (stats.averageProcessingTime > 5000) {
        issues.push(`Slow processing for ${stats.platform}: ${stats.averageProcessingTime}ms`);
        recommendations.push(`Optimize ${stats.platform} webhook handler performance`);
      }

      // Неактивные webhook'и
      if (!stats.isActive) {
        issues.push(`Webhook inactive for ${stats.platform}`);
        recommendations.push(`Check ${stats.platform} webhook registration`);
      }

      // Долго не было запросов
      if (stats.lastRequestTime) {
        const lastRequest = new Date(stats.lastRequestTime);
        const hoursSinceLastRequest = (Date.now() - lastRequest.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRequest > 24) {
          issues.push(`No requests for ${stats.platform} in ${hoursSinceLastRequest.toFixed(1)} hours`);
          recommendations.push(`Verify ${stats.platform} webhook URL is accessible`);
        }
      }
    });

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Получить список всех зарегистрированных webhook'ов
   */
  getRegisteredWebhooks(): Array<{
    adapterId: string;
    platform: MessengerPlatform;
    path: string;
    hasSecret: boolean;
    validateSignature: boolean;
  }> {
    return Array.from(this.webhookConfigs.entries()).map(([adapterId, config]) => ({
      adapterId,
      platform: config.platform,
      path: config.path,
      hasSecret: !!config.secret,
      validateSignature: config.validateSignature
    }));
  }

  /**
   * Активировать/деактивировать webhook
   */
  setWebhookActive(adapterId: string, active: boolean): void {
    const stats = this.stats.get(adapterId);
    if (stats) {
      stats.isActive = active;
      console.log(`Webhook ${adapterId} ${active ? 'activated' : 'deactivated'}`);
    }
  }

  /**
   * Сбросить статистику webhook'а
   */
  resetWebhookStats(adapterId: string): void {
    const stats = this.stats.get(adapterId);
    if (stats) {
      stats.requestCount = 0;
      stats.errorCount = 0;
      stats.lastRequestTime = null;
      stats.averageProcessingTime = 0;
      this.processingTimes.set(adapterId, []);
      console.log(`Reset stats for webhook ${adapterId}`);
    }
  }

  /**
   * Получить детальную информацию о webhook'е
   */
  getWebhookDetails(adapterId: string): {
    config: WebhookConfig;
    stats: WebhookStats;
    recentProcessingTimes: number[];
  } | null {
    const config = this.webhookConfigs.get(adapterId);
    const stats = this.stats.get(adapterId);
    const processingTimes = this.processingTimes.get(adapterId);

    if (!config || !stats) {
      return null;
    }

    return {
      config: { ...config },
      stats: { ...stats },
      recentProcessingTimes: [...(processingTimes || [])].slice(-10) // Последние 10 времен
    };
  }

  /**
   * Очистить все webhook'и
   */
  async dispose(): Promise<void> {
    const adapterIds = Array.from(this.adapters.keys());
    
    await Promise.all(
      adapterIds.map(adapterId => this.removeWebhookForAdapter(adapterId))
    );

    this.webhookConfigs.clear();
    this.adapters.clear();
    this.stats.clear();
    this.processingTimes.clear();
  }
}