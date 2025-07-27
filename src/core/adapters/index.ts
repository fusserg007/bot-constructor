/**
 * Экспорт всех адаптеров и инициализация системы
 */

export { MessengerAdapter } from './MessengerAdapter';
export { AdapterRegistry } from './AdapterRegistry';

// Импортируем конкретные адаптеры
import { TelegramAdapter } from '../../adapters/TelegramAdapter';
import { MaxAdapter } from '../../adapters/MaxAdapter';
import { AdapterRegistry } from './AdapterRegistry';

/**
 * Инициализация всех доступных адаптеров
 */
export function initializeAdapters(): void {
  const registry = AdapterRegistry.getInstance();

  // Регистрируем Telegram адаптер
  registry.registerAdapter('telegram', TelegramAdapter);

  // Регистрируем MAX адаптер
  registry.registerAdapter('max', MaxAdapter);

  console.log('All messenger adapters initialized');
}

/**
 * Получить экземпляр реестра адаптеров
 */
export function getAdapterRegistry(): AdapterRegistry {
  return AdapterRegistry.getInstance();
}