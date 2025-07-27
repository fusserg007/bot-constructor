/**
 * Реестр адаптеров мессенджеров
 * Обеспечивает регистрацию, создание и управление адаптерами
 */

import { MessengerAdapter } from './MessengerAdapter';
import { MessengerPlatform, PlatformCredentials } from '../types';

export type AdapterConstructor = new (platform: MessengerPlatform) => MessengerAdapter;

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<MessengerPlatform, AdapterConstructor> = new Map();
  private activeAdapters: Map<string, MessengerAdapter> = new Map();

  private constructor() {}

  /**
   * Получить экземпляр реестра (Singleton)
   */
  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  /**
   * Зарегистрировать адаптер для платформы
   */
  registerAdapter(platform: MessengerPlatform, adapterClass: AdapterConstructor): void {
    this.adapters.set(platform, adapterClass);
    console.log(`Registered adapter for platform: ${platform}`);
  }

  /**
   * Получить список поддерживаемых платформ
   */
  getSupportedPlatforms(): MessengerPlatform[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Проверить, поддерживается ли платформа
   */
  isPlatformSupported(platform: MessengerPlatform): boolean {
    return this.adapters.has(platform);
  }

  /**
   * Создать адаптер для платформы
   */
  createAdapter(platform: MessengerPlatform): MessengerAdapter {
    const AdapterClass = this.adapters.get(platform);
    if (!AdapterClass) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }

    return new AdapterClass(platform);
  }

  /**
   * Получить или создать активный адаптер для бота
   */
  async getAdapter(
    botId: string, 
    platform: MessengerPlatform, 
    credentials: PlatformCredentials
  ): Promise<MessengerAdapter> {
    const adapterId = `${botId}-${platform}`;
    
    // Проверяем, есть ли уже активный адаптер
    let adapter = this.activeAdapters.get(adapterId);
    
    if (adapter && adapter.isReady()) {
      return adapter;
    }

    // Создаем новый адаптер
    adapter = this.createAdapter(platform);
    
    try {
      await adapter.initialize(credentials);
      this.activeAdapters.set(adapterId, adapter);
      
      // Добавляем обработчик ошибок для автоматической очистки
      adapter.onError((error) => {
        console.error(`Adapter error for ${adapterId}:`, error);
        this.removeAdapter(adapterId);
      });
      
      return adapter;
    } catch (error) {
      console.error(`Failed to initialize adapter for ${adapterId}:`, error);
      throw error;
    }
  }

  /**
   * Удалить активный адаптер
   */
  async removeAdapter(adapterId: string): Promise<void> {
    const adapter = this.activeAdapters.get(adapterId);
    if (adapter) {
      try {
        await adapter.dispose();
      } catch (error) {
        console.error(`Error disposing adapter ${adapterId}:`, error);
      }
      this.activeAdapters.delete(adapterId);
    }
  }

  /**
   * Удалить все адаптеры для бота
   */
  async removeAdaptersForBot(botId: string): Promise<void> {
    const adaptersToRemove = Array.from(this.activeAdapters.keys())
      .filter(adapterId => adapterId.startsWith(`${botId}-`));

    await Promise.all(
      adaptersToRemove.map(adapterId => this.removeAdapter(adapterId))
    );
  }

  /**
   * Получить статистику активных адаптеров
   */
  getStats(): {
    totalRegistered: number;
    totalActive: number;
    activeByPlatform: Record<MessengerPlatform, number>;
  } {
    const activeByPlatform: Record<MessengerPlatform, number> = {} as any;
    
    // Инициализируем счетчики
    this.getSupportedPlatforms().forEach(platform => {
      activeByPlatform[platform] = 0;
    });

    // Подсчитываем активные адаптеры
    this.activeAdapters.forEach((adapter) => {
      const platform = adapter.getPlatform();
      activeByPlatform[platform]++;
    });

    return {
      totalRegistered: this.adapters.size,
      totalActive: this.activeAdapters.size,
      activeByPlatform
    };
  }

  /**
   * Очистить все активные адаптеры
   */
  async dispose(): Promise<void> {
    const disposePromises = Array.from(this.activeAdapters.keys())
      .map(adapterId => this.removeAdapter(adapterId));

    await Promise.all(disposePromises);
    this.activeAdapters.clear();
  }
}