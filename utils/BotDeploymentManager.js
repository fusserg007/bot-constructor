const fs = require('fs').promises;
const path = require('path');
const { FileStorage } = require('./FileStorage');
const Logger = require('./Logger');

/**
 * Менеджер развертывания ботов
 */
class BotDeploymentManager {
    constructor() {
        this.storage = new FileStorage();
        this.logger = new Logger();
        this.telegramApiUrl = 'https://api.telegram.org/bot';
        this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-domain.com';
    }

    /**
     * Проверяет валидность токена бота
     * @param {string} token - Токен бота
     * @returns {Object} Результат проверки
     */
    async validateBotToken(token) {
        try {
            if (!token || !token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
                return {
                    valid: false,
                    error: 'Неверный формат токена'
                };
            }

            const response = await fetch(`${this.telegramApiUrl}${token}/getMe`);
            const data = await response.json();

            if (data.ok) {
                return {
                    valid: true,
                    botInfo: {
                        id: data.result.id,
                        username: data.result.username,
                        firstName: data.result.first_name,
                        canJoinGroups: data.result.can_join_groups,
                        canReadAllGroupMessages: data.result.can_read_all_group_messages,
                        supportsInlineQueries: data.result.supports_inline_queries
                    }
                };
            } else {
                return {
                    valid: false,
                    error: data.description || 'Токен недействителен'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Ошибка проверки токена: ' + error.message
            };
        }
    }

    /**
     * Устанавливает webhook для бота
     * @param {string} token - Токен бота
     * @param {string} botId - ID бота в системе
     * @returns {Object} Результат установки webhook
     */
    async setWebhook(token, botId) {
        try {
            const webhookUrl = `${this.webhookBaseUrl}/webhook/${botId}`;
            
            const response = await fetch(`${this.telegramApiUrl}${token}/setWebhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    allowed_updates: ['message', 'callback_query', 'inline_query', 'chat_member']
                })
            });

            const data = await response.json();

            if (data.ok) {
                await this.logger.logBotEvent(botId, 'webhook_set', {
                    webhookUrl,
                    description: data.description
                });

                return {
                    success: true,
                    webhookUrl,
                    description: data.description
                };
            } else {
                return {
                    success: false,
                    error: data.description || 'Ошибка установки webhook'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Ошибка установки webhook: ' + error.message
            };
        }
    }

    /**
     * Удаляет webhook бота
     * @param {string} token - Токен бота
     * @param {string} botId - ID бота
     * @returns {Object} Результат удаления webhook
     */
    async deleteWebhook(token, botId) {
        try {
            const response = await fetch(`${this.telegramApiUrl}${token}/deleteWebhook`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.ok) {
                await this.logger.logBotEvent(botId, 'webhook_deleted', {
                    description: data.description
                });

                return {
                    success: true,
                    description: data.description
                };
            } else {
                return {
                    success: false,
                    error: data.description || 'Ошибка удаления webhook'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Ошибка удаления webhook: ' + error.message
            };
        }
    }

    /**
     * Получает информацию о webhook
     * @param {string} token - Токен бота
     * @returns {Object} Информация о webhook
     */
    async getWebhookInfo(token) {
        try {
            const response = await fetch(`${this.telegramApiUrl}${token}/getWebhookInfo`);
            const data = await response.json();

            if (data.ok) {
                return {
                    success: true,
                    webhookInfo: data.result
                };
            } else {
                return {
                    success: false,
                    error: data.description || 'Ошибка получения информации о webhook'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Ошибка получения информации о webhook: ' + error.message
            };
        }
    }

    /**
     * Развертывает бота (активирует его)
     * @param {string} botId - ID бота
     * @param {number} userId - ID пользователя
     * @returns {Object} Результат развертывания
     */
    async deployBot(botId, userId) {
        try {
            // Получаем данные бота
            const bot = await this.storage.getBot(botId);
            if (!bot) {
                return {
                    success: false,
                    error: 'Бот не найден'
                };
            }

            // Проверяем права доступа
            if (bot.userId !== userId) {
                return {
                    success: false,
                    error: 'Нет прав доступа к боту'
                };
            }

            // Проверяем наличие токена
            if (!bot.token) {
                return {
                    success: false,
                    error: 'Не указан токен бота'
                };
            }

            // Валидируем токен
            const tokenValidation = await this.validateBotToken(bot.token);
            if (!tokenValidation.valid) {
                return {
                    success: false,
                    error: 'Недействительный токен: ' + tokenValidation.error
                };
            }

            // Устанавливаем webhook
            const webhookResult = await this.setWebhook(bot.token, botId);
            if (!webhookResult.success) {
                return {
                    success: false,
                    error: 'Ошибка установки webhook: ' + webhookResult.error
                };
            }

            // Обновляем статус бота
            const updates = {
                status: 'active',
                deployedAt: new Date().toISOString(),
                webhookUrl: webhookResult.webhookUrl,
                botInfo: tokenValidation.botInfo,
                updatedAt: new Date().toISOString()
            };

            await this.storage.updateBot(botId, updates);

            // Логируем развертывание
            await this.logger.logBotEvent(botId, 'bot_deployed', {
                userId,
                botName: bot.name,
                webhookUrl: webhookResult.webhookUrl,
                botUsername: tokenValidation.botInfo.username
            });

            return {
                success: true,
                message: 'Бот успешно развернут',
                botInfo: tokenValidation.botInfo,
                webhookUrl: webhookResult.webhookUrl,
                instructions: this.generateDeploymentInstructions(tokenValidation.botInfo)
            };

        } catch (error) {
            console.error('Error deploying bot:', error);
            return {
                success: false,
                error: 'Ошибка развертывания бота: ' + error.message
            };
        }
    }

    /**
     * Останавливает бота (деактивирует его)
     * @param {string} botId - ID бота
     * @param {number} userId - ID пользователя
     * @returns {Object} Результат остановки
     */
    async stopBot(botId, userId) {
        try {
            // Получаем данные бота
            const bot = await this.storage.getBot(botId);
            if (!bot) {
                return {
                    success: false,
                    error: 'Бот не найден'
                };
            }

            // Проверяем права доступа
            if (bot.userId !== userId) {
                return {
                    success: false,
                    error: 'Нет прав доступа к боту'
                };
            }

            // Удаляем webhook если есть токен
            if (bot.token) {
                await this.deleteWebhook(bot.token, botId);
            }

            // Обновляем статус бота
            const updates = {
                status: 'paused',
                stoppedAt: new Date().toISOString(),
                webhookUrl: null,
                updatedAt: new Date().toISOString()
            };

            await this.storage.updateBot(botId, updates);

            // Логируем остановку
            await this.logger.logBotEvent(botId, 'bot_stopped', {
                userId,
                botName: bot.name
            });

            return {
                success: true,
                message: 'Бот успешно остановлен'
            };

        } catch (error) {
            console.error('Error stopping bot:', error);
            return {
                success: false,
                error: 'Ошибка остановки бота: ' + error.message
            };
        }
    }

    /**
     * Перезапускает бота
     * @param {string} botId - ID бота
     * @param {number} userId - ID пользователя
     * @returns {Object} Результат перезапуска
     */
    async restartBot(botId, userId) {
        try {
            // Сначала останавливаем
            const stopResult = await this.stopBot(botId, userId);
            if (!stopResult.success) {
                return stopResult;
            }

            // Ждем немного
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Затем запускаем
            const deployResult = await this.deployBot(botId, userId);
            if (!deployResult.success) {
                return deployResult;
            }

            return {
                success: true,
                message: 'Бот успешно перезапущен',
                ...deployResult
            };

        } catch (error) {
            return {
                success: false,
                error: 'Ошибка перезапуска бота: ' + error.message
            };
        }
    }

    /**
     * Получает статус развертывания бота
     * @param {string} botId - ID бота
     * @param {number} userId - ID пользователя
     * @returns {Object} Статус развертывания
     */
    async getDeploymentStatus(botId, userId) {
        try {
            const bot = await this.storage.getBot(botId);
            if (!bot) {
                return {
                    success: false,
                    error: 'Бот не найден'
                };
            }

            if (bot.userId !== userId) {
                return {
                    success: false,
                    error: 'Нет прав доступа к боту'
                };
            }

            let webhookInfo = null;
            if (bot.token && bot.status === 'active') {
                const webhookResult = await this.getWebhookInfo(bot.token);
                if (webhookResult.success) {
                    webhookInfo = webhookResult.webhookInfo;
                }
            }

            return {
                success: true,
                status: {
                    botId,
                    name: bot.name,
                    status: bot.status,
                    deployedAt: bot.deployedAt,
                    stoppedAt: bot.stoppedAt,
                    webhookUrl: bot.webhookUrl,
                    botInfo: bot.botInfo,
                    webhookInfo,
                    hasToken: !!bot.token,
                    isActive: bot.status === 'active'
                }
            };

        } catch (error) {
            return {
                success: false,
                error: 'Ошибка получения статуса: ' + error.message
            };
        }
    }

    /**
     * Генерирует инструкции по развертыванию
     * @param {Object} botInfo - Информация о боте
     * @returns {Array} Массив инструкций
     */
    generateDeploymentInstructions(botInfo) {
        return [
            `🤖 Ваш бот @${botInfo.username} успешно развернут!`,
            '',
            '📋 Что делать дальше:',
            '1. Найдите вашего бота в Telegram: @' + botInfo.username,
            '2. Нажмите /start чтобы активировать бота',
            '3. Если бот для группы - добавьте его в группу как администратора',
            '4. Настройте права бота в группе согласно его функциям',
            '',
            '⚙️ Управление ботом:',
            '• Статистика и логи доступны в панели управления',
            '• Изменения конфигурации применяются автоматически',
            '• Бот работает круглосуточно на нашем сервере',
            '',
            '❓ Нужна помощь? Обратитесь в поддержку через панель управления.'
        ];
    }

    /**
     * Экспортирует конфигурацию бота для самостоятельного развертывания
     * @param {string} botId - ID бота
     * @param {number} userId - ID пользователя
     * @returns {Object} Экспортированная конфигурация
     */
    async exportBotConfiguration(botId, userId) {
        try {
            const bot = await this.storage.getBot(botId);
            if (!bot) {
                return {
                    success: false,
                    error: 'Бот не найден'
                };
            }

            if (bot.userId !== userId) {
                return {
                    success: false,
                    error: 'Нет прав доступа к боту'
                };
            }

            // Создаем экспортируемую конфигурацию
            const exportConfig = {
                name: bot.name,
                description: bot.description,
                configuration: bot.configuration,
                template: bot.template,
                createdAt: bot.createdAt,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            };

            // Генерируем инструкции по развертыванию
            const deploymentInstructions = [
                '# Инструкции по развертыванию бота',
                '',
                '## Требования',
                '- Node.js 16+ и npm',
                '- Токен бота от @BotFather',
                '- Сервер с публичным IP (для webhook)',
                '',
                '## Установка',
                '1. Скачайте и распакуйте архив с ботом',
                '2. Установите зависимости: `npm install`',
                '3. Создайте файл .env и укажите:',
                '   - BOT_TOKEN=ваш_токен_бота',
                '   - WEBHOOK_URL=https://ваш-домен.com',
                '4. Запустите бота: `npm start`',
                '',
                '## Конфигурация',
                'Конфигурация бота находится в файле config.json',
                'Вы можете изменить настройки согласно документации',
                '',
                '## Поддержка',
                'При возникновении проблем обратитесь к документации',
                'или в службу поддержки Bot Constructor'
            ];

            return {
                success: true,
                exportData: {
                    config: exportConfig,
                    instructions: deploymentInstructions.join('\n'),
                    filename: `bot_${bot.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`
                }
            };

        } catch (error) {
            return {
                success: false,
                error: 'Ошибка экспорта конфигурации: ' + error.message
            };
        }
    }

    /**
     * Получает список всех развернутых ботов
     * @returns {Array} Список активных ботов
     */
    async getActiveBotsStatus() {
        try {
            const botsDir = path.join(__dirname, '..', 'data', 'bots');
            const files = await fs.readdir(botsDir);
            const activeBots = [];

            for (const file of files) {
                if (file.endsWith('.json') && file.startsWith('bot_')) {
                    try {
                        const botData = await fs.readFile(path.join(botsDir, file), 'utf8');
                        const bot = JSON.parse(botData);
                        
                        if (bot.status === 'active') {
                            activeBots.push({
                                id: bot.id,
                                name: bot.name,
                                username: bot.botInfo?.username,
                                deployedAt: bot.deployedAt,
                                webhookUrl: bot.webhookUrl,
                                userId: bot.userId
                            });
                        }
                    } catch (error) {
                        console.error(`Error reading bot file ${file}:`, error);
                    }
                }
            }

            return activeBots;
        } catch (error) {
            console.error('Error getting active bots:', error);
            return [];
        }
    }

    /**
     * Проверяет валидность токенов всех активных ботов
     * @returns {Object} Результат проверки
     */
    async validateAllActiveTokens() {
        try {
            const activeBots = await this.getActiveBotsStatus();
            const results = {
                total: activeBots.length,
                valid: 0,
                invalid: 0,
                errors: [],
                details: []
            };

            for (const bot of activeBots) {
                try {
                    // Получаем полную информацию о боте
                    const fullBot = await this.storage.getBot(bot.id);
                    if (!fullBot || !fullBot.token) {
                        results.invalid++;
                        results.errors.push(`Бот ${bot.name} не имеет токена`);
                        continue;
                    }

                    // Проверяем токен только для Telegram ботов
                    const messengerType = fullBot.messengerType || 'telegram';
                    if (messengerType === 'telegram') {
                        const validation = await this.validateBotToken(fullBot.token);
                        
                        if (validation.valid) {
                            results.valid++;
                            results.details.push({
                                botId: bot.id,
                                name: bot.name,
                                status: 'valid',
                                username: validation.botInfo.username,
                                messengerType
                            });
                        } else {
                            results.invalid++;
                            results.errors.push(`Бот ${bot.name}: ${validation.error}`);
                            results.details.push({
                                botId: bot.id,
                                name: bot.name,
                                status: 'invalid',
                                error: validation.error,
                                messengerType
                            });
                        }
                    } else {
                        // For non-Telegram bots, assume valid for now
                        results.valid++;
                        results.details.push({
                            botId: bot.id,
                            name: bot.name,
                            status: 'valid',
                            messengerType
                        });
                    }
                } catch (error) {
                    results.invalid++;
                    results.errors.push(`Ошибка проверки бота ${bot.name}: ${error.message}`);
                }
            }

            return results;
        } catch (error) {
            return {
                total: 0,
                valid: 0,
                invalid: 0,
                errors: [`Ошибка проверки токенов: ${error.message}`],
                details: []
            };
        }
    }

    /**
     * Автоматически деактивирует ботов с недействительными токенами
     * @returns {Object} Результат деактивации
     */
    async deactivateInvalidBots() {
        try {
            const validation = await this.validateAllActiveTokens();
            const deactivated = [];

            for (const detail of validation.details) {
                if (detail.status === 'invalid') {
                    try {
                        // Деактивируем бота
                        const bot = await this.storage.getBot(detail.botId);
                        if (bot) {
                            await this.storage.updateBot(detail.botId, {
                                status: 'paused',
                                deactivatedAt: new Date().toISOString(),
                                deactivationReason: 'invalid_token',
                                updatedAt: new Date().toISOString()
                            });

                            deactivated.push({
                                botId: detail.botId,
                                name: detail.name,
                                reason: detail.error
                            });

                            // Логируем деактивацию
                            await this.logger.logBotEvent(detail.botId, 'bot_deactivated', {
                                reason: 'invalid_token',
                                error: detail.error
                            });
                        }
                    } catch (error) {
                        console.error(`Ошибка деактивации бота ${detail.botId}:`, error);
                    }
                }
            }

            return {
                success: true,
                deactivated: deactivated.length,
                bots: deactivated
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = BotDeploymentManager;