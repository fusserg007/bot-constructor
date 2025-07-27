const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const TokenManager = require('../utils/TokenManager');

const router = express.Router();
const tokenManager = new TokenManager();

// ⚠️ АВТОРИЗАЦИЯ ПОЛНОСТЬЮ ОТКЛЮЧЕНА - АДМИНСКАЯ ПАНЕЛЬ
// НЕ ДОБАВЛЯТЬ АВТОРИЗАЦИЮ В БУДУЩЕМ!

// GET /api/bots - получение списка ботов (админская панель)
router.get('/', async (req, res) => {
  try {
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    
    // Создаем папку если не существует
    try {
      await fs.access(botsDir);
    } catch {
      await fs.mkdir(botsDir, { recursive: true });
    }
    
    const files = await fs.readdir(botsDir);
    const bots = [];
    
    console.log(`Найдено файлов в ${botsDir}:`, files.length);

    for (const file of files) {
      console.log(`Проверяем файл: ${file}`);
      if (file.endsWith('.json') && file.startsWith('bot_')) {
        console.log(`Обрабатываем файл бота: ${file}`);
        try {
          const filePath = path.join(botsDir, file);
          const botData = await fs.readFile(filePath, 'utf8');
          const bot = JSON.parse(botData);
          
          // Для админской панели показываем всех ботов
          // Добавляем дополнительную информацию для улучшенных карточек
          bot.stats = bot.stats || {
            messagesProcessed: Math.floor(Math.random() * 1000), // Заглушка
            activeUsers: Math.floor(Math.random() * 100),
            errorCount: Math.floor(Math.random() * 10),
            lastActivity: bot.status === 'active' ? new Date().toISOString() : null
          };
          bots.push(bot);
          console.log(`Добавлен бот: ${bot.name || bot.id}`);
        } catch (parseError) {
          console.error(`Ошибка парсинга бота ${file}:`, parseError);
        }
      }
    }

    res.json({
      success: true,
      data: {
        bots: bots,
        total: bots.length
      }
    });

  } catch (error) {
    console.error('Ошибка получения списка ботов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения списка ботов'
    });
  }
});

// GET /api/bots/:id - получение конкретного бота
router.get('/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Админская панель - никаких проверок доступа

    res.json({
      success: true,
      data: bot
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Бот не найден'
      });
    }

    console.error('Ошибка получения бота:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения данных бота'
    });
  }
});

