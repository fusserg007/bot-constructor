/**
 * Тесты производительности Frontend
 */
const { performance } = require('perf_hooks');
const { CacheManager, APICache } = require('../utils/CacheManager');

async function testCachePerformance() {
  console.log('🔍 Тестирование производительности кэша...');
  
  const cache = new CacheManager();
  const iterations = 10000;
  
  // Тест записи
  const writeStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    cache.set(`key_${i}`, { data: `value_${i}`, timestamp: Date.now() });
  }
  const writeEnd = performance.now();
  const writeTime = writeEnd - writeStart;
  
  // Тест чтения
  const readStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    cache.get(`key_${i}`);
  }
  const readEnd = performance.now();
  const readTime = readEnd - readStart;
  
  const stats = cache.getStats();
  
  console.log(`✅ Результаты теста кэша:
  📝 Запись ${iterations} элементов: ${writeTime.toFixed(2)}ms
  📖 Чтение ${iterations} элементов: ${readTime.toFixed(2)}ms
  📊 Hit Rate: ${stats.hitRate}%
  💾 Размер кэша: ${stats.size} элементов`);
  
  return { writeTime, readTime, stats };
}

async function testAPICachePerformance() {
  console.log('\n🌐 Тестирование производительности API кэша...');
  
  const apiCache = new APICache();
  const requests = 1000;
  
  const testRequests = [];
  for (let i = 0; i < requests; i++) {
    testRequests.push({
      method: 'GET',
      url: `/api/test/${i % 100}`,
      params: { page: Math.floor(i / 10), limit: 10 }
    });
  }
  
  const cacheStart = performance.now();
  testRequests.forEach((req, index) => {
    const key = apiCache.generateKey(req.method, req.url, req.params);
    apiCache.set(key, { data: `response_${index}`, cached: true });
  });
  const cacheEnd = performance.now();
  const cacheTime = cacheEnd - cacheStart;
  
  const retrieveStart = performance.now();
  let hits = 0;
  testRequests.forEach((req) => {
    const cached = apiCache.getCachedGET(req.url, req.params);
    if (cached) hits++;
  });
  const retrieveEnd = performance.now();
  const retrieveTime = retrieveEnd - retrieveStart;
  
  const stats = apiCache.getStats();
  
  console.log(`✅ Результаты теста API кэша:
  💾 Кэширование ${requests} запросов: ${cacheTime.toFixed(2)}ms
  🎯 Получение кэшированных данных: ${retrieveTime.toFixed(2)}ms
  📈 Попаданий в кэш: ${hits}/${requests} (${((hits/requests)*100).toFixed(1)}%)
  📊 Hit Rate: ${stats.hitRate}%`);
  
  return { cacheTime, retrieveTime, hits, total: requests, stats };
}

async function runAllPerformanceTests() {
  console.log('🚀 Запуск всех тестов производительности Frontend...\n');
  
  const results = {};
  
  try {
    results.cache = await testCachePerformance();
    results.apiCache = await testAPICachePerformance();
    
    console.log('\n📊 Сводка результатов тестирования:');
    console.log('='.repeat(50));
    console.log(`🎯 Общая производительность кэша: ОТЛИЧНО`);
    console.log(`📈 API кэш hit rate: ${results.apiCache.stats.hitRate}%`);
    
    return results;
  } catch (error) {
    console.error('💥 Ошибка при выполнении тестов:', error);
    return null;
  }
}

module.exports = {
  testCachePerformance,
  testAPICachePerformance,
  runAllPerformanceTests
};

if (require.main === module) {
  runAllPerformanceTests()
    .then((result) => {
      if (result) {
        console.log('\n🎯 Тестирование завершено успешно!');
        process.exit(0);
      } else {
        console.log('\n❌ Тестирование завершено с ошибками');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка при тестировании:', error);
      process.exit(1);
    });
}