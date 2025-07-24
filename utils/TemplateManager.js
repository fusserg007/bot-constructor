const fs = require('fs').promises;
const path = require('path');

/**
 * Менеджер шаблонов ботов
 * Управляет загрузкой, валидацией и применением шаблонов
 */
class TemplateManager {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'data', 'templates');
    this.templateCache = new Map();
  }

  /**
   * Получение всех шаблонов с кэшированием
   */
  async getAllTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const templates = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const template = await this.getTemplate(file.replace('.json', '').replace('template_', ''));
          if (template) {
            templates.push(this.getTemplateMetadata(template));
          }
        }
      }

      return templates;
    } catch (error) {
      console.error('Ошибка получения шаблонов:', error);
      throw new Error('Не удалось загрузить шаблоны');
    }
  }

  /**
   * Получение шаблона по ID с кэшированием
   */
  async getTemplate(templateId) {
    try {
      // Проверяем кэш
      if (this.templateCache.has(templateId)) {
        return this.templateCache.get(templateId);
      }

      const templatePath = path.join(this.templatesDir, `template_${templateId}.json`);
      const templateData = await fs.readFile(templatePath, 'utf8');
      const template = JSON.parse(templateData);

      // Валидируем шаблон
      this.validateTemplate(template);

      // Кэшируем
      this.templateCache.set(templateId, template);

      return template;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Валидация структуры шаблона
   */
  validateTemplate(template) {
    const requiredFields = ['id', 'name', 'description', 'category', 'configuration'];
    
    for (const field of requiredFields) {
      if (!template[field]) {
        throw new Error(`Отсутствует обязательное поле: ${field}`);
      }
    }

    // Валидация конфигурации
    if (!template.configuration.nodes || !Array.isArray(template.configuration.nodes)) {
      throw new Error('Конфигурация должна содержать массив nodes');
    }

    // Валидация узлов
    for (const node of template.configuration.nodes) {
      if (!node.id || !node.type || !node.data) {
        throw new Error(`Некорректная структура узла: ${node.id}`);
      }
    }

    return true;
  }

  /**
   * Получение метаданных шаблона (без конфигурации)
   */
  getTemplateMetadata(template) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      isPremium: template.isPremium || false,
      preview: template.preview,
      usage: template.usage,
      createdAt: template.createdAt
    };
  }

  /**
   * Группировка шаблонов по категориям
   */
  async getTemplatesByCategory() {
    const templates = await this.getAllTemplates();
    
    return templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {});
  }

  /**
   * Поиск шаблонов по запросу
   */
  async searchTemplates(query) {
    const templates = await this.getAllTemplates();
    const searchQuery = query.toLowerCase();

    return templates.filter(template => 
      template.name.toLowerCase().includes(searchQuery) ||
      template.description.toLowerCase().includes(searchQuery) ||
      template.category.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Получение популярных шаблонов
   */
  async getPopularTemplates(limit = 5) {
    const templates = await this.getAllTemplates();
    
    return templates
      .sort((a, b) => (b.usage?.installs || 0) - (a.usage?.installs || 0))
      .slice(0, limit);
  }

  /**
   * Обновление статистики использования шаблона
   */
  async updateTemplateUsage(templateId) {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Шаблон не найден');
      }

      // Обновляем статистику
      template.usage.installs = (template.usage.installs || 0) + 1;
      template._meta.lastModified = new Date().toISOString();

      // Сохраняем
      const templatePath = path.join(this.templatesDir, `template_${templateId}.json`);
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2));

      // Обновляем кэш
      this.templateCache.set(templateId, template);

      return template;
    } catch (error) {
      console.error('Ошибка обновления статистики шаблона:', error);
      throw error;
    }
  }

  /**
   * Очистка кэша шаблонов
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Получение статистики по всем шаблонам
   */
  async getTemplateStats() {
    const templates = await this.getAllTemplates();
    
    const stats = {
      total: templates.length,
      byCategory: {},
      totalInstalls: 0,
      premiumCount: 0
    };

    templates.forEach(template => {
      // По категориям
      if (!stats.byCategory[template.category]) {
        stats.byCategory[template.category] = 0;
      }
      stats.byCategory[template.category]++;

      // Общая статистика
      stats.totalInstalls += template.usage?.installs || 0;
      if (template.isPremium) {
        stats.premiumCount++;
      }
    });

    return stats;
  }
}

module.exports = TemplateManager;