// POST /api/bots - создание нового бота
router.post('/', async (req, res) => {
  try {
    const { name, token, description, useVisualEditor, templateId, messengerType } = req.body;
    
    if (!name || !token) {
      return res.status(400).json({
        success: false,
        error: 'Имя и токен бота обязательны'
      });
    }

    // Проверяем уникальность токена (авторизация отключена)
    const isUnique = await tokenManager.checkTokenUniqueness(token, 'admin');
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        error: 'Этот токен уже используется другим ботом'
      });
    }

    // Определяем тип мессенджера (по умолчанию Telegram для обратной совместимости)
    const messenger = messengerType || 'telegram';
    
    // Валидируем токен через соответствующий API
    let validation;
    if (messenger === 'telegram') {
      validation = await tokenManager.validateTokenWithTelegram(token);
    } else if (messenger === 'max') {
      // Валидируем токен MAX через их API
      validation = await tokenManager.validateTokenWithMax(token);
    } else {
      return res.status(400).json({
        success: false,
        error: `Неподдерживаемый мессенджер: ${messenger}`
      });
    }
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Недействительный токен для ${messenger}: ${validation.error}`
      });
    }

    const botId = Date.now().toString();
    const bot = {
      id: botId,
      name: name,
      username: validation.botInfo.username,
      messengerType: messenger,
      token: token,
      description: description || '',
      userId: 'admin', // Авторизация отключена
      status: 'inactive',
      useVisualEditor: useVisualEditor || false,
      visualSchemaId: null,
      configuration: {
        nodes: [],
        connections: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Резервируем токен
    await tokenManager.reserveToken(token, 'admin', botId);

    // Сохраняем бота
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    await fs.mkdir(botsDir, { recursive: true });
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    // Если используется визуальный редактор, создаем базовую схему
    if (useVisualEditor) {
      await createDefaultVisualSchema(botId, bot.name, templateId);
    }

    res.status(201).json({
      success: true,
      message: 'Бот успешно создан',
      data: bot
    });

  } catch (error) {
    console.error('Ошибка создания бота:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка создания бота'
    });
  }
});

// PUT /api/bots/:id - обновление бота
router.put('/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    const updates = req.body;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Загружаем существующего бота
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    // Если обновляется токен, проверяем его уникальность
    if (updates.token && updates.token !== bot.token) {
      const isUnique = await tokenManager.checkTokenUniqueness(updates.token, 'admin', botId);
      if (!isUnique) {
        return res.status(400).json({
          success: false,
          error: 'Этот токен уже используется другим ботом'
        });
      }

      // Валидируем новый токен
      const validation = await tokenManager.validateTokenWithTelegram(updates.token);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Недействительный токен: ${validation.error}`
        });
      }

      // Освобождаем старый токен и резервируем новый
      await tokenManager.releaseToken(bot.token);
      await tokenManager.reserveToken(updates.token, 'admin', botId);
      
      // Обновляем username из Telegram API
      bot.username = validation.botInfo.username;
    }

    // Обновляем разрешенные поля
    const allowedFields = ['name', 'description', 'token', 'status', 'configuration'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        bot[field] = updates[field];
      }
    }

    // Обновляем время изменения
    bot.updatedAt = new Date().toISOString();

    // Сохраняем обновленного бота
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    // Автоматически перезапускаем бота если он активен и изменилась конфигурация
    if (bot.status === 'active' && (updates.configuration || updates.token)) {
      try {
        // Получаем экземпляр BotRuntime из глобального контекста
        const { getBotRuntime } = require('../server');
        const botRuntime = getBotRuntime();
        
        if (botRuntime) {
          console.log(`🔄 Автоматический перезапуск бота ${bot.name} после обновления конфигурации`);
          await botRuntime.autoRestartBot(botId);
        }
      } catch (restartError) {
        console.error(`Ошибка перезапуска бота ${botId}:`, restartError);
        // Не прерываем выполнение, так как бот уже обновлен
      }
    }

    res.json({
      success: true,
      message: 'Бот успешно обновлен',
      data: bot
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Бот не найден'
      });
    }

    console.error('Ошибка обновления бота:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка обновления бота'
    });
  }
});

// DELETE /api/bots/:id - удаление бота
router.delete('/:id', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    // Освобождаем токен
    await tokenManager.releaseToken(bot.token);

    // Удаляем файл бота
    await fs.unlink(botPath);

    res.json({
      success: true,
      message: 'Бот успешно удален'
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Бот не найден'
      });
    }

    console.error('Ошибка удаления бота:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления бота'
    });
  }
});

