const TelegramBot = require('node-telegram-bot-api');
const MessengerAdapter = require('./MessengerAdapter');

/**
 * Адаптер для Telegram Bot API
 */
class TelegramAdapter extends MessengerAdapter {
    constructor(config) {
        super(config);
        this.bot = null;
        this.usePolling = config.usePolling !== false;
        this.webhookUrl = config.webhookUrl;
    }

    async initialize() {
        try {
            this.bot = new TelegramBot(this.token, {
                polling: false // Инициализируем без polling
            });

            // Проверяем токен
            const botInfo = await this.bot.getMe();
            this.log('info', `Инициализирован бот: @${botInfo.username} (${botInfo.first_name})`);
            
            return true;
        } catch (error) {
            this.log('error', 'Ошибка инициализации', error.message);
            return false;
        }
    }

    async start() {
        if (!this.bot) {
            throw new Error('Бот не инициализирован');
        }

        try {
            if (this.usePolling) {
                // Запускаем polling
                this.bot.startPolling();
                this.log('info', 'Запущен в режиме polling');
            } else if (this.webhookUrl) {
                // Устанавливаем webhook
                await this.bot.setWebHook(`${this.webhookUrl}/webhook/telegram/${this.botId}`);
                this.log('info', `Установлен webhook: ${this.webhookUrl}/webhook/telegram/${this.botId}`);
            } else {
                throw new Error('Не указан ни polling, ни webhook URL');
            }

            // Настраиваем обработчики сообщений
            this.setupMessageHandlers();

            this.isActive = true;
            this.stats.startTime = Date.now();
            this.log('info', 'Бот запущен');

            return true;
        } catch (error) {
            this.log('error', 'Ошибка запуска', error.message);
            return false;
        }
    }

    async stop() {
        if (!this.bot) return true;

        try {
            if (this.usePolling) {
                this.bot.stopPolling();
                this.log('info', 'Polling остановлен');
            } else {
                await this.bot.deleteWebHook();
                this.log('info', 'Webhook удален');
            }

            this.isActive = false;
            this.log('info', 'Бот остановлен');

            return true;
        } catch (error) {
            this.log('error', 'Ошибка остановки', error.message);
            return false;
        }
    }

    async sendMessage(chatId, message, options = {}) {
        if (!this.bot || !this.isActive) {
            throw new Error('Бот не активен');
        }

        try {
            const telegramOptions = {
                parse_mode: options.parseMode || 'HTML',
                reply_markup: options.keyboard || undefined,
                disable_web_page_preview: options.disablePreview || false
            };

            const result = await this.bot.sendMessage(chatId, message, telegramOptions);
            this.updateStats('messagesSent');
            
            return {
                success: true,
                messageId: result.message_id,
                chatId: result.chat.id
            };
        } catch (error) {
            this.log('error', 'Ошибка отправки сообщения', error.message);
            throw error;
        }
    }

    async validateToken() {
        try {
            const testBot = new TelegramBot(this.token, { polling: false });
            const botInfo = await testBot.getMe();
            
            return {
                valid: true,
                botInfo: {
                    id: botInfo.id,
                    username: botInfo.username,
                    firstName: botInfo.first_name,
                    canJoinGroups: botInfo.can_join_groups,
                    canReadAllGroupMessages: botInfo.can_read_all_group_messages,
                    supportsInlineQueries: botInfo.supports_inline_queries
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    async getBotInfo() {
        if (!this.bot) {
            throw new Error('Бот не инициализирован');
        }

        try {
            const botInfo = await this.bot.getMe();
            return {
                id: botInfo.id,
                username: botInfo.username,
                firstName: botInfo.first_name,
                type: 'telegram'
            };
        } catch (error) {
            this.log('error', 'Ошибка получения информации о боте', error.message);
            throw error;
        }
    }

    async setWebhook(url) {
        if (!this.bot) return false;

        try {
            await this.bot.setWebHook(url);
            this.log('info', `Webhook установлен: ${url}`);
            return true;
        } catch (error) {
            this.log('error', 'Ошибка установки webhook', error.message);
            return false;
        }
    }

    async deleteWebhook() {
        if (!this.bot) return false;

        try {
            await this.bot.deleteWebHook();
            this.log('info', 'Webhook удален');
            return true;
        } catch (error) {
            this.log('error', 'Ошибка удаления webhook', error.message);
            return false;
        }
    }

    normalizeMessage(telegramMessage) {
        return {
            id: telegramMessage.message_id,
            chatId: telegramMessage.chat.id,
            userId: telegramMessage.from.id,
            text: telegramMessage.text || telegramMessage.caption || '',
            type: this.getMessageType(telegramMessage),
            timestamp: telegramMessage.date * 1000,
            user: {
                id: telegramMessage.from.id,
                firstName: telegramMessage.from.first_name,
                lastName: telegramMessage.from.last_name,
                username: telegramMessage.from.username
            },
            chat: {
                id: telegramMessage.chat.id,
                type: telegramMessage.chat.type,
                title: telegramMessage.chat.title
            },
            raw: telegramMessage
        };
    }

    getMessageType(message) {
        if (message.text) return 'text';
        if (message.photo) return 'photo';
        if (message.document) return 'document';
        if (message.audio) return 'audio';
        if (message.video) return 'video';
        if (message.voice) return 'voice';
        if (message.sticker) return 'sticker';
        if (message.location) return 'location';
        if (message.contact) return 'contact';
        return 'unknown';
    }

    setupMessageHandlers() {
        if (!this.bot) return;

        // Обработчик всех сообщений
        this.bot.on('message', (msg) => {
            this.updateStats('messagesReceived');
            const normalizedMessage = this.normalizeMessage(msg);
            
            // Вызываем callback для обработки сообщения
            if (this.config.onMessage) {
                this.config.onMessage(normalizedMessage);
            }
        });

        // Обработчик ошибок
        this.bot.on('error', (error) => {
            this.log('error', 'Ошибка Telegram Bot API', error.message);
        });

        // Обработчик polling ошибок
        this.bot.on('polling_error', (error) => {
            this.log('error', 'Ошибка polling', error.message);
        });
    }

    // Метод для обработки webhook сообщений
    processWebhookUpdate(update) {
        if (!this.bot) return;

        try {
            this.bot.processUpdate(update);
        } catch (error) {
            this.log('error', 'Ошибка обработки webhook update', error.message);
        }
    }
}

module.exports = TelegramAdapter;