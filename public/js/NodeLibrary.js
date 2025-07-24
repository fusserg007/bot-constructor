/**
 * Библиотека узлов для визуального редактора
 * Управляет всеми типами узлов, их категоризацией и поиском
 * Оптимизированная версия с кэшированием и улучшенным логированием
 */
class NodeLibrary {
    constructor() {
        this.nodeTypes = this.initializeNodeTypes();
        this.categories = this.initializeCategories();
        this.searchIndex = this.buildSearchIndex();
        this.initialized = false;
        
        // Система уровней сложности
        this.complexityLevels = {
            1: { name: 'Новичок', color: '#4CAF50', description: 'Простые блоки для быстрого старта' },
            2: { name: 'Бизнес', color: '#FF9800', description: 'Готовые бизнес-сценарии и воронки' },
            3: { name: 'Профи', color: '#F44336', description: 'Продвинутая логика без ограничений' }
        };
        
        this.currentLevel = 1; // Начинаем с уровня новичка
        
        // Кэш для оптимизации производительности
        this.cache = {
            nodesByCategory: new Map(),
            nodesByLevel: new Map(),
            searchResults: new Map(),
            statistics: null,
            lastCacheUpdate: 0
        };
        
        // Инициализируем логгер
        this.logger = this.initLogger();
    }
    
    /**
     * Инициализирует логгер
     */
    initLogger() {
        // Пытаемся использовать систему логирования, если доступна
        if (typeof loggers !== 'undefined' && loggers.nodeLibrary) {
            return loggers.nodeLibrary;
        }
        
        // Fallback к простому логгеру
        return {
            info: (...args) => console.log(...args),
            warn: (...args) => console.warn(...args),
            debug: (...args) => console.log(...args),
            error: (...args) => console.error(...args)
        };
    }

    /**
     * Инициализация библиотеки
     */
    init() {
        if (this.initialized) return;
        
        console.log('🔧 Инициализация NodeLibrary...');
        this.validateNodeTypes();
        this.buildSearchIndex();
        this.initialized = true;
        
        // Подписываемся на изменения уровня сложности
        if (window.complexityLevelSwitcher) {
            window.complexityLevelSwitcher.onLevelChange((level, prevLevel, config) => {
                this.onComplexityLevelChange(level, config);
            });
        }
        
        console.log(`✅ NodeLibrary инициализирована: ${Object.keys(this.nodeTypes).length} типов узлов в ${this.categories.length} категориях`);
    }
    
    /**
     * Обработка изменения уровня сложности
     */
    onComplexityLevelChange(level, config) {
        console.log(`🎯 NodeLibrary: переключение на уровень ${level}`);
        
        // Обновляем кэш с учетом нового уровня
        this.cache.nodesByCategory.clear();
        this.cache.searchResults.clear();
        
        // Перерисовываем панель узлов если она существует
        if (window.nodeLibraryPanel) {
            window.nodeLibraryPanel.refresh();
        }
        
        // Уведомляем визуальный редактор об изменениях
        if (window.visualEditor) {
            window.visualEditor.onComplexityLevelChange(level, config);
        }
    }
    
    /**
     * Установка уровня сложности (вызывается из ComplexityLevelSwitcher)
     */
    setComplexityLevel(level, config) {
        this.currentComplexityLevel = level;
        this.currentComplexityConfig = config;
        this.onComplexityLevelChange(level, config);
    }

    /**
     * Проверяет корректность определений узлов
     */
    validateNodeTypes() {
        const errors = [];
        
        Object.entries(this.nodeTypes).forEach(([type, node]) => {
            if (!node.category) {
                errors.push(`Node type '${type}' missing category`);
            }
            if (!node.name) {
                errors.push(`Node type '${type}' missing name`);
            }
            if (!node.description) {
                errors.push(`Node type '${type}' missing description`);
            }
            if (!Array.isArray(node.inputs)) {
                errors.push(`Node type '${type}' inputs must be array`);
            }
            if (!Array.isArray(node.outputs)) {
                errors.push(`Node type '${type}' outputs must be array`);
            }
        });

        if (errors.length > 0) {
            console.warn('⚠️ NodeLibrary validation warnings:', errors);
        }
    }

    /**
     * Строит индекс для поиска
     */
    buildSearchIndex() {
        this.searchIndex = {};
        
        Object.entries(this.nodeTypes).forEach(([type, node]) => {
            const searchTerms = [
                type,
                node.name,
                node.description,
                node.category,
                node.complexity || 'beginner',
                ...(node.tags || [])
            ].join(' ').toLowerCase();
            
            this.searchIndex[type] = searchTerms;
        });
        
        return this.searchIndex;
    }

    /**
     * Устанавливает текущий уровень сложности
     */
    setComplexityLevel(level) {
        if (level >= 1 && level <= 3) {
            this.currentLevel = level;
            this.cache.nodesByLevel.clear(); // Очищаем кэш
            this.logger.info(`🎯 Уровень сложности изменен на: ${this.complexityLevels[level].name}`);
            return true;
        }
        return false;
    }

    /**
     * Получает узлы для текущего уровня сложности
     */
    getNodesForCurrentLevel() {
        const cacheKey = `level_${this.currentLevel}`;
        
        if (this.cache.nodesByLevel.has(cacheKey)) {
            return this.cache.nodesByLevel.get(cacheKey);
        }

        const filteredNodes = {};
        
        Object.entries(this.nodeTypes).forEach(([type, node]) => {
            const nodeLevel = node.level || 1;
            // Показываем узлы текущего и предыдущих уровней
            if (nodeLevel <= this.currentLevel) {
                filteredNodes[type] = node;
            }
        });

        this.cache.nodesByLevel.set(cacheKey, filteredNodes);
        return filteredNodes;
    }

    /**
     * Получает умные подсказки для узла
     */
    getSmartSuggestions(nodeType) {
        const node = this.nodeTypes[nodeType];
        if (!node || !node.smartSuggestions) {
            return [];
        }

        // Фильтруем подсказки по текущему уровню сложности
        return node.smartSuggestions.filter(suggestionType => {
            const suggestionNode = this.nodeTypes[suggestionType];
            return suggestionNode && (suggestionNode.level || 1) <= this.currentLevel;
        });
    }