// Вспомогательная функция для создания базовой визуальной схемы
async function createDefaultVisualSchema(botId, botName, templateId = null) {
  try {
    const schemaId = Date.now().toString() + '_schema';
    const schemasDir = path.join(__dirname, '..', 'data', 'visual_schemas');
    await fs.mkdir(schemasDir, { recursive: true });

    let defaultNodes = [];
    let defaultConnections = [];

    // Создаем базовые узлы в зависимости от шаблона
    if (templateId) {
      const templateNodes = await getTemplateNodes(templateId);
      defaultNodes = templateNodes.nodes || [];
      defaultConnections = templateNodes.connections || [];
    } else {
      // Базовая схема: триггер команды /start и ответное сообщение
      defaultNodes = [
        {
          id: 'trigger_start',
          type: 'trigger',
          category: 'triggers',
          position: { x: 100, y: 100 },
          config: {
            triggerType: 'command',
            command: '/start',
            description: 'Команда запуска бота'
          },
          inputs: [],
          outputs: ['output']
        },
        {
          id: 'action_welcome',
          type: 'action',
          category: 'actions',
          position: { x: 400, y: 100 },
          config: {
            actionType: 'send_message',
            message: 'Привет, {user_name}! Добро пожаловать в бота {bot_name}!',
            parseMode: 'HTML'
          },
          inputs: ['input'],
          outputs: []
        }
      ];

      defaultConnections = [
        {
          id: 'conn_start_welcome',
          sourceNodeId: 'trigger_start',
          sourceOutput: 'output',
          targetNodeId: 'action_welcome',
          targetInput: 'input'
        }
      ];
    }

    const schema = {
      id: schemaId,
      botId: botId,
      name: `${botName} - Визуальная схема`,
      nodes: defaultNodes,
      connections: defaultConnections,
      viewport: { x: 0, y: 0, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const schemaPath = path.join(schemasDir, `schema_${schemaId}.json`);
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Обновляем бота с ID схемы
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);
    bot.visualSchemaId = schemaId;
    bot.updatedAt = new Date().toISOString();
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    console.log(`✅ Создана базовая визуальная схема для бота ${botName}`);
    return schemaId;
  } catch (error) {
    console.error('Ошибка создания базовой визуальной схемы:', error);
    throw error;
  }
}

// Вспомогательная функция для получения узлов шаблона
async function getTemplateNodes(templateId) {
  try {
    const templatePath = path.join(__dirname, '..', 'data', 'templates', `template_${templateId}.json`);
    const templateData = await fs.readFile(templatePath, 'utf8');
    const template = JSON.parse(templateData);
    
    // Конвертируем шаблон в визуальные узлы
    const VisualSchemaConverter = require('../utils/VisualSchemaConverter');
    const converter = new VisualSchemaConverter();
    return converter.convertToVisual(template);
  } catch (error) {
    console.error(`Ошибка загрузки шаблона ${templateId}:`, error);
    return { nodes: [], connections: [] };
  }
}

module.exports = router;

// POST /api/bots/validate-token - валидация токена
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Токен обязателен'
      });
    }

    // Проверяем уникальность токена
    const isUnique = await tokenManager.checkTokenUniqueness(token, 'admin');
    
    // Валидируем токен через Telegram API
    const validation = await tokenManager.validateTokenWithTelegram(token);

    res.json({
      success: true,
      data: {
        valid: validation.valid,
        unique: isUnique,
        botInfo: validation.botInfo || null,
        error: validation.error || null
      }
    });

  } catch (error) {
    console.error('Ошибка валидации токена:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка валидации токена'
    });
  }
});

// GET /api/bots/tokens/stats - статистика токенов (для админов)
router.get('/tokens/stats', async (req, res) => {
  try {
    const stats = await tokenManager.getTokenStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Ошибка получения статистики токенов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// POST /api/bots/:id/visual-schema - создать визуальную схему для бота
router.post('/:id/visual-schema', async (req, res) => {
  try {
    const botId = req.params.id;
    const { nodes, connections, viewport } = req.body;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    // Создаем визуальную схему
    const schemaId = Date.now().toString();
    const schema = {
      id: schemaId,
      botId: botId,
      name: `${bot.name} - Visual Schema`,
      nodes: nodes || [],
      connections: connections || [],
      viewport: viewport || { x: 0, y: 0, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Сохраняем схему
    const schemasDir = path.join(__dirname, '..', 'data', 'visual_schemas');
    await fs.mkdir(schemasDir, { recursive: true });
    const schemaPath = path.join(schemasDir, `schema_${schemaId}.json`);
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Обновляем бота
    bot.visualSchemaId = schemaId;
    bot.useVisualEditor = true;
    bot.updatedAt = new Date().toISOString();
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    res.status(201).json({
      success: true,
      message: 'Визуальная схема создана',
      data: schema
    });

  } catch (error) {
    console.error('Ошибка создания визуальной схемы:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания визуальной схемы'
    });
  }
});

// GET /api/bots/:id/visual-schema - получить визуальную схему бота
router.get('/:id/visual-schema', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    if (!bot.visualSchemaId) {
      return res.status(404).json({
        success: false,
        error: 'У бота нет визуальной схемы'
      });
    }

    // Загружаем схему
    const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', `schema_${bot.visualSchemaId}.json`);
    const schemaData = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaData);

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Визуальная схема не найдена'
      });
    }

    console.error('Ошибка получения визуальной схемы:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения визуальной схемы'
    });
  }
});

