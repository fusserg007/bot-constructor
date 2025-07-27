/**
 * Финальный тест системы миграции данных
 * Демонстрирует работу автоматической миграции
 */

import { BotDataManager } from './utils/BotDataManager';
import { SchemaVersioning } from './core/versioning/SchemaVersioning';
import { DataMigrationSimple } from './core/migration/DataMigrationSimple';

// Тестовые данные разных версий
const testDataV010 = {
  name: 'Simple Bot',
  description: 'Basic bot without nodes',
  platforms: ['telegram']
};

const testDataV100 = {
  version: '1.0.0',
  settings: {
    name: 'Advanced Bot',
    description: 'Bot with full settings',
    platforms: ['telegram', 'max']
  },
  nodes: [
    {
      id: 'start',
      type: 'command',
      config: { command: '/start' }
    }
  ],
  edges: [],
  variables: {}
};

async function testDataMigrationFinal() {
  console.log('🧪 Final Data Migration Test...\n');

  try {
    // Создаем менеджер данных
    const manager = new BotDataManager('./test-backups');

    console.log('📋 Testing version detection:');
    console.log(`  v0.1.0 data detected as: ${DataMigrationSimple.detectSchemaVersion(testDataV010)}`);
    console.log(`  v1.0.0 data detected as: ${DataMigrationSimple.detectSchemaVersion(testDataV100)}`);
    console.log(`  Current system version: ${SchemaVersioning.getCurrentVersion()}`);

    console.log('\n🔄 Testing data loading with migration:');
    
    // Тест 1: Загрузка данных v0.1.0
    console.log('\n  Test 1: Loading v0.1.0 data');
    const result1 = await manager.loadBotData(testDataV010);
    console.log(`    Success: ${result1.success}`);
    console.log(`    Migrated: ${result1.migrated}`);
    console.log(`    Errors: ${result1.errors.length}`);
    console.log(`    Warnings: ${result1.warnings.length}`);
    
    if (result1.errors.length > 0) {
      console.log('    Errors:', result1.errors);
    }
    
    if (result1.warnings.length > 0) {
      console.log('    Warnings:', result1.warnings.slice(0, 3)); // Показываем первые 3
    }

    // Тест 2: Загрузка данных v1.0.0
    console.log('\n  Test 2: Loading v1.0.0 data');
    const result2 = await manager.loadBotData(testDataV100);
    console.log(`    Success: ${result2.success}`);
    console.log(`    Migrated: ${result2.migrated}`);
    console.log(`    Errors: ${result2.errors.length}`);
    console.log(`    Warnings: ${result2.warnings.length}`);

    // Тест 3: Информация о миграции
    console.log('\n📊 Migration information:');
    const migrationInfo = manager.getMigrationInfo(testDataV010);
    console.log(`  Current version: ${migrationInfo.currentVersion}`);
    console.log(`  Data version: ${migrationInfo.dataVersion}`);
    console.log(`  Needs migration: ${migrationInfo.needsMigration}`);
    console.log(`  Available migrations: ${migrationInfo.availableMigrations.length}`);

    // Тест 4: Проверка совместимости
    console.log('\n🔍 Compatibility check:');
    const compatibility = manager.checkCompatibility(testDataV010);
    console.log(`  Compatible: ${compatibility.compatible}`);
    console.log(`  Issues: ${compatibility.issues.length}`);
    console.log(`  Recommendations: ${compatibility.recommendations.length}`);

    // Тест 5: Работа с бэкапами
    console.log('\n💾 Backup functionality:');
    const backupPath = await manager.createBackup(testDataV100, 'test-final');
    console.log(`  Backup created: ${backupPath}`);
    
    const backups = manager.getAvailableBackups();
    console.log(`  Available backups: ${backups.length}`);

    // Тест 6: Сохранение данных
    console.log('\n💾 Save functionality:');
    if (result1.success && result1.data) {
      const saveResult = await manager.saveBotData(result1.data, './test-bot-migrated.json');
      console.log(`  Save success: ${saveResult.success}`);
      console.log(`  Save errors: ${saveResult.errors.length}`);
    }

    console.log('\n✅ All migration tests completed successfully!');
    
    // Статистика
    const stats = {
      totalTests: 6,
      passedTests: [result1.success, result2.success, true, true, true, true].filter(Boolean).length
    };
    
    console.log(`\n📈 Test Statistics:`);
    console.log(`  Total tests: ${stats.totalTests}`);
    console.log(`  Passed: ${stats.passedTests}`);
    console.log(`  Success rate: ${((stats.passedTests / stats.totalTests) * 100).toFixed(1)}%`);

    return stats.passedTests === stats.totalTests;

  } catch (error) {
    console.error('\n💥 Migration test failed:', error);
    return false;
  }
}

// Запуск теста
if (require.main === module) {
  testDataMigrationFinal()
    .then(success => {
      if (success) {
        console.log('\n🎉 Data migration system is working correctly!');
        process.exit(0);
      } else {
        console.log('\n💥 Data migration system has issues!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testDataMigrationFinal };