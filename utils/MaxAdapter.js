const MessengerAdapter = require('./MessengerAdapter');
const https = require('https');

/**
 * Адаптер для MAX мессенджера
 * Основан на официальной документации: https://github.com/max-messenger/max-bot-api-client-ts
 */
class MaxAdapter extends MessengerAdapter {
    constructor(config) {
        super(config);
        this.apiUrl = 'https://bot-api.max.ru'; // Официальный URL API
        this.webhookUrl = config.webhookUrl;
        this.apiVersion = 'v1';
    }

    async initialize() {
        try {
            // Проверяем токен через getMe API MAX
            const botInfo = await this.getBotInfo();
            this.log('info', `Инициализирован MAX бот: ${botInfo.username || botInfo.first_name || 'Неизвестно'}`);
            
            return true;
        } catch (error) {
            this.log('error', 'Ошибка инициализации MAX бота', error.message);
            return false;
        }
    }

    async start() {
        try {
            if (this.webhookUrl) {
                // Устанавливаем webhook для MAX
                await this.setWebhook(`${this.webhookUrl}/webhook/max/${this.botId}`);
                this.log('info', `Установлен MAX webhook: ${this.webhookUrl}/webhook/max/${this.botId}`);
            } else {
                // MAX может не поддерживать polling, только webhook
                this.log('warn', 'MAX требует webhook URL для работы');
                return false;
            }

            this.isActive = true;
            this.stats.startTime = Date.now();
            this.log('info', 'MAX бот запущен');

            return true;
        } catch (error) {
            this.log('error', 'Ошибка запуска MAX бота', error.message);
            return false;
        }
    }

    async stop() {
        try {
            if (this.webhookUrl) {
                await this.deleteWebhook();
                this.log('info', 'MAX webhook удален');
            }

            this.isActive = false;
            this.log('info', 'MAX бот остановлен');

            return true;
        } catch (error) {
            this.log('error', 'Ошибка остановки MAX бота', error.message);
            return false;
        }
    }

    async sendMessage(chatId, message, options = {}) {
        if (!this.isActive) {
            throw new Error('MAX бот не активен');
        }

        try {
            const payload = {
                chat_id: chatId,
                text: message,
                parse_mode: options.parseMode || 'HTML',
                disable_web_page_preview: options.disablePreview || false,
                reply_markup: options.keyboard || undefined
            };

            const result = await this.makeApiRequest('POST', '/sendMessage', payload);
            this.updateStats('messagesSent');
            
            return {
                success: true,
                messageId: result.message_id,
                chatId: result.chat.id
            };
        } catch (error) {
            this.log('error', 'Ошибка отправки сообщения в MAX', error.message);
            throw error;
        }
    }

    async validateToken() {
        try {
            const botInfo = await this.getBotInfo();
            
            return {
                valid: true,
                botInfo: {
                    id: botInfo.id,
                    name: botInfo.name,
                    type: 'max'
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
        try {
            const result = await this.makeApiRequest('GET', '/getMe');
            return {
                id: result.id,
                username: result.username,
                firstName: result.first_name,
                lastName: result.last_name,
                type: 'max'
            };
        } catch (error) {
            this.log('error', 'Ошибка получения информации о MAX боте', error.message);
            throw error;
        }
    }

    async setWebhook(url) {
        try {
            const payload = {
                url: url,
                max_connections: 40,
                allowed_updates: ['message', 'callback_query']
            };
            
            await this.makeApiRequest('POST', '/setWebhook', payload);
            this.log('info', `MAX webhook установлен: ${url}`);
            return true;
        } catch (error) {
            this.log('error', 'Ошибка установки MAX webhook', error.message);
            return false;
        }
    }

    async deleteWebhook() {
        try {
            await this.makeApiRequest('POST', '/deleteWebhook');
            this.log('info', 'MAX webhook удален');
            return true;
        } catch (error) {
            this.log('error', 'Ошибка удаления MAX webhook', error.message);
            return false;
        }
    }

    normalizeMessage(maxMessage) {
        // Нормализуем сообщение MAX к единому формату
        // MAX API использует структуру похожую на Telegram
        return {
            id: maxMessage.message_id,
            chatId: maxMessage.chat?.id,
            userId: maxMessage.from?.id,
            text: maxMessage.text || maxMessage.caption || '',
            type: this.getMessageType(maxMessage),
            timestamp: maxMessage.date ? maxMessage.date * 1000 : Date.now(),
            user: {
                id: maxMessage.from?.id,
                firstName: maxMessage.from?.first_name,
                lastName: maxMessage.from?.last_name,
                username: maxMessage.from?.username
            },
            chat: {
                id: maxMessage.chat?.id,
                type: maxMessage.chat?.type,
                title: maxMessage.chat?.title
            },
            raw: maxMessage
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

    // Метод для обработки webhook сообщений от MAX
    processWebhookUpdate(update) {
        try {
            // MAX API может отправлять разные типы обновлений
            if (update.message) {
                this.updateStats('messagesReceived');
                const normalizedMessage = this.normalizeMessage(update.message);
                
                // Вызываем callback для обработки сообщения
                if (this.config.onMessage) {
                    this.config.onMessage(normalizedMessage);
                }
            } else if (update.callback_query) {
                // Обработка callback запросов от inline клавиатур
                this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            this.log('error', 'Ошибка обработки MAX webhook update', error.message);
        }
    }

    handleCallbackQuery(callbackQuery) {
        // Обработка callback запросов
        this.log('info', `Получен callback query: ${callbackQuery.data}`);
        
        // Можно добавить специальную обработку для callback запросов
        if (this.config.onCallbackQuery) {
            this.config.onCallbackQuery(callbackQuery);
        }
    }

    // Вспомогательный метод для API запросов к MAX
    async makeApiRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'bot-api.max.ru',
                port: 443,
                path: `/bot${this.token}${endpoint}`, // MAX использует формат /bot<token>/method
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsedData);
                        } else {
                            reject(new Error(`MAX API Error: ${parsedData.error || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Ошибка парсинга ответа MAX API: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Ошибка запроса к MAX API: ${error.message}`));
            });

            if (data && (method === 'POST' || method === 'PUT')) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

module.exports = MaxAdapter;