    /**
     * Проверяет совместимость двух узлов
     */
    areNodesCompatible(sourceType, targetType) {
        const sourceNode = this.nodeTypes[sourceType];
        const targetNode = this.nodeTypes[targetType];
        
        if (!sourceNode || !targetNode) return false;
        
        // Базовая проверка совместимости по категориям
        if (sourceNode.compatibility && targetNode.compatibility) {
            const sourceCategories = sourceNode.compatibility.categories || [];
            const targetCategories = targetNode.compatibility.categories || [];
            
            return sourceCategories.some(cat => targetCategories.includes(cat));
        }
        
        return true; // По умолчанию считаем совместимыми
    }

    initializeNodeTypes() {
        return {
            // Триггеры - Уровень 1: Новичок
            'command': {
                category: 'triggers',
                name: 'Команда',
                description: 'Обрабатывает команды бота (/start, /help)',
                icon: '⚡',
                level: 1, // Новичок
                complexity: 'beginner',
                inputs: [],
                outputs: ['output'],
                config: {
                    command: { type: 'text', label: 'Команда', default: '/start' },
                    description: { type: 'text', label: 'Описание', default: '' }
                },
                // Умные подсказки для следующих блоков
                smartSuggestions: ['send_message', 'create_keyboard', 'save_variable'],
                // Совместимость с другими блоками
                compatibility: {
                    outputs: ['message_context', 'user_context'],
                    categories: ['communication', 'user_interaction']
                }
            },
            'text': {
                category: 'triggers',
                name: 'Текст',
                description: 'Обрабатывает текстовые сообщения',
                icon: '💬',
                level: 1, // Новичок
                complexity: 'beginner',
                inputs: [],
                outputs: ['output'],
                config: {
                    pattern: { type: 'text', label: 'Шаблон текста', default: '' },
                    exact_match: { type: 'checkbox', label: 'Точное совпадение', default: false }
                },
                smartSuggestions: ['text_check', 'send_message', 'save_variable'],
                compatibility: {
                    outputs: ['text_data', 'user_context'],
                    categories: ['text_processing', 'user_interaction']
                }
            },
            'callback': {
                category: 'triggers',
                name: 'Callback',
                description: 'Обрабатывает нажатия inline-кнопок',
                icon: '🔘',
                inputs: [],
                outputs: ['output'],
                config: {
                    callback_data: { type: 'text', label: 'Данные callback', default: '' }
                }
            },

            // Условия
            'text_check': {
                category: 'conditions',
                name: 'Проверка текста',
                description: 'Проверяет содержимое текстового сообщения',
                icon: '🔤',
                inputs: ['input'],
                outputs: ['true', 'false'],
                config: {
                    condition: { type: 'select', label: 'Условие', options: ['contains', 'equals', 'starts_with', 'ends_with', 'regex'], default: 'contains' },
                    value: { type: 'text', label: 'Значение', default: '' },
                    case_sensitive: { type: 'checkbox', label: 'Учитывать регистр', default: false }
                }
            },
            'user_check': {
                category: 'conditions',
                name: 'Проверка пользователя',
                description: 'Проверяет свойства пользователя',
                icon: '👤',
                inputs: ['input'],
                outputs: ['true', 'false'],
                config: {
                    property: { type: 'select', label: 'Свойство', options: ['is_admin', 'is_member', 'user_id', 'username', 'first_name', 'is_bot'], default: 'is_member' },
                    value: { type: 'text', label: 'Значение', default: '' },
                    operator: { type: 'select', label: 'Оператор', options: ['equals', 'not_equals', 'contains'], default: 'equals' }
                }
            },
            'time_check': {
                category: 'conditions',
                name: 'Проверка времени',
                description: 'Проверяет текущее время или дату',
                icon: '🕐',
                inputs: ['input'],
                outputs: ['true', 'false'],
                config: {
                    check_type: { type: 'select', label: 'Тип проверки', options: ['time_range', 'day_of_week', 'date_range', 'hour'], default: 'time_range' },
                    start_time: { type: 'text', label: 'Время начала (HH:MM)', default: '09:00' },
                    end_time: { type: 'text', label: 'Время окончания (HH:MM)', default: '18:00' },
                    days: { type: 'text', label: 'Дни недели (1-7, через запятую)', default: '1,2,3,4,5' },
                    timezone: { type: 'text', label: 'Часовой пояс', default: 'Europe/Moscow' }
                }
            },
            'data_check': {
                category: 'conditions',
                name: 'Проверка данных',
                description: 'Проверяет значения переменных или данных',
                icon: '📊',
                inputs: ['input'],
                outputs: ['true', 'false'],
                config: {
                    data_source: { type: 'select', label: 'Источник данных', options: ['variable', 'user_data', 'chat_data', 'global_data'], default: 'variable' },
                    key: { type: 'text', label: 'Ключ/Имя переменной', default: '' },
                    operator: { type: 'select', label: 'Оператор', options: ['equals', 'not_equals', 'greater', 'less', 'greater_equal', 'less_equal', 'exists', 'not_exists'], default: 'equals' },
                    value: { type: 'text', label: 'Значение для сравнения', default: '' },
                    data_type: { type: 'select', label: 'Тип данных', options: ['string', 'number', 'boolean'], default: 'string' }
                }
            },
            'logic_and': {
                category: 'conditions',
                name: 'И (AND)',
                description: 'Логический оператор И - все условия должны быть истинными',
                icon: '∧',
                inputs: ['input1', 'input2'],
                outputs: ['output'],
                config: {
                    description: { type: 'text', label: 'Описание', default: 'Логическое И' }
                }
            },
            'logic_or': {
                category: 'conditions',
                name: 'ИЛИ (OR)',
                description: 'Логический оператор ИЛИ - хотя бы одно условие должно быть истинным',
                icon: '∨',
                inputs: ['input1', 'input2'],
                outputs: ['output'],
                config: {
                    description: { type: 'text', label: 'Описание', default: 'Логическое ИЛИ' }
                }
            },
            'logic_not': {
                category: 'conditions',
                name: 'НЕ (NOT)',
                description: 'Логический оператор НЕ - инвертирует результат',
                icon: '¬',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    description: { type: 'text', label: 'Описание', default: 'Логическое НЕ' }
                }
            },

            // Действия - Уровень 1: Новичок
            'send_message': {
                category: 'actions',
                name: 'Отправить сообщение',
                description: 'Отправляет текстовое сообщение пользователю',
                icon: '💬',
                level: 1, // Новичок
                complexity: 'beginner',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    text: { type: 'textarea', label: 'Текст сообщения', default: 'Привет!' },
                    parse_mode: { type: 'select', label: 'Режим парсинга', options: ['none', 'HTML', 'Markdown'], default: 'none' },
                    disable_web_page_preview: { type: 'checkbox', label: 'Отключить превью ссылок', default: false },
                    reply_to_message: { type: 'checkbox', label: 'Ответить на сообщение', default: false },
                    delete_after: { type: 'number', label: 'Удалить через (сек)', default: 0 }
                },
                smartSuggestions: ['create_keyboard', 'text_check', 'delay_action'],
                compatibility: {
                    outputs: ['message_sent', 'user_notified'],
                    categories: ['communication', 'user_interaction']
                }
            },

