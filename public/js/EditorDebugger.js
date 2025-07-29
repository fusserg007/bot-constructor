/**
 * Система отладки для визуального редактора
 * Обеспечивает детальное логирование и диагностику
 */
class EditorDebugger {
    constructor() {
        this.logs = [];
        this.isEnabled = true;
        this.maxLogs = 1000;
        this.logLevels = {
            ERROR: { color: '#c62828', icon: '❌' },
            WARN: { color: '#ef6c00', icon: '⚠️' },
            INFO: { color: '#1976d2', icon: 'ℹ️' },
            SUCCESS: { color: '#2e7d32', icon: '✅' },
            DEBUG: { color: '#7b1fa2', icon: '🔍' }
        };
        
        this.stats = {
            nodesRendered: 0,
            connectionsCreated: 0,
            errorsCount: 0,
            renderTime: 0
        };
        
        console.log('🔍 EditorDebugger инициализирован');
    }
    
    log(message, level = 'INFO', data = null) {
        if (!this.isEnabled) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            level,
            data,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(logEntry);
        
        // Ограничиваем количество логов
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Обновляем статистику
        if (level === 'ERROR') this.stats.errorsCount++;
        
        // Выводим в консоль
        const style = this.logLevels[level];
        console.log(`${style.icon} [${timestamp}] ${message}`, data || '');
    }
    
    error(message, error = null) {
        this.log(message, 'ERROR', error);
    }
    
    warn(message, data = null) {
        this.log(message, 'WARN', data);
    }
    
    info(message, data = null) {
        this.log(message, 'INFO', data);
    }
    
    success(message, data = null) {
        this.log(message, 'SUCCESS', data);
    }
    
    debug(message, data = null) {
        this.log(message, 'DEBUG', data);
    }
    
    // Специальные методы для редактора
    logNodeRender(nodeId, nodeType, success = true) {
        if (success) {
            this.stats.nodesRendered++;
            this.success(`Узел отрендерен: ${nodeType} (${nodeId})`);
        } else {
            this.error(`Ошибка рендеринга узла: ${nodeType} (${nodeId})`);
        }
    }
    
    logConnection(fromNode, toNode, success = true) {
        if (success) {
            this.stats.connectionsCreated++;
            this.success(`Связь создана: ${fromNode} → ${toNode}`);
        } else {
            this.error(`Ошибка создания связи: ${fromNode} → ${toNode}`);
        }
    }
    
    logSchemaLoad(schema, success = true) {
        if (success) {
            const nodeCount = schema.nodes ? schema.nodes.length : 0;
            this.success(`Схема загружена: ${nodeCount} узлов`, schema);
        } else {
            this.error('Ошибка загрузки схемы', schema);
        }
    }
    
    startTimer(operation) {
        this.timers = this.timers || {};
        this.timers[operation] = performance.now();
        this.debug(`Начало операции: ${operation}`);
    }
    
    endTimer(operation) {
        if (!this.timers || !this.timers[operation]) return;
        
        const duration = performance.now() - this.timers[operation];
        this.info(`Операция завершена: ${operation} (${duration.toFixed(2)}ms)`);
        
        if (operation === 'render') {
            this.stats.renderTime = duration;
        }
        
        delete this.timers[operation];
    }
    
    clear() {
        this.logs = [];
        this.stats = {
            nodesRendered: 0,
            connectionsCreated: 0,
            errorsCount: 0,
            renderTime: 0
        };
        this.info('Логи очищены');
    }
    
    export() {
        const data = {
            timestamp: new Date().toISOString(),
            logs: this.logs,
            stats: this.stats,
            system: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                botConstructor: !!window.botConstructor,
                backToDashboard: !!window.backToDashboard
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `editor-debug-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.success('Диагностические данные экспортированы');
    }
}

// Создаем глобальный экземпляр отладчика
window.editorDebugger = new EditorDebugger();

// Перехватываем ошибки
window.addEventListener('error', (event) => {
    window.editorDebugger.error(`Глобальная ошибка: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

// Логируем загрузку
window.editorDebugger.success('EditorDebugger инициализирован');