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
     * @param {string} eventType - Тип события (message, command, error, etc.)
     * @param {Object} data - Данные события
     */
    async logBotEvent(botId, eventType, data = {}) {
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        const monthKey = this.getMonthKey(timestamp);
        const logFile = path.join(this.logsDir, `${botId}_${monthKey}.json`);

        const logEntry = {
            timestamp: timestamp.toISOString(),
            eventType,
            data: { ...data },
            botId
        };

        // Удаляем timestamp из data, чтобы не дублировать
        if (logEntry.data.timestamp) {
            delete logEntry.data.timestamp;
        }

        try {
            // Читаем существующие логи или создаем новый массив
            let logs = [];
            try {
                const existingData = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(existingData);
            } catch (error) {
                // Файл не существует, создаем новый
                logs = [];
            }

            // Добавляем новую запись
            logs.push(logEntry);

            // Ограничиваем размер лога (максимум 10000 записей на месяц)
            if (logs.length > 10000) {
                logs = logs.slice(-10000);
            }

            // Записываем обратно в файл
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    /**
     * Получает логи бота за определенный период
     * @param {string} botId - ID бота
     * @param {Date} startDate - Начальная дата
     * @param {Date} endDate - Конечная дата
     * @param {string} eventType - Фильтр по типу события (опционально)
     * @returns {Array} Массив логов
     */
    async getBotLogs(botId, startDate, endDate, eventType = null) {
        const logs = [];
        const months = this.getMonthsBetween(startDate, endDate);

        for (const monthKey of months) {
            const logFile = path.join(this.logsDir, `${botId}_${monthKey}.json`);
            
            try {
                const data = await fs.readFile(logFile, 'utf8');
                const monthLogs = JSON.parse(data);
                
                // Фильтруем по дате и типу события
                const filteredLogs = monthLogs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    const inDateRange = logDate >= startDate && logDate <= endDate;
                    const matchesEventType = !eventType || log.eventType === eventType;
                    return inDateRange && matchesEventType;
                });

                logs.push(...filteredLogs);
            } catch (error) {
                // Файл не существует для этого месяца, пропускаем
                continue;
            }
        }

        return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Получает статистику бота
     * @param {string} botId - ID бота
     * @param {Date} startDate - Начальная дата
     * @param {Date} endDate - Конечная дата
     * @returns {Object} Объект со статистикой
     */
    async getBotStats(botId, startDate, endDate) {
        const logs = await this.getBotLogs(botId, startDate, endDate);
        
        const stats = {
            totalEvents: logs.length,
            messagesProcessed: 0,
            commandsExecuted: 0,
            errorsCount: 0,
            activeUsers: new Set(),
            eventsByType: {},
            dailyActivity: {},
            hourlyActivity: Array(24).fill(0)
        };

        logs.forEach(log => {
            // Подсчет по типам событий
            stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;

            // Специфичные подсчеты
            if (log.eventType === 'message') {
                stats.messagesProcessed++;
                if (log.data && log.data.userId) {
                    stats.activeUsers.add(log.data.userId.toString());
                }
            } else if (log.eventType === 'command') {
                stats.commandsExecuted++;
                if (log.data && log.data.userId) {
                    stats.activeUsers.add(log.data.userId.toString());
                }
            } else if (log.eventType === 'action') {
                if (log.data && log.data.userId) {
                    stats.activeUsers.add(log.data.userId.toString());
                }
            } else if (log.eventType === 'error') {
                stats.errorsCount++;
            }

            // Активность по дням
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;

            // Активность по часам
            const hour = new Date(log.timestamp).getHours();
            stats.hourlyActivity[hour]++;
        });

        stats.activeUsers = stats.activeUsers.size;
        
        return stats;
    }

    /**
     * Логирует сообщение от пользователя
     */
    async logMessage(botId, userId, messageText, messageType = 'text') {
        await this.logBotEvent(botId, 'message', {
            userId,
            messageText: messageText?.substring(0, 200), // Ограничиваем длину
            messageType
        });
    }

    /**
     * Логирует выполнение команды
     */
    async logCommand(botId, userId, command, args = []) {
        await this.logBotEvent(botId, 'command', {
            userId,
            command,
            args
        });
    }

    /**
     * Логирует ошибку
     */
    async logError(botId, error, context = {}) {
        await this.logBotEvent(botId, 'error', {
            error: error.message,
            stack: error.stack,
            context
        });
    }

    /**
     * Логирует действие бота
     */
    async logAction(botId, actionType, data = {}) {
        await this.logBotEvent(botId, 'action', {
            actionType,
            ...data
        });
    }

    /**
     * Логирует системное событие
     */
    async logSystemEvent(eventType, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType: 'system_' + eventType,
            data
        };

        try {
            const monthKey = this.getMonthKey(new Date());
            const logFile = path.join(this.logsDir, `system_${monthKey}.json`);
            
            let logs = [];
            try {
                const data = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(data);
            } catch (error) {
                // Файл не существует, создаем новый массив
            }

            logs.push(logEntry);
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error logging system event:', error);
        }
    }

    /**
     * Получает ключ месяца в формате YYYY-MM
     */
    getMonthKey(date) {
        return date.toISOString().substring(0, 7);
    }

    /**
     * Получает список месяцев между двумя датами
     */
    getMonthsBetween(startDate, endDate) {
        const months = new Set();
        
        // Добавляем месяц начальной даты
        months.add(this.getMonthKey(startDate));
        
        // Добавляем месяц конечной даты
        months.add(this.getMonthKey(endDate));
        
        // Добавляем все месяцы между ними
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (current <= end) {
            months.add(this.getMonthKey(current));
            current.setMonth(current.getMonth() + 1);
        }

        return Array.from(months).sort();
    }

    /**
     * Очищает старые логи (старше указанного количества месяцев)
     */
    async cleanupOldLogs(monthsToKeep = 12) {
        try {
            const files = await fs.readdir(this.logsDir);
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
            const cutoffKey = this.getMonthKey(cutoffDate);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const monthKey = file.split('_').pop().replace('.json', '');
                    if (monthKey < cutoffKey) {
                        await fs.unlink(path.join(this.logsDir, file));
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up old logs:', error);
        }
    }
}

module.exports = Logger;