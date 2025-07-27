/**
 * Главный файл мультиплатформенного конструктора ботов
 * Инициализирует все системы и экспортирует основные компоненты
 */

// Инициализация адаптеров
import { initializeAdapters, getAdapterRegistry } from './core/adapters';

// Экспорт основных типов
export * from './core/types';

// Экспорт адаптеров
export { MessengerAdapter, AdapterRegistry } from './core/adapters';

// Экспорт конкретных адаптеров
export { TelegramAdapter } from './adapters/TelegramAdapter';
export { MaxAdapter } from './adapters/MaxAdapter';

// Экспорт системы валидации и миграции
export { SchemaValidator } from './core/validation/SchemaValidator';
export { SchemaVersioning } from './core/versioning/SchemaVersioning';
export { DataMigration } from './core/migration/DataMigration';

/**
 * Инициализация всей системы
 */
export function initializeBotConstructor(): void {
  console.log('Initializing Multiplatform Bot Constructor...');
  
  // Инициализируем адаптеры
  initializeAdapters();
  
  console.log('Bot Constructor initialized successfully');
}

/**
 * Получить реестр адаптеров
 */
export function getRegistry(): AdapterRegistry {
  return getAdapterRegistry();
}

// Автоматическая инициализация при импорте
initializeBotConstructor();