/**
 * Webhook сервер для мультиплатформенного конструктора ботов
 * Расширенная версия с поддержкой Express middleware и автоматической настройкой
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { WebhookManager } from './WebhookManager';
import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { MessengerPlatform } from '../types';

export interface WebhookServerConfig {
  port?: number;
  baseUrl: string;
  enableCors?: boolean;
  enableLogging?: boolean;
  rateLimitWindow?: number; // в миллисекундах
  rateLimitMax?: number; // максимум запросов в окне
  enableHealthCheck?: boolean;
  enableMetrics?: boolean;
}

export interface WebhookMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  platformBreakdown: Record<MessengerPlatform, {
    requests: number;
    errors: number;
    avgTime: number;
  }>;
}

export class WebhookServer {
  private app: Express;
  private webhookManager: WebhookManager;
  private adapterRegistry: AdapterRegistry;
  private config: WebhookServerConfig;
  private metrics: WebhookMetrics;
  private requestTimes: number[] = [];
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: WebhookServerConfig) {
    this.config = {
      port: 3000,
      enableCors: true,
      enableLogging: true,
      rateLimitWindow: 60000, // 1 минута
      rateLimitMax: 100, // 100 запросов в минуту
      enableHealthCheck: true,
      enableMetrics: true,
      ...config
    };

    this.app = express();
    this.webhookManager = WebhookManager.getInstance();
    this.adapterRegistry = AdapterRegistry.getInstance();
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerMinute: 0,
      platformBreakdown: {} as any
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Настройка middleware
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.enableCors) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (this.config.enableLogging) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        
        next();
      });
    }

    // Rate limiting
    this.app.use(this.rateLimitMiddleware.bind(this));

    // Metrics collection
    if (this.config.enableMetrics) {
      this.app.use(this.metricsMiddleware.bind(this));
    }
  }

  /**
   * Rate limiting middleware
   */
  private rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow!;

    // Очищаем старые записи
    for (const [ip, data] of this.rateLimitMap.entries()) {
      if (data.resetTime < windowStart) {
        this.rateLimitMap.delete(ip);
      }
    }

    const clientData = this.rateLimitMap.get(clientIp);
    
    if (!clientData) {
      this.rateLimitMap.set(clientIp, { count: 1, resetTime: now });
      next();
      return;
    }

    if (clientData.count >= this.config.rateLimitMax!) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${this.config.rateLimitMax} requests per ${this.config.rateLimitWindow! / 1000} seconds`,
        retryAfter: Math.ceil((clientData.resetTime + this.config.rateLimitWindow! - now) / 1000)
      });
      return;
    }

    clientData.count++;
    next();
  }

  /**
   * Metrics collection middleware
   */
  private metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.requestTimes.push(duration);
      
      // Ограничиваем размер массива
      if (this.requestTimes.length > 1000) {
        this.requestTimes.splice(0, this.requestTimes.length - 500);
      }

      this.metrics.totalRequests++;
      
      if (res.statusCode >= 200 && res.statusCode < 400) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }

      // Обновляем среднее время ответа
      this.metrics.averageResponseTime = 
        this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;

      // Обновляем запросы в минуту (приблизительно)
      const recentRequests = this.requestTimes.filter(time => 
        Date.now() - time < 60000
      ).length;
      this.metrics.requestsPerMinute = recentRequests;
    });

    next();
  }

  /**
   * Настройка маршрутов
   */
  private setupRoutes(): void {
    // Основной webhook endpoint
    this.app.use('/webhook', this.webhookManager.getWebhookMiddleware());

    // Health check
    if (this.config.enableHealthCheck) {
      this.app.get('/health', this.healthCheckHandler.bind(this));
      this.app.get('/health/webhooks', this.webhookHealthHandler.bind(this));
    }

    // Metrics endpoint
    if (this.config.enableMetrics) {
      this.app.get('/metrics', this.metricsHandler.bind(this));
      this.app.get('/metrics/webhooks', this.webhookMetricsHandler.bind(this));
    }

    // Webhook management endpoints
    this.app.get('/api/webhooks', this.listWebhooksHandler.bind(this));
    this.app.post('/api/webhooks/:adapterId/setup', this.setupWebhookHandler.bind(this));
    this.app.delete('/api/webhooks/:adapterId', this.removeWebhookHandler.bind(this));
    this.app.get('/api/webhooks/:adapterId/stats', this.webhookStatsHandler.bind(this));
    this.app.post('/api/webhooks/:adapterId/test', this.testWebhookHandler.bind(this));

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Health check handler
   */
  private healthCheckHandler(req: Request, res: Response): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      webhooks: this.webhookManager.getStatus(),
      metrics: this.config.enableMetrics ? this.metrics : null
    };

    res.json(health);
  }

  /**
   * Webhook health handler
   */
  private webhookHealthHandler(req: Request, res: Response): void {
    const health = this.webhookManager.getHealthStatus();
    res.json(health);
  }

  /**
   * Metrics handler
   */
  private metricsHandler(req: Request, res: Response): void {
    res.json(this.metrics);
  }

  /**
   * Webhook metrics handler
   */
  private webhookMetricsHandler(req: Request, res: Response): void {
    const webhookStats = this.webhookManager.getOverallStats();
    res.json(webhookStats);
  }

  /**
   * List webhooks handler
   */
  private listWebhooksHandler(req: Request, res: Response): void {
    const webhooks = this.webhookManager.getRegisteredWebhooks();
    res.json(webhooks);
  }

  /**
   * Setup webhook handler
   */
  private async setupWebhookHandler(req: Request, res: Response): Promise<void> {
    const { adapterId } = req.params;
    const { config } = req.body;

    try {
      const adapter = this.adapterRegistry.getAdapter(adapterId);
      if (!adapter) {
        res.status(404).json({ error: 'Adapter not found' });
        return;
      }

      const success = await this.webhookManager.setupWebhookForAdapter(
        adapterId,
        adapter,
        this.config.baseUrl,
        config
      );

      if (success) {
        res.json({ success: true, message: 'Webhook set up successfully' });
      } else {
        res.status(500).json({ error: 'Failed to set up webhook' });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Setup failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Remove webhook handler
   */
  private async removeWebhookHandler(req: Request, res: Response): Promise<void> {
    const { adapterId } = req.params;

    try {
      const success = await this.webhookManager.removeWebhookForAdapter(adapterId);
      
      if (success) {
        res.json({ success: true, message: 'Webhook removed successfully' });
      } else {
        res.status(500).json({ error: 'Failed to remove webhook' });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Removal failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Webhook stats handler
   */
  private webhookStatsHandler(req: Request, res: Response): void {
    const { adapterId } = req.params;
    const details = this.webhookManager.getWebhookDetails(adapterId);
    
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Webhook not found' });
    }
  }

  /**
   * Test webhook handler
   */
  private async testWebhookHandler(req: Request, res: Response): Promise<void> {
    const { adapterId } = req.params;
    const { testData } = req.body;

    try {
      await this.webhookManager.handleWebhook(adapterId, {
        platform: 'telegram', // Будет переопределено адаптером
        body: testData || { test: true },
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, string>
      });

      res.json({ success: true, message: 'Test webhook processed successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Test failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Error handler
   */
  private errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    console.error('Webhook server error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: this.config.enableLogging ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Автоматически настроить webhook'и для всех адаптеров
   */
  async setupAllWebhooks(): Promise<{
    successful: string[];
    failed: Array<{ adapterId: string; error: string }>;
  }> {
    const adapters = this.adapterRegistry.getAllAdapters();
    const successful: string[] = [];
    const failed: Array<{ adapterId: string; error: string }> = [];

    for (const [adapterId, adapter] of adapters) {
      try {
        const success = await this.webhookManager.setupWebhookForAdapter(
          adapterId,
          adapter,
          this.config.baseUrl
        );

        if (success) {
          successful.push(adapterId);
        } else {
          failed.push({ adapterId, error: 'Setup returned false' });
        }
      } catch (error) {
        failed.push({ 
          adapterId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Получить Express приложение
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Запустить сервер
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.config.port, () => {
          console.log(`Webhook server started on port ${this.config.port}`);
          console.log(`Base URL: ${this.config.baseUrl}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Остановить сервер
   */
  async stop(): Promise<void> {
    await this.webhookManager.dispose();
    console.log('Webhook server stopped');
  }

  /**
   * Получить конфигурацию сервера
   */
  getConfig(): WebhookServerConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию сервера
   */
  updateConfig(updates: Partial<WebhookServerConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Webhook server config updated');
  }

  /**
   * Получить статистику сервера
   */
  getServerStats(): {
    config: WebhookServerConfig;
    metrics: WebhookMetrics;
    webhooks: ReturnType<typeof WebhookManager.prototype.getOverallStats>;
    health: ReturnType<typeof WebhookManager.prototype.getHealthStatus>;
  } {
    return {
      config: this.getConfig(),
      metrics: this.metrics,
      webhooks: this.webhookManager.getOverallStats(),
      health: this.webhookManager.getHealthStatus()
    };
  }

  /**
   * Сбросить метрики сервера
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerMinute: 0,
      platformBreakdown: {} as any
    };
    this.requestTimes = [];
    console.log('Server metrics reset');
  }

  /**
   * Получить информацию о rate limiting
   */
  getRateLimitInfo(): Array<{
    ip: string;
    requests: number;
    resetTime: string;
    remaining: number;
  }> {
    const now = Date.now();
    return Array.from(this.rateLimitMap.entries()).map(([ip, data]) => ({
      ip,
      requests: data.count,
      resetTime: new Date(data.resetTime + this.config.rateLimitWindow!).toISOString(),
      remaining: Math.max(0, this.config.rateLimitMax! - data.count)
    }));
  }

  /**
   * Очистить rate limit для IP
   */
  clearRateLimit(ip: string): boolean {
    return this.rateLimitMap.delete(ip);
  }

  /**
   * Получить детальную информацию о производительности
   */
  getPerformanceInfo(): {
    averageResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestRequests: number[];
    requestsInLastMinute: number;
    requestsInLastHour: number;
  } {
    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const now = Date.now();
    
    return {
      averageResponseTime: this.metrics.averageResponseTime,
      medianResponseTime: sortedTimes[Math.floor(sortedTimes.length / 2)] || 0,
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
      slowestRequests: sortedTimes.slice(-10),
      requestsInLastMinute: this.requestTimes.filter(time => now - time < 60000).length,
      requestsInLastHour: this.requestTimes.filter(time => now - time < 3600000).length
    };
  }
}