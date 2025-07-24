/**
 * Вспомогательные функции и константы для узлов действий
 * Выносим общую логику для уменьшения дублирования кода
 */

/**
 * Константы для узлов действий
 */
const ActionConstants = {
    PARSE_MODES: [
        { value: 'none', label: 'None' },
        { value: 'HTML', label: 'HTML' },
        { value: 'Markdown', label: 'Markdown' },
        { value: 'MarkdownV2', label: 'MarkdownV2' }
    ],
    
    KEYBOARD_TYPES: [
        { value: 'reply', label: 'Reply Keyboard' },
        { value: 'inline', label: 'Inline Keyboard' }
    ],
    
    ADMIN_ACTIONS: [
        { value: 'kick_user', label: 'Kick User' },
        { value: 'ban_user', label: 'Ban User' },
        { value: 'unban_user', label: 'Unban User' },
        { value: 'mute_user', label: 'Mute User' },
        { value: 'unmute_user', label: 'Unmute User' }
    ],
    
    TIME_UNITS: [
        { value: 'seconds', label: 'Seconds' },
        { value: 'minutes', label: 'Minutes' },
        { value: 'hours', label: 'Hours' }
    ],
    
    MAX_DELAY_SECONDS: 86400,
    MAX_DURATION_MINUTES: 525600
};

/**
 * Валидаторы для узлов действий
 */
const ActionValidators = {
    /**
     * Валидация обязательного текста
     */
    validateRequiredText(text, fieldName = 'Text') {
        const errors = [];
        if (!text || text.trim() === '') {
            errors.push(`${fieldName} is required`);
        }
        return { isValid: errors.length === 0, errors };
    },
    
    /**
     * Валидация выбора из списка
     */
    validateChoice(value, allowedValues, fieldName = 'Value') {
        const errors = [];
        if (value && !allowedValues.includes(value)) {
            errors.push(`Invalid ${fieldName}: ${value}`);
        }
        return { isValid: errors.length === 0, errors };
    },
    
    /**
     * Валидация числового диапазона
     */
    validateRange(value, min, max, fieldName = 'Value') {
        const errors = [];
        const numValue = Number(value);
        if (isNaN(numValue)) {
            errors.push(`${fieldName} must be a number`);
        } else if (numValue < min || numValue > max) {
            errors.push(`${fieldName} must be between ${min} and ${max}`);
        }
        return { isValid: errors.length === 0, errors };
    },
    
    /**
     * Валидация URL
     */
    validateUrl(url, fieldName = 'URL') {
        const errors = [];
        if (url) {
            try {
                new URL(url);
            } catch (e) {
                errors.push(`Invalid ${fieldName}: ${url}`);
            }
        }
        return { isValid: errors.length === 0, errors };
    },
    
    /**
     * Валидация JSON
     */
    validateJson(jsonString, fieldName = 'JSON') {
        const errors = [];
        if (jsonString) {
            try {
                JSON.parse(jsonString);
            } catch (e) {
                errors.push(`Invalid ${fieldName}: ${e.message}`);
            }
        }
        return { isValid: errors.length === 0, errors };
    }
};

/**
 * Фабрика для создания свойств узлов
 */
const PropertyFactory = {
    /**
     * Создает текстовое поле
     */
    createTextProperty(name, label, value = '', options = {}) {
        return {
            name,
            label,
            type: 'text',
            value,
            required: options.required || false,
            placeholder: options.placeholder || '',
            ...options
        };
    },
    
    /**
     * Создает текстовую область
     */
    createTextareaProperty(name, label, value = '', options = {}) {
        return {
            name,
            label,
            type: 'textarea',
            value,
            required: options.required || false,
            placeholder: options.placeholder || '',
            rows: options.rows || 3,
            ...options
        };
    },
    
    /**
     * Создает выпадающий список
     */
    createSelectProperty(name, label, value, options, selectOptions = {}) {
        return {
            name,
            label,
            type: 'select',
            value,
            options,
            required: selectOptions.required || false,
            ...selectOptions
        };
    },
    
    /**
     * Создает чекбокс
     */
    createCheckboxProperty(name, label, value = false, options = {}) {
        return {
            name,
            label,
            type: 'checkbox',
            value,
            ...options
        };
    },
    
    /**
     * Создает числовое поле
     */
    createNumberProperty(name, label, value = 0, options = {}) {
        return {
            name,
            label,
            type: 'number',
            value,
            min: options.min,
            max: options.max,
            step: options.step || 1,
            required: options.required || false,
            ...options
        };
    }
};

/**
 * Утилиты для работы с конфигурацией
 */
const ConfigUtils = {
    /**
     * Объединяет результаты валидации
     */
    combineValidationResults(...results) {
        const allErrors = [];
        let isValid = true;
        
        results.forEach(result => {
            if (!result.isValid) {
                isValid = false;
                allErrors.push(...result.errors);
            }
        });
        
        return { isValid, errors: allErrors };
    },
    
    /**
     * Создает конфигурацию по умолчанию
     */
    createDefaultConfig(overrides = {}) {
        return {
            enabled: true,
            displayName: '',
            description: '',
            icon: '⚙️',
            ...overrides
        };
    },
    
    /**
     * Валидирует базовую конфигурацию узла
     */
    validateBaseConfig(config) {
        const errors = [];
        
        if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
            errors.push('enabled must be a boolean');
        }
        
        return { isValid: errors.length === 0, errors };
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ActionConstants,
        ActionValidators,
        PropertyFactory,
        ConfigUtils
    };
}

// Глобальный доступ для браузера
if (typeof window !== 'undefined') {
    window.ActionNodeHelpers = {
        ActionConstants,
        ActionValidators,
        PropertyFactory,
        ConfigUtils
    };
}