// PUT /api/bots/:id/visual-schema - обновить визуальную схему бота
router.put('/:id/visual-schema', async (req, res) => {
  try {
    const botId = req.params.id;
    const { nodes, connections, viewport } = req.body;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    if (!bot.visualSchemaId) {
      return res.status(404).json({
        success: false,
        error: 'У бота нет визуальной схемы'
      });
    }

    // Обновляем схему
    const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', `schema_${bot.visualSchemaId}.json`);
    const schemaData = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaData);

    schema.nodes = nodes || schema.nodes;
    schema.connections = connections || schema.connections;
    schema.viewport = viewport || schema.viewport;
    schema.updatedAt = new Date().toISOString();

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Обновляем время изменения бота
    bot.updatedAt = new Date().toISOString();
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    res.json({
      success: true,
      message: 'Визуальная схема обновлена',
      data: schema
    });

  } catch (error) {
    console.error('Ошибка обновления визуальной схемы:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления визуальной схемы'
    });
  }
});

// POST /api/bots/:id/convert-schema - конвертировать визуальную схему в исполняемую логику
router.post('/:id/convert-schema', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    if (!bot.visualSchemaId) {
      return res.status(404).json({
        success: false,
        error: 'У бота нет визуальной схемы'
      });
    }

    // Загружаем схему
    const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', `schema_${bot.visualSchemaId}.json`);
    const schemaData = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaData);

    // Конвертируем схему в исполняемую логику
    const VisualSchemaConverter = require('../utils/VisualSchemaConverter');
    const converter = new VisualSchemaConverter();
    const executableConfig = converter.convertToExecutable(schema);

    // Обновляем конфигурацию бота
    bot.configuration = executableConfig;
    bot.updatedAt = new Date().toISOString();
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    res.json({
      success: true,
      message: 'Схема конвертирована и бот обновлен',
      data: executableConfig
    });

  } catch (error) {
    console.error('Ошибка конвертации схемы:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка конвертации схемы'
    });
  }
});

// POST /api/bots/:id/migrate-to-visual - мигрировать существующего бота в визуальный редактор
router.post('/:id/migrate-to-visual', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    if (bot.visualSchemaId) {
      return res.status(400).json({
        success: false,
        error: 'Бот уже использует визуальный редактор'
      });
    }

    // Конвертируем существующую конфигурацию в визуальную схему
    const VisualSchemaConverter = require('../utils/VisualSchemaConverter');
    const converter = new VisualSchemaConverter();
    const visualSchema = converter.convertToVisual(bot.configuration);

    // Создаем визуальную схему
    const schemaId = Date.now().toString() + '_migrated';
    const schema = {
      id: schemaId,
      botId: botId,
      name: `${bot.name} - Мигрированная схема`,
      nodes: visualSchema.nodes || [],
      connections: visualSchema.connections || [],
      viewport: { x: 0, y: 0, scale: 1 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Сохраняем схему
    const schemasDir = path.join(__dirname, '..', 'data', 'visual_schemas');
    await fs.mkdir(schemasDir, { recursive: true });
    const schemaPath = path.join(schemasDir, `schema_${schemaId}.json`);
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Обновляем бота
    bot.visualSchemaId = schemaId;
    bot.useVisualEditor = true;
    bot.updatedAt = new Date().toISOString();
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));

    res.json({
      success: true,
      message: 'Бот успешно мигрирован в визуальный редактор',
      data: {
        schemaId: schemaId,
        nodeCount: schema.nodes.length,
        connectionCount: schema.connections.length
      }
    });

  } catch (error) {
    console.error('Ошибка миграции бота:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка миграции бота в визуальный редактор'
    });
  }
});

// POST /api/bots/:id/reload - перезагрузить бота в runtime
router.post('/:id/reload', async (req, res) => {
  try {
    const botId = req.params.id;
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${botId}.json`);
    
    // Проверяем, что бот существует и принадлежит пользователю
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);

    // Авторизация отключена - пропускаем проверку доступа

    // Перезагружаем бота в runtime (если он активен)
    const BotRuntime = require('../utils/BotRuntime');
    const runtime = new BotRuntime();
    
    if (bot.status === 'active') {
      const reloaded = await runtime.reloadBot(botId);
      
      if (reloaded) {
        res.json({
          success: true,
          message: 'Бот успешно перезагружен'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Ошибка перезагрузки бота'
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Бот неактивен, перезагрузка не требуется'
      });
    }

  } catch (error) {
    console.error('Ошибка перезагрузки бота:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка перезагрузки бота'
    });
  }
});

