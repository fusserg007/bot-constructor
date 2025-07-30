/**
 * Менеджер процессов - заглушка для совместимости
 */
class ProcessManager {
    constructor() {
        this.processes = new Map();
        this.initialized = false;
    }

    /**
     * Инициализация менеджера процессов
     */
    async initialize() {
        console.log('ProcessManager: Initializing...');
        this.initialized = true;
        return true;
    }

    /**
     * Запустить процесс
     */
    async startProcess(id, config) {
        console.log(`ProcessManager: Starting process ${id}`);
        this.processes.set(id, { id, config, status: 'running' });
        return true;
    }

    /**
     * Остановить процесс
     */
    async stopProcess(id) {
        console.log(`ProcessManager: Stopping process ${id}`);
        this.processes.delete(id);
        return true;
    }

    /**
     * Получить статус процесса
     */
    getProcessStatus(id) {
        const process = this.processes.get(id);
        return process ? process.status : 'stopped';
    }

    /**
     * Получить все процессы
     */
    getAllProcesses() {
        return Array.from(this.processes.values());
    }
}

module.exports = ProcessManager;