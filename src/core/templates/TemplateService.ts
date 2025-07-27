/**
 * Сервис для работы с шаблонами ботов
 */
import { TemplateManager, BotTemplate, TemplateCategory } from './TemplateManager';
import { BotSchema } from '../types';

export class TemplateService {
  private templateManager: TemplateManager;

  constructor() {
    this.templateManager = TemplateManager.getInstance();
  }

  /**
   * Получить все доступные шаблоны
   */
  async getAllTemplates(): Promise<BotTemplate[]> {
    return this.templateManager.getAllTemplates();
  }

  /**
   * Получить шаблон по ID
   */
  async getTemplate(id: string): Promise<BotTemplate | null> {
    const template = this.templateManager.getTemplate(id);
    return template || null;
  }

  /**
   * Получить шаблоны по категории
   */
  async getTemplatesByCategory(category: string): Promise<BotTemplate[]> {
    return this.templateManager.getTemplatesByCategory(category);
  }

  /**
   * Поиск шаблонов
   */
  async searchTemplates(
    query: string,
    filters?: {
      category?: string;
      difficulty?: string;
      platform?: string;
      tags?: string[];
    }
  ): Promise<BotTemplate[]> {
    return this.templateManager.searchTemplates(query, filters);
  }

  /**
   * Получить все категории
   */
  async getCategories(): Promise<TemplateCategory[]> {
    return this.templateManager.getAllCategories();
  }

  /**
   * Создать бота из шаблона
   */
  async createBotFromTemplate(templateId: string, botName: string): Promise<BotSchema | null> {
    return this.templateManager.cloneTemplate(templateId, botName);
  }

  /**
   * Получить статистику по шаблонам
   */
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    categoriesCount: number;
    popularCategories: Array<{ category: string; count: number }>;
    difficultyDistribution: Record<string, number>;
  }> {
    const templates = this.templateManager.getAllTemplates();
    const categories = this.templateManager.getAllCategories();

    // Подсчет по категориям
    const categoryStats: Record<string, number> = {};
    const difficultyStats: Record<string, number> = {};

    templates.forEach(template => {
      categoryStats[template.category] = (categoryStats[template.category] || 0) + 1;
      difficultyStats[template.difficulty] = (difficultyStats[template.difficulty] || 0) + 1;
    });

    // Сортировка популярных категорий
    const popularCategories = Object.entries(categoryStats)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTemplates: templates.length,
      categoriesCount: categories.length,
      popularCategories,
      difficultyDistribution: difficultyStats
    };
  }

  /**
   * Получить рекомендуемые шаблоны для начинающих
   */
  async getRecommendedTemplates(): Promise<BotTemplate[]> {
    return this.templateManager.searchTemplates('', {
      difficulty: 'beginner'
    });
  }

  /**
   * Получить популярные шаблоны
   */
  async getPopularTemplates(): Promise<BotTemplate[]> {
    // Возвращаем шаблоны из самых популярных категорий
    const templates = this.templateManager.getAllTemplates();
    
    // Приоритет: business, support, education
    const priorityOrder = ['business', 'support', 'education', 'ecommerce', 'utility'];
    
    return templates.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.category);
      const bIndex = priorityOrder.indexOf(b.category);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }

  /**
   * Валидация шаблона
   */
  async validateTemplate(template: BotTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка обязательных полей
    if (!template.id) errors.push('ID шаблона обязателен');
    if (!template.name) errors.push('Название шаблона обязательно');
    if (!template.description) errors.push('Описание шаблона обязательно');
    if (!template.category) errors.push('Категория шаблона обязательна');
    if (!template.schema) errors.push('Схема бота обязательна');

    // Проверка схемы
    if (template.schema) {
      if (!template.schema.nodes || template.schema.nodes.length === 0) {
        errors.push('Схема должна содержать хотя бы один узел');
      }

      if (!template.schema.edges) {
        warnings.push('Схема не содержит связей между узлами');
      }
    }

    // Проверка платформ
    if (!template.platforms || template.platforms.length === 0) {
      warnings.push('Не указаны поддерживаемые платформы');
    }

    // Проверка тегов
    if (!template.tags || template.tags.length === 0) {
      warnings.push('Не указаны теги для поиска');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Экспорт шаблона в JSON
   */
  async exportTemplate(templateId: string): Promise<string | null> {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return null;

    return JSON.stringify(template, null, 2);
  }

  /**
   * Импорт шаблона из JSON
   */
  async importTemplate(templateJson: string): Promise<{
    success: boolean;
    template?: BotTemplate;
    error?: string;
  }> {
    try {
      const template: BotTemplate = JSON.parse(templateJson);
      
      // Валидация
      const validation = await this.validateTemplate(template);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Ошибки валидации: ${validation.errors.join(', ')}`
        };
      }

      // Добавляем шаблон
      this.templateManager.addTemplate(template);

      return {
        success: true,
        template
      };
    } catch (error) {
      return {
        success: false,
        error: `Ошибка парсинга JSON: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }
}