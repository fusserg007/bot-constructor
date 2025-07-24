#!/usr/bin/env node

/**
 * Главный файл для запуска всех тестов Bot Constructor
 */

const SystemTester = require('./system-test');
const APITester = require('./api-test');
const MessageProcessingTester = require('./simple-message-test');

class TestRunner {
    constructor() {
        this.results = {
            system: null,
            api: null,
            messageProcessing: null
        };
        this.startTime = Date.now();
    }

    /**
     * Запуск всех тестов
     */
    async runAllTests() {
        console.log('🚀 Запуск полного тестирования Bot Constructor');
        console.log('=' .repeat(60));
        console.log(`📅 Время запуска: ${new Date().toLocaleString()}`);
        console.log('=' .repeat(60));
        console.log();

        try {
            // Проверяем, запущен ли сервер
            await this.checkServerStatus();

            // Запускаем системные тесты
            console.log('🧪 СИСТЕМНЫЕ ТЕСТЫ');
            console.log('-'.repeat(40));
            const systemTester = new SystemTester();
            await systemTester.runAllTests();
            this.results.system = systemTester.testResults;
            console.log();

            // Запускаем тесты обработки сообщений
            console.log('💬 ТЕСТЫ ОБРАБОТКИ СООБЩЕНИЙ');
            console.log('-'.repeat(40));
            const messageTester = new MessageProcessingTester();
            await messageTester.runAllTests();
            this.results.messageProcessing = messageTester.testResults;
            console.log();

            // Запускаем API тесты
            console.log('🌐 API ТЕСТЫ');
            console.log('-'.repeat(40));
            const apiTester = new APITester();
            await apiTester.runAllTests();
            this.results.api = apiTester.testResults;
            console.log();

            // Выводим общие результаты
            this.printOverallResults();

        } catch (error) {
            console.error('❌ Критическая ошибка тестирования:', error);
            process.exit(1);
        }
    }

    /**
     * Проверка статуса сервера
     */
    async checkServerStatus() {
        console.log('🔍 Проверка статуса сервера...');
        
        try {
            const http = require('http');
            
            const checkServer = () => {
                return new Promise((resolve, reject) => {
                    const req = http.request({
                        hostname: 'localhost',
                        port: 3000,
                        path: '/api/health',
                        method: 'GET',
                        timeout: 5000
                    }, (res) => {
                        resolve(res.statusCode === 200);
                    });

                    req.on('error', () => resolve(false));
                    req.on('timeout', () => resolve(false));
                    req.end();
                });
            };

            const isServerRunning = await checkServer();
            
            if (isServerRunning) {
                console.log('✅ Сервер запущен и отвечает');
            } else {
                console.log('⚠️ Сервер не отвечает - некоторые API тесты могут не работать');
                console.log('💡 Запустите сервер командой: npm start');
            }
            console.log();
        } catch (error) {
            console.log('⚠️ Не удалось проверить статус сервера:', error.message);
            console.log();
        }
    }

    /**
     * Вывод общих результатов тестирования
     */
    printOverallResults() {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);

        console.log('=' .repeat(60));
        console.log('📊 ОБЩИЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
        console.log('=' .repeat(60));

        let totalPassed = 0;
        let totalFailed = 0;
        let totalErrors = [];

        // Подсчитываем результаты по всем тестам
        Object.entries(this.results).forEach(([testType, result]) => {
            if (result) {
                totalPassed += result.passed;
                totalFailed += result.failed;
                totalErrors.push(...result.errors.map(error => `[${testType.toUpperCase()}] ${error}`));

                console.log(`${this.getTestTypeIcon(testType)} ${testType.toUpperCase()}:`);
                console.log(`   ✅ Пройдено: ${result.passed}`);
                console.log(`   ❌ Провалено: ${result.failed}`);
                
                if (result.failed === 0) {
                    console.log(`   🎉 Все тесты пройдены!`);
                }
                console.log();
            }
        });

        // Общая статистика
        console.log('📈 ОБЩАЯ СТАТИСТИКА:');
        console.log(`   ✅ Всего пройдено: ${totalPassed}`);
        console.log(`   ❌ Всего провалено: ${totalFailed}`);
        console.log(`   ⏱️ Время выполнения: ${duration}с`);

        const successRate = totalPassed / Math.max(totalPassed + totalFailed, 1) * 100;
        console.log(`   📊 Процент успешности: ${successRate.toFixed(1)}%`);

        // Вывод ошибок
        if (totalErrors.length > 0) {
            console.log('\n🐛 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
            totalErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        // Рекомендации
        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        if (totalFailed === 0) {
            console.log('🎉 Отличная работа! Все тесты пройдены успешно.');
            console.log('✨ Система готова к развертыванию.');
        } else {
            console.log('⚠️ Обнаружены проблемы, требующие исправления:');
            
            if (this.results.system && this.results.system.failed > 0) {
                console.log('   • Проверьте файловую систему и базовые компоненты');
            }
            
            if (this.results.messageProcessing && this.results.messageProcessing.failed > 0) {
                console.log('   • Проверьте логику обработки сообщений');
            }
            
            if (this.results.api && this.results.api.failed > 0) {
                console.log('   • Проверьте API endpoints и авторизацию');
            }
        }

        console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
        console.log('1. Исправьте обнаруженные ошибки');
        console.log('2. Запустите тесты повторно');
        console.log('3. При успешном прохождении - переходите к развертыванию');

        console.log('=' .repeat(60));

        // Устанавливаем код выхода
        if (totalFailed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }

    /**
     * Получение иконки для типа теста
     */
    getTestTypeIcon(testType) {
        const icons = {
            system: '🧪',
            messageProcessing: '💬',
            api: '🌐'
        };
        return icons[testType] || '🔧';
    }
}

// Запуск тестов
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().catch((error) => {
        console.error('💥 Фатальная ошибка:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;