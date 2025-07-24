const express = require('express');
const router = express.Router();
const BotDeploymentManager = require('../utils/BotDeploymentManager');

// ⚠️ АВТОРИЗАЦИЯ ПОЛНОСТЬЮ УДАЛЕНА - НЕ ДОБАВЛЯТЬ!

const deploymentManager = new BotDeploymentManager();

/**
 * POST /api/deployment/deploy/:botId
 * Развертывание бота
 */
router.post('/deploy/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = 'admin'; // Фиксированный пользователь для админки

        const result = await deploymentManager.deployBot(botId, userId);

        if (result.success) {
            res.json({
                success: true,
                data: result,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in deploy endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка развертывания бота'
        });
    }
});

/**
 * POST /api/deployment/stop/:botId
 * Остановка бота
 */
router.post('/stop/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = 'admin'; // Фиксированный пользователь для админки

        const result = await deploymentManager.stopBot(botId, userId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in stop endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка остановки бота'
        });
    }
});

/**
 * POST /api/deployment/restart/:botId
 * Перезапуск бота
 */
router.post('/restart/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = 'admin'; // Фиксированный пользователь для админки

        const result = await deploymentManager.restartBot(botId, userId);

        if (result.success) {
            res.json({
                success: true,
                data: result,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in restart endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка перезапуска бота'
        });
    }
});

/**
 * GET /api/deployment/status/:botId
 * Получение статуса развертывания бота
 */
router.get('/status/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = 'admin'; // Фиксированный пользователь для админки

        const result = await deploymentManager.getDeploymentStatus(botId, userId);

        if (result.success) {
            res.json({
                success: true,
                data: result.status
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in status endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения статуса'
        });
    }
});

/**
 * POST /api/deployment/validate-token
 * Проверка валидности токена бота
 */
router.post('/validate-token', auth, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Не указан токен'
            });
        }

        const result = await deploymentManager.validateBotToken(token);

        if (result.valid) {
            res.json({
                success: true,
                data: {
                    valid: true,
                    botInfo: result.botInfo
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    valid: false,
                    error: result.error
                }
            });
        }
    } catch (error) {
        console.error('Error in validate-token endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка проверки токена'
        });
    }
});

/**
 * GET /api/deployment/export/:botId
 * Экспорт конфигурации бота
 */
router.get('/export/:botId', auth, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = req.user.telegramId;

        const result = await deploymentManager.exportBotConfiguration(botId, userId);

        if (result.success) {
            // Устанавливаем заголовки для скачивания файла
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${result.exportData.filename}"`);

            res.json({
                success: true,
                data: result.exportData
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in export endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка экспорта конфигурации'
        });
    }
});

/**
 * GET /api/deployment/active-bots
 * Получение списка активных ботов (для админов)
 */
router.get('/active-bots', auth, async (req, res) => {
    try {
        // Проверяем права администратора (можно добавить middleware)
        const activeBots = await deploymentManager.getActiveBotsStatus();

        res.json({
            success: true,
            data: {
                activeBots,
                count: activeBots.length
            }
        });
    } catch (error) {
        console.error('Error in active-bots endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения списка активных ботов'
        });
    }
});

/**
 * POST /api/deployment/validate-all-tokens
 * Проверка валидности токенов всех активных ботов
 */
router.post('/validate-all-tokens', auth, async (req, res) => {
    try {
        const result = await deploymentManager.validateAllActiveTokens();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in validate-all-tokens endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка проверки токенов'
        });
    }
});

/**
 * POST /api/deployment/deactivate-invalid-bots
 * Автоматическая деактивация ботов с недействительными токенами
 */
router.post('/deactivate-invalid-bots', auth, async (req, res) => {
    try {
        const result = await deploymentManager.deactivateInvalidBots();

        if (result.success) {
            res.json({
                success: true,
                data: result,
                message: `Деактивировано ${result.deactivated} ботов с недействительными токенами`
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in deactivate-invalid-bots endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка деактивации ботов'
        });
    }
});

/**
 * POST /api/deployment/webhook-info/:botId
 * Получение информации о webhook
 */
router.post('/webhook-info/:botId', auth, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = req.user.telegramId;

        // Получаем бота
        const bot = await deploymentManager.storage.getBot(botId);
        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Бот не найден'
            });
        }

        if (bot.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Нет прав доступа к боту'
            });
        }

        if (!bot.token) {
            return res.status(400).json({
                success: false,
                error: 'У бота нет токена'
            });
        }

        const result = await deploymentManager.getWebhookInfo(bot.token);

        if (result.success) {
            res.json({
                success: true,
                data: result.webhookInfo
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in webhook-info endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения информации о webhook'
        });
    }
});

/**
 * POST /api/deployment/health-check
 * Ручной запуск проверки здоровья ботов
 */
router.post('/health-check', auth, async (req, res) => {
    try {
        // Получаем экземпляр BotRuntime
        const { getBotRuntime } = require('../server');
        const botRuntime = getBotRuntime();

        if (!botRuntime) {
            return res.status(500).json({
                success: false,
                error: 'BotRuntime не инициализирован'
            });
        }

        // Запускаем проверку здоровья
        await botRuntime.performHealthCheck();

        res.json({
            success: true,
            message: 'Проверка здоровья ботов выполнена',
            data: {
                activeBots: botRuntime.activeBots.size,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in health-check endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка проверки здоровья ботов'
        });
    }
});

module.exports = router;