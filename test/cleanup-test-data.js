#!/usr/bin/env node

/**
 * Скрипт для очистки тестовых данных
 */

const { FileStorage } = require('../utils/FileStorage');
const fs = require('fs').promises;
const path = require('path');

class TestDataCleaner {
    constructor() {
        this.storage = new FileStorage();
        this.testUserIds = [123456789, 987654321, 999999999]; // ID тестовых пользователей
        this.cleanedItems = {
            users: 0,
            bots: 0,
            logs: 0,
            schemas: 0
        };
    }

    /**
     * Очистка всех тестовых данных
     */
    async cleanupAllTestData() {
        console.log('🧹 Начинаем очистку тестовых данных...\n');

        try {
            await this.cleanupTestUsers();
            await this.cleanupTestBots();
            await this.cleanupTestLogs();
            await this.cleanupTestSchemas();
            await this.cleanupTempFiles();

            this.printCleanupResults();

        } catch (error) {
            console.error('❌ Ошибка очистки тестовых данных:', error);
            throw error;
        }
    }

    /**
     * Очистка тестовых пользователей
     */
    async cleanupTestUsers() {
        console.log('👤 Очистка тестовых пользователей...');

        try {
            const usersDir = path.join(__dirname, '..', 'data', 'users');
            
            // Проверяем существование директории
            try {
                await fs.access(usersDir);
            } catch (error) {
                console.log('ℹ️ Директория пользователей не найдена');
                return;
            }

            const files = await fs.readdir(usersDir);

            for (const file of files) {
                if (file.startsWith('user_') && file.endsWith('.json')) {
                    try {
                        const userPath = path.join(usersDir, file);
                        const userData = await fs.readFile(userPath, 'utf8');
                        const user = JSON.parse(userData);

                        // Проверяем, является ли пользователь тестовым
                        if (this.testUserIds.includes(user.telegramId) || 
                            user.username?.includes('test') ||
                            user.firstName?.includes('Test')) {
                            
                            await fs.unlink(userPath);
                            this.cleanedItems.users++;
                            console.log(`  ✅ Удален тестовый пользователь: ${user.username || user.telegramId}`);
                        }
                    } catch (error) {
                        console.warn(`  ⚠️ Ошибка обработки файла ${file}:`, error.message);
                    }
                }
            }

            console.log(`✅ Очищено ${this.cleanedItems.users} тестовых пользователей\n`);
        } catch (error) {
            console.error('❌ Ошибка очистки пользователей:', error);
        }
    }

    /**
     * Очистка тестовых ботов
     */
    async cleanupTestBots() {
        console.log('🤖 Очистка тестовых ботов...');

        try {
            const botsDir = path.join(__dirname, '..', 'data', 'bots');
            
            // Проверяем существование директории
            try {
                await fs.access(botsDir);
            } catch (error) {
                console.log('ℹ️ Директория ботов не найдена');
                return;
            }

            const files = await fs.readdir(botsDir);

            for (const file of files) {
                if (file.startsWith('bot_') && file.endsWith('.json')) {
                    try {
                        const botPath = path.join(botsDir, file);
                        const botData = await fs.readFile(botPath, 'utf8');
                        const bot = JSON.parse(botData);

                        // Проверяем, является ли бот тестовым
                        if (this.testUserIds.includes(bot.userId) ||
                            bot.name?.toLowerCase().includes('test') ||
                            bot.token?.includes('TEST_TOKEN') ||
                            bot.description?.includes('тест')) {
                            
                            await fs.unlink(botPath);
                            this.cleanedItems.bots++;
                            console.log(`  ✅ Удален тестовый бот: ${bot.name}`);
                        }
                    } catch (error) {
                        console.warn(`  ⚠️ Ошибка обработки файла ${file}:`, error.message);
                    }
                }
            }

            console.log(`✅ Очищено ${this.cleanedItems.bots} тестовых ботов\n`);
        } catch (error) {
            console.error('❌ Ошибка очистки ботов:', error);
        }
    }

