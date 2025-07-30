const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', 'data', 'logs');
        this.ensureLogsDirectory();
    }

    async ensureLogsDirectory() {
        try {
            await fs.access(this.logsDir);
        } catch (error) {
            await fs.mkdir(this.logsDir, { recursive: true });
        }
    }

    /**
     * Записывает событие в лог бота
     * @param {string} botId - ID бота
     * @param {string} level - Уровень лога (info, warn, error)
     * @param {string} message - Сообщение
     * @param {Object} data - Дополнительные данные
     */
    async logBotEvent(botId, level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        const logFile = path.join(this.logsDir, `bot_${botId}.log`);
        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error('Ошибка записи в лог:', error);
        }
    }

    /**
     * Записывает системное событие
     */
    async logSystemEvent(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        const logFile = path.join(this.logsDir, 'system.log');
        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error('Ошибка записи в системный лог:', error);
        }
    }

    /**
     * Получает логи бота
     */
    async getBotLogs(botId, startDate, endDate, eventType = null) {
        const logFile = path.join(this.logsDir, `bot_${botId}.log`);
        
        try {
            const data = await fs.readFile(logFile, 'utf8');
            const lines = data.trim().split('\n').filter(line => line);
            
            let logs = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    return null;
                }
            }).filter(log => log !== null);

            // Фильтрация по дате
            if (startDate) {
                logs = logs.filter(log => new Date(log.timestamp) >= startDate);
            }
            if (endDate) {
                logs = logs.filter(log => new Date(log.timestamp) <= endDate);
            }

            // Фильтрация по типу события
            if (eventType) {
                logs = logs.filter(log => log.level === eventType);
            }

            return logs;
        } catch (error) {
            return [];
        }
    }

    /**
     * Получает статистику бота
     */
    async getBotStats(botId, startDate, endDate) {
        const logs = await this.getBotLogs(botId, startDate, endDate);
        
        const stats = {
            totalEvents: logs.length,
            messagesProcessed: logs.filter(log => log.message.includes('message')).length,
            errorsCount: logs.filter(log => log.level === 'error').length,
            warningsCount: logs.filter(log => log.level === 'warn').length,
            activeUsers: new Set(logs.map(log => log.data?.userId).filter(id => id)).size,
            lastActivity: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        };

        return stats;
    }

    /**
     * Очищает старые логи
     */
    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const files = await fs.readdir(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            for (const file of files) {
                const filePath = path.join(this.logsDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    console.log(`Удален старый лог файл: ${file}`);
                }
            }
        } catch (error) {
            console.error('Ошибка очистки логов:', error);
        }
    }

    // Удобные методы для разных уровней логирования
    info(botId, message, data) {
        return this.logBotEvent(botId, 'info', message, data);
    }

    warn(botId, message, data) {
        return this.logBotEvent(botId, 'warn', message, data);
    }

    error(botId, message, data) {
        return this.logBotEvent(botId, 'error', message, data);
    }

    // Системные логи
    systemInfo(message, data) {
        return this.logSystemEvent('info', message, data);
    }

    systemWarn(message, data) {
        return this.logSystemEvent('warn', message, data);
    }

    systemError(message, data) {
        return this.logSystemEvent('error', message, data);
    }
}

module.exports = Logger;