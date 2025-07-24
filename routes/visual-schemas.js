/**
 * API маршруты для работы с визуальными схемами ботов
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const VisualSchemaConverter = require('../utils/VisualSchemaConverter');

// ⚠️ АВТОРИЗАЦИЯ ПОЛНОСТЬЮ ОТКЛЮЧЕНА - АДМИНСКАЯ ПАНЕЛЬ
// НЕ ДОБАВЛЯТЬ АВТОРИЗАЦИЮ В БУДУЩЕМ!

// Инициализация конвертера схем
const schemaConverter = new VisualSchemaConverter();

/**
 * @route GET /api/visual-schemas
 * @desc Получить все визуальные схемы пользователя
 * @access Private
 */
router.get('/', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const userSchemasDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId);
        
        // Создаем директорию, если не существует
        try {
            await fs.mkdir(userSchemasDir, { recursive: true });
        } catch (err) {
            // Игнорируем ошибку, если директория уже существует
        }
        
        // Получаем список файлов схем
        const files = await fs.readdir(userSchemasDir);
        const schemas = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const schemaPath = path.join(userSchemasDir, file);
                const schemaData = await fs.readFile(schemaPath, 'utf8');
                const schema = JSON.parse(schemaData);
                
                schemas.push({
                    id: schema.id || file.replace('.json', ''),
                    name: schema.name || 'Unnamed Schema',
                    botId: schema.botId || null,
                    createdAt: schema.createdAt || null,
                    updatedAt: schema.updatedAt || null,
                    nodeCount: schema.nodes ? schema.nodes.length : 0,
                    connectionCount: schema.connections ? schema.connections.length : 0
                });
            }
        }
        
        res.json(schemas);
    } catch (error) {
        console.error('Error fetching visual schemas:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/visual-schemas/:id
 * @desc Получить визуальную схему по ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        try {
            const schemaData = await fs.readFile(schemaPath, 'utf8');
            const schema = JSON.parse(schemaData);
            res.json(schema);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ message: 'Schema not found' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Error fetching visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas
 * @desc Создать новую визуальную схему
 * @access Private
 */
router.post('/', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const { name, botId, nodes, connections, viewport } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Schema name is required' });
        }
        
        const schemaId = uuidv4();
        const now = new Date().toISOString();
        
        const schema = {
            id: schemaId,
            name,
            botId,
            createdAt: now,
            updatedAt: now,
            nodes: nodes || [],
            connections: connections || [],
            viewport: viewport || { x: 0, y: 0, scale: 1 }
        };
        
        const userSchemasDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId);
        
        // Создаем директорию, если не существует
        await fs.mkdir(userSchemasDir, { recursive: true });
        
        const schemaPath = path.join(userSchemasDir, `${schemaId}.json`);
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
        
        // Если указан botId, связываем схему с ботом
        if (botId) {
            await linkSchemaToBot(userId, botId, schemaId);
        }
        
        res.status(201).json(schema);
    } catch (error) {
        console.error('Error creating visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route PUT /api/visual-schemas/:id
 * @desc Обновить визуальную схему
 * @access Private
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const { name, nodes, connections, viewport } = req.body;
        
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование схемы
        try {
            await fs.access(schemaPath);
        } catch (err) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        
        // Читаем текущую схему
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        // Обновляем поля
        schema.name = name || schema.name;
        schema.nodes = nodes || schema.nodes;
        schema.connections = connections || schema.connections;
        schema.viewport = viewport || schema.viewport;
        schema.updatedAt = new Date().toISOString();
        
        // Сохраняем обновленную схему
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
        
        res.json(schema);
    } catch (error) {
        console.error('Error updating visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route DELETE /api/visual-schemas/:id
 * @desc Удалить визуальную схему
 * @access Private
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование схемы
        try {
            await fs.access(schemaPath);
        } catch (err) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        
        // Читаем схему для получения botId
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        // Если схема связана с ботом, удаляем связь
        if (schema.botId) {
            await unlinkSchemaFromBot(userId, schema.botId);
        }
        
        // Удаляем файл схемы
        await fs.unlink(schemaPath);
        
        res.json({ message: 'Schema deleted successfully' });
    } catch (error) {
        console.error('Error deleting visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:id/convert
 * @desc Конвертировать визуальную схему в исполняемую логику
 * @access Private
 */
router.post('/:id/convert', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование схемы
        try {
            await fs.access(schemaPath);
        } catch (err) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        
        // Читаем схему
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        // Конвертируем схему
        const executableSchema = schemaConverter.convertToExecutable(schema);
        
        // Если схема связана с ботом, обновляем конфигурацию бота
        if (schema.botId) {
            await updateBotConfiguration(userId, schema.botId, executableSchema);
            res.json({ message: 'Schema converted and bot updated successfully', schema: executableSchema });
        } else {
            res.json({ message: 'Schema converted successfully', schema: executableSchema });
        }
    } catch (error) {
        console.error('Error converting visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:id/save-version
 * @desc Сохранить версию визуальной схемы
 * @access Private
 */
router.post('/:id/save-version', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Version name is required' });
        }
        
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование схемы
        try {
            await fs.access(schemaPath);
        } catch (err) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        
        // Читаем схему
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        // Создаем версию
        const versionId = `v_${Date.now()}`;
        const version = {
            id: versionId,
            name,
            schemaId,
            timestamp: new Date().toISOString(),
            nodeCount: schema.nodes ? schema.nodes.length : 0,
            connectionCount: schema.connections ? schema.connections.length : 0
        };
        
        // Создаем директорию для версий
        const versionsDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId, 'versions');
        await fs.mkdir(versionsDir, { recursive: true });
        
        // Сохраняем версию
        const versionPath = path.join(versionsDir, `${versionId}.json`);
        await fs.writeFile(versionPath, JSON.stringify({
            version,
            schema
        }, null, 2));
        
        // Обновляем список версий схемы
        const versionsListPath = path.join(versionsDir, `${schemaId}_versions.json`);
        let versionsList = [];
        
        try {
            const versionsListData = await fs.readFile(versionsListPath, 'utf8');
            versionsList = JSON.parse(versionsListData);
        } catch (err) {
            // Если файл не существует, создаем новый список
        }
        
        versionsList.push(version);
        
        // Сортируем версии по времени (новые сверху)
        versionsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Ограничиваем количество версий (оставляем последние 20)
        if (versionsList.length > 20) {
            const removedVersions = versionsList.splice(20);
            
            // Удаляем старые версии
            for (const removedVersion of removedVersions) {
                try {
                    await fs.unlink(path.join(versionsDir, `${removedVersion.id}.json`));
                } catch (err) {
                    // Игнорируем ошибки удаления
                }
            }
        }
        
        await fs.writeFile(versionsListPath, JSON.stringify(versionsList, null, 2));
        
        res.json({
            message: 'Version saved successfully',
            version
        });
    } catch (error) {
        console.error('Error saving version:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/visual-schemas/:id/versions
 * @desc Получить список версий визуальной схемы
 * @access Private
 */
router.get('/:id/versions', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        
        const versionsListPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, 'versions', `${schemaId}_versions.json`);
        
        try {
            const versionsListData = await fs.readFile(versionsListPath, 'utf8');
            const versionsList = JSON.parse(versionsListData);
            res.json(versionsList);
        } catch (err) {
            // Если файл не существует, возвращаем пустой список
            res.json([]);
        }
    } catch (error) {
        console.error('Error getting versions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route GET /api/visual-schemas/:id/versions/:versionId
 * @desc Получить конкретную версию визуальной схемы
 * @access Private
 */
router.get('/:id/versions/:versionId', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const versionId = req.params.versionId;
        
        const versionPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, 'versions', `${versionId}.json`);
        
        try {
            const versionData = await fs.readFile(versionPath, 'utf8');
            const version = JSON.parse(versionData);
            res.json(version);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ message: 'Version not found' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Error getting version:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:id/restore/:versionId
 * @desc Восстановить схему из версии
 * @access Private
 */
router.post('/:id/restore/:versionId', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const versionId = req.params.versionId;
        
        const versionPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, 'versions', `${versionId}.json`);
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование версии
        try {
            await fs.access(versionPath);
        } catch (err) {
            return res.status(404).json({ message: 'Version not found' });
        }
        
        // Читаем версию
        const versionData = await fs.readFile(versionPath, 'utf8');
        const version = JSON.parse(versionData);
        
        // Проверяем, что версия принадлежит этой схеме
        if (version.schema.id !== schemaId) {
            return res.status(400).json({ message: 'Version does not belong to this schema' });
        }
        
        // Сохраняем текущую схему как версию перед восстановлением
        try {
            const currentSchemaData = await fs.readFile(schemaPath, 'utf8');
            const currentSchema = JSON.parse(currentSchemaData);
            
            const backupVersionId = `backup_${Date.now()}`;
            const backupVersion = {
                id: backupVersionId,
                name: 'Автоматическое сохранение перед восстановлением',
                schemaId,
                timestamp: new Date().toISOString(),
                nodeCount: currentSchema.nodes ? currentSchema.nodes.length : 0,
                connectionCount: currentSchema.connections ? currentSchema.connections.length : 0
            };
            
            const versionsDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId, 'versions');
            await fs.mkdir(versionsDir, { recursive: true });
            
            const backupVersionPath = path.join(versionsDir, `${backupVersionId}.json`);
            await fs.writeFile(backupVersionPath, JSON.stringify({
                version: backupVersion,
                schema: currentSchema
            }, null, 2));
            
            // Обновляем список версий
            const versionsListPath = path.join(versionsDir, `${schemaId}_versions.json`);
            let versionsList = [];
            
            try {
                const versionsListData = await fs.readFile(versionsListPath, 'utf8');
                versionsList = JSON.parse(versionsListData);
            } catch (err) {
                // Если файл не существует, создаем новый список
            }
            
            versionsList.push(backupVersion);
            versionsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            await fs.writeFile(versionsListPath, JSON.stringify(versionsList, null, 2));
        } catch (err) {
            // Игнорируем ошибки создания резервной копии
            console.warn('Failed to create backup version:', err);
        }
        
        // Восстанавливаем схему из версии
        await fs.writeFile(schemaPath, JSON.stringify(version.schema, null, 2));
        
        res.json({
            message: 'Schema restored from version successfully',
            schema: version.schema
        });
    } catch (error) {
        console.error('Error restoring schema from version:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:id/link/:botId
 * @desc Связать визуальную схему с ботом
 * @access Private
 */
router.post('/:id/link/:botId', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        const botId = req.params.botId;
        
        await linkSchemaToBot(userId, botId, schemaId);
        
        res.json({ message: 'Schema linked to bot successfully' });
    } catch (error) {
        console.error('Error linking schema to bot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:botId
 * @desc Сохранить визуальную схему для конкретного бота
 * @access Private
 */
router.post('/:botId', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const botId = req.params.botId;
        const { nodes, connections, version, lastModified } = req.body;
        
        // Проверяем существование бота
        const botPath = path.join(__dirname, '..', 'data', 'bots', userId, `${botId}.json`);
        
        try {
            await fs.access(botPath);
        } catch (err) {
            return res.status(404).json({ message: 'Bot not found' });
        }
        
        // Ищем существующую схему для этого бота
        const userSchemasDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId);
        await fs.mkdir(userSchemasDir, { recursive: true });
        
        let schemaId = null;
        let existingSchema = null;
        
        // Проверяем, есть ли уже схема для этого бота
        try {
            const files = await fs.readdir(userSchemasDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const schemaPath = path.join(userSchemasDir, file);
                    const schemaData = await fs.readFile(schemaPath, 'utf8');
                    const schema = JSON.parse(schemaData);
                    
                    if (schema.botId === botId) {
                        schemaId = schema.id;
                        existingSchema = schema;
                        break;
                    }
                }
            }
        } catch (err) {
            // Игнорируем ошибки чтения директории
        }
        
        // Если схема не найдена, создаем новую
        if (!schemaId) {
            schemaId = uuidv4();
        }
        
        const now = new Date().toISOString();
        
        const schema = {
            id: schemaId,
            name: existingSchema ? existingSchema.name : `Schema for ${botId}`,
            botId: botId,
            createdAt: existingSchema ? existingSchema.createdAt : now,
            updatedAt: now,
            version: version || '1.0',
            lastModified: lastModified || now,
            nodes: nodes || [],
            connections: connections || [],
            viewport: existingSchema ? existingSchema.viewport : { x: 0, y: 0, scale: 1 }
        };
        
        const schemaPath = path.join(userSchemasDir, `${schemaId}.json`);
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
        
        // Связываем схему с ботом, если еще не связана
        if (!existingSchema) {
            await linkSchemaToBot(userId, botId, schemaId);
        }
        
        res.json({
            message: 'Schema saved successfully',
            schema: schema
        });
    } catch (error) {
        console.error('Error saving visual schema for bot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/:id/unlink
 * @desc Отвязать визуальную схему от бота
 * @access Private
 */
router.post('/:id/unlink', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const schemaId = req.params.id;
        
        const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
        
        // Проверяем существование схемы
        try {
            await fs.access(schemaPath);
        } catch (err) {
            return res.status(404).json({ message: 'Schema not found' });
        }
        
        // Читаем схему для получения botId
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        if (!schema.botId) {
            return res.status(400).json({ message: 'Schema is not linked to any bot' });
        }
        
        await unlinkSchemaFromBot(userId, schema.botId);
        
        // Обновляем схему
        schema.botId = null;
        schema.updatedAt = new Date().toISOString();
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
        
        res.json({ message: 'Schema unlinked from bot successfully' });
    } catch (error) {
        console.error('Error unlinking schema from bot:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route POST /api/visual-schemas/migrate/:botId
 * @desc Мигрировать существующего бота в визуальную схему
 * @access Private
 */
router.post('/migrate/:botId', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const botId = req.params.botId;
        
        // Получаем конфигурацию бота
        const botPath = path.join(__dirname, '..', 'data', 'bots', userId, `${botId}.json`);
        
        try {
            await fs.access(botPath);
        } catch (err) {
            return res.status(404).json({ message: 'Bot not found' });
        }
        
        const botData = await fs.readFile(botPath, 'utf8');
        const bot = JSON.parse(botData);
        
        // Конвертируем конфигурацию бота в визуальную схему
        const visualSchema = schemaConverter.convertToVisual(bot.configuration);
        
        // Создаем новую схему
        const schemaId = uuidv4();
        const now = new Date().toISOString();
        
        const schema = {
            id: schemaId,
            name: `${bot.name} - Visual Schema`,
            botId: botId,
            createdAt: now,
            updatedAt: now,
            nodes: visualSchema.nodes || [],
            connections: visualSchema.connections || [],
            viewport: { x: 0, y: 0, scale: 1 }
        };
        
        const userSchemasDir = path.join(__dirname, '..', 'data', 'visual_schemas', userId);
        
        // Создаем директорию, если не существует
        await fs.mkdir(userSchemasDir, { recursive: true });
        
        const schemaPath = path.join(userSchemasDir, `${schemaId}.json`);
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
        
        // Связываем схему с ботом
        await linkSchemaToBot(userId, botId, schemaId);
        
        res.status(201).json({
            message: 'Bot migrated to visual schema successfully',
            schema
        });
    } catch (error) {
        console.error('Error migrating bot to visual schema:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * Вспомогательная функция для связывания схемы с ботом
 */
async function linkSchemaToBot(userId, botId, schemaId) {
    const botPath = path.join(__dirname, '..', 'data', 'bots', userId, `${botId}.json`);
    
    try {
        await fs.access(botPath);
    } catch (err) {
        throw new Error('Bot not found');
    }
    
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);
    
    // Обновляем бота
    bot.visualSchemaId = schemaId;
    bot.updatedAt = new Date().toISOString();
    
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));
    
    // Обновляем схему
    const schemaPath = path.join(__dirname, '..', 'data', 'visual_schemas', userId, `${schemaId}.json`);
    
    try {
        const schemaData = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaData);
        
        schema.botId = botId;
        schema.updatedAt = new Date().toISOString();
        
        await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
    } catch (err) {
        // Если схема не найдена, игнорируем
    }
}

/**
 * Вспомогательная функция для отвязывания схемы от бота
 */
async function unlinkSchemaFromBot(userId, botId) {
    const botPath = path.join(__dirname, '..', 'data', 'bots', userId, `${botId}.json`);
    
    try {
        await fs.access(botPath);
    } catch (err) {
        // Если бот не найден, игнорируем
        return;
    }
    
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);
    
    // Обновляем бота
    bot.visualSchemaId = null;
    bot.updatedAt = new Date().toISOString();
    
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));
}

/**
 * Вспомогательная функция для обновления конфигурации бота
 */
async function updateBotConfiguration(userId, botId, configuration) {
    const botPath = path.join(__dirname, '..', 'data', 'bots', userId, `${botId}.json`);
    
    try {
        await fs.access(botPath);
    } catch (err) {
        throw new Error('Bot not found');
    }
    
    const botData = await fs.readFile(botPath, 'utf8');
    const bot = JSON.parse(botData);
    
    // Обновляем конфигурацию бота
    bot.configuration = configuration;
    bot.updatedAt = new Date().toISOString();
    
    await fs.writeFile(botPath, JSON.stringify(bot, null, 2));
}

module.exports = router;