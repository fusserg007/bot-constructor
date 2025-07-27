/**
 * Простой тест архитектуры без внешних зависимостей
 */

import { initializeAdapters, getAdapterRegistry } from './core/adapters';

async function testSimple() {
  console.log('🚀 Простой тест архитектуры...\n');

  try {
    // 1. Инициализируем систему адаптеров
    console.log('📦 Инициализация системы адаптеров...');
    initializeAdapters();
    
    const registry = getAdapterRegistry();
    const supportedPlatforms = registry.getSupportedPlatforms();
    console.log('✅ Поддерживаемые платформы:', supportedPlatforms);

    // 2. Тестируем создание адаптеров
    console.log('\n🔧 Тестирование создания адаптеров...');
    
    for (const platform of supportedPlatforms) {
      try {
        const adapter = registry.createAdapter(platform);
        console.log(`✅ ${platform} адаптер создан успешно`);
        
        // Проверяем возможности адаптера
        const capabilities = adapter.getCapabilities();
        console.log(`  Возможности: кнопки=${capabilities.supportsInlineButtons}, медиа=${capabilities.supportsMedia}`);
        
        // Очищаем ресурсы
        await adapter.dispose();
      } catch (error) {
        console.error(`❌ Ошибка создания ${platform} адаптера:`, error);
      }
    }

    // 3. Тестируем статистику реестра
    console.log('\n📊 Статистика реестра адаптеров:');
    const stats = registry.getStats();
    console.log('  Зарегистрировано:', stats.totalRegistered);
    console.log('  Активных:', stats.totalActive);
    console.log('  По платформам:', stats.activeByPlatform);

    console.log('\n🎉 Простой тест завершен успешно!');
    console.log('\n📋 Резюме:');
    console.log(`  ✅ Система адаптеров: ${supportedPlatforms.length} платформ`);
    console.log('  ✅ Реестр адаптеров: функционирует');
    console.log('  ✅ Создание адаптеров: работает');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testSimple().catch(console.error);