            // Бизнес-блоки - Уровень 2: Бизнес
            'ecommerce_catalog': {
                category: 'business',
                name: '🛒 Каталог товаров',
                description: 'Показывает каталог товаров с возможностью выбора',
                icon: '🛒',
                level: 2, // Бизнес
                complexity: 'business',
                inputs: ['input'],
                outputs: ['item_selected', 'catalog_viewed', 'error'],
                config: {
                    catalog_source: { type: 'select', label: 'Источник каталога', options: ['json_file', 'api_endpoint', 'database'], default: 'json_file' },
                    items_per_page: { type: 'number', label: 'Товаров на странице', default: 5 },
                    show_prices: { type: 'checkbox', label: 'Показывать цены', default: true },
                    show_images: { type: 'checkbox', label: 'Показывать изображения', default: true },
                    currency: { type: 'text', label: 'Валюта', default: '₽' }
                },
                smartSuggestions: ['ecommerce_cart', 'payment_processor', 'save_variable'],
                compatibility: {
                    outputs: ['product_data', 'user_selection'],
                    categories: ['ecommerce', 'business_logic']
                }
            },

            'ecommerce_cart': {
                category: 'business',
                name: '🛍️ Корзина покупок',
                description: 'Управляет корзиной пользователя',
                icon: '🛍️',
                level: 2, // Бизнес
                complexity: 'business',
                inputs: ['product_data'],
                outputs: ['cart_updated', 'checkout_ready', 'cart_empty'],
                config: {
                    max_items: { type: 'number', label: 'Максимум товаров', default: 10 },
                    auto_save: { type: 'checkbox', label: 'Автосохранение', default: true },
                    show_total: { type: 'checkbox', label: 'Показывать итого', default: true }
                },
                smartSuggestions: ['payment_processor', 'send_message', 'save_variable'],
                compatibility: {
                    outputs: ['cart_data', 'order_data'],
                    categories: ['ecommerce', 'data_management']
                }
            },

            // Продвинутые блоки - Уровень 3: Профи
            'advanced_loop': {
                category: 'logic',
                name: '🔄 Цикл For',
                description: 'Выполняет действия в цикле с счетчиком',
                icon: '🔄',
                level: 3, // Профи
                complexity: 'advanced',
                inputs: ['input', 'loop_data'],
                outputs: ['iteration', 'completed', 'error'],
                config: {
                    start_value: { type: 'number', label: 'Начальное значение', default: 0 },
                    end_value: { type: 'number', label: 'Конечное значение', default: 10 },
                    step: { type: 'number', label: 'Шаг', default: 1 },
                    max_iterations: { type: 'number', label: 'Максимум итераций', default: 100 },
                    break_condition: { type: 'text', label: 'Условие прерывания', default: '' }
                },
                smartSuggestions: ['condition_check', 'save_variable', 'api_request'],
                compatibility: {
                    outputs: ['loop_iteration', 'counter_value'],
                    categories: ['advanced_logic', 'flow_control']
                }
            },

