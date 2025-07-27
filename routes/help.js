const express = require('express');
const router = express.Router();

// Импорт системы помощи (будет создан позже)
// const { helpSystem } = require('../src/core/documentation/HelpSystem');

// Временные данные для демонстрации
const mockHelpData = {
  'trigger-command': {
    id: 'trigger-command',
    title: 'Триггер команды',
    description: 'Запускает выполнение схемы при получении команды от пользователя (например, /start, /help)',
    category: 'triggers',
    examples: [
      {
        title: 'Команда приветствия',
        description: 'Базовая команда /start для приветствия новых пользователей',
        config: { command: '/start', description: 'Начать работу с ботом' },
        useCase: 'Первое знакомство пользователя с ботом',
        difficulty: 'beginner'
      },
      {
        title: 'Команда помощи',
        description: 'Команда /help для показа доступных функций',
        config: { command: '/help', description: 'Показать справку' },
        useCase: 'Предоставление справочной информации',
        difficulty: 'beginner'
      }
    ],
    bestPractices: [
      'Используйте понятные названия команд (/start, /help, /settings)',
      'Добавляйте описания к командам для автоматического меню',
      'Не создавайте слишком много команд - это запутает пользователей'
    ],
    commonIssues: [
      {
        problem: 'Команда не срабатывает',
        solution: 'Проверьте правильность написания команды (должна начинаться с /)',
        prevention: 'Используйте валидацию при создании команд'
      }
    ],
    relatedNodes: ['action-send-message', 'condition-user-role', 'data-variable'],
    platforms: ['telegram', 'max', 'discord']
  },
  'action-send-message': {
    id: 'action-send-message',
    title: 'Отправить сообщение',
    description: 'Отправляет текстовое сообщение пользователю с возможностью добавления кнопок',
    category: 'actions',
    examples: [
      {
        title: 'Простое сообщение',
        description: 'Отправка обычного текстового сообщения',
        config: { text: 'Привет! Как дела?', parseMode: 'HTML' },
        useCase: 'Базовое общение с пользователем',
        difficulty: 'beginner'
      },
      {
        title: 'Сообщение с кнопками',
        description: 'Сообщение с inline кнопками для выбора',
        config: {
          text: 'Выберите действие:',
          buttons: [
            [{ text: 'Помощь', callback_data: 'help' }],
            [{ text: 'Настройки', callback_data: 'settings' }]
          ]
        },
        useCase: 'Создание интерактивных меню',
        difficulty: 'intermediate'
      }
    ],
    bestPractices: [
      'Используйте HTML разметку для форматирования текста',
      'Группируйте кнопки логически (не более 3-4 в ряду)',
      'Добавляйте эмодзи для улучшения восприятия'
    ],
    commonIssues: [
      {
        problem: 'Сообщение не отправляется',
        solution: 'Проверьте корректность HTML разметки и длину сообщения',
        prevention: 'Используйте валидацию HTML и ограничения по длине'
      }
    ],
    relatedNodes: ['trigger-callback', 'condition-text-contains', 'data-variable'],
    platforms: ['telegram', 'max', 'whatsapp', 'discord']
  }
};

