/**
 * Простой тест Telegram адаптера (JavaScript)
 */

console.log('🧪 Testing Telegram Adapter (Simple)...\n');

// Проверяем, что файлы существуют
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/adapters/TelegramAdapter.ts',
  'src/core/adapters/MessengerAdapter.ts',
  'src/core/adapters/AdapterRegistry.ts',
  'src/core/types/index.ts'
];

console.log('📋 Checking required files:');
let allFilesExist = true;

for (const file of filesToCheck) {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n📋 Checking TelegramAdapter structure:');

// Читаем содержимое TelegramAdapter
const telegramAdapterContent = fs.readFileSync('src/adapters/TelegramAdapter.ts', 'utf8');

const requiredMethods = [
  'initialize',
  'validateCredentials',
  'getCapabilities',
  'sendMessage',
  'sendMedia',
  'startPolling',
  'stopPolling',
  'handleWebhook',
  'setWebhook',
  'deleteWebhook'
];

console.log('  Required methods:');
for (const method of requiredMethods) {
  const hasMethod = telegramAdapterContent.includes(`async ${method}(`) || 
                   telegramAdapterContent.includes(`${method}(`);
  console.log(`    ${hasMethod ? '✅' : '❌'} ${method}`);
}

console.log('\n📋 Checking adapter features:');

const features = [
  { name: 'Polling support', pattern: 'pollUpdates' },
  { name: 'Webhook support', pattern: 'handleWebhook' },
  { name: 'Message processing', pattern: 'processMessage' },
  { name: 'Callback processing', pattern: 'processCallbackQuery' },
  { name: 'Media support', pattern: 'sendMedia' },
  { name: 'Inline keyboard', pattern: 'buildInlineKeyboard' },
  { name: 'Error handling', pattern: 'emitError' },
  { name: 'API retry logic', pattern: 'retryAttempts' }
];

for (const feature of features) {
  const hasFeature = telegramAdapterContent.includes(feature.pattern);
  console.log(`  ${hasFeature ? '✅' : '❌'} ${feature.name}`);
}

console.log('\n📋 Checking MessengerAdapter inheritance:');
const extendsMessengerAdapter = telegramAdapterContent.includes('extends MessengerAdapter');
console.log(`  ${extendsMessengerAdapter ? '✅' : '❌'} Extends MessengerAdapter`);

console.log('\n📋 Checking TypeScript types:');
const hasTypes = telegramAdapterContent.includes('PlatformCredentials') &&
                telegramAdapterContent.includes('IncomingMessage') &&
                telegramAdapterContent.includes('CallbackQuery');
console.log(`  ${hasTypes ? '✅' : '❌'} Uses proper TypeScript types`);

console.log('\n📊 Telegram Adapter Analysis Results:');

// Подсчитываем статистику
const methodsCount = requiredMethods.filter(method => 
  telegramAdapterContent.includes(`async ${method}(`) || 
  telegramAdapterContent.includes(`${method}(`)
).length;

const featuresCount = features.filter(feature => 
  telegramAdapterContent.includes(feature.pattern)
).length;

console.log(`✅ Required methods implemented: ${methodsCount}/${requiredMethods.length}`);
console.log(`✅ Features implemented: ${featuresCount}/${features.length}`);
console.log(`✅ Proper inheritance: ${extendsMessengerAdapter ? 'Yes' : 'No'}`);
console.log(`✅ TypeScript types: ${hasTypes ? 'Yes' : 'No'}`);

const successRate = ((methodsCount + featuresCount + (extendsMessengerAdapter ? 1 : 0) + (hasTypes ? 1 : 0)) / 
                    (requiredMethods.length + features.length + 2)) * 100;

console.log(`📈 Implementation completeness: ${successRate.toFixed(1)}%`);

if (successRate >= 90) {
  console.log('\n🎉 Telegram adapter is well implemented!');
  process.exit(0);
} else if (successRate >= 70) {
  console.log('\n⚠️ Telegram adapter needs some improvements');
  process.exit(0);
} else {
  console.log('\n💥 Telegram adapter needs significant work');
  process.exit(1);
}