/**
 * Тест API экспорта в Node.js код
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Функция для HTTP запроса
function makeRequest(options, postData = null, binary = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const data = binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString();
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

// Тест экспорта через API
async function testExportAPI() {
  console.log('🧪 Тестирование API экспорта в Node.js код...\n');
  
  try {
    // Проверяем, что сервер запущен
    console.log('🔍 Проверяем доступность сервера...');
    
    const healthCheck = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/bots',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (healthCheck.statusCode !== 200) {
      console.error('❌ Сервер недоступен. Запустите сервер командой: npm start');
      return;
    }
    
    console.log('✅ Сервер доступен');
    
    // Тестируем экспорт простого бота
    const botId = 'simple-test-bot';
    console.log(`\n📤 Тестируем экспорт бота: ${botId}`);
    
    const exportOptions = {
      includeComments: true,
      minify: false,
      platform: 'telegram'
    };
    
    const exportRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/export/${botId}/nodejs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ options: exportOptions }), true);
    
    console.log(`📊 Статус ответа: ${exportRequest.statusCode}`);
    
    if (exportRequest.statusCode === 200) {
      console.log('✅ Экспорт успешен!');
      console.log('📁 Получен ZIP архив с экспортированным кодом');
      
      // Сохраняем архив для проверки
      const archivePath = path.join(__dirname, '..', 'temp', `exported-${botId}-${Date.now()}.zip`);
      fs.writeFileSync(archivePath, exportRequest.data);
      console.log(`💾 Архив сохранен: ${archivePath}`);
      
    } else if (exportRequest.statusCode === 404) {
      console.error('❌ Бот не найден');
      console.log('📋 Доступные боты:');
      
      // Получаем список ботов
      const botsRequest = await makeRequest({
        hostname: 'localhost',
        port: 3002,
        path: '/api/bots',
        method: 'GET'
      });
      
      if (botsRequest.statusCode === 200) {
        const bots = JSON.parse(botsRequest.data);
        bots.forEach(bot => {
          console.log(`  - ${bot.id}: ${bot.name}`);
        });
      }
      
    } else {
      console.error('❌ Ошибка экспорта:', exportRequest.statusCode);
      console.log('📄 Ответ сервера:', exportRequest.data);
    }
    
    // Тестируем экспорт с другими опциями
    console.log('\n🔧 Тестируем экспорт с минификацией...');
    
    const minifiedExportRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/export/${botId}/nodejs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ 
      options: {
        includeComments: false,
        minify: true,
        platform: 'telegram'
      }
    }), true);
    
    if (minifiedExportRequest.statusCode === 200) {
      console.log('✅ Минифицированный экспорт успешен!');
    } else {
      console.log('⚠️ Минифицированный экспорт не удался:', minifiedExportRequest.statusCode);
    }
    
    // Тестируем экспорт несуществующего бота
    console.log('\n🚫 Тестируем экспорт несуществующего бота...');
    
    const notFoundRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/export/nonexistent-bot/nodejs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ options: exportOptions }));
    
    if (notFoundRequest.statusCode === 404) {
      console.log('✅ Корректно обработан запрос несуществующего бота (404)');
    } else {
      console.log('⚠️ Неожиданный ответ для несуществующего бота:', notFoundRequest.statusCode);
    }
    
    console.log('\n🎉 Тестирование API экспорта завершено!');
    
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Убедитесь что сервер запущен:');
      console.log('   npm start');
      console.log('   или');
      console.log('   node server.js');
    }
  }
}

// Тест создания тестового бота для экспорта
async function createTestBot() {
  console.log('🤖 Создаем тестового бота для экспорта...\n');
  
  const testBot = {
    name: 'Экспорт Тест Бот',
    description: 'Специальный бот для тестирования экспорта в Node.js',
    platforms: [
      {
        platform: 'telegram',
        enabled: true
      }
    ],
    configuration: {
      nodes: [
        {
          id: 'start-cmd',
          type: 'trigger-command',
          data: {
            command: '/start',
            label: 'Старт',
            description: 'Команда запуска'
          }
        },
        {
          id: 'start-msg',
          type: 'action-send-message',
          data: {
            text: '🚀 Привет! Это экспортированный бот!\n\nЯ был создан в конструкторе и экспортирован в Node.js код.',
            label: 'Приветствие',
            parseMode: 'HTML'
          }
        },
        {
          id: 'info-cmd',
          type: 'trigger-command',
          data: {
            command: '/info',
            label: 'Информация',
            description: 'Информация о боте'
          }
        },
        {
          id: 'info-msg',
          type: 'action-send-message',
          data: {
            text: '📊 <b>Информация о боте:</b>\n\n• Создан: в конструкторе ботов\n• Экспортирован: в Node.js код\n• Сообщений: {{message_count}}\n• Пользователей: {{user_count}}',
            label: 'Информация',
            parseMode: 'HTML'
          }
        }
      ],
      edges: [
        {
          id: 'start-edge',
          source: 'start-cmd',
          target: 'start-msg'
        },
        {
          id: 'info-edge',
          source: 'info-cmd',
          target: 'info-msg'
        }
      ],
      variables: {
        message_count: {
          type: 'number',
          defaultValue: 0
        },
        user_count: {
          type: 'number',
          defaultValue: 0
        }
      }
    }
  };
  
  try {
    const createRequest = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/bots',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify(testBot));
    
    if (createRequest.statusCode === 201) {
      const createdBot = JSON.parse(createRequest.data);
      console.log('✅ Тестовый бот создан!');
      console.log(`📋 ID: ${createdBot.id}`);
      console.log(`📝 Название: ${createdBot.name}`);
      return createdBot.id;
    } else {
      console.error('❌ Ошибка создания бота:', createRequest.statusCode);
      console.log('📄 Ответ:', createRequest.data);
      return null;
    }
    
  } catch (error) {
    console.error('💥 Ошибка создания тестового бота:', error.message);
    return null;
  }
}

// Основная функция тестирования
async function runFullTest() {
  console.log('🧪 Полное тестирование системы экспорта Node.js\n');
  console.log('=' .repeat(50));
  
  // Тестируем API экспорта
  await testExportAPI();
  
  console.log('\n' + '='.repeat(50));
  
  // Создаем и тестируем нового бота
  const newBotId = await createTestBot();
  
  if (newBotId) {
    console.log(`\n📤 Тестируем экспорт нового бота: ${newBotId}`);
    
    try {
      const exportRequest = await makeRequest({
        hostname: 'localhost',
        port: 3002,
        path: `/api/export/${newBotId}/nodejs`,
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
        console.log('✅ Экспорт нового бота успешен!');
        
        const archivePath = path.join(__dirname, '..', 'temp', `new-bot-export-${Date.now()}.zip`);
        fs.writeFileSync(archivePath, exportRequest.data);
        console.log(`💾 Архив сохранен: ${archivePath}`);
      } else {
        console.log('❌ Ошибка экспорта нового бота:', exportRequest.statusCode);
      }
      
    } catch (error) {
      console.error('💥 Ошибка экспорта нового бота:', error.message);
    }
  }
  
  console.log('\n🎯 Полное тестирование завершено!');
}

// Запуск тестов
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--full')) {
    runFullTest();
  } else if (args.includes('--create')) {
    createTestBot();
  } else {
    testExportAPI();
  }
}

module.exports = {
  testExportAPI,
  createTestBot,
  runFullTest
};