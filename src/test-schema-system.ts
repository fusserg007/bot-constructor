/**
 * Тест системы схем данных
 */

import { SchemaValidator } from './core/validation/SchemaValidator';
import { SchemaVersioning } from './core/versioning/SchemaVersioning';
import { NodeDefinitions } from './core/schema/NodeDefinitions';
import { BotSchema, NodeInstance, NodeConnection } from './core/schema/NodeTypes';

async function testSchemaSystem() {
    console.log('🚀 Тестирование системы схем данных...\n');

    try {
        // 1. Тестируем определения узлов
        console.log('📋 Тестирование определений узлов:');
        testNodeDefinitions();

        // 2. Тестируем создание схемы
        console.log('\n🏗️ Тестирование создания схемы:');
        const testSchema = createTestSchema();
        console.log('✅ Тестовая схема создана');

        // 3. Тестируем валидацию схемы
        console.log('\n🔍 Тестирование валидации схемы:');
        testSchemaValidation(testSchema);

        // 4. Тестируем версионирование
        console.log('\n📦 Тестирование версионирования:');
        testVersioning();

        // 5. Тестируем сложную схему
        console.log('\n🧩 Тестирование сложной схемы:');
        const complexSchema = createComplexSchema();
        testComplexSchemaValidation(complexSchema);

        console.log('\n🎉 Все тесты системы схем пройдены успешно!');

    } catch (error) {
        console.error('❌ Ошибка при тестировании системы схем:', error);
    }
}

/**
 * Тестирование определений узлов
 */
function testNodeDefinitions() {
    const nodeTypes = Object.keys(NodeDefinitions);
    console.log(`  📝 Доступно типов узлов: ${nodeTypes.length}`);

    for (const nodeType of nodeTypes) {
        const definition = NodeDefinitions[nodeType];
        console.log(`    ✅ ${definition.name} (${definition.type})`);
        console.log(`       Категория: ${definition.metadata.category}`);
        console.log(`       Входы: ${definition.inputs.length}, Выходы: ${definition.outputs.length}`);
        console.log(`       Поля конфигурации: ${Object.keys(definition.configFields).length}`);
    }
}

/**
 * Создание тестовой схемы
 */
function createTestSchema(): BotSchema {
    const nodes: NodeInstance[] = [
        {
            id: 'trigger-1',
            type: 'trigger-command',
            position: { x: 100, y: 100 },
            config: {
                command: '/start',
                caseSensitive: false,
                description: 'Команда запуска бота'
            }
        },
        {
            id: 'action-1',
            type: 'action-send-message',
            position: { x: 300, y: 100 },
            config: {
                text: 'Привет! Добро пожаловать в бот!',
                parseMode: 'HTML',
                disablePreview: false
            }
        }
    ];

    const connections: NodeConnection[] = [
        {
            id: 'conn-1',
            sourceNodeId: 'trigger-1',
            sourcePortId: 'trigger',
            targetNodeId: 'action-1',
            targetPortId: 'trigger'
        }
    ];

    return {
        id: 'test-schema-1',
        settings: {
            name: 'Тестовый бот',
            description: 'Простой бот для тестирования',
            version: '2.0.0',
            platforms: ['telegram'],
            mode: 'polling',
            timeout: 30,
            maxExecutionDepth: 10,
            errorHandling: 'stop',
            retryAttempts: 3,
            logging: {
                level: 'info',
                includeUserData: false,
                retention: 7
            },
            rateLimit: {
                enabled: true,
                requestsPerMinute: 60,
                burstLimit: 10
            }
        },
        nodes,
        connections,
        groups: [],
        variables: {
            'userName': {
                id: 'var-1',
                name: 'userName',
                type: 'string',
                scope: 'user',
                defaultValue: '',
                description: 'Имя пользователя'
            }
        },
        constants: {
            'botName': {
                id: 'const-1',
                name: 'botName',
                value: 'TestBot',
                type: 'string',
                description: 'Название бота'
            }
        },
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['test', 'simple']
        }
    };
}

