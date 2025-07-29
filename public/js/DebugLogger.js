/**
 * Система логирования для отладки визуального редактора
 */
class DebugLogger {
    constructor() {
        this.logs = [];
        this.isEnabled = true;
        this.logLevel = 'debug'; // debug, info, warn, error
        this.maxLogs = 1000;
        this.categories = new Set();
        this.listeners = new Set();
        
        // Уровни логирования по приоритету
        this.levels = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3
        };
        
        console.log('🔧 DebugLogger инициализирован');
    }
    
    /**
     * Записывает лог с указанным уровнем и категорией
     */
    log(level, category, message, data = null) {
        if (!this.isEnabled) return;
        
        // Проверяем уровень логирования
        if (this.levels[level] < this.levels[this.logLevel]) return;
        
        const logEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            level: level,
            category: category,
            message: message,
            data: data,
            stackTrace: level === 'error' ? new Error().stack : null
        };
        
        // Добавляем в массив логов
        this.logs.push(logEntry);
        this.categories.add(category);
        
        // Ограничиваем количество логов
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Выводим в консоль браузера
        this.outputToConsole(logEntry);
        
        // Уведомляем слушателей
        this.notifyListeners(logEntry);
        
        return logEntry.id;
    }
    
    /**
     * Удобные методы для разных уровней
     */
    debug(category, message, data = null) {
        return this.log('debug', category, message, data);
    }
    
    info(category, message, data = null) {
        return this.log('info', category, message, data);
    }
    
    warn(category, message, data = null) {
        return this.log('warn', category, message, data);
    }
    
    error(category, message, data = null) {
        return this.log('error', category, message, data);
    }
    
    /**
     * Возвращает отфильтрованные логи
     */
    getLogs(filter = null) {
        let filteredLogs = [...this.logs];
        
        if (filter) {
            if (filter.level) {
                filteredLogs = filteredLogs.filter(log => log.level === filter.level);
            }
            if (filter.category) {
                filteredLogs = filteredLogs.filter(log => log.category === filter.category);
            }
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                filteredLogs = filteredLogs.filter(log => 
                    log.message.toLowerCase().includes(searchLower) ||
                    log.category.toLowerCase().includes(searchLower)
                );
            }
            if (filter.since) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since);
            }
        }
        
        return filteredLogs;
    }
    
    /**
     * Экспортирует логи в JSON
     */
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            totalLogs: this.logs.length,
            categories: Array.from(this.categories),
            systemInfo: this.getSystemInfo(),
            logs: this.logs
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Очищает все логи
     */
    clear() {
        const clearedCount = this.logs.length;
        this.logs = [];
        this.categories.clear();
        
        this.info('system', `Логи очищены (удалено ${clearedCount} записей)`);
        return clearedCount;
    }
    
    /**
     * Добавляет слушателя для новых логов
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    /**
     * Удаляет слушателя
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * Устанавливает уровень логирования
     */
    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
            this.info('system', `Уровень логирования изменен на: ${level}`);
        } else {
            this.warn('system', `Неизвестный уровень логирования: ${level}`);
        }
    }
    
    /**
     * Включает/выключает логирование
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`🔧 DebugLogger ${enabled ? 'включен' : 'выключен'}`);
    }
    
    /**
     * Возвращает статистику логов
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            byCategory: {},
            timeRange: null
        };
        
        // Статистика по уровням
        for (const level of Object.keys(this.levels)) {
            stats.byLevel[level] = this.logs.filter(log => log.level === level).length;
        }
        
        // Статистика по категориям
        for (const category of this.categories) {
            stats.byCategory[category] = this.logs.filter(log => log.category === category).length;
        }
        
        // Временной диапазон
        if (this.logs.length > 0) {
            stats.timeRange = {
                start: this.logs[0].timestamp,
                end: this.logs[this.logs.length - 1].timestamp
            };
        }
        
        return stats;
    }
    
    // === ПРИВАТНЫЕ МЕТОДЫ ===
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    outputToConsole(logEntry) {
        const timestamp = logEntry.timestamp.toLocaleTimeString();
        const prefix = `[${timestamp}] [${logEntry.category}]`;
        
        switch (logEntry.level) {
            case 'debug':
                console.debug(`🔍 ${prefix}`, logEntry.message, logEntry.data);
                break;
            case 'info':
                console.info(`ℹ️ ${prefix}`, logEntry.message, logEntry.data);
                break;
            case 'warn':
                console.warn(`⚠️ ${prefix}`, logEntry.message, logEntry.data);
                break;
            case 'error':
                console.error(`❌ ${prefix}`, logEntry.message, logEntry.data);
                if (logEntry.stackTrace) {
                    console.error('Stack trace:', logEntry.stackTrace);
                }
                break;
        }
    }
    
    notifyListeners(logEntry) {
        for (const listener of this.listeners) {
            try {
                listener(logEntry);
            } catch (error) {
                console.error('Ошибка в слушателе логов:', error);
            }
        }
    }
    
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height
            }
        };
    }
}

// Создаем глобальный экземпляр
if (typeof window !== 'undefined') {
    window.debugLogger = new DebugLogger();
    
    // Перехватываем глобальные ошибки
    window.addEventListener('error', (event) => {
        window.debugLogger.error('global', 'Глобальная ошибка JavaScript', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
    });
    
    // Перехватываем необработанные промисы
    window.addEventListener('unhandledrejection', (event) => {
        window.debugLogger.error('global', 'Необработанное отклонение промиса', {
            reason: event.reason,
            promise: event.promise
        });
    });
}

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugLogger;
}