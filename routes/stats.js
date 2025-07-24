const express = require('express');
const router = express.Router();
const Logger = require('../utils/Logger');
const { FileStorage } = require('../utils/FileStorage');
// ⚠️ АВТОРИЗАЦИЯ УДАЛЕНА - НЕ ДОБАВЛЯТЬ!

const logger = new Logger();
const storage = new FileStorage();

/**
 * GET /api/stats/bots/:botId
 * Получение статистики конкретного бота
 */
router.get('/bots/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { startDate, endDate, period = '30d' } = req.query;

        // Проверяем, что бот принадлежит пользователю
        const bot = await storage.getBot(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        if (bot.userId !== req.user.telegramId) {
            return res.status(403).json({ error: 'Нет доступа к этому боту' });
        }

        // Определяем период для статистики
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            end = new Date();
            start = new Date();
            
            switch (period) {
                case '24h':
                    start.setHours(start.getHours() - 24);
                    break;
                case '7d':
                    start.setDate(start.getDate() - 7);
                    break;
                case '30d':
                    start.setDate(start.getDate() - 30);
                    break;
                case '90d':
                    start.setDate(start.getDate() - 90);
                    break;
                default:
                    start.setDate(start.getDate() - 30);
            }
        }

        // Получаем статистику
        const stats = await logger.getBotStats(botId, start, end);

        // Добавляем информацию о боте
        const response = {
            botId,
            botName: bot.name,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            stats
        };

        res.json(response);
    } catch (error) {
        console.error('Error getting bot stats:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

/**
 * GET /api/stats/bots/:botId/logs
 * Получение логов конкретного бота
 */
router.get('/bots/:botId/logs', async (req, res) => {
    try {
        const { botId } = req.params;
        const { 
            startDate, 
            endDate, 
            eventType, 
            limit = 100, 
            offset = 0 
        } = req.query;

        // Проверяем, что бот принадлежит пользователю
        const bot = await storage.getBot(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        if (bot.userId !== req.user.telegramId) {
            return res.status(403).json({ error: 'Нет доступа к этому боту' });
        }

        // Определяем период
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

        // Получаем логи
        const logs = await logger.getBotLogs(botId, start, end, eventType);

        // Применяем пагинацию
        const totalLogs = logs.length;
        const paginatedLogs = logs
            .reverse() // Показываем новые логи первыми
            .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        res.json({
            logs: paginatedLogs,
            pagination: {
                total: totalLogs,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalLogs
            }
        });
    } catch (error) {
        console.error('Error getting bot logs:', error);
        res.status(500).json({ error: 'Ошибка получения логов' });
    }
});

/**
 * GET /api/stats/dashboard
 * Получение общей статистики для дашборда пользователя
 */
router.get('/dashboard', async (req, res) => {
    try {
        const userId = 'admin'; // Фиксированный пользователь для админки
        const user = await storage.getUser(userId);
        
        if (!user || !user.bots) {
            return res.json({
                totalBots: 0,
                activeBots: 0,
                totalMessages: 0,
                totalUsers: 0,
                bots: []
            });
        }

        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30); // Последние 30 дней

        const dashboardStats = {
            totalBots: user.bots.length,
            activeBots: 0,
            totalMessages: 0,
            totalUsers: new Set(),
            bots: []
        };

        // Собираем статистику по каждому боту
        for (const botId of user.bots) {
            try {
                const bot = await storage.getBot(botId);
                if (!bot) continue;

                const stats = await logger.getBotStats(botId, start, end);
                
                if (stats.messagesProcessed > 0) {
                    dashboardStats.activeBots++;
                }
                
                dashboardStats.totalMessages += stats.messagesProcessed;
                
                // Добавляем уникальных пользователей (приблизительно)
                dashboardStats.totalUsers.add(...Array.from({length: stats.activeUsers}, (_, i) => `${botId}_${i}`));

                dashboardStats.bots.push({
                    id: botId,
                    name: bot.name,
                    status: bot.status,
                    messagesProcessed: stats.messagesProcessed,
                    activeUsers: stats.activeUsers,
                    lastActivity: bot.stats?.lastActivity || null,
                    errorsCount: stats.errorsCount
                });
            } catch (error) {
                console.error(`Error getting stats for bot ${botId}:`, error);
            }
        }

        dashboardStats.totalUsers = dashboardStats.totalUsers.size;

        res.json(dashboardStats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Ошибка получения статистики дашборда' });
    }
});

/**
 * GET /api/stats/system
 * Системная статистика (только для администраторов)
 */
router.get('/system', async (req, res) => {
    try {
        // Проверяем права администратора (можно добавить проверку роли)
        // Пока что любой авторизованный пользователь может получить базовую системную статистику
        
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        // Здесь можно добавить системную статистику
        // Например, общее количество ботов, пользователей, сообщений и т.д.
        
        const systemStats = {
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            // Базовая статистика - можно расширить
            message: 'Системная статистика доступна только администраторам'
        };

        res.json(systemStats);
    } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({ error: 'Ошибка получения системной статистики' });
    }
});

module.exports = router;