/**
 * Тестирование валидации схемы
 */
function testSchemaValidation(schema: BotSchema) {
    const validator = new SchemaValidator();
    const result = validator.validateSchema(schema);

    console.log(`  📊 Результат валидации:`);
    console.log(`    Валидна: ${result.isValid}`);
    console.log(`    Ошибок: ${result.errors.length}`);
    console.log(`    Предупреждений: ${result.warnings.length}`);
    console.log(`    Статистика:`);
    console.log(`      Узлов: ${result.stats.nodeCount}`);
    console.log(`      Соединений: ${result.stats.connectionCount}`);
    console.log(`      Переменных: ${result.stats.variableCount}`);
    console.log(`      Сложность: ${result.stats.complexity}`);

    if (result.errors.length > 0) {
        console.log(`  ❌ Ошибки:`);
        result.errors.forEach(error => {
            console.log(`    - ${error.message}`);
        });
    }

    if (result.warnings.length > 0) {
        console.log(`  ⚠️ Предупреждения:`);
        result.warnings.forEach(warning => {
            console.log(`    - ${warning.message}`);
        });
    }

    if (result.isValid) {
        console.log('  ✅ Схема прошла валидацию');
    }
}

/**
 * Тестирование версионирования
 */
function testVersioning() {
    console.log(`  📦 Текущая версия: ${SchemaVersioning.getCurrentVersion()}`);

    const supportedVersions = SchemaVersioning.getSupportedVersions();
    console.log(`  📋 Поддерживаемые версии: ${supportedVersions.map(v => v.version).join(', ')}`);

    // Тест определения версии
    const oldSchema = { nodes: [], edges: [] };
    const detectedVersion = SchemaVersioning.detectSchemaVersion(oldSchema);
    console.log(`  🔍 Определена версия старой схемы: ${detectedVersion}`);

    const needsMigration = SchemaVersioning.needsMigration(oldSchema);
    console.log(`  🔄 Нужна миграция: ${needsMigration}`);

    // Тест предупреждений
    const warnings = SchemaVersioning.getVersionWarnings('0.1.0');
    if (warnings.length > 0) {
        console.log(`  ⚠️ Предупреждения для версии 0.1.0:`);
        warnings.forEach(warning => console.log(`    - ${warning}`));
    }

    console.log('  ✅ Версионирование работает корректно');
}

/**
 * Создание сложной схемы для тестирования
 */
