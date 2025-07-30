/**
 * Менеджер инициализации BotConstructor
 * Обеспечивает надежную инициализацию с отладкой и fallback механизмами
 */
class BotConstructorManager {
    constructor() {
        this.initAttempts = 0;
        this.maxAttempts = 5;
        this.retryDelay = 1000;
        this.isInitialized = false;
        this.initPromise = null;
        
        // Логирование
        this.logger = window.editorDebugger || console;
        
        this.logger.info?.('BotConstructorManager создан') || console.log('🔧 BotConstructorManager создан');
    }
    
    /**
     * Основной метод инициализации
     */
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this._performInitialization();
        return this.initPromise;
    }
    
    async _performInitialization() {
        this.logger.info?.('Начало инициализации BotConstructor') || console.log('🚀 Начало инициализации BotConstructor');
        
        while (this.initAttempts < this.maxAttempts && !this.isInitialized) {
            this.initAttempts++;
            
            try {
                this.logger.info?.(`Попытка инициализации #${this.initAttempts}`) || console.log(`🔄 Попытка инициализации #${this.initAttempts}`);
                
                // Проверяем готовность DOM
                await this._waitForDOM();
                
                // Проверяем зависимости
                this._checkDependencies();
                
                // Создаем экземпляр BotConstructor
                await this._createBotConstructor();
                
                // Проверяем успешность инициализации
                await this._validateInitialization();
                
                this.isInitialized = true;
                this.logger.success?.('BotConstructor успешно инициализирован') || console.log('✅ BotConstructor успешно инициализирован');
                
                return window.botConstructor;
                
            } catch (error) {
                this.logger.error?.(`Ошибка инициализации (попытка ${this.initAttempts})`, error) || console.error(`❌ Ошибка инициализации (попытка ${this.initAttempts}):`, error);
                
                if (this.initAttempts < this.maxAttempts) {
                    this.logger.warn?.(`Повторная попытка через ${this.retryDelay}ms`) || console.warn(`⏳ Повторная попытка через ${this.retryDelay}ms`);
                    await this._delay(this.retryDelay);
                    this.retryDelay *= 1.5; // Увеличиваем задержку
                } else {
                    this.logger.error?.('Все попытки инициализации исчерпаны') || console.error('💥 Все попытки инициализации исчерпаны');
                    this._showFallbackInterface(error);
                    throw error;
                }
            }
        }
    }
    
    /**
     * Ожидание готовности DOM
     */
    async _waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Проверка зависимостей
     */
    _checkDependencies() {
        const dependencies = {
            'BotConstructor': typeof BotConstructor !== 'undefined',
            'document.body': !!document.body,
            'fetch': typeof fetch !== 'undefined'
        };
        
        const missing = Object.entries(dependencies)
            .filter(([name, available]) => !available)
            .map(([name]) => name);
        
        if (missing.length > 0) {
            throw new Error(`Отсутствуют зависимости: ${missing.join(', ')}`);
        }
        
        this.logger.debug?.('Все зависимости доступны', dependencies) || console.log('✅ Все зависимости доступны');
    }
    
    /**
     * Создание экземпляра BotConstructor
     */
    async _createBotConstructor() {
        this.logger.info?.('Создание экземпляра BotConstructor') || console.log('🏗️ Создание экземпляра BotConstructor');
        
        // Очищаем предыдущий экземпляр если есть
        if (window.botConstructor) {
            this.logger.warn?.('Найден предыдущий экземпляр, очищаем') || console.warn('⚠️ Найден предыдущий экземпляр, очищаем');
            delete window.botConstructor;
        }
        
        // Создаем новый экземпляр
        window.botConstructor = new BotConstructor();
        
        // Даем время на инициализацию
        await this._delay(100);
    }
    
    /**
     * Валидация успешности инициализации
     */
    async _validateInitialization() {
        const validations = [
            {
                name: 'window.botConstructor существует',
                check: () => !!window.botConstructor
            },
            {
                name: 'BotConstructor имеет метод showView',
                check: () => typeof window.botConstructor.showView === 'function'
            },
            {
                name: 'BotConstructor имеет метод loadDashboardData',
                check: () => typeof window.botConstructor.loadDashboardData === 'function'
            },
            {
                name: 'backToDashboard функция доступна',
                check: () => typeof window.backToDashboard === 'function'
            },
            {
                name: 'dashboard-view элемент существует',
                check: () => !!document.getElementById('dashboard-view')
            },
            {
                name: 'constructor-view элемент существует',
                check: () => !!document.getElementById('constructor-view')
            }
        ];
        
        const failed = [];
        
        for (const validation of validations) {
            try {
                if (!validation.check()) {
                    failed.push(validation.name);
                }
            } catch (error) {
                failed.push(`${validation.name} (ошибка: ${error.message})`);
            }
        }
        
        if (failed.length > 0) {
            const errorMsg = `Валидация не пройдена: ${failed.join(', ')}`;
            this.logger.error?.(errorMsg) || console.error('❌ ' + errorMsg);
            throw new Error(errorMsg);
        }
        
        this.logger.success?.('Валидация пройдена успешно') || console.log('✅ Валидация пройдена успешно');
    }
    
    /**
     * Показ fallback интерфейса при критической ошибке
     */
    _showFallbackInterface(error) {
        this.logger.error?.('Показ fallback интерфейса', error) || console.error('🆘 Показ fallback интерфейса:', error);
        
        // Создаем минимальный интерфейс
        const fallbackHTML = `
            <div id="fallback-interface" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #f8f9fa;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    max-width: 500px;
                    text-align: center;
                ">
                    <h2 style="color: #dc3545; margin-bottom: 1rem;">⚠️ Ошибка инициализации</h2>
                    <p style="margin-bottom: 1rem; color: #666;">
                        Не удалось инициализировать Bot Constructor после ${this.initAttempts} попыток.
                    </p>
                    <details style="margin-bottom: 1rem; text-align: left;">
                        <summary style="cursor: pointer; color: #007bff;">Подробности ошибки</summary>
                        <pre style="
                            background: #f8f9fa;
                            padding: 1rem;
                            border-radius: 4px;
                            margin-top: 0.5rem;
                            font-size: 12px;
                            overflow: auto;
                        ">${error.message}

${error.stack || ''}</pre>
                    </details>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="location.reload()" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 4px;
                            cursor: pointer;
                        ">🔄 Перезагрузить страницу</button>
                        <button onclick="window.botConstructorManager.initialize()" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 4px;
                            cursor: pointer;
                        ">🔁 Повторить инициализацию</button>
                    </div>
                    <div style="margin-top: 1rem; font-size: 12px; color: #999;">
                        Если проблема повторяется, обратитесь к разработчику
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', fallbackHTML);
    }
    
    /**
     * Утилита задержки
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Получение статуса инициализации
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            attempts: this.initAttempts,
            maxAttempts: this.maxAttempts,
            botConstructorExists: !!window.botConstructor,
            backToDashboardExists: !!window.backToDashboard
        };
    }
    
    /**
     * Принудительная переинициализация
     */
    async reinitialize() {
        this.logger.warn?.('Принудительная переинициализация') || console.warn('🔄 Принудительная переинициализация');
        
        this.isInitialized = false;
        this.initAttempts = 0;
        this.initPromise = null;
        this.retryDelay = 1000;
        
        // Удаляем fallback интерфейс если есть
        const fallback = document.getElementById('fallback-interface');
        if (fallback) {
            fallback.remove();
        }
        
        return this.initialize();
    }
}

// Создаем глобальный экземпляр менеджера
window.botConstructorManager = new BotConstructorManager();

// Автоинициализация отключена - инициализация происходит вручную из index.html

// Экспорт для использования в других модулях
window.BotConstructorManager = BotConstructorManager;