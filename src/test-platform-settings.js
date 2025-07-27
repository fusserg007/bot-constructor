/**
 * Тестирование API настроек платформ
 */

const express = require('express');
const platformRoutes = require('../routes/platforms');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/api/bots', platformRoutes);

console.log('🧪 Тестирование API настроек платформ...\n');

// Создаем тестового бота
const testBotId = 'test-platform-bot';
const testBotPath = path.join(__dirname, '..', 'data', 'bots', `bot_${testBotId}.json`);

// Убеждаемся что директория существует
const botsDir = path.dirname(testBotPath);
if (!fs.existsSync(botsDir)) {
  fs.mkdirSync(botsDir, { recursive: true });
}

// Создаем тестового бота
const testBot = {
  id: testBotId,
  name: 'Тестовый бот для платформ',
  description: 'Бот для тестирования настроек платформ',
  status: 'draft',
  platforms: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

fs.writeFileSync(testBotPath, JSON.stringify(testBot, null, 2));

// Запускаем сервер для тестов
const server = app.listen(3004, async () => {
  try {
    // Тест 1: Получение доступных платформ
    console.log('1. Тестирование получения доступных платформ:');
    const response1 = await fetch('http://localhost:3004/api/bots/available');
    const availablePlatforms = await response1.json();
    console.log(`✅ Найдено платформ: ${availablePlatforms.platforms.length}`);
    availablePlatforms.platforms.forEach((platform, index) => {
      console.log(`   ${index + 1}. ${platform.name} (${platform.id})`);
    });

    // Тест 2: Получение настроек платформ для бота
    console.log('\n2. Тестирование получения настроек платформ:');
    const response2 = await fetch(`http://localhost:3004/api/bots/${testBotId}/platforms`);
    const botPlatforms = await response2.json();
    console.log(`✅ Настройки получены: ${botPlatforms.platforms.length} платформ`);

    // Тест 3: Обновление настроек платформ
    console.log('\n3. Тестирование обновления настроек платформ:');
    const platformsConfig = [
      {
        platform: 'telegram',
        enabled: true,
        credentials: { token: '123456789:AAAA-test-token' },
        mode: 'polling',
        status: 'disconnected'
      },
      {
        platform: 'max',
        enabled: false,
        credentials: {},
        mode: 'webhook',
        status: 'disconnected'
      }
    ];

    const response3 = await fetch(`http://localhost:3004/api/bots/${testBotId}/platforms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: platformsConfig })
    });
    const updateResult = await response3.json();
    console.log(`✅ Настройки обновлены: ${updateResult.success}`);

    // Тест 4: Тестирование подключения к Telegram (с неверным токеном)
    console.log('\n4. Тестирование подключения к Telegram (неверный токен):');
    const response4 = await fetch(`http://localhost:3004/api/bots/${testBotId}/platforms/telegram/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: { token: 'invalid-token' },
        mode: 'polling'
      })
    });
    const testResult = await response4.json();
    console.log(`✅ Тест подключения: ${testResult.success ? 'успешно' : 'ошибка'}`);
    if (!testResult.success) {
      console.log(`   Ошибка: ${testResult.error}`);
    }

    // Тест 5: Тестирование подключения к MAX (демо)
    console.log('\n5. Тестирование подключения к MAX (демо):');
    const response5 = await fetch(`http://localhost:3004/api/bots/${testBotId}/platforms/max/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: { apiKey: 'test-key', secretKey: 'test-secret' },
        mode: 'webhook'
      })
    });
    const maxTestResult = await response5.json();
    console.log(`✅ Тест MAX: ${maxTestResult.success ? 'успешно' : 'ошибка'}`);
    if (maxTestResult.message) {
      console.log(`   Сообщение: ${maxTestResult.message}`);
    }

    // Тест 6: Проверка сохранения настроек
    console.log('\n6. Проверка сохранения настроек:');
    const response6 = await fetch(`http://localhost:3004/api/bots/${testBotId}/platforms`);
    const savedPlatforms = await response6.json();
    console.log(`✅ Сохранено платформ: ${savedPlatforms.platforms.length}`);
    savedPlatforms.platforms.forEach((platform, index) => {
      console.log(`   ${index + 1}. ${platform.platform}: ${platform.enabled ? 'включена' : 'выключена'}`);
    });

    // Тест 7: Обработка ошибок
    console.log('\n7. Тестирование обработки ошибок:');
    const response7 = await fetch('http://localhost:3004/api/bots/non-existent-bot/platforms');
    console.log(`✅ Статус ответа для несуществующего бота: ${response7.status}`);

    console.log('\n🎉 Все тесты API настроек платформ завершены!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error.message);
  } finally {
    // Очищаем тестовые данные
    if (fs.existsSync(testBotPath)) {
      fs.unlinkSync(testBotPath);
      console.log('\n🧹 Тестовые данные очищены');
    }
    
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
            ok: res.statusCode >= 200 && res.statusCode < 300,
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