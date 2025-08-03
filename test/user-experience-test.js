const fs = require('fs');
const path = require('path');

console.log('👤 Тестирование пользовательского опыта бота №1...\n');

// Загружаем схему бота
const botPath = path.join(__dirname, '..', 'data', 'bots', 'bot_01_main_test_bot.json');
const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));

// Симулируем пользовательские сценарии
console.log('🎭 Симуляция пользовательских сценариев:\n');

// Сценарий 1: Новый пользователь запускает бота
console.log('📱 Сценарий 1: Новый пользователь запускает бота');
console.log('   Пользователь: отправляет /start');

const startNode = botData.configuration.nodes.find(n => n.type === 'start');
if (startNode) {
    console.log('   ✅ Бот: активирует стартовый узел');
    
    // Находим следующий узел
    const startConnection = botData.configuration.connections.find(c => c.sourceNodeId === startNode.id);
    if (startConnection) {
        const menuNode = botData.configuration.nodes.find(n => n.id === startConnection.targetNodeId);
        if (menuNode && menuNode.type === 'send_message_with_keyboard') {
            console.log('   📋 Бот: показывает главное меню');
            console.log(`   💬 Текст: "${menuNode.config.text}"`);
            
            const buttons = menuNode.config.keyboard?.buttons || [];
            console.log('   🎛️  Доступные кнопки:');
            buttons.forEach((row, i) => {
                row.forEach(button => {
                    console.log(`      • ${button.text} (${button.callback_data})`);
                });
            });
        }
    }
}

console.log('\n📱 Сценарий 2: Пользователь нажимает "📖 Справка"');
console.log('   Пользователь: нажимает кнопку "📖 Справка"');

const helpHandler = botData.configuration.nodes.find(n => 
    n.type === 'callback_handler' && n.config.callback_data === 'help'
);

if (helpHandler) {
    console.log('   ✅ Бот: активирует обработчик справки');
    
    const helpConnection = botData.configuration.connections.find(c => c.sourceNodeId === helpHandler.id);
    if (helpConnection) {
        const helpTextNode = botData.configuration.nodes.find(n => n.id === helpConnection.targetNodeId);
        if (helpTextNode) {
            console.log('   📖 Бот: отправляет справочную информацию');
            console.log(`   💬 Текст: "${helpTextNode.config.text.substring(0, 100)}..."`);
        }
    }
}

console.log('\n📱 Сценарий 3: Пользователь нажимает "🧪 Тест"');
console.log('   Пользователь: нажимает кнопку "🧪 Тест"');

const testHandler = botData.configuration.nodes.find(n => 
    n.type === 'callback_handler' && n.config.callback_data === 'test'
);

if (testHandler) {
    console.log('   ✅ Бот: активирует обработчик теста');
    
    const testConnection = botData.configuration.connections.find(c => c.sourceNodeId === testHandler.id);
    if (testConnection) {
        const testResponseNode = botData.configuration.nodes.find(n => n.id === testConnection.targetNodeId);
        if (testResponseNode) {
            console.log('   🧪 Бот: выполняет тест и показывает результат');
            console.log(`   💬 Текст: "${testResponseNode.config.text.substring(0, 100)}..."`);
        }
    }
}

console.log('\n📱 Сценарий 4: Пользователь нажимает "ℹ️ О боте"');
console.log('   Пользователь: нажимает кнопку "ℹ️ О боте"');

const aboutHandler = botData.configuration.nodes.find(n => 
    n.type === 'callback_handler' && n.config.callback_data === 'about'
);

if (aboutHandler) {
    console.log('   ✅ Бот: активирует обработчик информации');
    
    const aboutConnection = botData.configuration.connections.find(c => c.sourceNodeId === aboutHandler.id);
    if (aboutConnection) {
        const aboutTextNode = botData.configuration.nodes.find(n => n.id === aboutConnection.targetNodeId);
        if (aboutTextNode) {
            console.log('   ℹ️  Бот: показывает информацию о системе');
            console.log(`   💬 Текст: "${aboutTextNode.config.text.substring(0, 100)}..."`);
        }
    }
}

