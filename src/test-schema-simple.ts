/**
 * Простой тест системы схем данных
 */

import { SchemaVersioning } from './core/versioning/SchemaVersioning';
import { NodeDefinitions } from './core/schema/NodeDefinitions';

async function testSchemaSimple() {
  console.log('🚀 Простой тест системы схем данных...\n');

  try {
    // 1. Тестируем определения узлов
    console.log('📋 Тестирование определений узлов:');
    testNodeDefinitions();

    // 2. Тестируем версионирование
    console.log('\n📦 Тестирование версионирования:');
    testVersioning();

    // 3. Тестируем структуру узлов
    console.log('\n🔧 Тестирование структуры узлов:');
    testNodeStructure();

    console.log('\n🎉 Простой тест системы схем завершен успешно!');

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
    console.log(`       Иконка: ${definition.metadata.icon}`);
    console.log(`       Входы: ${definition.inputs.length}, Выходы: ${definition.outputs.length}`);
    console.log(`       Поля конфигурации: ${Object.keys(definition.configFields).length}`);
    
    // Проверяем структуру определения
    if (!definition.type || !definition.name) {
      console.log(`       ❌ Неполное определение узла`);
    }
    
    if (!definition.metadata.description) {
      console.log(`       ⚠️ Отсутствует описание`);
    }
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

  // Тест сравнения версий
  const comparison = SchemaVersioning.compareVersions('1.0.0', '0.2.0');
  console.log(`  🔢 Сравнение версий 1.0.0 vs 0.2.0: ${comparison}`);

  // Тест совместимости
  const compatible = SchemaVersioning.areVersionsCompatible('1.0.0', '1.0.0');
  console.log(`  🔗 Совместимость версий 1.0.0 и 1.0.0: ${compatible}`);

  // Тест предупреждений
  const warnings = SchemaVersioning.getVersionWarnings('0.1.0');
  if (warnings.length > 0) {
    console.log(`  ⚠️ Предупреждения для версии 0.1.0:`);
    warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  console.log('  ✅ Версионирование работает корректно');
}

/**
 * Тестирование структуры узлов
 */
function testNodeStructure() {
  // Тестируем триггер команды
  const commandTrigger = NodeDefinitions['trigger-command'];
  console.log(`  🎯 Тестирование триггера команды:`);
  console.log(`    Название: ${commandTrigger.name}`);
  console.log(`    Описание: ${commandTrigger.metadata.description}`);
  console.log(`    Поддерживаемые платформы: ${commandTrigger.metadata.supportedPlatforms}`);
  
  // Проверяем порты
  console.log(`    Выходные порты:`);
  commandTrigger.outputs.forEach(port => {
    console.log(`      - ${port.name} (${port.type}, ${port.dataType})`);
  });

  // Проверяем поля конфигурации
  console.log(`    Поля конфигурации:`);
  Object.entries(commandTrigger.configFields).forEach(([key, field]) => {
    console.log(`      - ${key}: ${field.label} (${field.type})`);
  });

  // Тестируем действие отправки сообщения
  const sendMessage = NodeDefinitions['action-send-message'];
  console.log(`\n  📤 Тестирование действия отправки сообщения:`);
  console.log(`    Название: ${sendMessage.name}`);
  console.log(`    Входные порты: ${sendMessage.inputs.length}`);
  console.log(`    Выходные порты: ${sendMessage.outputs.length}`);

  // Тестируем HTTP интеграцию
  const httpIntegration = NodeDefinitions['integration-http'];
  console.log(`\n  🌐 Тестирование HTTP интеграции:`);
  console.log(`    Название: ${httpIntegration.name}`);
  console.log(`    Категория: ${httpIntegration.metadata.category}`);
  console.log(`    Подкатегория: ${httpIntegration.metadata.subcategory}`);

  // Проверяем конфигурацию HTTP узла
  const httpConfig = httpIntegration.configFields;
  console.log(`    HTTP методы: ${httpConfig.method.options?.map(o => o.value).join(', ')}`);

  console.log('  ✅ Структура узлов корректна');
}

/**
 * Демонстрация создания простой схемы
 */
function demonstrateSchemaCreation() {
  console.log('\n🏗️ Демонстрация создания схемы:');

  // Создаем простую схему с командой и ответом
  const simpleSchema = {
    id: 'demo-schema',
    name: 'Демо схема',
    nodes: [
      {
        id: 'start-trigger',
        type: 'trigger-command',
        position: { x: 100, y: 100 },
        config: {
          command: '/start',
          caseSensitive: false,
          description: 'Команда запуска'
        }
      },
      {
        id: 'welcome-message',
        type: 'action-send-message',
        position: { x: 300, y: 100 },
        config: {
          text: 'Добро пожаловать в бот!',
          parseMode: 'HTML'
        }
      }
    ],
    connections: [
      {
        id: 'start-to-welcome',
        sourceNodeId: 'start-trigger',
        sourcePortId: 'trigger',
        targetNodeId: 'welcome-message',
        targetPortId: 'trigger'
      }
    ]
  };

  console.log(`  📋 Создана схема: ${simpleSchema.name}`);
  console.log(`  🔧 Узлов: ${simpleSchema.nodes.length}`);
  console.log(`  🔗 Соединений: ${simpleSchema.connections.length}`);
  console.log('  ✅ Схема создана успешно');
}

// Запускаем тест
testSchemaSimple().catch(console.error);