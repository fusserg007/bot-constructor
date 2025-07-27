/**
 * Тестирование системы помощи и документации
 */

import { HelpSystem, helpSystem } from './core/documentation/HelpSystem';

console.log('🧪 Тестирование системы помощи и документации...\n');

// Тест 1: Получение справки по узлу
console.log('1. Тестирование получения справки по узлу:');
const commandTriggerHelp = helpSystem.getNodeHelp('trigger-command');
if (commandTriggerHelp) {
  console.log(`✅ Справка по триггеру команды найдена: ${commandTriggerHelp.title}`);
  console.log(`   Описание: ${commandTriggerHelp.description.substring(0, 100)}...`);
  console.log(`   Примеров: ${commandTriggerHelp.examples.length}`);
  console.log(`   Лучших практик: ${commandTriggerHelp.bestPractices.length}`);
  console.log(`   Платформы: ${commandTriggerHelp.platforms.join(', ')}`);
} else {
  console.log('❌ Справка по триггеру команды не найдена');
}

// Тест 2: Поиск по документации
console.log('\n2. Тестирование поиска по документации:');
const searchResults = helpSystem.search('сообщение');
console.log(`✅ Найдено результатов по запросу "сообщение": ${searchResults.length}`);
searchResults.slice(0, 3).forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.title} (${result.type}, релевантность: ${result.relevance})`);
});

// Тест 3: Поиск с фильтрами
console.log('\n3. Тестирование поиска с фильтрами:');
const filteredResults = helpSystem.search('триггер', {
  type: ['node'],
  category: ['triggers']
});
console.log(`✅ Найдено результатов с фильтрами: ${filteredResults.length}`);
filteredResults.forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.title} (категория: ${result.category})`);
});

// Тест 4: Получение примеров для узла
console.log('\n4. Тестирование получения примеров:');
const examples = helpSystem.getNodeExamples('action-send-message');
console.log(`✅ Найдено примеров для отправки сообщения: ${examples.length}`);
examples.forEach((example, index) => {
  console.log(`   ${index + 1}. ${example.title} (${example.difficulty})`);
  console.log(`      ${example.description}`);
});

// Тест 5: Получение примеров по сложности
console.log('\n5. Тестирование фильтрации примеров по сложности:');
const beginnerExamples = helpSystem.getNodeExamples('action-send-message', 'beginner');
console.log(`✅ Найдено примеров для начинающих: ${beginnerExamples.length}`);

// Тест 6: Получение связанных узлов
console.log('\n6. Тестирование получения связанных узлов:');
const relatedNodes = helpSystem.getRelatedNodes('trigger-command');
console.log(`✅ Найдено связанных узлов: ${relatedNodes.length}`);
relatedNodes.forEach((node, index) => {
  console.log(`   ${index + 1}. ${node.title} (${node.category})`);
});

// Тест 7: Получение рекомендаций
console.log('\n7. Тестирование получения рекомендаций:');
const recommendations = helpSystem.getRecommendations('Как создать бота который отвечает на команду /start');
console.log(`✅ Найдено рекомендаций: ${recommendations.length}`);
recommendations.slice(0, 3).forEach((rec, index) => {
  console.log(`   ${index + 1}. ${rec.title} (релевантность: ${rec.relevance})`);
});

// Тест 8: Рекомендации с фильтром по платформе
console.log('\n8. Тестирование рекомендаций для конкретной платформы:');
const telegramRecs = helpSystem.getRecommendations('отправить сообщение', 'telegram');
console.log(`✅ Найдено рекомендаций для Telegram: ${telegramRecs.length}`);

// Тест 9: Поиск несуществующего узла
console.log('\n9. Тестирование обработки несуществующих узлов:');
const nonExistentHelp = helpSystem.getNodeHelp('non-existent-node');
if (nonExistentHelp === null) {
  console.log('✅ Корректно обработан запрос несуществующего узла');
} else {
  console.log('❌ Неправильная обработка несуществующего узла');
}

// Тест 10: Пустой поиск
console.log('\n10. Тестирование пустого поиска:');
const emptySearch = helpSystem.search('');
console.log(`✅ Результатов пустого поиска: ${emptySearch.length} (должно быть 0)`);

// Тест производительности
console.log('\n11. Тест производительности поиска:');
const startTime = Date.now();
for (let i = 0; i < 100; i++) {
  helpSystem.search('сообщение');
}
const endTime = Date.now();
console.log(`✅ 100 поисковых запросов выполнены за ${endTime - startTime}мс`);

// Демонстрация структуры данных
console.log('\n12. Демонстрация структуры справки:');
const messageActionHelp = helpSystem.getNodeHelp('action-send-message');
if (messageActionHelp) {
  console.log('✅ Структура справки по отправке сообщения:');
  console.log(`   - ID: ${messageActionHelp.id}`);
  console.log(`   - Заголовок: ${messageActionHelp.title}`);
  console.log(`   - Категория: ${messageActionHelp.category}`);
  console.log(`   - Примеры: ${messageActionHelp.examples.length}`);
  console.log(`   - Лучшие практики: ${messageActionHelp.bestPractices.length}`);
  console.log(`   - Частые проблемы: ${messageActionHelp.commonIssues.length}`);
  console.log(`   - Связанные узлы: ${messageActionHelp.relatedNodes.length}`);
  console.log(`   - Поддерживаемые платформы: ${messageActionHelp.platforms.join(', ')}`);
  
  // Показать первый пример
  if (messageActionHelp.examples.length > 0) {
    const firstExample = messageActionHelp.examples[0];
    console.log('\n   Первый пример:');
    console.log(`   - Название: ${firstExample.title}`);
    console.log(`   - Описание: ${firstExample.description}`);
    console.log(`   - Сложность: ${firstExample.difficulty}`);
    console.log(`   - Применение: ${firstExample.useCase}`);
    console.log(`   - Конфигурация: ${JSON.stringify(firstExample.config, null, 4)}`);
  }
  
  // Показать первую проблему
  if (messageActionHelp.commonIssues.length > 0) {
    const firstIssue = messageActionHelp.commonIssues[0];
    console.log('\n   Первая частая проблема:');
    console.log(`   - Проблема: ${firstIssue.problem}`);
    console.log(`   - Решение: ${firstIssue.solution}`);
    console.log(`   - Профилактика: ${firstIssue.prevention}`);
  }
}

console.log('\n🎉 Тестирование системы помощи завершено!');

// Экспорт для использования в других тестах
export function testHelpSystem() {
  return {
    helpSystem,
    searchResults: helpSystem.search('сообщение'),
    nodeHelp: helpSystem.getNodeHelp('trigger-command'),
    examples: helpSystem.getNodeExamples('action-send-message'),
    recommendations: helpSystem.getRecommendations('создать бота')
  };
}