const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const TemplateManager = require('../utils/TemplateManager');
// Убираем авторизацию для админской панели

// Инициализация менеджера шаблонов
const templateManager = new TemplateManager();

// Используем настоящий middleware авторизации

// GET /api/templates - получение списка шаблонов
router.get('/', async (req, res) => {
  try {
    const { category, search, popular } = req.query;
    
    let templates;
    
    if (search) {
      templates = await templateManager.searchTemplates(search);
      const categorizedTemplates = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {});
      
      return res.json({
        success: true,
        data: {
          templates: categorizedTemplates,
          total: templates.length,
          searchQuery: search
        }
      });
    }
    
    if (popular) {
      templates = await templateManager.getPopularTemplates(parseInt(popular) || 5);
      return res.json({
        success: true,
        data: {
          templates: templates,
          total: templates.length,
          type: 'popular'
        }
      });
    }
    
    if (category) {
      const allTemplates = await templateManager.getTemplatesByCategory();
      const categoryTemplates = allTemplates[category] || [];
      
      return res.json({
        success: true,
        data: {
          templates: { [category]: categoryTemplates },
          total: categoryTemplates.length,
          category: category
        }
      });
    }

    // Получаем все шаблоны, сгруппированные по категориям
    const categorizedTemplates = await templateManager.getTemplatesByCategory();
    const totalCount = Object.values(categorizedTemplates).reduce((sum, arr) => sum + arr.length, 0);

    res.json({
      success: true,
      data: {
        templates: categorizedTemplates,
        total: totalCount
      }
    });

  } catch (error) {
    console.error('Ошибка получения шаблонов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения списка шаблонов'
    });
  }
});

// GET /api/templates/stats - получение статистики по шаблонам
router.get('/stats', async (req, res) => {
  try {
    const stats = await templateManager.getTemplateStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Ошибка получения статистики шаблонов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// GET /api/templates/:id - получение конкретного шаблона
router.get('/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await templateManager.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Шаблон не найден'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Ошибка получения шаблона:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения шаблона'
    });
  }
});

// POST /api/templates/:id/apply - применение шаблона к боту
router.post('/:id/apply', async (req, res) => {
  try {
    const templateId = req.params.id;
    const { botName, customizations = {} } = req.body;
    
    if (!botName) {
      return res.status(400).json({
        success: false,
        error: 'Не указано имя бота'
      });
    }

    // Загружаем шаблон через TemplateManager
    const template = await templateManager.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Шаблон не найден'
      });
    }

    // Проверяем доступ к премиум шаблонам
    if (template.isPremium && req.user.subscription.plan === 'free') {
      return res.status(403).json({
        success: false,
        error: 'Для использования этого шаблона требуется премиум подписка'
      });
    }

    // Создаем нового бота на основе шаблона
    const botId = uuidv4();
    const newBot = {
      id: botId,
      userId: req.user.telegramId,
      name: botName,
      description: template.description,
      token: '', // Будет заполнен пользователем позже
      status: 'draft',
      configuration: {
        ...template.configuration,
        // Применяем кастомизации
        ...customizations
      },
      template: {
        id: template.id,
        category: template.category,
        customizations: customizations
      },
      stats: {
        messagesProcessed: 0,
        activeUsers: 0,
        lastActivity: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Сохраняем бота
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    await fs.writeFile(botPath, JSON.stringify(newBot, null, 2));

    // Обновляем статистику использования шаблона через TemplateManager
    await templateManager.updateTemplateUsage(templateId);

    res.json({
      success: true,
      data: {
        botId: botId,
        message: 'Бот успешно создан на основе шаблона'
      }
    });

  } catch (error) {
    console.error('Ошибка применения шаблона:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания бота из шаблона'
    });
  }
});

module.exports = router;