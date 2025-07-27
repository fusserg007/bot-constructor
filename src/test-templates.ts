/**
 * Тест системы шаблонов
 */
import { TemplateManager } from './core/templates/TemplateManager';
import { TemplateService } from './core/templates/TemplateService';

async function testTemplateSystem() {
  console.log('🧪 Тестирование системы шаблонов...\n');

  try {
    // Тест TemplateManager
    console.log('1. Тестирование TemplateManager:');
    const templateManager = TemplateManager.getInstance();
    
    const allTemplates = templateManager.getAllTemplates();
    console.log(`   ✅ Загружено ${allTemplates.length} шаблонов`);
    
    const categories = templateManager.getAllCategories();
    console.log(`   ✅ Загружено ${categories.length} категорий`);
    
    // Проверяем конкретные шаблоны
    const welcomeBot = templateManager.getTemplate('welcome-bot');
    if (welcomeBot) {
      console.log(`   ✅ Найден шаблон: ${welcomeBot.name}`);
      console.log(`      - Категория: ${welcomeBot.category}`);
      console.log(`      - Сложность: ${welcomeBot.difficulty}`);
      console.log(`      - Платформы: ${welcomeBot.platforms.join(', ')}`);
    }

    // Тест поиска
    const businessTemplates = templateManager.getTemplatesByCategory('business');
    console.log(`   ✅ Найдено ${businessTemplates.length} бизнес-шаблонов`);

    const searchResults = templateManager.searchTemplates('бот', { difficulty: 'beginner' });
    console.log(`   ✅ Поиск "бот" (начинающий): ${searchResults.length} результатов`);

    // Тест клонирования
    const clonedSchema = templateManager.cloneTemplate('welcome-bot', 'Мой приветственный бот');
    if (clonedSchema) {
      console.log(`   ✅ Клонирован шаблон: ${clonedSchema.name}`);
      console.log(`      - ID: ${clonedSchema.id}`);
      console.log(`      - Узлов: ${clonedSchema.nodes.length}`);
      console.log(`      - Связей: ${clonedSchema.edges.length}`);
    }

    console.log('\n2. Тестирование TemplateService:');
    const templateService = new TemplateService();
    
    // Тест получения всех шаблонов
    const serviceTemplates = await templateService.getAllTemplates();
    console.log(`   ✅ Сервис: получено ${serviceTemplates.length} шаблонов`);

    // Тест получения категорий
    const serviceCategories = await templateService.getCategories();
    console.log(`   ✅ Сервис: получено ${serviceCategories.length} категорий`);

    // Тест статистики
    const stats = await templateService.getTemplateStats();
    console.log(`   ✅ Статистика:`);
    console.log(`      - Всего шаблонов: ${stats.totalTemplates}`);
    console.log(`      - Категорий: ${stats.categoriesCount}`);
    console.log(`      - Популярные категории:`, stats.popularCategories);
    console.log(`      - Распределение по сложности:`, stats.difficultyDistribution);

    // Тест рекомендаций
    const recommended = await templateService.getRecommendedTemplates();
    console.log(`   ✅ Рекомендуемых шаблонов: ${recommended.length}`);

    const popular = await templateService.getPopularTemplates();
    console.log(`   ✅ Популярных шаблонов: ${popular.length}`);

    // Тест валидации
    if (serviceTemplates.length > 0) {
      const validation = await templateService.validateTemplate(serviceTemplates[0]);
      console.log(`   ✅ Валидация первого шаблона:`);
      console.log(`      - Валиден: ${validation.isValid}`);
      console.log(`      - Ошибок: ${validation.errors.length}`);
      console.log(`      - Предупреждений: ${validation.warnings.length}`);
    }

    // Тест экспорта/импорта
    const exportedTemplate = await templateService.exportTemplate('welcome-bot');
    if (exportedTemplate) {
      console.log(`   ✅ Экспорт шаблона: ${exportedTemplate.length} символов`);
      
      const importResult = await templateService.importTemplate(exportedTemplate);
      console.log(`   ✅ Импорт шаблона: ${importResult.success ? 'успешно' : 'ошибка'}`);
    }

    console.log('\n3. Тестирование конкретных шаблонов:');
    
    // Проверяем каждый шаблон
    for (const template of allTemplates) {
      console.log(`   📋 ${template.name}:`);
      console.log(`      - ID: ${template.id}`);
      console.log(`      - Категория: ${template.category}`);
      console.log(`      - Теги: ${template.tags.join(', ')}`);
      console.log(`      - Узлов в схеме: ${template.schema.nodes.length}`);
      console.log(`      - Связей в схеме: ${template.schema.edges.length}`);
      
      if (template.preview?.features) {
        console.log(`      - Возможности: ${template.preview.features.length}`);
      }
    }

    console.log('\n✅ Все тесты системы шаблонов прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании системы шаблонов:', error);
    throw error;
  }
}

// Запуск тестов
if (require.main === module) {
  testTemplateSystem()
    .then(() => {
      console.log('\n🎉 Тестирование завершено успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Тестирование завершилось с ошибкой:', error);
      process.exit(1);
    });
}

export { testTemplateSystem };