            'api_integration': {
                category: 'integrations',
                name: '🌐 API интеграция',
                description: 'Продвинутая интеграция с внешними API',
                icon: '🌐',
                level: 3, // Профи
                complexity: 'advanced',
                inputs: ['request_data'],
                outputs: ['success', 'error', 'data_received'],
                config: {
                    endpoint_url: { type: 'text', label: 'URL эндпоинта', default: '' },
                    method: { type: 'select', label: 'HTTP метод', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
                    headers: { type: 'textarea', label: 'Заголовки (JSON)', default: '{}' },
                    auth_type: { type: 'select', label: 'Тип авторизации', options: ['none', 'bearer', 'basic', 'api_key'], default: 'none' },
                    retry_attempts: { type: 'number', label: 'Попыток повтора', default: 3 },
                    timeout: { type: 'number', label: 'Таймаут (сек)', default: 30 }
                },
                smartSuggestions: ['data_transformer', 'condition_check', 'error_handler'],
                compatibility: {
                    outputs: ['api_response', 'processed_data'],
                    categories: ['api_integration', 'external_services']
                }
            },
            'send_photo': {
                category: 'actions',
                name: 'Отправить фото',
                description: 'Отправляет изображение с подписью',
                icon: '🖼️',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    photo_url: { type: 'text', label: 'URL изображения', default: '' },
                    photo_file: { type: 'text', label: 'Путь к файлу', default: '' },
                    caption: { type: 'textarea', label: 'Подпись', default: '' },
                    parse_mode: { type: 'select', label: 'Режим парсинга', options: ['none', 'HTML', 'Markdown'], default: 'none' }
                }
            },
            'send_document': {
                category: 'actions',
                name: 'Отправить документ',
                description: 'Отправляет файл или документ',
                icon: '📄',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    document_url: { type: 'text', label: 'URL документа', default: '' },
                    document_file: { type: 'text', label: 'Путь к файлу', default: '' },
                    caption: { type: 'textarea', label: 'Подпись', default: '' },
                    filename: { type: 'text', label: 'Имя файла', default: '' }
                }
            },
            'create_keyboard': {
                category: 'actions',
                name: 'Создать клавиатуру',
                description: 'Создает inline или reply клавиатуру',
                icon: '⌨️',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    keyboard_type: { type: 'select', label: 'Тип клавиатуры', options: ['inline', 'reply'], default: 'inline' },
                    buttons: { type: 'textarea', label: 'Кнопки (JSON)', default: '[{"text": "Кнопка", "callback_data": "button_1"}]' },
                    resize_keyboard: { type: 'checkbox', label: 'Изменить размер', default: true },
                    one_time_keyboard: { type: 'checkbox', label: 'Одноразовая', default: false }
                }
            },
            'delete_message': {
                category: 'actions',
                name: 'Удалить сообщение',
                description: 'Удаляет сообщение из чата',
                icon: '🗑️',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    target: { type: 'select', label: 'Что удалить', options: ['current_message', 'reply_message', 'by_id'], default: 'current_message' },
                    message_id: { type: 'text', label: 'ID сообщения', default: '' },
                    delay: { type: 'number', label: 'Задержка (сек)', default: 0 }
                }
            },
            'admin_action': {
                category: 'actions',
                name: 'Действие администратора',
                description: 'Выполняет административные действия в чате',
                icon: '👮',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    action: { type: 'select', label: 'Действие', options: ['kick_user', 'ban_user', 'unban_user', 'mute_user', 'unmute_user', 'promote_user', 'demote_user'], default: 'kick_user' },
                    target_user: { type: 'select', label: 'Пользователь', options: ['message_author', 'reply_user', 'by_id'], default: 'message_author' },
                    user_id: { type: 'text', label: 'ID пользователя', default: '' },
                    duration: { type: 'number', label: 'Длительность (мин)', default: 0 },
                    reason: { type: 'text', label: 'Причина', default: '' }
                }
            },
            'delay_action': {
                category: 'actions',
                name: 'Задержка',
                description: 'Приостанавливает выполнение на указанное время',
                icon: '⏱️',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    delay_type: { type: 'select', label: 'Тип задержки', options: ['seconds', 'minutes', 'hours'], default: 'seconds' },
                    duration: { type: 'number', label: 'Длительность', default: 1 },
                    description: { type: 'text', label: 'Описание', default: 'Пауза в выполнении' }
                }
            },
            'forward_message': {
                category: 'actions',
                name: 'Переслать сообщение',
                description: 'Пересылает сообщение в другой чат',
                icon: '↗️',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    target_chat: { type: 'text', label: 'ID целевого чата', default: '' },
                    source_message: { type: 'select', label: 'Источник', options: ['current_message', 'reply_message'], default: 'current_message' },
                    disable_notification: { type: 'checkbox', label: 'Без уведомления', default: false }
                }
            },
            'edit_message': {
                category: 'actions',
                name: 'Редактировать сообщение',
                description: 'Изменяет текст существующего сообщения',
                icon: '✏️',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    new_text: { type: 'textarea', label: 'Новый текст', default: '' },
                    message_id: { type: 'text', label: 'ID сообщения', default: '' },
                    parse_mode: { type: 'select', label: 'Режим парсинга', options: ['none', 'HTML', 'Markdown'], default: 'none' }
                }
            },

            // Данные
            'save_variable': {
                category: 'data',
                name: 'Сохранить переменную',
                description: 'Сохраняет значение в переменную',
                icon: '💾',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    variable_name: { type: 'text', label: 'Имя переменной', default: 'my_var' },
                    value: { type: 'text', label: 'Значение', default: '' },
                    scope: { type: 'select', label: 'Область видимости', options: ['user', 'chat', 'global'], default: 'user' },
                    data_type: { type: 'select', label: 'Тип данных', options: ['string', 'number', 'boolean', 'json'], default: 'string' }
                }
            },
            'load_variable': {
                category: 'data',
                name: 'Загрузить переменную',
                description: 'Загружает значение переменной',
                icon: '📂',
                inputs: ['input'],
                outputs: ['output', 'not_found'],
                config: {
                    variable_name: { type: 'text', label: 'Имя переменной', default: 'my_var' },
                    scope: { type: 'select', label: 'Область видимости', options: ['user', 'chat', 'global'], default: 'user' },
                    default_value: { type: 'text', label: 'Значение по умолчанию', default: '' }
                }
            },
            'counter': {
                category: 'data',
                name: 'Счетчик',
                description: 'Увеличивает или уменьшает числовой счетчик',
                icon: '🔢',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    counter_name: { type: 'text', label: 'Имя счетчика', default: 'counter' },
                    operation: { type: 'select', label: 'Операция', options: ['increment', 'decrement', 'set', 'reset'], default: 'increment' },
                    value: { type: 'number', label: 'Значение', default: 1 },
                    scope: { type: 'select', label: 'Область видимости', options: ['user', 'chat', 'global'], default: 'user' },
                    min_value: { type: 'number', label: 'Минимальное значение', default: 0 },
                    max_value: { type: 'number', label: 'Максимальное значение', default: 1000 }
                }
            },
            'database_query': {
                category: 'data',
                name: 'Запрос к БД',
                description: 'Выполняет запрос к базе данных',
                icon: '🗄️',
                inputs: ['input'],
                outputs: ['success', 'error', 'empty'],
                config: {
                    operation: { type: 'select', label: 'Операция', options: ['select', 'insert', 'update', 'delete'], default: 'select' },
                    table: { type: 'text', label: 'Таблица', default: 'users' },
                    conditions: { type: 'textarea', label: 'Условия (JSON)', default: '{"user_id": "{user_id}"}' },
                    data: { type: 'textarea', label: 'Данные (JSON)', default: '{}' },
                    limit: { type: 'number', label: 'Лимит записей', default: 10 }
                }
            },
            'random_generator': {
                category: 'data',
                name: 'Генератор случайных значений',
                description: 'Генерирует случайные числа, строки или выбирает из списка',
                icon: '🎲',
                inputs: ['input'],
                outputs: ['output'],
                config: {
                    type: { type: 'select', label: 'Тип генерации', options: ['number', 'string', 'choice', 'boolean'], default: 'number' },
                    min_number: { type: 'number', label: 'Минимальное число', default: 1 },
                    max_number: { type: 'number', label: 'Максимальное число', default: 100 },
                    string_length: { type: 'number', label: 'Длина строки', default: 8 },
                    string_chars: { type: 'text', label: 'Символы для строки', default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
                    choices: { type: 'textarea', label: 'Варианты выбора (по строке)', default: 'Вариант 1\nВариант 2\nВариант 3' }
                }
            },
            'data_transformer': {
                category: 'data',
                name: 'Преобразователь данных',
                description: 'Преобразует данные между различными форматами',
                icon: '🔄',
                inputs: ['input'],
                outputs: ['output', 'error'],
                config: {
                    operation: { type: 'select', label: 'Операция', options: ['json_parse', 'json_stringify', 'to_upper', 'to_lower', 'trim', 'split', 'join'], default: 'json_parse' },
                    input_data: { type: 'text', label: 'Входные данные', default: '' },
                    separator: { type: 'text', label: 'Разделитель (для split/join)', default: ',' },
                    target_variable: { type: 'text', label: 'Целевая переменная', default: 'result' }
                }
            },
            'data_validator': {
                category: 'data',
                name: 'Валидатор данных',
                description: 'Проверяет данные на соответствие правилам',
                icon: '✅',
                inputs: ['input'],
                outputs: ['valid', 'invalid'],
                config: {
                    validation_type: { type: 'select', label: 'Тип валидации', options: ['email', 'phone', 'url', 'number', 'length', 'regex'], default: 'email' },
                    input_value: { type: 'text', label: 'Проверяемое значение', default: '' },
                    min_length: { type: 'number', label: 'Минимальная длина', default: 1 },
                    max_length: { type: 'number', label: 'Максимальная длина', default: 100 },
                    regex_pattern: { type: 'text', label: 'Регулярное выражение', default: '' }
                }
            },

            // Интеграции
            'http_request': {
                category: 'integrations',
                name: 'HTTP-запрос',
                description: 'Выполняет HTTP-запрос к внешнему API',
                icon: '🌐',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    url: { type: 'text', label: 'URL', default: 'https://api.example.com' },
                    method: { type: 'select', label: 'Метод', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
                    headers: { type: 'textarea', label: 'Заголовки (JSON)', default: '{"Content-Type": "application/json"}' },
                    body: { type: 'textarea', label: 'Тело запроса', default: '' },
                    timeout: { type: 'number', label: 'Таймаут (сек)', default: 30 }
                }
            },
            'weather_api': {
                category: 'integrations',
                name: 'Погода',
                description: 'Получает данные о погоде через OpenWeatherMap API',
                icon: '🌤️',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    api_key: { type: 'text', label: 'API ключ OpenWeatherMap', default: '' },
                    city: { type: 'text', label: 'Город', default: 'Moscow' },
                    units: { type: 'select', label: 'Единицы измерения', options: ['metric', 'imperial', 'kelvin'], default: 'metric' },
                    lang: { type: 'select', label: 'Язык', options: ['ru', 'en', 'de', 'fr', 'es'], default: 'ru' }
                }
            },
            'news_api': {
                category: 'integrations',
                name: 'Новости',
                description: 'Получает новости через NewsAPI',
                icon: '📰',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    api_key: { type: 'text', label: 'API ключ NewsAPI', default: '' },
                    query: { type: 'text', label: 'Поисковый запрос', default: 'технологии' },
                    country: { type: 'select', label: 'Страна', options: ['ru', 'us', 'gb', 'de', 'fr'], default: 'ru' },
                    category: { type: 'select', label: 'Категория', options: ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'], default: 'technology' },
                    page_size: { type: 'number', label: 'Количество новостей', default: 5 }
                }
            },
            'currency_api': {
                category: 'integrations',
                name: 'Курсы валют',
                description: 'Получает курсы валют через ExchangeRate API',
                icon: '💱',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    base_currency: { type: 'select', label: 'Базовая валюта', options: ['USD', 'EUR', 'RUB', 'GBP', 'JPY', 'CNY'], default: 'USD' },
                    target_currency: { type: 'select', label: 'Целевая валюта', options: ['USD', 'EUR', 'RUB', 'GBP', 'JPY', 'CNY'], default: 'RUB' },
                    amount: { type: 'number', label: 'Сумма для конвертации', default: 1 }
                }
            },
            'translate_api': {
                category: 'integrations',
                name: 'Переводчик',
                description: 'Переводит текст через Google Translate API',
                icon: '🌍',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    api_key: { type: 'text', label: 'API ключ Google Translate', default: '' },
                    text: { type: 'textarea', label: 'Текст для перевода', default: '{message_text}' },
                    source_lang: { type: 'select', label: 'Исходный язык', options: ['auto', 'ru', 'en', 'de', 'fr', 'es', 'zh'], default: 'auto' },
                    target_lang: { type: 'select', label: 'Целевой язык', options: ['ru', 'en', 'de', 'fr', 'es', 'zh'], default: 'en' }
                }
            },
            'qr_generator': {
                category: 'integrations',
                name: 'QR-код',
                description: 'Генерирует QR-код через QR Server API',
                icon: '📱',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    text: { type: 'textarea', label: 'Текст для QR-кода', default: '{message_text}' },
                    size: { type: 'select', label: 'Размер', options: ['100x100', '200x200', '300x300', '400x400'], default: '200x200' },
                    format: { type: 'select', label: 'Формат', options: ['png', 'jpg', 'gif', 'svg'], default: 'png' }
                }
            },
            'joke_api': {
                category: 'integrations',
                name: 'Анекдоты',
                description: 'Получает случайные анекдоты через JokeAPI',
                icon: '😄',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    category: { type: 'select', label: 'Категория', options: ['Any', 'Programming', 'Misc', 'Dark', 'Pun', 'Spooky', 'Christmas'], default: 'Programming' },
                    type: { type: 'select', label: 'Тип', options: ['single', 'twopart'], default: 'single' },
                    lang: { type: 'select', label: 'Язык', options: ['en', 'de', 'es', 'fr', 'pt'], default: 'en' }
                }
            },
            'cat_api': {
                category: 'integrations',
                name: 'Случайный котик',
                description: 'Получает случайные фото котиков через Cat API',
                icon: '🐱',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    breed: { type: 'text', label: 'Порода (необязательно)', default: '' },
                    limit: { type: 'number', label: 'Количество фото', default: 1 }
                }
            },
            'webhook_sender': {
                category: 'integrations',
                name: 'Webhook',
                description: 'Отправляет данные на webhook URL',
                icon: '🔗',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    webhook_url: { type: 'text', label: 'URL webhook', default: '' },
                    method: { type: 'select', label: 'HTTP метод', options: ['POST', 'PUT', 'PATCH'], default: 'POST' },
                    payload: { type: 'textarea', label: 'Данные (JSON)', default: '{"message": "{message_text}", "user_id": "{user_id}"}' },
                    secret: { type: 'text', label: 'Секретный ключ', default: '' }
                }
            },
            'scheduler': {
                category: 'integrations',
                name: 'Планировщик',
                description: 'Планирует выполнение действий на определенное время',
                icon: '⏰',
                inputs: ['input'],
                outputs: ['scheduled', 'error'],
                config: {
                    schedule_type: { type: 'select', label: 'Тип расписания', options: ['once', 'daily', 'weekly', 'monthly'], default: 'once' },
                    datetime: { type: 'text', label: 'Дата и время (YYYY-MM-DD HH:MM)', default: '' },
                    timezone: { type: 'text', label: 'Часовой пояс', default: 'Europe/Moscow' },
                    action_data: { type: 'textarea', label: 'Данные действия (JSON)', default: '{}' }
                }
            },
            'notification_sender': {
                category: 'integrations',
                name: 'Уведомления',
                description: 'Отправляет push-уведомления через внешние сервисы',
                icon: '🔔',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    service: { type: 'select', label: 'Сервис', options: ['telegram', 'email', 'slack', 'discord'], default: 'telegram' },
                    recipient: { type: 'text', label: 'Получатель', default: '' },
                    title: { type: 'text', label: 'Заголовок', default: 'Уведомление от бота' },
                    message: { type: 'textarea', label: 'Сообщение', default: '{message_text}' },
                    priority: { type: 'select', label: 'Приоритет', options: ['low', 'normal', 'high'], default: 'normal' }
                }
            },
            'crypto_api': {
                category: 'integrations',
                name: 'Криптовалюты',
                description: 'Получает курсы криптовалют через CoinGecko API',
                icon: '₿',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    coin_id: { type: 'text', label: 'ID монеты', default: 'bitcoin' },
                    vs_currency: { type: 'select', label: 'Валюта', options: ['usd', 'eur', 'rub', 'btc', 'eth'], default: 'usd' },
                    include_24hr_change: { type: 'checkbox', label: 'Включить изменение за 24ч', default: true }
                }
            },
            'github_api': {
                category: 'integrations',
                name: 'GitHub',
                description: 'Получает информацию о репозиториях через GitHub API',
                icon: '🐙',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    username: { type: 'text', label: 'Имя пользователя', default: '' },
                    repository: { type: 'text', label: 'Название репозитория', default: '' },
                    action: { type: 'select', label: 'Действие', options: ['user_info', 'repo_info', 'user_repos', 'repo_commits'], default: 'repo_info' },
                    token: { type: 'text', label: 'GitHub Token (необязательно)', default: '' }
                }
            },
            'wikipedia_api': {
                category: 'integrations',
                name: 'Википедия',
                description: 'Поиск статей в Википедии',
                icon: '📖',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    query: { type: 'text', label: 'Поисковый запрос', default: '{message_text}' },
                    language: { type: 'select', label: 'Язык', options: ['ru', 'en', 'de', 'fr', 'es', 'it'], default: 'ru' },
                    sentences: { type: 'number', label: 'Количество предложений', default: 3 }
                }
            },
            'youtube_api': {
                category: 'integrations',
                name: 'YouTube',
                description: 'Поиск видео на YouTube через API',
                icon: '📺',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    api_key: { type: 'text', label: 'YouTube API ключ', default: '' },
                    query: { type: 'text', label: 'Поисковый запрос', default: '{message_text}' },
                    max_results: { type: 'number', label: 'Максимум результатов', default: 5 },
                    order: { type: 'select', label: 'Сортировка', options: ['relevance', 'date', 'rating', 'viewCount'], default: 'relevance' }
                }
            },
            'rss_parser': {
                category: 'integrations',
                name: 'RSS парсер',
                description: 'Парсит RSS ленты новостей и блогов',
                icon: '📡',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    rss_url: { type: 'text', label: 'URL RSS ленты', default: 'https://example.com/rss.xml' },
                    max_items: { type: 'number', label: 'Максимум элементов', default: 5 },
                    include_content: { type: 'checkbox', label: 'Включить содержимое', default: false }
                }
            },
            'ip_geolocation': {
                category: 'integrations',
                name: 'Геолокация по IP',
                description: 'Определяет местоположение по IP адресу',
                icon: '🌍',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    ip_address: { type: 'text', label: 'IP адрес', default: '{user_ip}' },
                    fields: { type: 'text', label: 'Поля (через запятую)', default: 'country,city,timezone' }
                }
            },
            'shorturl_api': {
                category: 'integrations',
                name: 'Сокращение ссылок',
                description: 'Сокращает длинные URL через TinyURL или bit.ly',
                icon: '🔗',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    service: { type: 'select', label: 'Сервис', options: ['tinyurl', 'bitly', 'shortio'], default: 'tinyurl' },
                    long_url: { type: 'text', label: 'Длинная ссылка', default: '{message_text}' },
                    api_key: { type: 'text', label: 'API ключ (для bit.ly)', default: '' }
                }
            },
            'ai_chat': {
                category: 'integrations',
                name: 'AI Чат',
                description: 'Интеграция с AI сервисами (OpenAI, Claude, etc.)',
                icon: '🤖',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    service: { type: 'select', label: 'AI Сервис', options: ['openai', 'claude', 'gemini', 'local'], default: 'openai' },
                    api_key: { type: 'text', label: 'API ключ', default: '' },
                    model: { type: 'text', label: 'Модель', default: 'gpt-3.5-turbo' },
                    prompt: { type: 'textarea', label: 'Системный промпт', default: 'Ты полезный помощник.' },
                    message: { type: 'textarea', label: 'Сообщение пользователя', default: '{message_text}' },
                    max_tokens: { type: 'number', label: 'Максимум токенов', default: 150 }
                }
            },
            'image_generator': {
                category: 'integrations',
                name: 'Генератор изображений',
                description: 'Генерирует изображения через AI (DALL-E, Midjourney API)',
                icon: '🎨',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    service: { type: 'select', label: 'Сервис', options: ['dalle', 'stable_diffusion', 'midjourney'], default: 'dalle' },
                    api_key: { type: 'text', label: 'API ключ', default: '' },
                    prompt: { type: 'textarea', label: 'Описание изображения', default: '{message_text}' },
                    size: { type: 'select', label: 'Размер', options: ['256x256', '512x512', '1024x1024'], default: '512x512' },
                    style: { type: 'select', label: 'Стиль', options: ['natural', 'vivid', 'artistic'], default: 'natural' }
                }
            },
            'email_sender': {
                category: 'integrations',
                name: 'Отправка Email',
                description: 'Отправляет email через SMTP или сервисы (SendGrid, Mailgun)',
                icon: '📧',
                inputs: ['input'],
                outputs: ['success', 'error'],
                config: {
                    service: { type: 'select', label: 'Сервис', options: ['smtp', 'sendgrid', 'mailgun'], default: 'smtp' },
                    api_key: { type: 'text', label: 'API ключ', default: '' },
                    to_email: { type: 'text', label: 'Получатель', default: '' },
                    subject: { type: 'text', label: 'Тема', default: 'Сообщение от бота' },
                    body: { type: 'textarea', label: 'Текст письма', default: '{message_text}' },
                    from_email: { type: 'text', label: 'Отправитель', default: 'bot@example.com' }
                }
            },
            'database_external': {
                category: 'integrations',
                name: 'Внешняя БД',
                description: 'Подключение к внешним базам данных (MySQL, PostgreSQL, MongoDB)',
                icon: '🗃️',
                inputs: ['input'],
                outputs: ['success', 'error', 'empty'],
                config: {
                    db_type: { type: 'select', label: 'Тип БД', options: ['mysql', 'postgresql', 'mongodb', 'sqlite'], default: 'mysql' },
                    connection_string: { type: 'text', label: 'Строка подключения', default: '' },
                    query: { type: 'textarea', label: 'SQL запрос', default: 'SELECT * FROM users LIMIT 10' },
                    parameters: { type: 'textarea', label: 'Параметры (JSON)', default: '{}' }
                }
            }
        };
    }

    initializeCategories() {
        return {
            'triggers': {
                name: 'Триггеры',
                icon: '⚡',
                description: 'События, которые запускают выполнение логики бота',
                color: '#4caf50'
            },
            'conditions': {
                name: 'Условия',
                icon: '❓',
                description: 'Проверки и логические операторы',
                color: '#ff9800'
            },
            'actions': {
                name: 'Действия',
                icon: '🎯',
                description: 'Действия, которые выполняет бот',
                color: '#2196f3'
            },
            'data': {
                name: 'Данные',
                icon: '💾',
                description: 'Работа с переменными и базой данных',
                color: '#9c27b0'
            },
            'integrations': {
                name: 'Интеграции',
                icon: '🔗',
                description: 'Интеграция с внешними сервисами',
                color: '#607d8b'
            }
        };
    }

    // Получение узлов по категории с фильтрацией по уровню сложности
    getNodesByCategory(category) {
        const cacheKey = `${category}_${this.currentComplexityLevel || 'all'}`;
        
        if (this.cache.nodesByCategory.has(cacheKey)) {
            return this.cache.nodesByCategory.get(cacheKey);
        }

        const nodes = [];
        for (const [type, nodeData] of Object.entries(this.nodeTypes)) {
            if (nodeData.category === category) {
                // Проверяем доступность узла на текущем уровне сложности
                if (this.isNodeAllowed(type)) {
                    nodes.push({
                        type: type,
                        ...nodeData
                    });
                }
            }
        }
        
        this.cache.nodesByCategory.set(cacheKey, nodes);
        return nodes;
    }
    
    // Проверяет доступность узла на текущем уровне сложности
    isNodeAllowed(nodeType) {
        if (!window.complexityLevelSwitcher) {
            return true; // Если система уровней не инициализирована, разрешаем все
        }
        
        return window.complexityLevelSwitcher.isNodeTypeAllowed(nodeType);
    }

    // Получение всех категорий
    getCategories() {
        return this.categories;
    }

    // Получение информации о типе узла
    getNodeType(type) {
        return this.nodeTypes[type] || null;
    }

    // Создание экземпляра узла


    // Валидация конфигурации узла
    validateNodeConfig(type, config) {
        const nodeType = this.getNodeType(type);
        if (!nodeType) {
            return { valid: false, errors: [`Unknown node type: ${type}`] };
        }

        const errors = [];

        for (const [key, field] of Object.entries(nodeType.config)) {
            const value = config[key];

            // Проверка обязательных полей
            if (field.required && (value === undefined || value === null || value === '')) {
                errors.push(`Field '${key}' is required`);
                continue;
            }

            // Проверка типов
            if (value !== undefined && value !== null) {
                switch (field.type) {
                    case 'number':
                        if (isNaN(Number(value))) {
                            errors.push(`Field '${key}' must be a number`);
                        }
                        break;
                    case 'select':
                        if (field.options && !field.options.includes(value)) {
                            errors.push(`Field '${key}' must be one of: ${field.options.join(', ')}`);
                        }
                        break;
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }


    /**
     * Получает все типы узлов
     */
    getAllNodeTypes() {
        return Object.keys(this.nodeTypes).map(type => ({
            type,
            ...this.nodeTypes[type]
        }));
    }



    /**
     * Получает узлы по категории
     */
    getNodeTypesByCategory(category) {
        return Object.keys(this.nodeTypes)
            .filter(type => this.nodeTypes[type].category === category)
            .map(type => ({ type, ...this.nodeTypes[type] }));
    }

    /**
     * Поиск узлов по запросу
     */
    searchNodes(query) {
        if (!query || query.trim() === '') {
            return this.getAllNodeTypes();
        }

        const searchTerm = query.toLowerCase().trim();
        const results = [];

        Object.entries(this.searchIndex).forEach(([type, searchText]) => {
            if (searchText.includes(searchTerm)) {
                const node = this.getNodeType(type);
                if (node) {
                    // Вычисляем релевантность
                    let relevance = 0;
                    if (node.name.toLowerCase().includes(searchTerm)) relevance += 10;
                    if (node.type.toLowerCase().includes(searchTerm)) relevance += 8;
                    if (node.description.toLowerCase().includes(searchTerm)) relevance += 5;
                    if (node.category.toLowerCase().includes(searchTerm)) relevance += 3;

                    results.push({ ...node, relevance });
                }
            }
        });

        // Сортируем по релевантности
        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Создает экземпляр узла
     */
    createNodeInstance(type, config = {}) {
        const nodeType = this.getNodeType(type);
        if (!nodeType) {
            throw new Error(`Unknown node type: ${type}`);
        }

        // Создаем базовый узел с конфигурацией по умолчанию
        const defaultConfig = {};
        if (nodeType.config) {
            Object.entries(nodeType.config).forEach(([key, field]) => {
                defaultConfig[key] = field.default;
            });
        }

        const nodeConfig = { ...defaultConfig, ...config };
        
        // Создаем экземпляр BaseNode
        const node = new BaseNode(null, type, nodeType.category, nodeConfig);
        
        // Добавляем входы и выходы
        if (nodeType.inputs) {
            nodeType.inputs.forEach(input => {
                node.addInput(input, 'any', false);
            });
        }
        
        if (nodeType.outputs) {
            nodeType.outputs.forEach(output => {
                node.addOutput(output, 'any');
            });
        }

        // Добавляем метаданные
        node.displayName = nodeType.name;
        node.description = nodeType.description;
        node.icon = nodeType.icon;

        return node;
    }

    /**
     * Валидирует конфигурацию узла
     */
    validateNodeConfig(type, config) {
        const nodeType = this.getNodeType(type);
        if (!nodeType) {
            return { isValid: false, errors: [`Unknown node type: ${type}`] };
        }

        const errors = [];
        
        if (nodeType.config) {
            Object.entries(nodeType.config).forEach(([key, field]) => {
                const value = config[key];
                
                // Проверяем обязательные поля
                if (field.required && (value === undefined || value === null || value === '')) {
                    errors.push(`Field '${field.label}' is required`);
                }
                
                // Проверяем типы
                if (value !== undefined && value !== null) {
                    switch (field.type) {
                        case 'number':
                            if (isNaN(Number(value))) {
                                errors.push(`Field '${field.label}' must be a number`);
                            }
                            break;
                        case 'select':
                            if (field.options && !field.options.includes(value)) {
                                errors.push(`Field '${field.label}' must be one of: ${field.options.join(', ')}`);
                            }
                            break;
                        case 'checkbox':
                            if (typeof value !== 'boolean') {
                                errors.push(`Field '${field.label}' must be a boolean`);
                            }
                            break;
                    }
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Получает категории узлов
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Получает статистику по категориям
     */
    getCategoryStats() {
        const stats = {};
        
        this.categories.forEach(category => {
            stats[category.id] = {
                ...category,
                nodeCount: this.getNodeTypesByCategory(category.id).length
            };
        });

        return stats;
    }

    /**
     * Экспортирует библиотеку в JSON
     */
    exportLibrary() {
        return {
            version: '1.0.0',
            categories: this.categories,
            nodeTypes: this.nodeTypes,
            metadata: {
                totalNodes: Object.keys(this.nodeTypes).length,
                totalCategories: this.categories.length,
                exportedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Импортирует библиотеку из JSON
     */
    importLibrary(libraryData) {
        if (!libraryData.nodeTypes || !libraryData.categories) {
            throw new Error('Invalid library format');
        }

        this.nodeTypes = { ...this.nodeTypes, ...libraryData.nodeTypes };
        this.categories = libraryData.categories;
        this.buildSearchIndex();
        
        console.log(`📚 Imported library: ${Object.keys(libraryData.nodeTypes).length} node types`);
    }

    /**
     * Добавляет пользовательский тип узла
     */
    addCustomNodeType(type, definition) {
        if (this.nodeTypes[type]) {
            console.warn(`⚠️ Node type '${type}' already exists, overwriting`);
        }

        // Валидируем определение
        const requiredFields = ['category', 'name', 'description', 'inputs', 'outputs'];
        const missingFields = requiredFields.filter(field => !definition[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        this.nodeTypes[type] = definition;
        this.buildSearchIndex();
        
        console.log(`➕ Added custom node type: ${type}`);
    }

    /**
     * Удаляет тип узла
     */
    removeNodeType(type) {
        if (!this.nodeTypes[type]) {
            console.warn(`⚠️ Node type '${type}' does not exist`);
            return false;
        }

        delete this.nodeTypes[type];
        this.buildSearchIndex();
        
        console.log(`➖ Removed node type: ${type}`);
        return true;
    }

    /**
     * Получает рекомендации узлов на основе контекста
     */
    getRecommendations(context = {}) {
        const recommendations = [];
        
        // Рекомендации на основе категории
        if (context.category) {
            const categoryNodes = this.getNodeTypesByCategory(context.category);
            recommendations.push(...categoryNodes.slice(0, 3));
        }
        
        // Рекомендации на основе последних использованных узлов
        if (context.recentNodes && context.recentNodes.length > 0) {
            const recentCategories = context.recentNodes.map(node => 
                this.getNodeType(node)?.category
            ).filter(Boolean);
            
            const uniqueCategories = [...new Set(recentCategories)];
            uniqueCategories.forEach(category => {
                const nodes = this.getNodeTypesByCategory(category);
                recommendations.push(...nodes.slice(0, 2));
            });
        }
        
        // Популярные узлы по умолчанию
        if (recommendations.length === 0) {
            const popularNodes = [
                'send_message', 'text_check', 'command', 
                'save_variable', 'http_request'
            ];
            
            popularNodes.forEach(type => {
                const node = this.getNodeType(type);
                if (node) recommendations.push(node);
            });
        }
        
        // Убираем дубликаты и ограничиваем количество
        const uniqueRecommendations = recommendations.filter((node, index, arr) => 
            arr.findIndex(n => n.type === node.type) === index
        );
        
        return uniqueRecommendations.slice(0, 8);
    }

    /**
     * Получает совместимые узлы для подключения
     */
    getCompatibleNodes(sourceNodeType, outputPort) {
        const sourceNode = this.getNodeType(sourceNodeType);
        if (!sourceNode || !sourceNode.outputs[outputPort]) {
            return [];
        }

        const outputType = sourceNode.outputs[outputPort];
        const compatibleNodes = [];

        Object.entries(this.nodeTypes).forEach(([type, node]) => {
            if (node.inputs && node.inputs.length > 0) {
                const hasCompatibleInput = node.inputs.some(input => 
                    input === 'any' || outputType === 'any' || input === outputType
                );
                
                if (hasCompatibleInput) {
                    compatibleNodes.push({ type, ...node });
                }
            }
        });

        return compatibleNodes;
    }
}

// Глобальная переменная для доступа
let nodeLibrary = null;

// Инициализация при загрузке
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        nodeLibrary = new NodeLibrary();
        nodeLibrary.init();
        console.log('🚀 NodeLibrary готова к использованию');
    });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeLibrary;
}