/**
 * Тест системы миграции данных
 * Проверяет автоматическую миграцию между версиями схем
 */

import { DataMigration } from './core/migration/DataMigration';
import { BotDataManager } from './utils/BotDataManager';
import { SchemaVersioning } from './core/versioning/SchemaVersioning';

// Тестовые данные разных версий
const testDataV010 = {
  name: 'Test Bot',
  description: 'Simple test bot',
  platforms: ['telegram']
};

const testDataV020 = {
  name: 'Test Bot V2',
  description: 'Test bot with nodes',
  platforms: ['telegram'],
  nodes: [
    {
      id: 'node1',
      type: 'command',
      config: { command: '/start' }
    }
  ],
  edges: [],
  variables: {}
};

const testDataV100 = {
  version: '1.0.0',
  settings: {
    name: 'Test Bot V1',
    description: 'Test bot with settings',
    platforms: ['telegram', 'max']
  },
  nodes: [
    {
      id: 'node1',
      type: 'command',
      config: { command: '/start' }
    },
    {
      id: 'node2',
      type: 'send',
      config: { text: 'Hello!' }
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2'
    }
  ],
  variables: {
    userName: {
      type: 'string',
      defaultValue: 'User'
    }
  }
};

async function testMigrationSystem() {
  console.log('🧪 Testing Migration System...\n');

  const tests = [
    {
      name: 'Version Detection',
      test: testVersionDetection
    },
    {
      name: 'Migration from v0.1.0',
      test: () => testMigration(testDataV010, '0.1.0')
    },
    {
      name: 'Migration from v0.2.0',
      test: () => testMigration(testDataV020, '0.2.0')
    },
    {
      name: 'Migration from v1.0.0',
      test: () => testMigration(testDataV100, '1.0.0')
    },
    {
      name: 'Migration Plan Creation',
      test: testMigrationPlan
    },
    {
      name: 'BotDataManager Integration',
      test: testBotDataManagerIntegration
    },
    {
      name: 'Backup and Restore',
      test: testBackupRestore
    },
    {
      name: 'Error Handling',
      test: testErrorHandling
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n📋 ${test.name}:`);
      await test.test();
      console.log(`✅ ${test.name} - PASSED`);
      passed++;
    } catch (error) {
      console.error(`❌ ${test.name} - FAILED:`, error);
      failed++;
    }
  }

  console.log(`\n📊 Migration System Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

async function testVersionDetection() {
  console.log('  Testing version detection...');

  // Тест определения версий
  const v010 = SchemaVersioning.detectSchemaVersion(testDataV010);
  const v020 = SchemaVersioning.detectSchemaVersion(testDataV020);
  const v100 = SchemaVersioning.detectSchemaVersion(testDataV100);
  const v200 = SchemaVersioning.detectSchemaVersion({
    id: 'test',
    settings: { name: 'Test' },
    nodes: [],
    connections: []
  });

  console.log(`    v0.1.0 detected as: ${v010}`);
  console.log(`    v0.2.0 detected as: ${v020}`);
  console.log(`    v1.0.0 detected as: ${v100}`);
  console.log(`    v2.0.0 detected as: ${v200}`);

  if (v010 !== '0.1.0') throw new Error(`Expected 0.1.0, got ${v010}`);
  if (v020 !== '0.2.0') throw new Error(`Expected 0.2.0, got ${v020}`);
  if (v100 !== '1.0.0') throw new Error(`Expected 1.0.0, got ${v100}`);
  if (v200 !== '2.0.0') throw new Error(`Expected 2.0.0, got ${v200}`);
}

async function testMigration(testData: any, expectedVersion: string) {
  console.log(`  Testing migration from ${expectedVersion}...`);

  const detectedVersion = SchemaVersioning.detectSchemaVersion(testData);
  console.log(`    Detected version: ${detectedVersion}`);

  if (detectedVersion !== expectedVersion) {
    throw new Error(`Version detection failed: expected ${expectedVersion}, got ${detectedVersion}`);
  }

  const result = await DataMigration.migrateSchema(testData, expectedVersion, SchemaVersioning.getCurrentVersion());
  
  console.log(`    Migration success: ${result.success}`);
  console.log(`    Applied migrations: ${result.migrationSteps.length}`);
  
  if (result.migrationSteps.length > 0) {
    const stepDescriptions = result.migrationSteps.map(step => `${step.fromVersion}->${step.toVersion}`);
    console.log(`    Migrations: ${stepDescriptions.join(', ')}`);
  }

  if (result.warnings.length > 0) {
    console.log(`    Warnings: ${result.warnings.length}`);
  }

  if (!result.success) {
    throw new Error(`Migration failed: ${result.errors.join(', ')}`);
  }

  // Проверяем, что результат имеет правильную структуру
  if (!result.migratedSchema) {
    throw new Error('No migrated schema returned');
  }

  const migratedVersion = SchemaVersioning.detectSchemaVersion(result.migratedSchema);
  const currentVersion = SchemaVersioning.getCurrentVersion();
  
  console.log(`    Result version: ${migratedVersion}`);
  
  if (migratedVersion !== currentVersion) {
    throw new Error(`Migration didn't reach current version: ${migratedVersion} !== ${currentVersion}`);
  }
}

async function testMigrationPlan() {
  console.log('  Testing migration plan creation...');

  const plan = DataMigration.getMigrationPlan('0.1.0', '2.0.0');
  
  console.log(`    From: ${plan.fromVersion}`);
  console.log(`    To: ${plan.toVersion}`);
  console.log(`    Steps: ${plan.steps.length}`);
  console.log(`    Estimated time: ${plan.estimatedDuration}ms`);
  console.log(`    Breaking changes: ${plan.hasBreakingChanges}`);

  if (plan.steps.length === 0) {
    throw new Error('No migration path found');
  }

  if (plan.fromVersion !== '0.1.0' || plan.toVersion !== '2.0.0') {
    throw new Error('Incorrect plan versions');
  }
}

async function testBotDataManagerIntegration() {
  console.log('  Testing BotDataManager integration...');

  const manager = new BotDataManager('./test-backups');

  // Тест загрузки с миграцией
  const result = await manager.loadBotData(testDataV100);
  
  console.log(`    Load success: ${result.success}`);
  console.log(`    Migration performed: ${result.migrated}`);
  
  if (result.migrationDetails) {
    console.log(`    Migration steps: ${result.migrationDetails.migrationSteps.length}`);
  }

  if (!result.success) {
    throw new Error(`Load failed: ${result.errors.join(', ')}`);
  }

  // Тест получения информации о миграции
  const migrationInfo = manager.getMigrationInfo(testDataV100);
  console.log(`    Current version: ${migrationInfo.currentVersion}`);
  console.log(`    Data version: ${migrationInfo.dataVersion}`);
  console.log(`    Needs migration: ${migrationInfo.needsMigration}`);

  // Тест проверки совместимости
  const compatibility = manager.checkCompatibility(testDataV100);
  console.log(`    Compatible: ${compatibility.compatible}`);
  console.log(`    Issues: ${compatibility.issues.length}`);
}

async function testBackupRestore() {
  console.log('  Testing backup and restore...');

  const manager = new BotDataManager('./test-backups');

  // Создаем бэкап
  const backupPath = await manager.createBackup(testDataV100, 'test-backup');
  console.log(`    Backup created: ${backupPath}`);

  // Восстанавливаем из бэкапа
  const restoreResult = await manager.restoreFromBackup(backupPath);
  console.log(`    Restore success: ${restoreResult.success}`);

  if (!restoreResult.success) {
    throw new Error(`Restore failed: ${restoreResult.errors.join(', ')}`);
  }

  // Проверяем список бэкапов
  const backups = manager.getAvailableBackups();
  console.log(`    Available backups: ${backups.length}`);

  if (backups.length === 0) {
    throw new Error('No backups found');
  }
}

async function testErrorHandling() {
  console.log('  Testing error handling...');

  // Тест с невалидными данными
  const invalidData = { invalid: 'data' };
  const result = await DataMigration.migrateSchema(invalidData, '0.1.0', '2.0.0');
  
  console.log(`    Invalid data handled: ${!result.success}`);
  console.log(`    Error count: ${result.errors.length}`);

  if (result.success) {
    throw new Error('Should have failed with invalid data');
  }

  // Тест с null данными
  const nullResult = await DataMigration.migrateSchema(null, '0.1.0', '2.0.0');
  console.log(`    Null data handled: ${!nullResult.success}`);

  if (nullResult.success) {
    throw new Error('Should have failed with null data');
  }

  // Тест BotDataManager с невалидными данными
  const manager = new BotDataManager('./test-backups');
  const loadResult = await manager.loadBotData(null);
  
  console.log(`    Manager null handling: ${!loadResult.success}`);

  if (loadResult.success) {
    throw new Error('Manager should have failed with null data');
  }
}

// Запуск тестов
if (require.main === module) {
  testMigrationSystem()
    .then(results => {
      if (results.failed === 0) {
        console.log('\n🎉 All migration tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some migration tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Migration test suite failed:', error);
      process.exit(1);
    });
}

export { testMigrationSystem };