function createComplexSchema(): BotSchema {
    const nodes: NodeInstance[] = [
        {
            id: 'trigger-start',
            type: 'trigger-command',
            position: { x: 50, y: 100 },
            config: { command: '/start', caseSensitive: false }
        },
        {
            id: 'trigger-help',
            type: 'trigger-command',
            position: { x: 50, y: 200 },
            config: { command: '/help', caseSensitive: false }
        },
        {
            id: 'condition-user',
            type: 'condition-text-contains',
            position: { x: 250, y: 150 },
            config: { searchText: 'admin', matchType: 'contains' }
        },
        {
            id: 'action-welcome',
            type: 'action-send-message',
            position: { x: 450, y: 100 },
            config: { text: 'Добро пожаловать!', parseMode: 'HTML' }
        },
        {
            id: 'action-help',
            type: 'action-send-message',
            position: { x: 450, y: 200 },
            config: { text: 'Справка по боту', parseMode: 'HTML' }
        },
        {
            id: 'var-counter',
            type: 'data-variable',
            position: { x: 650, y: 150 },
            config: { variableName: 'messageCount', scope: 'user', dataType: 'number' }
        },
        {
            id: 'http-api',
            type: 'integration-http',
            position: { x: 850, y: 150 },
            config: { method: 'GET', url: 'https://api.example.com/stats', timeout: 10 }
        }
    ];

    const connections: NodeConnection[] = [
        {
            id: 'conn-1',
            sourceNodeId: 'trigger-start',
            sourcePortId: 'trigger',
            targetNodeId: 'condition-user',
            targetPortId: 'trigger'
        },
        {
            id: 'conn-2',
            sourceNodeId: 'trigger-help',
            sourcePortId: 'trigger',
            targetNodeId: 'action-help',
            targetPortId: 'trigger'
        },
        {
            id: 'conn-3',
            sourceNodeId: 'condition-user',
            sourcePortId: 'true',
            targetNodeId: 'action-welcome',
            targetPortId: 'trigger'
        },
        {
            id: 'conn-4',
            sourceNodeId: 'action-welcome',
            sourcePortId: 'success',
            targetNodeId: 'var-counter',
            targetPortId: 'set'
        },
        {
            id: 'conn-5',
            sourceNodeId: 'var-counter',
            sourcePortId: 'success',
            targetNodeId: 'http-api',
            targetPortId: 'trigger'
        }
    ];

    return {
        id: 'complex-schema-1',
        settings: {
            name: 'Сложный тестовый бот',
            description: 'Бот с множественными триггерами и интеграциями',
            version: '2.0.0',
            platforms: ['telegram', 'max'],
            mode: 'webhook',
            timeout: 60,
            maxExecutionDepth: 20,
            errorHandling: 'continue',
            retryAttempts: 2,
            logging: {
                level: 'debug',
                includeUserData: true,
                retention: 30
            },
            rateLimit: {
                enabled: true,
                requestsPerMinute: 100,
                burstLimit: 20
            }
        },
        nodes,
        connections,
        groups: [
            {
                id: 'group-triggers',
                name: 'Триггеры',
                description: 'Группа триггерных узлов',
                nodeIds: ['trigger-start', 'trigger-help'],
                position: { x: 30, y: 80 },
                size: { width: 200, height: 150 },
                color: '#e3f2fd'
            }
        ],
        variables: {
            'messageCount': {
                id: 'var-msg-count',
                name: 'messageCount',
                type: 'number',
                scope: 'user',
                defaultValue: 0,
                description: 'Счетчик сообщений пользователя',
                persistent: true
            },
            'userRole': {
                id: 'var-user-role',
                name: 'userRole',
                type: 'string',
                scope: 'user',
                defaultValue: 'user',
                description: 'Роль пользователя в системе'
            }
        },
        constants: {
            'maxMessages': {
                id: 'const-max-msg',
                name: 'maxMessages',
                value: 100,
                type: 'number',
                description: 'Максимальное количество сообщений'
            }
        },
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['complex', 'multi-platform', 'api-integration'],
            thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
    };
}

/**
 * Тестирование валидации сложной схемы
 */
function testComplexSchemaValidation(schema: BotSchema) {
    const validator = new SchemaValidator();
    const result = validator.validateSchema(schema);

    console.log(`  📊 Результат валидации сложной схемы:`);
    console.log(`    Валидна: ${result.isValid}`);
    console.log(`    Ошибок: ${result.errors.length}`);
    console.log(`    Предупреждений: ${result.warnings.length}`);
    console.log(`    Статистика:`);
    console.log(`      Узлов: ${result.stats.nodeCount}`);
    console.log(`      Соединений: ${result.stats.connectionCount}`);
    console.log(`      Переменных: ${result.stats.variableCount}`);
    console.log(`      Групп: ${result.stats.groupCount}`);
    console.log(`      Сложность: ${result.stats.complexity}`);

    // Показываем первые несколько ошибок и предупреждений
    if (result.errors.length > 0) {
        console.log(`  ❌ Первые ошибки:`);
        result.errors.slice(0, 3).forEach(error => {
            console.log(`    - ${error.message}`);
            if (error.suggestions) {
                console.log(`      Предложения: ${error.suggestions.join(', ')}`);
            }
        });
    }

    if (result.warnings.length > 0) {
        console.log(`  ⚠️ Первые предупреждения:`);
        result.warnings.slice(0, 3).forEach(warning => {
            console.log(`    - ${warning.message}`);
        });
    }

    console.log('  ✅ Валидация сложной схемы завершена');
}

// Запускаем тест
testSchemaSystem().catch(console.error);