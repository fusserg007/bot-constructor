/**
 * Тест интеграции демо-бота с системой
 */

const http = require('http');

// Функция для HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Тест интеграции демо-бота
async function testDemoBotIntegration() {
  console.log('🧪 Тестирование интеграции демо-бота с системой...\n');
  
  try {
    // Получаем список всех ботов
    console.log('📋 Получаем список ботов...');
    
    const botsRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/bots',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (botsRequest.statusCode !== 200) {
      console.error('❌ Не удалось получить список ботов');
      return false;
    }
    
    const botsResponse = JSON.parse(botsRequest.data);
    const bots = botsResponse.data ? botsResponse.data.bots : botsResponse;
    
    console.log(`✅ Получено ботов: ${bots.length}`);
    
    // Ищем демо-ботов
    const demoBots = bots.filter(bot => bot.name === 'Demo Bot');
    console.log(`🤖 Найдено демо-ботов: ${demoBots.length}`);
    
    if (demoBots.length === 0) {
      console.log('⚠️ Демо-боты не найдены. Создайте демо-бота командой:');
      console.log('   node src/create-demo-bot.js');
      return false;
    }
    
    // Тестируем первого найденного демо-бота
    const demoBot = demoBots[0];
    console.log(`\n🔍 Тестируем демо-бота: ${demoBot.id}`);
    
    // Получаем детальную информацию о боте
    const botRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/bots/${demoBot.id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (botRequest.statusCode !== 200) {
      console.error('❌ Не удалось получить детали бота');
      return false;
    }
    
    const botDetails = JSON.parse(botRequest.data);
    const bot = botDetails.data || botDetails;
    
    console.log('✅ Детали бота получены');
    
    // Проверяем структуру бота
    const checks = [
      { 
        condition: bot.name === 'Demo Bot', 
        name: 'Название бота',
        value: bot.name 
      },
      { 
        condition: bot.description && bot.description.includes('demonstration'), 
        name: 'Описание бота',
        value: bot.description ? bot.description.substring(0, 50) + '...' : 'Нет'
      },
      { 
        condition: bot.status === 'draft', 
        name: 'Статус бота',
        value: bot.status 
      },
      { 
        condition: bot.platforms && bot.platforms.length > 0, 
        name: 'Платформы настроены',
        value: bot.platforms ? bot.platforms.length : 0
      },
      { 
        condition: bot.configuration && bot.configuration.nodes, 
        name: 'Конфигурация узлов',
        value: bot.configuration && bot.configuration.nodes ? bot.configuration.nodes.length : 0
      },
      { 
        condition: bot.configuration && bot.configuration.edges, 
        name: 'Связи между узлами',
        value: bot.configuration && bot.configuration.edges ? bot.configuration.edges.length : 0
      },
      { 
        condition: bot.configuration && bot.configuration.variables, 
        name: 'Переменные бота',
        value: bot.configuration && bot.configuration.variables ? Object.keys(bot.configuration.variables).length : 0
      }
    ];
    
    console.log('\n📊 Проверка структуры бота:');
    let passedChecks = 0;
    
    checks.forEach(check => {
      if (check.condition) {
        console.log(`✅ ${check.name}: ${check.value}`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name}: ${check.value}`);
      }
    });
    
    console.log(`\n📈 Результат: ${passedChecks}/${checks.length} проверок пройдено`);
    
    // Проверяем команды бота
    if (bot.configuration && bot.configuration.nodes) {
      const commandNodes = bot.configuration.nodes.filter(node => node.type === 'trigger-command');
      
      console.log('\n📋 Команды бота:');
      commandNodes.forEach(node => {
        console.log(`  • ${node.data.command} - ${node.data.description || node.data.label}`);
      });
    }
    
    // Тестируем экспорт бота
    console.log('\n📦 Тестируем экспорт бота...');
    
    const exportRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/export/${demoBot.id}/nodejs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ 
      options: {
        includeComments: true,
        minify: false
      }
    }), true);
    
    if (exportRequest.statusCode === 200) {
      console.log('✅ Экспорт в Node.js работает');
      console.log(`📊 Размер архива: ${Math.round(exportRequest.data.length / 1024)} KB`);
    } else {
      console.log('❌ Экспорт в Node.js не работает:', exportRequest.statusCode);
    }
    
    // Общий результат
    const success = passedChecks >= checks.length * 0.8; // 80% проверок должны пройти
    
    if (success) {
      console.log('\n🎉 Демо-бот успешно интегрирован в систему!');
      
      console.log('\n💡 Рекомендации для пользователей:');
      console.log('1. Откройте Dashboard: http://localhost:3002');
      console.log('2. Найдите "Demo Bot" в списке ботов');
      console.log('3. Нажмите "Edit" для редактирования в визуальном редакторе');
      console.log('4. Изучите структуру бота и команды');
      console.log('5. Настройте реальный токен в "Platforms" для тестирования');
      console.log('6. Экспортируйте бота в Node.js код для запуска');
      
    } else {
      console.log('\n⚠️ Демо-бот создан, но есть проблемы с интеграцией');
    }
    
    return success;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования интеграции:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Убедитесь что сервер запущен:');
      console.log('   node server.js');
    }
    
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🎯 Тестирование интеграции демо-бота\n');
  console.log('='.repeat(60));
  
  const success = await testDemoBotIntegration();
  
  console.log('\n' + '='.repeat(60));
  
  if (success) {
    console.log('✅ Тестирование завершено успешно');
  } else {
    console.log('❌ Тестирование завершено с ошибками');
  }
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  testDemoBotIntegration
};