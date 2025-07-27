/**
 * Тест системы валидации и миграции данных
 */

import { SchemaValidator } from './core/validation/SchemaValidator';
import { SchemaVersioning } from './core/versioning/SchemaVersioning';
import { DataMigration } from './core/migration/DataMigration';
import { BotSchema } from './core/types';

async function testDataMigration() {
    console.log('🔄 Testing data migration and validation system...\n');

    // Тест 1: Валидация корректной схемы
    console.log('📋 Test 1: Validating correct schema...');
    const validSchema: BotSchema = {
        id: 'test-schema-1',
        name: 'Test Bot',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger-command',
                category: 'triggers',
                position: { x: 100, y: 100 },
                data: {
                    label: 'Start Command',
                    config: { command: '/start' },
                    inputs: [],
                    outputs: [{
                        id: 'output',
                        name: 'Выход',
                        type: 'control',
                        dataType: 'any',
                        required: false
                    }]
                }
            },
            {
                id: 'action-1',
                type: 'action-send-message',
                category: 'actions',
                position: { x: 400, y: 100 },
                data: {
                    label: 'Send Welcome',
                    config: { message: 'Привет!' },
                    inputs: [{
                        id: 'input',
                        name: 'Вход',
                        type: 'control',
                        dataType: 'any',
                        required: false
                    }],
                    outputs: []
                }
            }
        ],
        edges: [
            {
                id: 'edge-1',
                source: 'trigger-1',
                target: 'action-1'
            }
        ],
        variables: {},
        settings: {
            name: 'Test Bot',
            description: 'Test bot for validation',
            platforms: ['telegram'],
            mode: 'polling',
            variables: {}
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const validator = new SchemaValidator();
    const validationResult = validator.validateSchema(validSchema);

    console.log('✅ Validation result:', {
        isValid: validationResult.isValid,
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length
    });

    if (validationResult.errors.length > 0) {
        console.log('❌ Errors:', validationResult.errors.map(e => e.message));
    }

    if (validationResult.warnings.length > 0) {
        console.log('⚠️ Warnings:', validationResult.warnings.map(w => w.message));
    }

    // Тест 2: Валидация некорректной схемы
    console.log('\n📋 Test 2: Validating invalid schema...');
    const invalidSchema = {
        // Отсутствует обязательное поле id
        name: 'Invalid Bot',
        nodes: [
            {
                // Отсутствует id узла
                type: 'trigger-command',
                category: 'triggers',
                position: { x: 100, y: 100 }
                // Отсутствует data
            }
        ],
        edges: [],
        variables: {},
        settings: {
            name: 'Invalid Bot',
            platforms: [], // Пустой массив платформ
            mode: 'invalid-mode' // Неверный режим
        }
    } as any;

    const invalidResult = validator.validateSchema(invalidSchema);
    console.log('❌ Invalid schema result:', {
        isValid: invalidResult.isValid,
        errors: invalidResult.errors.length,
        warnings: invalidResult.warnings.length
    });

    console.log('Errors found:', invalidResult.errors.map(e => `${e.type}: ${e.message}`));

    // Тест 3: Определение версии схемы
    console.log('\n🔍 Test 3: Schema version detection...');

    const oldSchemaV1 = {
        id: 'old-bot',
        name: 'Old Bot',
        configuration: {
            nodes: [
                {
                    id: 'node1',
                    type: 'action',
                    data: { message: 'Hello' },
                    connections: ['node2']
                }
            ]
        }
    };

    const detectedVersion = SchemaVersioning.detectSchemaVersion(oldSchemaV1);
    console.log('📊 Detected version for old schema:', detectedVersion);

    const currentVersion = SchemaVersioning.getCurrentVersion();
    console.log('📊 Current version:', currentVersion);

    const needsMigration = SchemaVersioning.needsMigration(oldSchemaV1);
    console.log('🔄 Needs migration:', needsMigration);

    // Тест 4: Миграция данных
    console.log('\n🔄 Test 4: Data migration...');

    if (needsMigration) {
        console.log('Starting migration from', detectedVersion, 'to', currentVersion);

        const migrationResult = await DataMigration.migrateToCurrentVersion(oldSchemaV1);

        console.log('Migration result:', {
            success: migrationResult.success,
            errors: migrationResult.errors.length,
            warnings: migrationResult.warnings.length
        });

        if (migrationResult.errors.length > 0) {
            console.log('Migration errors:', migrationResult.errors);
        }

        if (migrationResult.warnings.length > 0) {
            console.log('Migration warnings:', migrationResult.warnings);
        }

        if (migrationResult.success && migrationResult.migratedSchema) {
            console.log('✅ Migration successful!');
            console.log('Migrated schema version:', migrationResult.migratedSchema.version);
            console.log('Migrated nodes count:', migrationResult.migratedSchema.nodes.length);
            console.log('Migrated edges count:', migrationResult.migratedSchema.edges.length);

            // Валидируем мигрированную схему
            const migratedValidation = validator.validateSchema(migrationResult.migratedSchema);
            console.log('Migrated schema validation:', {
                isValid: migratedValidation.isValid,
                errors: migratedValidation.errors.length,
                warnings: migratedValidation.warnings.length
            });
        }
    }

    // Тест 5: Версионирование
    console.log('\n📋 Test 5: Schema versioning...');

    const supportedVersions = SchemaVersioning.getSupportedVersions();
    console.log('Supported versions:', supportedVersions.map(v => v.version));

    const versionWarnings = SchemaVersioning.getVersionWarnings('0.1.0');
    console.log('Version 0.1.0 warnings:', versionWarnings);

    const canMigrate = DataMigration.canMigrate('0.1.0', '1.0.0');
    console.log('Can migrate 0.1.0 -> 1.0.0:', canMigrate);

    // Тест 6: Создание новой схемы
    console.log('\n🆕 Test 6: Creating new schema...');

    const newSchema = SchemaVersioning.createNewSchema({
        name: 'New Test Bot',
        nodes: [],
        edges: []
    });

    console.log('New schema created:', {
        id: newSchema.id,
        version: newSchema.version,
        platforms: newSchema.settings.platforms
    });

    const newSchemaValidation = validator.validateSchema(newSchema);
    console.log('New schema validation:', {
        isValid: newSchemaValidation.isValid,
        warnings: newSchemaValidation.warnings.length
    });

    console.log('\n🎉 Data migration and validation tests completed!');
}

// Запускаем тест
testDataMigration().catch(console.error);