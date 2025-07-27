/**
 * Простой тест системы миграции данных
 */

import { BotDataManager } from './utils/BotDataManager';
import { SchemaVersioning } from './core/versioning/SchemaVersioning';

// Тестовые данные старого формата
const oldBotData = {
  name: 'Test Bot',
  description: 'Simple test bot',
  platforms: ['telegram'],
  nodes: [
    {
      id: 'start',
      type: 'command',
      config: { command: '/start' }
    },
    {
      id: 'response',
      type: 'send',
      config: { text: 'Hello, World!' }
    }
  ],
  edges: [
    {
      id: 'edge1',
      source: 'start',
      target: 'response'
    }
  ],
  variables: {
    userName: {
      type: 'string',
      defaultValue: 'User'
    }
  }
};

async function testMigrationSimple() {
  console.log('🧪 Testing Migration System (Simple)...\n');

  try {
    // Создаем менеджер данных
    const manager = new BotDataManager('./test-backups');

    console.log('📋 Original data version:', SchemaVersioning.detectSchemaVersion(oldBotData));
    console.log('📋 Current system version:', SchemaVersioning.getCurrentVersion());

    // Загружаем данные с автоматической миграцией
    console.log('\n🔄 Loading data with migration...');
    const result = await manager.loadBotData(oldBotData);

    console.log('✅ Load result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.success && result.data) {
      console.log('\n📊 Migrated data structure:');
      console.log(`  ID: ${result.data.id || 'N/A'}`);
      console.log(`  Settings: ${result.data.settings ? 'Present' : 'Missing'}`);
      console.log(`  Nodes: ${result.data.nodes ? result.data.nodes.length : 0}`);
      console.log(`  Connections: ${result.data.connections ? result.data.connections.length : 0}`);
      console.log(`  Variables: ${result.data.variables ? Object.keys(result.data.variables).length : 0}`);
    }

    // Тест информации о миграции
    console.log('\n📋 Migration info:');
    const migrationInfo = manager.getMigrationInfo(oldBotData);
    console.log(`  Current version: ${migrationInfo.currentVersion}`);
    console.log(`  Data version: ${migrationInfo.dataVersion}`);
    console.log(`  Needs migration: ${migrationInfo.needsMigration}`);
    console.log(`  Available migrations: ${migrationInfo.availableMigrations.length}`);

    // Тест совместимости
    console.log('\n🔍 Compatibility check:');
    const compatibility = manager.checkCompatibility(oldBotData);
    console.log(`  Compatible: ${compatibility.compatible}`);
    console.log(`  Issues: ${compatibility.issues.length}`);
    console.log(`  Recommendations: ${compatibility.recommendations.length}`);

    if (compatibility.issues.length > 0) {
      console.log('  Issues:');
      compatibility.issues.forEach(issue => console.log(`    - ${issue}`));
    }

    console.log('\n🎉 Migration test completed successfully!');
    return true;

  } catch (error) {
    console.error('\n💥 Migration test failed:', error);
    return false;
  }
}

// Запуск теста
if (require.main === module) {
  testMigrationSimple()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testMigrationSimple };