// Получить справку по узлу
router.get('/nodes/:nodeType', (req, res) => {
  try {
    const { nodeType } = req.params;
    
    // В реальной реализации будет использоваться helpSystem
    // const helpInfo = helpSystem.getNodeHelp(nodeType);
    const helpInfo = mockHelpData[nodeType];
    
    if (!helpInfo) {
      return res.status(404).json({
        success: false,
        error: 'Справка для данного типа узла не найдена'
      });
    }

    res.json(helpInfo);
  } catch (error) {
    console.error('Ошибка получения справки:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Поиск по справке
router.get('/search', (req, res) => {
  try {
    const { q: query, type, category, difficulty } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    // Простой поиск по mock данным
    const results = [];
    const searchQuery = query.toLowerCase();
    
    for (const [nodeId, helpInfo] of Object.entries(mockHelpData)) {
      let relevance = 0;
      
      // Поиск в заголовке
      if (helpInfo.title.toLowerCase().includes(searchQuery)) {
        relevance += 20;
      }
      
      // Поиск в описании
      if (helpInfo.description.toLowerCase().includes(searchQuery)) {
        relevance += 15;
      }
      
      // Поиск в примерах
      for (const example of helpInfo.examples) {
        if (example.title.toLowerCase().includes(searchQuery) ||
            example.description.toLowerCase().includes(searchQuery)) {
          relevance += 10;
        }
      }
      
      // Поиск в лучших практиках
      for (const practice of helpInfo.bestPractices) {
        if (practice.toLowerCase().includes(searchQuery)) {
          relevance += 5;
        }
      }
      
      if (relevance > 0) {
        results.push({
          type: 'node',
          id: nodeId,
          title: helpInfo.title,
          description: helpInfo.description,
          relevance,
          category: helpInfo.category
        });
      }
    }
    
    // Применение фильтров
    let filteredResults = results;
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      filteredResults = filteredResults.filter(r => types.includes(r.type));
    }
    
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      filteredResults = filteredResults.filter(r => r.category && categories.includes(r.category));
    }
    
    // Сортировка по релевантности
    filteredResults.sort((a, b) => b.relevance - a.relevance);
    
    res.json(filteredResults.slice(0, 20));
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить примеры для узла
router.get('/nodes/:nodeType/examples', (req, res) => {
  try {
    const { nodeType } = req.params;
    const { difficulty } = req.query;
    
    const helpInfo = mockHelpData[nodeType];
    if (!helpInfo) {
      return res.status(404).json({
        success: false,
        error: 'Узел не найден'
      });
    }
    
    let examples = helpInfo.examples;
    if (difficulty) {
      examples = examples.filter(ex => ex.difficulty === difficulty);
    }
    
    res.json(examples);
  } catch (error) {
    console.error('Ошибка получения примеров:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить связанные узлы
router.get('/nodes/:nodeType/related', (req, res) => {
  try {
    const { nodeType } = req.params;
    
    const helpInfo = mockHelpData[nodeType];
    if (!helpInfo) {
      return res.status(404).json({
        success: false,
        error: 'Узел не найден'
      });
    }
    
    const relatedNodes = helpInfo.relatedNodes
      .map(id => mockHelpData[id])
      .filter(Boolean);
    
    res.json(relatedNodes);
  } catch (error) {
    console.error('Ошибка получения связанных узлов:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить рекомендации для задачи
router.post('/recommendations', (req, res) => {
  try {
    const { task, platform } = req.body;
    
    if (!task || task.trim().length < 3) {
      return res.json([]);
    }
    
    // Простая логика рекомендаций
    const recommendations = [];
    const taskLower = task.toLowerCase();
    
    // Рекомендации на основе ключевых слов
    if (taskLower.includes('команд') || taskLower.includes('/start') || taskLower.includes('триггер')) {
      recommendations.push({
        type: 'node',
        id: 'trigger-command',
        title: 'Триггер команды',
        description: 'Для обработки команд пользователя',
        relevance: 20,
        category: 'triggers'
      });
    }
    
    if (taskLower.includes('сообщен') || taskLower.includes('отправ') || taskLower.includes('ответ')) {
      recommendations.push({
        type: 'node',
        id: 'action-send-message',
        title: 'Отправить сообщение',
        description: 'Для отправки сообщений пользователю',
        relevance: 18,
        category: 'actions'
      });
    }
    
    if (taskLower.includes('услов') || taskLower.includes('если') || taskLower.includes('проверк')) {
      recommendations.push({
        type: 'node',
        id: 'condition-text-contains',
        title: 'Условие: текст содержит',
        description: 'Для проверки содержимого сообщений',
        relevance: 15,
        category: 'conditions'
      });
    }
    
    // Фильтрация по платформе
    if (platform) {
      const filteredRecommendations = recommendations.filter(rec => {
        const helpInfo = mockHelpData[rec.id];
        return helpInfo && (helpInfo.platforms.includes(platform) || helpInfo.platforms.includes('all'));
      });
      
      res.json(filteredRecommendations.sort((a, b) => b.relevance - a.relevance));
    } else {
      res.json(recommendations.sort((a, b) => b.relevance - a.relevance));
    }
  } catch (error) {
    console.error('Ошибка получения рекомендаций:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить все категории узлов
router.get('/categories', (req, res) => {
  try {
    const categories = new Set();
    
    for (const helpInfo of Object.values(mockHelpData)) {
      categories.add(helpInfo.category);
    }
    
    const categoryList = Array.from(categories).map(category => {
      const nodes = Object.values(mockHelpData).filter(h => h.category === category);
      
      return {
        id: category,
        name: getCategoryName(category),
        icon: getCategoryIcon(category),
        nodeCount: nodes.length,
        nodes: nodes.map(n => ({ id: n.id, title: n.title }))
      };
    });
    
    res.json(categoryList);
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Вспомогательные функции
function getCategoryName(category) {
  const names = {
    'triggers': 'Триггеры',
    'actions': 'Действия',
    'conditions': 'Условия',
    'data': 'Данные',
    'integrations': 'Интеграции'
  };
  return names[category] || category;
}

function getCategoryIcon(category) {
  const icons = {
    'triggers': '⚡',
    'actions': '🎯',
    'conditions': '❓',
    'data': '📊',
    'integrations': '🔗'
  };
  return icons[category] || '📄';
}

module.exports = router;