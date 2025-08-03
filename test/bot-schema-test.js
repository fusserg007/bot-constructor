const fs = require('fs');
const path = require('path');

console.log('🔍 Тестирование схемы бота №1...\n');

// Загружаем схему бота
const botPath = path.join(__dirname, '..', 'data', 'bots', 'bot_01_main_test_bot.json');
const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));

console.log('📋 Информация о боте:');
console.log(`   Название: ${botData.name}`);
console.log(`   ID: ${botData.id}`);
console.log(`   Статус: ${botData.status}`);
console.log(`   Использует визуальный редактор: ${botData.useVisualEditor}\n`);

// Проверяем структуру схемы
const config = botData.configuration;
console.log('🔧 Анализ схемы:');
console.log(`   Количество узлов: ${config.nodes.length}`);
console.log(`   Количество соединений: ${config.connections.length}\n`);

// Проверяем узлы
console.log('📦 Узлы схемы:');
config.nodes.forEach((node, index) => {
    const name = node.config.name || node.config.description || node.type;
    console.log(`   ${index + 1}. ${name} (${node.type})`);
    
    // Проверяем специальные свойства
    if (node.type === 'send_message_with_keyboard') {
        const buttons = node.config.keyboard?.buttons || [];
        const buttonCount = buttons.flat().length;
        console.log(`      └─ Кнопок в меню: ${buttonCount}`);
    }
    
    if (node.type === 'callback_handler') {
        console.log(`      └─ Обрабатывает: ${node.config.callback_data}`);
    }
});

console.log('\n🔗 Соединения:');
config.connections.forEach((conn, index) => {
    const sourceNode = config.nodes.find(n => n.id === conn.sourceNodeId);
    const targetNode = config.nodes.find(n => n.id === conn.targetNodeId);
    
    const sourceName = sourceNode?.config?.name || sourceNode?.type || 'Unknown';
    const targetName = targetNode?.config?.name || targetNode?.type || 'Unknown';
    
    console.log(`   ${index + 1}. ${sourceName} → ${targetName}`);
});

// Проверяем пользовательский опыт
console.log('\n👤 Анализ пользовательского опыта:');

// Проверяем наличие стартового узла
const startNode = config.nodes.find(n => n.type === 'start');
if (startNode) {
    console.log('   ✅ Есть стартовый узел');
} else {
    console.log('   ❌ Отсутствует стартовый узел');
}

// Проверяем наличие меню
const menuNode = config.nodes.find(n => n.type === 'send_message_with_keyboard');
if (menuNode) {
    console.log('   ✅ Есть интерактивное меню');
    const buttons = menuNode.config.keyboard?.buttons || [];
    const buttonTexts = buttons.flat().map(b => b.text);
    console.log(`   📱 Кнопки меню: ${buttonTexts.join(', ')}`);
} else {
    console.log('   ❌ Отсутствует интерактивное меню');
}

// Проверяем русские названия
const russianNames = config.nodes.filter(n => 
    n.config.name && /[а-яё]/i.test(n.config.name)
).length;

console.log(`   🇷🇺 Узлов с русскими названиями: ${russianNames}/${config.nodes.length}`);

// Проверяем эмодзи
const emojiNodes = config.nodes.filter(n => 
    n.config.name && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(n.config.name)
).length;

console.log(`   😊 Узлов с эмодзи: ${emojiNodes}/${config.nodes.length}`);

// Проверяем логику потока
console.log('\n🔄 Проверка логики потока:');

// Проверяем, что стартовый узел связан с меню
const startConnection = config.connections.find(c => c.sourceNodeId === startNode?.id);
if (startConnection && startConnection.targetNodeId === menuNode?.id) {
    console.log('   ✅ Стартовый узел правильно связан с главным меню');
} else {
    console.log('   ⚠️  Проверьте связь между стартовым узлом и главным меню');
}

// Проверяем обработчики кнопок
const callbackHandlers = config.nodes.filter(n => n.type === 'callback_handler');
console.log(`   🎛️  Обработчиков кнопок: ${callbackHandlers.length}`);

callbackHandlers.forEach(handler => {
    const hasConnection = config.connections.some(c => c.sourceNodeId === handler.id);
    if (hasConnection) {
        console.log(`   ✅ Обработчик "${handler.config.callback_data}" имеет выходное соединение`);
    } else {
        console.log(`   ❌ Обработчик "${handler.config.callback_data}" не имеет выходного соединения`);
    }
});

console.log('\n📊 Итоговая оценка схемы:');
let score = 0;
let maxScore = 6;

if (startNode) score++;
if (menuNode) score++;
if (russianNames >= config.nodes.length * 0.8) score++;
if (emojiNodes >= config.nodes.length * 0.5) score++;
if (callbackHandlers.length > 0) score++;
if (config.connections.length >= config.nodes.length - 1) score++;

const percentage = Math.round((score / maxScore) * 100);
console.log(`   Оценка: ${score}/${maxScore} (${percentage}%)`);

if (percentage >= 90) {
    console.log('   🏆 Отличная схема! Готова к использованию');
} else if (percentage >= 70) {
    console.log('   👍 Хорошая схема, есть небольшие улучшения');
} else {
    console.log('   🔧 Схема требует доработки');
}

console.log('\n✅ Тестирование схемы завершено!');