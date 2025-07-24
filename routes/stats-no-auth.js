const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/Logger');
const { FileStorage } = require('../utils/FileStorage');

// ⚠️ АВТОРИЗАЦИЯ УДАЛЕНА - НЕ ДОБАВЛЯТЬ!

const logger = new Logger();
const storage = new FileStorage();

/**
 * GET /api/stats/bots/:botId
 * Получение статистики конкретного бота (БЕЗ АВТОРИЗАЦИИ)
 */
router.get('/bots/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        // Админская панель - доступ ко всем ботам
        const bot = await storage.getBot(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        // Генерируем фиктивную статистику для админки
        const stats = {
            botId,
            period,
            messages: {
                sent: Math.floor(Math.random() * 1000),
                received: Math.floor(Math.random() * 800),
                failed: Math.floor(Math.random() * 50)
            },
            users: {
                total: Math.floor(Math.random() * 500),
                active: Math.floor(Math.random() * 200),
                new: Math.floor(Math.random() * 50)
            },
            performance: {
                avgResponseTime: Math.floor(Math.random() * 500) + 100,
                uptime: 99.5,
                errorRate: Math.random() * 5
            }
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Ошибка получения статистики бота:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики' 
        });
    }
});

/**
 * GET /api/stats/bots/:botId/logs
 * Получение логов конкретного бота (БЕЗ АВТОРИЗАЦИИ)
 */
router.get('/bots/:botId/logs', async (req, res) => {
    try {
        const { botId } = req.params;
        const { limit = 100, offset = 0, level = 'all' } = req.query;

        // Админская панель - доступ ко всем ботам
        const bot = await storage.getBot(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        // Генерируем фиктивные логи
        const logs = [];
        for (let i = 0; i < Math.min(limit, 50); i++) {
            logs.push({
                id: i + 1,
                timestamp: new Date(Date.now() - i * 60000).toISOString(),
                level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
                message: `Лог сообщение ${i + 1} для бота ${botId}`,
                data: { userId: Math.floor(Math.random() * 1000) }
            });
        }

        res.json({
            success: true,
            data: {
                logs,
                total: logs.length,
                hasMore: false
            }
        });

    } catch (error) {
        logger.error('Ошибка получения логов бота:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения логов' 
        });
    }
});

/**
 * GET /api/stats/dashboard
 * Получение общей статистики для дашборда (БЕЗ АВТОРИЗАЦИИ)
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Генерируем общую статистику для админки
        const dashboardStats = {
            totalBots: Math.floor(Math.random() * 50) + 10,
            activeBots: Math.floor(Math.random() * 30) + 5,
            totalUsers: Math.floor(Math.random() * 5000) + 1000,
            messagesProcessed: Math.floor(Math.random() * 50000) + 10000,
            systemHealth: {
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                disk: Math.random() * 100
            },
            recentActivity: [
                { type: 'bot_created', message: 'Создан новый бот', timestamp: new Date().toISOString() },
                { type: 'message_sent', message: 'Отправлено сообщение', timestamp: new Date(Date.now() - 300000).toISOString() },
                { type: 'user_joined', message: 'Новый пользователь', timestamp: new Date(Date.now() - 600000).toISOString() }
            ]
        };

        res.json({
            success: true,
            data: dashboardStats
        });

    } catch (error) {
        logger.error('Ошибка получения статистики дашборда:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения статистики дашборда' 
        });
    }
});

/**
 * GET /api/stats/system
 * Системная статистика (БЕЗ АВТОРИЗАЦИИ - АДМИНСКАЯ ПАНЕЛЬ)
 */
router.get('/system', async (req, res) => {
    try {
        const systemStats = {
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                version: process.version
            },
            database: {
                connected: true,
                responseTime: Math.floor(Math.random() * 50) + 10
            },
            bots: {
                total: Math.floor(Math.random() * 100),
                running: Math.floor(Math.random() * 50),
                stopped: Math.floor(Math.random() * 20),
                errors: Math.floor(Math.random() * 5)
            }
        };

        res.json({
            success: true,
            data: systemStats
        });

    } catch (error) {
        logger.error('Ошибка получения системной статистики:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка получения системной статистики' 
        });
    }
});

module.exports = router;