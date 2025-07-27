/**
 * Менеджер интеграций для управления внешними сервисами
 */

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'rest_api' | 'graphql' | 'database' | 'webhook' | 'file_storage' | 'custom';
  enabled: boolean;
  config: Record<string, any>;
  credentials?: Record<string, string>;
  rateLimit?: {
    requests: number;
    period: number; // в миллисекундах
  };
  timeout?: number;
  retries?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationUsage {
  integrationId: string;
  requests: number;
  lastUsed: number;
  errors: number;
  avgResponseTime: number;
}

export class IntegrationManager {
  private static instance: IntegrationManager;
  private integrations: Map<string, IntegrationConfig> = new Map();
  private usage: Map<string, IntegrationUsage> = new Map();
  private rateLimiters: Map<string, { requests: number[]; }> = new Map();

  private constructor() {
    this.initializeDefaultIntegrations();
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Добавить интеграцию
   */
  addIntegration(integration: IntegrationConfig): void {
    this.integrations.set(integration.id, integration);
    
    // Инициализируем статистику использования
    this.usage.set(integration.id, {
      integrationId: integration.id,
      requests: 0,
      lastUsed: 0,
      errors: 0,
      avgResponseTime: 0
    });

    console.log(`Добавлена интеграция: ${integration.name} (${integration.type})`);
  }

  /**
   * Получить интеграцию
   */
  getIntegration(id: string): IntegrationConfig | undefined {
    return this.integrations.get(id);
  }

  /**
   * Получить все интеграции
   */
  getAllIntegrations(): IntegrationConfig[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Получить интеграции по типу
   */
  getIntegrationsByType(type: string): IntegrationConfig[] {
    return Array.from(this.integrations.values())
      .filter(integration => integration.type === type);
  }

  /**
   * Обновить интеграцию
   */
  updateIntegration(id: string, updates: Partial<IntegrationConfig>): boolean {
    const integration = this.integrations.get(id);
    if (!integration) return false;

    const updatedIntegration = {
      ...integration,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.integrations.set(id, updatedIntegration);
    return true;
  }

  /**
   * Удалить интеграцию
   */
  removeIntegration(id: string): boolean {
    const removed = this.integrations.delete(id);
    if (removed) {
      this.usage.delete(id);
      this.rateLimiters.delete(id);
    }
    return removed;
  }

  /**
   * Проверить лимит запросов
   */
  checkRateLimit(integrationId: string): boolean {
    const integration = this.integrations.get(integrationId);
    if (!integration?.rateLimit) return true;

    const limiter = this.rateLimiters.get(integrationId) || { requests: [] };
    const now = Date.now();
    const { requests, period } = integration.rateLimit;

    // Удаляем старые запросы
    limiter.requests = limiter.requests.filter(time => now - time < period);

    // Проверяем лимит
    if (limiter.requests.length >= requests) {
      return false;
    }

    // Добавляем текущий запрос
    limiter.requests.push(now);
    this.rateLimiters.set(integrationId, limiter);

    return true;
  }

  /**
   * Записать использование интеграции
   */
  recordUsage(integrationId: string, responseTime: number, isError: boolean = false): void {
    const usage = this.usage.get(integrationId);
    if (!usage) return;

    usage.requests++;
    usage.lastUsed = Date.now();
    
    if (isError) {
      usage.errors++;
    }

    // Обновляем среднее время ответа
    usage.avgResponseTime = (usage.avgResponseTime * (usage.requests - 1) + responseTime) / usage.requests;

    this.usage.set(integrationId, usage);
  }

  /**
   * Получить статистику использования
   */
  getUsageStats(integrationId?: string): IntegrationUsage[] {
    if (integrationId) {
      const usage = this.usage.get(integrationId);
      return usage ? [usage] : [];
    }
    return Array.from(this.usage.values());
  }

  /**
   * Получить общую статистику
   */
  getOverallStats(): {
    totalIntegrations: number;
    enabledIntegrations: number;
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    integrationsByType: Record<string, number>;
  } {
    const integrations = this.getAllIntegrations();
    const usageStats = this.getUsageStats();

    const totalRequests = usageStats.reduce((sum, usage) => sum + usage.requests, 0);
    const totalErrors = usageStats.reduce((sum, usage) => sum + usage.errors, 0);
    const avgResponseTime = usageStats.length > 0 
      ? usageStats.reduce((sum, usage) => sum + usage.avgResponseTime, 0) / usageStats.length 
      : 0;

    const integrationsByType: Record<string, number> = {};
    integrations.forEach(integration => {
      integrationsByType[integration.type] = (integrationsByType[integration.type] || 0) + 1;
    });

    return {
      totalIntegrations: integrations.length,
      enabledIntegrations: integrations.filter(i => i.enabled).length,
      totalRequests,
      totalErrors,
      avgResponseTime,
      integrationsByType
    };
  }

  /**
   * Тестировать интеграцию
   */
  async testIntegration(integrationId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
    data?: any;
  }> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      return {
        success: false,
        responseTime: 0,
        error: 'Интеграция не найдена'
      };
    }

    const startTime = Date.now();

    try {
      let result: any;

      switch (integration.type) {
        case 'rest_api':
          result = await this.testRestApi(integration);
          break;
        case 'graphql':
          result = await this.testGraphQL(integration);
          break;
        case 'database':
          result = await this.testDatabase(integration);
          break;
        default:
          throw new Error(`Тестирование типа ${integration.type} не поддерживается`);
      }

      const responseTime = Date.now() - startTime;
      this.recordUsage(integrationId, responseTime, false);

      return {
        success: true,
        responseTime,
        data: result
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordUsage(integrationId, responseTime, true);

      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить конфигурацию для узла
   */
  getNodeConfig(integrationId: string, nodeType: string): Record<string, any> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return {};

    const baseConfig = {
      timeout: integration.timeout || 10000,
      retries: integration.retries || 0,
      ...integration.config
    };

    // Добавляем credentials если они есть
    if (integration.credentials) {
      baseConfig.credentials = integration.credentials;
    }

    return baseConfig;
  }

  /**
   * Инициализация стандартных интеграций
   */
  private initializeDefaultIntegrations(): void {
    // REST API интеграция по умолчанию
    this.addIntegration({
      id: 'default-rest-api',
      name: 'REST API по умолчанию',
      type: 'rest_api',
      enabled: true,
      config: {
        baseUrl: '',
        defaultHeaders: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bot-Constructor/1.0'
        }
      },
      timeout: 10000,
      retries: 2,
      rateLimit: {
        requests: 100,
        period: 60000 // 100 запросов в минуту
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // GraphQL интеграция
    this.addIntegration({
      id: 'default-graphql',
      name: 'GraphQL по умолчанию',
      type: 'graphql',
      enabled: true,
      config: {
        endpoint: '',
        defaultHeaders: {
          'Content-Type': 'application/json'
        }
      },
      timeout: 15000,
      retries: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Файловая система
    this.addIntegration({
      id: 'local-file-system',
      name: 'Локальная файловая система',
      type: 'file_storage',
      enabled: true,
      config: {
        basePath: './data',
        allowedExtensions: ['.txt', '.json', '.csv', '.xml'],
        maxFileSize: 10 * 1024 * 1024 // 10MB
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Тестирование REST API
   */
  private async testRestApi(integration: IntegrationConfig): Promise<any> {
    const testUrl = integration.config.testUrl || integration.config.baseUrl + '/health';
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: integration.config.defaultHeaders || {},
      signal: AbortSignal.timeout(integration.timeout || 10000)
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  /**
   * Тестирование GraphQL
   */
  private async testGraphQL(integration: IntegrationConfig): Promise<any> {
    const endpoint = integration.config.endpoint;
    const testQuery = integration.config.testQuery || '{ __schema { types { name } } }';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...integration.config.defaultHeaders
      },
      body: JSON.stringify({ query: testQuery }),
      signal: AbortSignal.timeout(integration.timeout || 15000)
    });

    const data = await response.json();
    return data;
  }

  /**
   * Тестирование базы данных
   */
  private async testDatabase(integration: IntegrationConfig): Promise<any> {
    // В реальной реализации здесь было бы подключение к БД
    return {
      connected: true,
      database: integration.config.database || 'test',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Экспорт конфигурации интеграций
   */
  exportConfig(): Record<string, IntegrationConfig> {
    const config: Record<string, IntegrationConfig> = {};
    this.integrations.forEach((integration, id) => {
      // Не экспортируем credentials из соображений безопасности
      const { credentials, ...safeConfig } = integration;
      config[id] = safeConfig;
    });
    return config;
  }

  /**
   * Импорт конфигурации интеграций
   */
  importConfig(config: Record<string, IntegrationConfig>): void {
    Object.entries(config).forEach(([id, integration]) => {
      this.addIntegration({ ...integration, id });
    });
  }
}