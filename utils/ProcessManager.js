const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class ProcessManager {
    constructor() {
        this.pidFile = path.join(process.cwd(), 'bot-constructor.pid');
        this.logFile = path.join(process.cwd(), 'logs', 'process.log');
    }

    /**
     * Записывает PID текущего процесса в файл
     */
    writePID() {
        try {
            fs.writeFileSync(this.pidFile, process.pid.toString());
            this.log(`PID записан: ${process.pid}`);
            return true;
        } catch (error) {
            this.log(`Ошибка записи PID: ${error.message}`);
            return false;
        }
    }

    /**
     * Читает PID из файла
     */
    readPID() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                return parseInt(pid);
            }
            return null;
        } catch (error) {
            this.log(`Ошибка чтения PID: ${error.message}`);
            return null;
        }
    }

    /**
     * Проверяет, запущен ли процесс с указанным PID
     */
    isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Завершает процесс по PID
     */
    killProcess(pid) {
        return new Promise((resolve) => {
            if (!this.isProcessRunning(pid)) {
                this.log(`Процесс ${pid} уже не запущен`);
                resolve(true);
                return;
            }

            try {
                // Сначала пытаемся мягко завершить
                process.kill(pid, 'SIGTERM');
                
                // Ждем 3 секунды
                setTimeout(() => {
                    if (this.isProcessRunning(pid)) {
                        // Если процесс все еще запущен, принудительно завершаем
                        try {
                            process.kill(pid, 'SIGKILL');
                            this.log(`Процесс ${pid} принудительно завершен`);
                        } catch (error) {
                            this.log(`Ошибка принудительного завершения процесса ${pid}: ${error.message}`);
                        }
                    } else {
                        this.log(`Процесс ${pid} корректно завершен`);
                    }
                    resolve(true);
                }, 3000);
            } catch (error) {
                this.log(`Ошибка завершения процесса ${pid}: ${error.message}`);
                resolve(false);
            }
        });
    }

    /**
     * Удаляет PID файл
     */
    removePIDFile() {
        try {
            if (fs.existsSync(this.pidFile)) {
                fs.unlinkSync(this.pidFile);
                this.log('PID файл удален');
            }
            return true;
        } catch (error) {
            this.log(`Ошибка удаления PID файла: ${error.message}`);
            return false;
        }
    }

    /**
     * Завершает предыдущий экземпляр приложения
     */
    async stopPreviousInstance() {
        const oldPID = this.readPID();
        
        if (oldPID) {
            this.log(`Найден предыдущий экземпляр с PID: ${oldPID}`);
            
            if (this.isProcessRunning(oldPID)) {
                this.log(`Завершаем процесс ${oldPID}...`);
                await this.killProcess(oldPID);
            } else {
                this.log(`Процесс ${oldPID} уже не запущен`);
            }
        } else {
            this.log('Предыдущий экземпляр не найден');
        }

        this.removePIDFile();
    }

    /**
     * Инициализирует процесс-менеджер для текущего приложения
     */
    async initialize() {
        // Создаем директорию для логов если её нет
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        this.log('=== Инициализация Process Manager ===');
        
        // Завершаем предыдущий экземпляр
        await this.stopPreviousInstance();
        
        // Записываем PID текущего процесса
        this.writePID();
        
        // Устанавливаем обработчики для корректного завершения
        this.setupExitHandlers();
        
        this.log(`Приложение запущено с PID: ${process.pid}`);
    }

    /**
     * Устанавливает обработчики для корректного завершения приложения
     */
    setupExitHandlers() {
        const cleanup = () => {
            this.log('Выполняется корректное завершение приложения...');
            this.removePIDFile();
        };

        // Обработчики различных сигналов завершения
        process.on('exit', cleanup);
        process.on('SIGINT', () => {
            this.log('Получен сигнал SIGINT (Ctrl+C)');
            cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            this.log('Получен сигнал SIGTERM');
            cleanup();
            process.exit(0);
        });
        process.on('uncaughtException', (error) => {
            this.log(`Необработанная ошибка: ${error.message}`);
            cleanup();
            process.exit(1);
        });
    }

    /**
     * Записывает сообщение в лог
     */
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logMessage);
        } catch (error) {
            console.error('Ошибка записи в лог:', error.message);
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    /**
     * Проверяет статус приложения
     */
    getStatus() {
        const pid = this.readPID();
        
        if (!pid) {
            return {
                running: false,
                message: 'Приложение не запущено'
            };
        }

        const isRunning = this.isProcessRunning(pid);
        
        return {
            running: isRunning,
            pid: pid,
            message: isRunning ? `Приложение запущено (PID: ${pid})` : 'PID файл найден, но процесс не запущен'
        };
    }
}

module.exports = ProcessManager;