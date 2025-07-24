const TelegramAdapter = require('./TelegramAdapter');
const MaxAdapter = require('./MaxAdapter');

/**
 * Фабрика для создания адаптеров мессенджеров
 */
class MessengerAdapterFactory {
    static supportedMessengers = {
        telegram: {
            name: 'Telegram',
            adapter: TelegramAdapter,
            features: ['polling', 'webhook', 'inline_keyboards', 'file_upload'],
            tokenFormat: /^\d+:[A-Za-z0-9_-]{35}$/
        },
        max: {
            name: 'MAX',
            adapter: MaxAdapter,
            features: ['webhook', 'inline_keyboards', 'callback_queries'],
            tokenFormat: /^\d+:[A-Za-z0-9_-]{35}$/ // MAX использует формат похожий на Telegram
        }
    };

    /**
     * Создает адаптер для указанного мессенджера
     */
    static createAdapter(messengerType, config) {
        const messenger = this.supportedMessengers[messengerType.toLowerCase()];
        
        if (!messenger) {
            throw new Error(`Неподдерживаемый мессенджер: ${messengerType}`);
        }

        const AdapterClass = messenger.adapter;
        return new AdapterClass({
            ...config,
            type: messengerType.toLowerCase()
        });
    }

    /**
     * Получает список поддерживаемых мессенджеров
     */
    static getSupportedMessengers() {
        return Object.keys(this.supportedMessengers).map(key => ({
            type: key,
            name: this.supportedMessengers[key].name,
            features: this.supportedMessengers[key].features
        }));
    }

    /**
     * Проверяет формат токена для указанного мессенджера
     */
    static validateTokenFormat(messengerType, token) {
        const messenger = this.supportedMessengers[messengerType.toLowerCase()];
        
        if (!messenger) {
            return {
                valid: false,
                error: `Неподдерживаемый мессенджер: ${messengerType}`
            };
        }

        const isValid = messenger.tokenFormat.test(token);
        
        return {
            valid: isValid,
            error: isValid ? null : `Неверный формат токена для ${messenger.name}`
        };
    }

    /**
     * Получает информацию о мессенджере
     */
    static getMessengerInfo(messengerType) {
        const messenger = this.supportedMessengers[messengerType.toLowerCase()];
        
        if (!messenger) {
            return null;
        }

        return {
            type: messengerType.toLowerCase(),
            name: messenger.name,
            features: messenger.features,
            tokenFormat: messenger.tokenFormat.toString()
        };
    }

    /**
     * Проверяет поддержку функции мессенджером
     */
    static supportsFeature(messengerType, feature) {
        const messenger = this.supportedMessengers[messengerType.toLowerCase()];
        return messenger ? messenger.features.includes(feature) : false;
    }
}

module.exports = MessengerAdapterFactory;