    /**
     * Очистка тестовых логов
     */
    async cleanupTestLogs() {
        console.log('📝 Очистка тестовых логов...');

        try {
            const logsDir = path.join(__dirname, '..', 'data', 'logs');
            
            // Проверяем существование директории
            try {
                await fs.access(logsDir);
            } catch (error) {
                console.log('ℹ️ Директория логов не найдена');
                return;
            }

            const files = await fs.readdir(logsDir);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const logPath = path.join(logsDir, file);
                        
                        // Удаляем логи тестовых ботов
                        if (file.includes('test') || 
                            file.includes('TEST') ||
                            file.startsWith('system_')) {
                            
                            await fs.unlink(logPath);
                            this.cleanedItems.logs++;
                            console.log(`  ✅ Удален лог файл: ${file}`);
                        }
                    } catch (error) {
                        console.warn(`  ⚠️ Ошибка обработки лог файла ${file}:`, error.message);
                    }
                }
            }

            console.log(`✅ Очищено ${this.cleanedItems.logs} лог файлов\n`);
        } catch (error) {
            console.error('❌ Ошибка очистки логов:', error);
        }
    }

    /**
     * Очистка тестовых схем
     */
    async cleanupTestSchemas() {
        console.log('🎨 Очистка тестовых визуальных схем...');

        try {
            const schemasDir = path.join(__dirname, '..', 'data', 'visual_schemas');
            
            // Проверяем существование директории
            try {
                await fs.access(schemasDir);
            } catch (error) {
                console.log('ℹ️ Директория схем не найдена');
                return;
            }

            const files = await fs.readdir(schemasDir);

            for (const file of files) {
                if (file.startsWith('schema_') && file.endsWith('.json')) {
                    try {
                        const schemaPath = path.join(schemasDir, file);
                        
                        // Удаляем тестовые схемы
                        if (file.includes('test') || file.includes('TEST')) {
                            await fs.unlink(schemaPath);
                            this.cleanedItems.schemas++;
                            console.log(`  ✅ Удалена тестовая схема: ${file}`);
                        }
                    } catch (error) {
                        console.warn(`  ⚠️ Ошибка обработки схемы ${file}:`, error.message);
                    }
                }
            }

            console.log(`✅ Очищено ${this.cleanedItems.schemas} тестовых схем\n`);
        } catch (error) {
            console.error('❌ Ошибка очистки схем:', error);
        }
    }

    /**
     * Очистка временных файлов
     */
    async cleanupTempFiles() {
        console.log('🗂️ Очистка временных файлов...');

        try {
            const tempPatterns = [
                path.join(__dirname, '..', 'data', '**', '*.tmp'),
                path.join(__dirname, '..', 'data', '**', '*.temp'),
                path.join(__dirname, '..', 'data', '**', '.DS_Store'),
                path.join(__dirname, '..', 'data', '**', 'Thumbs.db')
            ];

            // Простая очистка без glob для совместимости
            const dataDir = path.join(__dirname, '..', 'data');
            await this.cleanupTempFilesRecursive(dataDir);

            console.log('✅ Временные файлы очищены\n');
        } catch (error) {
            console.error('❌ Ошибка очистки временных файлов:', error);
        }
    }

    /**
     * Рекурсивная очистка временных файлов
     */
    async cleanupTempFilesRecursive(dir) {
        try {
            const items = await fs.readdir(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                if (item.isDirectory()) {
                    await this.cleanupTempFilesRecursive(fullPath);
                } else if (item.isFile()) {
                    // Удаляем временные файлы
                    if (item.name.endsWith('.tmp') || 
                        item.name.endsWith('.temp') ||
                        item.name === '.DS_Store' ||
                        item.name === 'Thumbs.db') {
                        
                        await fs.unlink(fullPath);
                        console.log(`  ✅ Удален временный файл: ${item.name}`);
                    }
                }
            }
        } catch (error) {
            // Игнорируем ошибки доступа к директориям
        }
    }

    /**
     * Вывод результатов очистки
     */
    printCleanupResults() {
        console.log('=' .repeat(50));
        console.log('📊 РЕЗУЛЬТАТЫ ОЧИСТКИ');
        console.log('=' .repeat(50));

        console.log(`👤 Пользователи: ${this.cleanedItems.users}`);
        console.log(`🤖 Боты: ${this.cleanedItems.bots}`);
        console.log(`📝 Логи: ${this.cleanedItems.logs}`);
        console.log(`🎨 Схемы: ${this.cleanedItems.schemas}`);

        const totalCleaned = Object.values(this.cleanedItems).reduce((sum, count) => sum + count, 0);
        console.log(`📈 Всего очищено: ${totalCleaned} элементов`);

        if (totalCleaned > 0) {
            console.log('\n🎉 Очистка завершена успешно!');
            console.log('💡 Система готова к новому тестированию');
        } else {
            console.log('\nℹ️ Тестовые данные не найдены или уже очищены');
        }

        console.log('=' .repeat(50));
    }

    /**
     * Интерактивная очистка с подтверждением
     */
    async interactiveCleanup() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('⚠️ Вы уверены, что хотите удалить все тестовые данные? (y/N): ', (answer) => {
                rl.close();
                
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    resolve(true);
                } else {
                    console.log('❌ Очистка отменена');
                    resolve(false);
                }
            });
        });
    }
}

// Запуск очистки
if (require.main === module) {
    const cleaner = new TestDataCleaner();
    
    // Проверяем аргументы командной строки
    const args = process.argv.slice(2);
    const forceCleanup = args.includes('--force') || args.includes('-f');

    if (forceCleanup) {
        // Принудительная очистка без подтверждения
        cleaner.cleanupAllTestData().catch((error) => {
            console.error('💥 Ошибка очистки:', error);
            process.exit(1);
        });
    } else {
        // Интерактивная очистка с подтверждением
        cleaner.interactiveCleanup().then((confirmed) => {
            if (confirmed) {
                return cleaner.cleanupAllTestData();
            }
        }).catch((error) => {
            console.error('💥 Ошибка очистки:', error);
            process.exit(1);
        });
    }
}

module.exports = TestDataCleaner;