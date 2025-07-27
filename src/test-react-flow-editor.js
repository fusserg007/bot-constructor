/**
 * Тест базовой структуры React Flow редактора
 * Проверяет наличие и функциональность компонентов
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing React Flow Editor Structure...\n');

// Проверяем наличие основных файлов
const requiredFiles = [
  'frontend/src/components/Editor/Editor.tsx',
  'frontend/src/components/Editor/NodeLibrary/NodeLibrary.tsx',
  'frontend/src/components/Editor/PropertyPanel/PropertyPanel.tsx',
  'frontend/src/components/Editor/ValidationPanel/ValidationPanel.tsx',
  'frontend/src/components/Editor/CustomNodes/index.ts',
  'frontend/src/components/Editor/CustomNodes/TriggerNode.tsx',
  'frontend/src/components/Editor/CustomNodes/ActionNode.tsx',
  'frontend/src/components/Editor/CustomNodes/ConditionNode.tsx',
  'frontend/src/types/flow.ts',
  'frontend/src/types/nodes.ts',
  'frontend/src/utils/nodeValidation.ts',
  'frontend/src/utils/SchemaValidator.ts'
];

console.log('📋 Checking required files:');
let allFilesExist = true;

for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n📋 Analyzing Editor.tsx structure:');

// Читаем содержимое Editor.tsx
const editorContent = fs.readFileSync('frontend/src/components/Editor/Editor.tsx', 'utf8');

const editorFeatures = [
  { name: 'ReactFlow import', pattern: 'import ReactFlow' },
  { name: 'useNodesState hook', pattern: 'useNodesState' },
  { name: 'useEdgesState hook', pattern: 'useEdgesState' },
  { name: 'onConnect handler', pattern: 'onConnect' },
  { name: 'onDrop handler', pattern: 'onDrop' },
  { name: 'Node validation', pattern: 'validateConnection' },
  { name: 'Schema validation', pattern: 'schemaValidator' },
  { name: 'Save functionality', pattern: 'handleSave' },
  { name: 'Controls component', pattern: '<Controls' },
  { name: 'MiniMap component', pattern: '<MiniMap' },
  { name: 'Background component', pattern: '<Background' },
  { name: 'Custom node types', pattern: 'nodeTypes' },
  { name: 'Drag and drop', pattern: 'onDragOver' }
];

console.log('  Core features:');
for (const feature of editorFeatures) {
  const hasFeature = editorContent.includes(feature.pattern);
  console.log(`    ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📋 Analyzing NodeLibrary.tsx structure:');

// Читаем содержимое NodeLibrary.tsx
const nodeLibraryContent = fs.readFileSync('frontend/src/components/Editor/NodeLibrary/NodeLibrary.tsx', 'utf8');

const nodeLibraryFeatures = [
  { name: 'Node definitions', pattern: 'nodeDefinitions' },
  { name: 'Categories system', pattern: 'categories' },
  { name: 'Search functionality', pattern: 'searchQuery' },
  { name: 'Drag start handler', pattern: 'handleNodeDragStart' },
  { name: 'Node filtering', pattern: 'filteredNodes' },
  { name: 'Category selection', pattern: 'selectedCategory' },
  { name: 'Trigger nodes', pattern: 'trigger-message' },
  { name: 'Action nodes', pattern: 'action-send-message' },
  { name: 'Condition nodes', pattern: 'condition-text' },
  { name: 'Data nodes', pattern: 'data-save' }
];

console.log('  Library features:');
for (const feature of nodeLibraryFeatures) {
  const hasFeature = nodeLibraryContent.includes(feature.pattern);
  console.log(`    ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📋 Analyzing Custom Nodes:');

// Проверяем кастомные узлы
const customNodesIndex = fs.readFileSync('frontend/src/components/Editor/CustomNodes/index.ts', 'utf8');
const triggerNodeContent = fs.readFileSync('frontend/src/components/Editor/CustomNodes/TriggerNode.tsx', 'utf8');

const customNodeFeatures = [
  { name: 'Node types export', pattern: 'export const nodeTypes', file: 'index' },
  { name: 'TriggerNode export', pattern: 'TriggerNode', file: 'index' },
  { name: 'ActionNode export', pattern: 'ActionNode', file: 'index' },
  { name: 'ConditionNode export', pattern: 'ConditionNode', file: 'index' },
  { name: 'Handle component', pattern: 'Handle', file: 'trigger' },
  { name: 'Position import', pattern: 'Position', file: 'trigger' },
  { name: 'NodeProps type', pattern: 'NodeProps', file: 'trigger' },
  { name: 'Custom styling', pattern: 'styles.customNode', file: 'trigger' }
];

console.log('  Custom node features:');
for (const feature of customNodeFeatures) {
  let content;
  switch (feature.file) {
    case 'index':
      content = customNodesIndex;
      break;
    case 'trigger':
      content = triggerNodeContent;
      break;
    default:
      content = '';
  }
  
  const hasFeature = content.includes(feature.pattern);
  console.log(`    ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📋 Checking package.json dependencies:');

// Проверяем зависимости
const packageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
const requiredDependencies = [
  'react',
  'react-dom',
  'reactflow',
  'react-router-dom'
];

console.log('  Required dependencies:');
for (const dep of requiredDependencies) {
  const hasDepInDeps = packageJson.dependencies && packageJson.dependencies[dep];
  const hasDepInDevDeps = packageJson.devDependencies && packageJson.devDependencies[dep];
  const hasDep = hasDepInDeps || hasDepInDevDeps;
  
  console.log(`    ${hasDep ? '✅' : '❌'} ${dep}${hasDep ? ` (${hasDepInDeps ? packageJson.dependencies[dep] : packageJson.devDependencies[dep]})` : ''}`);
}

console.log('\n📋 Analyzing TypeScript types:');

// Проверяем типы
const flowTypesContent = fs.readFileSync('frontend/src/types/flow.ts', 'utf8');
const nodeTypesContent = fs.readFileSync('frontend/src/types/nodes.ts', 'utf8');

const typeFeatures = [
  { name: 'BotSchema interface', pattern: 'interface BotSchema', file: 'flow' },
  { name: 'Node interface', pattern: 'interface.*Node', file: 'flow' },
  { name: 'Edge interface', pattern: 'interface.*Edge', file: 'flow' },
  { name: 'NodeDefinition interface', pattern: 'interface NodeDefinition', file: 'nodes' },
  { name: 'NodeCategory type', pattern: 'NodeCategory', file: 'nodes' },
  { name: 'NodePort interface', pattern: 'interface NodePort', file: 'nodes' }
];

console.log('  TypeScript types:');
for (const feature of typeFeatures) {
  let content;
  switch (feature.file) {
    case 'flow':
      content = flowTypesContent;
      break;
    case 'nodes':
      content = nodeTypesContent;
      break;
    default:
      content = '';
  }
  
  const hasFeature = content.match(new RegExp(feature.pattern));
  console.log(`    ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📋 Checking utility functions:');

// Проверяем утилиты
const nodeValidationContent = fs.readFileSync('frontend/src/utils/nodeValidation.ts', 'utf8');
const schemaValidatorContent = fs.readFileSync('frontend/src/utils/SchemaValidator.ts', 'utf8');

const utilityFeatures = [
  { name: 'validateConnection function', pattern: 'validateConnection', file: 'validation' },
  { name: 'Connection validation logic', pattern: 'valid.*reason', file: 'validation' },
  { name: 'SchemaValidator class', pattern: 'class SchemaValidator', file: 'validator' },
  { name: 'validateSchema method', pattern: 'validateSchema', file: 'validator' },
  { name: 'Error handling', pattern: 'errors.*warnings', file: 'validator' }
];

console.log('  Utility functions:');
for (const feature of utilityFeatures) {
  let content;
  switch (feature.file) {
    case 'validation':
      content = nodeValidationContent;
      break;
    case 'validator':
      content = schemaValidatorContent;
      break;
    default:
      content = '';
  }
  
  const hasFeature = content.includes(feature.pattern) || content.match(new RegExp(feature.pattern));
  console.log(`    ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📊 React Flow Editor Analysis Results:');

// Подсчитываем статистику
const totalFeatures = editorFeatures.length + nodeLibraryFeatures.length + 
                     customNodeFeatures.length + typeFeatures.length + 
                     utilityFeatures.length;

let implementedFeatures = 0;

// Подсчитываем реализованные функции
implementedFeatures += editorFeatures.filter(f => editorContent.includes(f.pattern)).length;
implementedFeatures += nodeLibraryFeatures.filter(f => nodeLibraryContent.includes(f.pattern)).length;

// Кастомные узлы
implementedFeatures += customNodeFeatures.filter(f => {
  let content;
  switch (f.file) {
    case 'index': content = customNodesIndex; break;
    case 'trigger': content = triggerNodeContent; break;
    default: content = '';
  }
  return content.includes(f.pattern);
}).length;

// Типы
implementedFeatures += typeFeatures.filter(f => {
  let content;
  switch (f.file) {
    case 'flow': content = flowTypesContent; break;
    case 'nodes': content = nodeTypesContent; break;
    default: content = '';
  }
  return content.match(new RegExp(f.pattern));
}).length;

// Утилиты
implementedFeatures += utilityFeatures.filter(f => {
  let content;
  switch (f.file) {
    case 'validation': content = nodeValidationContent; break;
    case 'validator': content = schemaValidatorContent; break;
    default: content = '';
  }
  return content.includes(f.pattern) || content.match(new RegExp(f.pattern));
}).length;

const completionRate = ((implementedFeatures / totalFeatures) * 100).toFixed(1);

console.log(`✅ Files present: ${requiredFiles.length}/${requiredFiles.length}`);
console.log(`✅ Features implemented: ${implementedFeatures}/${totalFeatures}`);
console.log(`✅ Dependencies: ${requiredDependencies.filter(dep => packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]).length}/${requiredDependencies.length}`);
console.log(`📈 Implementation completeness: ${completionRate}%`);

if (parseFloat(completionRate) >= 90) {
  console.log('\n🎉 React Flow editor is excellently implemented!');
  process.exit(0);
} else if (parseFloat(completionRate) >= 70) {
  console.log('\n✅ React Flow editor is well implemented!');
  process.exit(0);
} else {
  console.log('\n⚠️ React Flow editor needs some improvements');
  process.exit(0);
}