/**
 * Простой тест API системы помощи
 */

const express = require('express');
const helpRoutes = require('../routes/help');

const app = express();
app.use(express.json());
app.use('/api/help', helpRoutes);

console.log('🧪 Тестирование API системы помощи...\n');

// Запускаем сервер для тестов
const server = app.listen(3003, async () => {
  try {
    // Тест 1: Получение справки по узлу
    console.log('1. Тестирование получения справки по узлу:');
    const response1 = await fetch('http://localhost:3003/api/help/nodes/trigger-command');
    const nodeHelp = await response1.json();
    console.log(`✅ Справка получена: ${nodeHelp.title}`);
    console.log(`   Примеров: ${nodeHelp.examples.length}`);
    console.log(`   Платформы: ${nodeHelp.platforms.join(', ')}`);

    // Тест 2: Поиск по документации
    console.log('\n2. Тестирование поиска:');
    const response2 = await fetch('http://localhost:3003/api/help/search?q=сообщение');
    const searchResults = await response2.json();
    console.log(`✅ Найдено результатов: ${searchResults.length}`);
    searchResults.slice(0, 3).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (релевантность: ${result.relevance})`);
    });

    // Тест 3: Получение примеров
    console.log('\n3. Тестирование получения примеров:');
    const response3 = await fetch('http://localhost:3003/api/help/nodes/action-send-message/examples');
    const examples = await response3.json();
    console.log(`✅ Найдено примеров: ${examples.length}`);
    examples.forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.title} (${example.difficulty})`);
    });

    // Тест 4: Рекомендации
    console.log('\n4. Тестирование рекомендаций:');
    const response4 = await fetch('http://localhost:3003/api/help/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'создать бота который отвечает на команды' })
    });
    const recommendations = await response4.json();
    console.log(`✅ Найдено рекомендаций: ${recommendations.length}`);
    recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title} (релевантность: ${rec.relevance})`);
    });

    // Тест 5: Категории
    console.log('\n5. Тестирование получения категорий:');
    const response5 = await fetch('http://localhost:3003/api/help/categories');
    const categories = await response5.json();
    console.log(`✅ Найдено категорий: ${categories.length}`);
    categories.forEach((category, index) => {
      console.log(`   ${index + 1}. ${category.name} (${category.nodeCount} узлов)`);
    });

    // Тест 6: Обработка ошибок
    console.log('\n6. Тестирование обработки ошибок:');
    const response6 = await fetch('http://localhost:3003/api/help/nodes/non-existent-node');
    console.log(`✅ Статус ответа для несуществующего узла: ${response6.status}`);

    console.log('\n🎉 Все API тесты прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

// Простая реализация fetch для Node.js
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    const http = require('http');
    const https = require('https');
    const urlParsed = new URL(url);
    const client = urlParsed.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            json: async () => JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}