// Анализ интуитивности интерфейса
console.log('\n🧠 Анализ интуитивности интерфейса:');

// Проверяем понятность названий узлов
const nodeNames = botData.configuration.nodes.map(n => n.config.name || n.type);
const russianNodes = nodeNames.filter(name => /[а-яё]/i.test(name));
console.log(`   📝 Русские названия: ${russianNodes.length}/${nodeNames.length} узлов`);

// Проверяем использование эмодзи
const emojiNodes = nodeNames.filter(name => 
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(name)
);
console.log(`   😊 Эмодзи в названиях: ${emojiNodes.length}/${nodeNames.length} узлов`);

// Проверяем логичность потока
const menuNode = botData.configuration.nodes.find(n => n.type === 'send_message_with_keyboard');
let buttons = [];
let handlers = [];
let matchingHandlers = [];

if (menuNode) {
    buttons = menuNode.config.keyboard?.buttons?.flat() || [];
    handlers = botData.configuration.nodes.filter(n => n.type === 'callback_handler');
    
    console.log(`   🎛️  Кнопок в меню: ${buttons.length}`);
    console.log(`   🔧 Обработчиков: ${handlers.length}`);
    
    matchingHandlers = buttons.filter(button => 
        handlers.some(handler => handler.config.callback_data === button.callback_data)
    );
    
    console.log(`   ✅ Кнопок с обработчиками: ${matchingHandlers.length}/${buttons.length}`);
}

// Рекомендации по улучшению
console.log('\n💡 Рекомендации по улучшению:');

// Проверяем возможность возврата в меню
const backToMenuConnections = botData.configuration.connections.filter(c => 
    c.targetNodeId === menuNode?.id && c.sourceNodeId !== startNode?.id
);

if (backToMenuConnections.length === 0) {
    console.log('   🔄 Добавить кнопки "Назад в меню" для лучшей навигации');
}

// Проверяем обработку неизвестных команд
const hasDefaultHandler = botData.configuration.nodes.some(n => 
    n.type === 'callback_handler' && n.config.callback_data === 'default'
);

if (!hasDefaultHandler) {
    console.log('   ❓ Добавить обработчик неизвестных команд');
}

// Проверяем персонализацию
const hasUserVariables = Object.keys(botData.configuration.variables || {}).length > 0;
if (!hasUserVariables) {
    console.log('   👤 Рассмотреть добавление переменных для персонализации');
}

console.log('\n📊 Итоговая оценка пользовательского опыта:');

let uxScore = 0;
let maxUxScore = 8;

// Критерии оценки UX
if (startNode) uxScore++; // Есть четкая точка входа
if (menuNode) uxScore++; // Есть главное меню
if (russianNodes.length >= nodeNames.length * 0.8) uxScore++; // Русские названия
if (emojiNodes.length >= nodeNames.length * 0.5) uxScore++; // Эмодзи для визуализации
if (buttons && handlers && matchingHandlers.length === buttons.length) uxScore++; // Все кнопки работают
if (menuNode?.config?.text && menuNode.config.text.length > 10) uxScore++; // Информативное приветствие
if (botData.configuration.connections.length >= botData.configuration.nodes.length - 2) uxScore++; // Хорошая связность
if (botData.configuration.nodes.length >= 5) uxScore++; // Достаточная функциональность

const uxPercentage = Math.round((uxScore / maxUxScore) * 100);
console.log(`   UX Оценка: ${uxScore}/${maxUxScore} (${uxPercentage}%)`);

if (uxPercentage >= 90) {
    console.log('   🏆 Превосходный пользовательский опыт!');
} else if (uxPercentage >= 75) {
    console.log('   👍 Хороший пользовательский опыт');
} else if (uxPercentage >= 60) {
    console.log('   🔧 Пользовательский опыт требует улучшений');
} else {
    console.log('   ❌ Пользовательский опыт нуждается в серьезной доработке');
}

console.log('\n✅ Тестирование пользовательского опыта завершено!');