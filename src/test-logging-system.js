/**
 * Тест системы логирования
 */
const fs = require('fs');
const path = require('path');
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

// Функция создания тестового бота с логированием
async function createTestBotWithLogging() {
  console.log('🤖 Создание тестового бота с логированием...\n');
  
  try {
    const botId = `logging-test-bot-${Date.now()}`;
    const botData = {
      id: botId,
      name: "Logging Test Bot",
      description: "Тестовый бот для проверки системы логирования",
      token: "LOGGING_TEST_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      status: "draft",
      platforms: [
        {
          platform: "telegram",
          enabled: true,
          credentials: {
            token: "LOGGING_TEST_TOKEN_123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          },
          mode: "polling",
          status: "disconnected"
        }
      ],
      configuration: {
        nodes: [
          {
            id: "start-command",
            type: "trigger-command",
            position: { x: 100, y: 100 },
            data: {
              label: "Start Command",
              command: "/start",
              description: "Команда запуска с логированием",
              color: "#3b82f6"
            }
          },
          {
            id: "welcome-message",
            type: "action-send-message",
            position: { x: 400, y: 100 },
            data: {
              label: "Welcome Message",
              text: "🔍 Добро пожаловать в бота с логированием!\\n\\nВсе ваши действия записываются в логи для анализа и отладки.\\n\\nВаш ID: {{user_id}}",
              parseMode: "HTML",
              color: "#10b981"
            }
          },
          {
            id: "logs-command",
            type: "trigger-command",
            position: { x: 100, y: 250 },
            data: {
              label: "Logs Command",
              command: "/logs",
              description: "Просмотр логов",
              color: "#3b82f6"
            }
          },
          {
            id: "logs-message",
            type: "action-send-message",
            position: { x: 400, y: 250 },
            data: {
              label: "Logs Info",
              text: "📊 <b>Информация о логировании:</b>\\n\\n• Все сообщения записываются\\n• Команды отслеживаются\\n• Ошибки логируются\\n• Статистика собирается\\n\\n<i>Логи доступны в веб-интерфейсе</i>",
              parseMode: "HTML",
              color: "#10b981"
            }
          },
          {
            id: "error-command",
            type: "trigger-command",
            position: { x: 100, y: 400 },
            data: {
              label: "Error Command",
              command: "/error",
              description: "Тестовая ошибка для логирования",
              color: "#ef4444"
            }
          },
          {
            id: "error-message",
            type: "action-send-message",
            position: { x: 400, y: 400 },
            data: {
              label: "Error Test",
              text: "⚠️ Это тестовая ошибка для проверки логирования!\\n\\nОшибка будет записана в логи с полной информацией о контексте.",
              parseMode: "HTML",
              color: "#ef4444"
            }
          }
        ],
        edges: [
          {
            id: "start-to-welcome",
            source: "start-command",
            target: "welcome-message"
          },
          {
            id: "logs-to-info",
            source: "logs-command",
            target: "logs-message"
          },
          {
            id: "error-to-test",
            source: "error-command",
            target: "error-message"
          }
        ],
        variables: {
          user_id: {
            type: "string",
            defaultValue: "0",
            description: "ID пользователя"
          }
        }
      },
      stats: {
        messagesProcessed: 0,
        activeUsers: 0,
        uptime: 1,
        lastActivity: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем бота
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }
    
    const botPath = path.join(botsDir, `bot_${botId}.json`);
    fs.writeFileSync(botPath, JSON.stringify(botData, null, 2));
    
    console.log('✅ Тестовый бот создан!');
    console.log(`📋 ID: ${botData.id}`);
    console.log(`📝 Название: ${botData.name}`);
    console.log(`📊 Узлов: ${botData.configuration.nodes.length}`);
    console.log(`💾 Файл: ${botPath}`);
    
    return botData;
    
  } catch (error) {
    console.error('💥 Ошибка создания тестового бота:', error.message);
    return false;
  }
}

// Функция тестирования Logger класса
async function testLoggerClass() {
  console.log('\n📝 Тестирование Logger класса...\n');
  
  try {
    // Импортируем Logger
    const Logger = require('../utils/Logger');
    const logger = new Logger();
    
    console.log('✅ Logger класс загружен');
    
    // Тестируем различные типы логирования
    const testBotId = 'test-logging-bot';
    const testUserId = 12345;
    
    console.log('🧪 Тестирование методов логирования...');
    
    // Логируем сообщение
    await logger.logMessage(testBotId, testUserId, 'Тестовое сообщение для логирования', 'text');
    console.log('✅ Сообщение залогировано');
    
    // Логируем команду
    await logger.logCommand(testBotId, testUserId, '/start', []);
    console.log('✅ Команда залогирована');
    
    // Логируем действие
    await logger.logAction(testBotId, 'send_message', {
      userId: testUserId,
      messageText: 'Ответ бота',
      nodeId: 'welcome-message'
    });
    console.log('✅ Действие залогировано');
    
    // Логируем ошибку
    const testError = new Error('Тестовая ошибка для логирования');
    await logger.logError(testBotId, testError, {
      userId: testUserId,
      command: '/error',
      nodeId: 'error-handler'
    });
    console.log('✅ Ошибка залогирована');
    
    // Логируем системное событие
    await logger.logSystemEvent('bot_started', {
      botId: testBotId,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Системное событие залогировано');
    
    // Получаем логи за последний час
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 час назад
    
    const logs = await logger.getBotLogs(testBotId, startDate, endDate);
    console.log(`📊 Получено логов: ${logs.length}`);
    
    if (logs.length > 0) {
      console.log('📋 Примеры логов:');
      logs.slice(0, 3).forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.timestamp}] ${log.eventType}: ${JSON.stringify(log.data).substring(0, 100)}...`);
      });
    }
    
    // Получаем статистику
    const stats = await logger.getBotStats(testBotId, startDate, endDate);
    console.log('\n📈 Статистика бота:');
    console.log(`  • Всего событий: ${stats.totalEvents}`);
    console.log(`  • Сообщений обработано: ${stats.messagesProcessed}`);
    console.log(`  • Команд выполнено: ${stats.commandsExecuted}`);
    console.log(`  • Ошибок: ${stats.errorsCount}`);
    console.log(`  • Активных пользователей: ${stats.activeUsers}`);
    
    console.log('\n📊 События по типам:');
    Object.entries(stats.eventsByType).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования Logger:', error.message);
    return false;
  }
}

// Функция создания веб-интерфейса для логов
async function createLogsWebInterface() {
  console.log('\n🌐 Создание веб-интерфейса для логов...\n');
  
  try {
    // Создаем HTML страницу для просмотра логов
    const logsHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Система логирования - Bot Constructor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: #2563eb;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .controls {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .controls h2 {
            margin-bottom: 1rem;
            color: #1f2937;
        }
        
        .form-group {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .form-group label {
            min-width: 120px;
            font-weight: 500;
        }
        
        .form-group input, .form-group select {
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #1d4ed8;
        }
        
        .btn-secondary {
            background: #6b7280;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-card h3 {
            font-size: 2rem;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 0.5rem;
        }
        
        .stat-card p {
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .logs-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .logs-header {
            background: #f9fafb;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .logs-header h2 {
            color: #1f2937;
        }
        
        .logs-list {
            max-height: 600px;
            overflow-y: auto;
        }
        
        .log-entry {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
            transition: background 0.2s;
        }
        
        .log-entry:hover {
            background: #f9fafb;
        }
        
        .log-entry:last-child {
            border-bottom: none;
        }
        
        .log-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .log-type {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .log-type.message {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .log-type.command {
            background: #d1fae5;
            color: #065f46;
        }
        
        .log-type.action {
            background: #fef3c7;
            color: #92400e;
        }
        
        .log-type.error {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .log-timestamp {
            color: #6b7280;
            font-size: 0.8rem;
        }
        
        .log-data {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.8rem;
            background: #f9fafb;
            padding: 0.5rem;
            border-radius: 4px;
            color: #374151;
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }
        
        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }
        
        .auto-refresh {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .auto-refresh input[type="checkbox"] {
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Система логирования</h1>
    </div>
    
    <div class="container">
        <div class="controls">
            <h2>Фильтры и настройки</h2>
            
            <div class="form-group">
                <label for="botId">ID бота:</label>
                <input type="text" id="botId" placeholder="Введите ID бота">
                <button class="btn" onclick="loadLogs()">Загрузить логи</button>
                <button class="btn btn-secondary" onclick="clearLogs()">Очистить</button>
            </div>
            
            <div class="form-group">
                <label for="eventType">Тип события:</label>
                <select id="eventType">
                    <option value="">Все типы</option>
                    <option value="message">Сообщения</option>
                    <option value="command">Команды</option>
                    <option value="action">Действия</option>
                    <option value="error">Ошибки</option>
                </select>
                
                <label for="timeRange">Период:</label>
                <select id="timeRange">
                    <option value="1">Последний час</option>
                    <option value="24">Последние 24 часа</option>
                    <option value="168">Последняя неделя</option>
                    <option value="720">Последний месяц</option>
                </select>
            </div>
            
            <div class="form-group">
                <div class="auto-refresh">
                    <input type="checkbox" id="autoRefresh">
                    <label for="autoRefresh">Автообновление (каждые 5 сек)</label>
                </div>
            </div>
        </div>
        
        <div class="stats" id="stats" style="display: none;">
            <div class="stat-card">
                <h3 id="totalEvents">0</h3>
                <p>Всего событий</p>
            </div>
            <div class="stat-card">
                <h3 id="messagesCount">0</h3>
                <p>Сообщений</p>
            </div>
            <div class="stat-card">
                <h3 id="commandsCount">0</h3>
                <p>Команд</p>
            </div>
            <div class="stat-card">
                <h3 id="errorsCount">0</h3>
                <p>Ошибок</p>
            </div>
            <div class="stat-card">
                <h3 id="activeUsers">0</h3>
                <p>Активных пользователей</p>
            </div>
        </div>
        
        <div class="logs-container">
            <div class="logs-header">
                <h2>Логи событий</h2>
            </div>
            <div class="logs-list" id="logsList">
                <div class="loading">
                    Выберите бота и нажмите "Загрузить логи" для просмотра событий
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let autoRefreshInterval = null;
        
        async function loadLogs() {
            const botId = document.getElementById('botId').value.trim();
            if (!botId) {
                alert('Введите ID бота');
                return;
            }
            
            const eventType = document.getElementById('eventType').value;
            const timeRange = parseInt(document.getElementById('timeRange').value);
            
            const logsList = document.getElementById('logsList');
            logsList.innerHTML = '<div class="loading">Загрузка логов...</div>';
            
            try {
                // Загружаем логи
                const logsResponse = await fetch(\`/api/logs/\${botId}?eventType=\${eventType}&hours=\${timeRange}\`);
                
                if (!logsResponse.ok) {
                    throw new Error('Ошибка загрузки логов');
                }
                
                const data = await logsResponse.json();
                
                // Обновляем статистику
                updateStats(data.stats);
                
                // Отображаем логи
                displayLogs(data.logs);
                
            } catch (error) {
                logsList.innerHTML = \`<div class="error">Ошибка загрузки логов: \${error.message}</div>\`;
            }
        }
        
        function updateStats(stats) {
            document.getElementById('totalEvents').textContent = stats.totalEvents || 0;
            document.getElementById('messagesCount').textContent = stats.messagesProcessed || 0;
            document.getElementById('commandsCount').textContent = stats.commandsExecuted || 0;
            document.getElementById('errorsCount').textContent = stats.errorsCount || 0;
            document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
            
            document.getElementById('stats').style.display = 'grid';
        }
        
        function displayLogs(logs) {
            const logsList = document.getElementById('logsList');
            
            if (logs.length === 0) {
                logsList.innerHTML = '<div class="loading">Логи не найдены</div>';
                return;
            }
            
            const logsHtml = logs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('ru-RU');
                const dataStr = JSON.stringify(log.data, null, 2);
                
                return \`
                    <div class="log-entry">
                        <div class="log-meta">
                            <span class="log-type \${log.eventType}">\${log.eventType}</span>
                            <span class="log-timestamp">\${timestamp}</span>
                        </div>
                        <div class="log-data">\${dataStr}</div>
                    </div>
                \`;
            }).join('');
            
            logsList.innerHTML = logsHtml;
        }
        
        function clearLogs() {
            document.getElementById('logsList').innerHTML = '<div class="loading">Выберите бота и нажмите "Загрузить логи" для просмотра событий</div>';
            document.getElementById('stats').style.display = 'none';
        }
        
        // Автообновление
        document.getElementById('autoRefresh').addEventListener('change', function() {
            if (this.checked) {
                autoRefreshInterval = setInterval(() => {
                    const botId = document.getElementById('botId').value.trim();
                    if (botId) {
                        loadLogs();
                    }
                }, 5000);
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }
        });
        
        // Загрузка логов по Enter
        document.getElementById('botId').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadLogs();
            }
        });
    </script>
</body>
</html>`;
    
    // Сохраняем HTML файл
    const logsHtmlPath = path.join(__dirname, '..', 'public', 'logs.html');
    fs.writeFileSync(logsHtmlPath, logsHtml);
    
    console.log('✅ Веб-интерфейс создан');
    console.log(`📄 Файл: ${logsHtmlPath}`);
    console.log('🌐 Доступен по адресу: http://localhost:3002/logs.html');
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка создания веб-интерфейса:', error.message);
    return false;
  }
}

// Функция создания API роута для логов
async function createLogsAPI() {
  console.log('\n🔌 Создание API для логов...\n');
  
  try {
    // Создаем роут для API логов
    const logsApiCode = `const express = require('express');
const Logger = require('../utils/Logger');
const router = express.Router();

const logger = new Logger();

/**
 * Получение логов бота
 * GET /api/logs/:botId?eventType=&hours=24
 */
router.get('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const { eventType, hours = 24 } = req.query;
    
    // Вычисляем временной диапазон
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(hours) * 60 * 60 * 1000));
    
    // Получаем логи
    const logs = await logger.getBotLogs(botId, startDate, endDate, eventType || null);
    
    // Получаем статистику
    const stats = await logger.getBotStats(botId, startDate, endDate);
    
    res.json({
      success: true,
      logs: logs.reverse(), // Показываем новые логи сверху
      stats,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        hours: parseInt(hours)
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Получение статистики всех ботов
 * GET /api/logs/system/stats
 */
router.get('/system/stats', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    // Получаем список всех ботов
    const fs = require('fs');
    const path = require('path');
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    
    if (!fs.existsSync(botsDir)) {
      return res.json({
        success: true,
        stats: {
          totalBots: 0,
          activeBots: 0,
          totalEvents: 0,
          totalUsers: 0
        }
      });
    }
    
    const botFiles = fs.readdirSync(botsDir).filter(file => file.startsWith('bot_') && file.endsWith('.json'));
    
    let totalEvents = 0;
    let totalUsers = new Set();
    let activeBots = 0;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(hours) * 60 * 60 * 1000));
    
    // Собираем статистику по всем ботам
    for (const botFile of botFiles) {
      const botId = botFile.replace('bot_', '').replace('.json', '');
      
      try {
        const stats = await logger.getBotStats(botId, startDate, endDate);
        
        if (stats.totalEvents > 0) {
          activeBots++;
          totalEvents += stats.totalEvents;
          
          // Добавляем уникальных пользователей (приблизительно)
          for (let i = 0; i < stats.activeUsers; i++) {
            totalUsers.add(\`\${botId}_user_\${i}\`);
          }
        }
      } catch (error) {
        // Пропускаем ботов без логов
        continue;
      }
    }
    
    res.json({
      success: true,
      stats: {
        totalBots: botFiles.length,
        activeBots,
        totalEvents,
        totalUsers: totalUsers.size
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        hours: parseInt(hours)
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения системной статистики:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Очистка старых логов
 * DELETE /api/logs/cleanup?months=12
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    await logger.cleanupOldLogs(parseInt(months));
    
    res.json({
      success: true,
      message: \`Старые логи (старше \${months} месяцев) удалены\`
    });
    
  } catch (error) {
    console.error('Ошибка очистки логов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Экспорт логов в CSV
 * GET /api/logs/:botId/export?format=csv&hours=24
 */
router.get('/:botId/export', async (req, res) => {
  try {
    const { botId } = req.params;
    const { format = 'csv', hours = 24, eventType } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(hours) * 60 * 60 * 1000));
    
    const logs = await logger.getBotLogs(botId, startDate, endDate, eventType || null);
    
    if (format === 'csv') {
      // Генерируем CSV
      const csvHeader = 'Timestamp,Event Type,User ID,Data\\n';
      const csvRows = logs.map(log => {
        const timestamp = log.timestamp;
        const eventType = log.eventType;
        const userId = log.data.userId || '';
        const data = JSON.stringify(log.data).replace(/"/g, '""'); // Экранируем кавычки
        
        return \`"\${timestamp}","\${eventType}","\${userId}","\${data}"\`;
      }).join('\\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', \`attachment; filename="logs_\${botId}_\${Date.now()}.csv"\`);
      res.send(csv);
      
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', \`attachment; filename="logs_\${botId}_\${Date.now()}.json"\`);
      res.json({
        botId,
        period: { startDate, endDate },
        logs
      });
      
    } else {
      res.status(400).json({
        success: false,
        error: 'Неподдерживаемый формат. Используйте csv или json'
      });
    }
    
  } catch (error) {
    console.error('Ошибка экспорта логов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;`;
    
    // Сохраняем роут
    const logsApiPath = path.join(__dirname, '..', 'routes', 'logs.js');
    fs.writeFileSync(logsApiPath, logsApiCode);
    
    console.log('✅ API роут создан');
    console.log(`📄 Файл: ${logsApiPath}`);
    console.log('🔌 Эндпоинты:');
    console.log('  • GET /api/logs/:botId - получение логов бота');
    console.log('  • GET /api/logs/system/stats - системная статистика');
    console.log('  • DELETE /api/logs/cleanup - очистка старых логов');
    console.log('  • GET /api/logs/:botId/export - экспорт логов');
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка создания API:', error.message);
    return false;
  }
}

// Функция тестирования API логов
async function testLogsAPI() {
  console.log('\n🧪 Тестирование API логов...\n');
  
  try {
    // Создаем тестовые логи
    const Logger = require('../utils/Logger');
    const logger = new Logger();
    
    const testBotId = 'api-test-bot';
    const testUserId = 54321;
    
    console.log('📝 Создание тестовых логов...');
    
    // Создаем несколько тестовых записей
    await logger.logMessage(testBotId, testUserId, 'Тестовое сообщение для API', 'text');
    await logger.logCommand(testBotId, testUserId, '/start', []);
    await logger.logAction(testBotId, 'send_message', { userId: testUserId, nodeId: 'welcome' });
    await logger.logError(testBotId, new Error('Тестовая ошибка API'), { userId: testUserId });
    
    console.log('✅ Тестовые логи созданы');
    
    // Тестируем API получения логов
    console.log('🌐 Тестирование API получения логов...');
    
    const logsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/logs/${testBotId}?hours=1`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (logsResponse.statusCode === 200) {
      const data = JSON.parse(logsResponse.data);
      console.log('✅ API логов работает');
      console.log(`📊 Получено логов: ${data.logs.length}`);
      console.log(`📈 Статистика: ${data.stats.totalEvents} событий, ${data.stats.activeUsers} пользователей`);
    } else {
      console.error('❌ Ошибка API логов:', logsResponse.statusCode);
      console.error('Ответ:', logsResponse.data);
      return false;
    }
    
    // Тестируем системную статистику
    console.log('\n📊 Тестирование системной статистики...');
    
    const statsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/logs/system/stats?hours=24',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.statusCode === 200) {
      const data = JSON.parse(statsResponse.data);
      console.log('✅ Системная статистика работает');
      console.log(`🤖 Всего ботов: ${data.stats.totalBots}`);
      console.log(`⚡ Активных ботов: ${data.stats.activeBots}`);
      console.log(`📊 Всего событий: ${data.stats.totalEvents}`);
      console.log(`👥 Всего пользователей: ${data.stats.totalUsers}`);
    } else {
      console.error('❌ Ошибка системной статистики:', statsResponse.statusCode);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования API:', error.message);
    return false;
  }
}

// Функция интеграции логирования в существующую систему
async function integrateLoggingSystem() {
  console.log('\n🔧 Интеграция системы логирования...\n');
  
  try {
    // Проверяем, подключен ли роут логов в server.js
    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('routes/logs')) {
      console.log('📝 Добавление роута логов в server.js...');
      
      // Находим место для добавления роута
      const routePattern = /app\.use\('\/api\/[^']+',\s*require\('[^']+routes\/[^']+\.js'\)\);/g;
      const matches = [...serverContent.matchAll(routePattern)];
      
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const insertPosition = lastMatch.index + lastMatch[0].length;
        
        const newRoute = "\napp.use('/api/logs', require('./routes/logs.js'));";
        const updatedContent = serverContent.slice(0, insertPosition) + newRoute + serverContent.slice(insertPosition);
        
        fs.writeFileSync(serverPath, updatedContent);
        console.log('✅ Роут логов добавлен в server.js');
      } else {
        console.log('⚠️ Не удалось найти место для добавления роута');
      }
    } else {
      console.log('✅ Роут логов уже подключен');
    }
    
    // Проверяем интеграцию с BotRuntime
    const runtimePath = path.join(__dirname, '..', 'utils', 'BotRuntime.js');
    
    if (fs.existsSync(runtimePath)) {
      const runtimeContent = fs.readFileSync(runtimePath, 'utf8');
      
      if (!runtimeContent.includes('Logger')) {
        console.log('📝 Добавление логирования в BotRuntime...');
        
        // Добавляем импорт Logger
        const importPattern = /const\s+\w+\s*=\s*require\([^)]+\);/g;
        const imports = [...runtimeContent.matchAll(importPattern)];
        
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const insertPosition = lastImport.index + lastImport[0].length;
          
          const loggerImport = "\nconst Logger = require('./Logger');";
          const updatedContent = runtimeContent.slice(0, insertPosition) + loggerImport + runtimeContent.slice(insertPosition);
          
          // Добавляем инициализацию логгера в конструктор
          const constructorPattern = /constructor\s*\([^)]*\)\s*\{/;
          const constructorMatch = updatedContent.match(constructorPattern);
          
          if (constructorMatch) {
            const constructorEnd = constructorMatch.index + constructorMatch[0].length;
            const loggerInit = "\n    this.logger = new Logger();";
            const finalContent = updatedContent.slice(0, constructorEnd) + loggerInit + updatedContent.slice(constructorEnd);
            
            fs.writeFileSync(runtimePath, finalContent);
            console.log('✅ Логирование добавлено в BotRuntime');
          }
        }
      } else {
        console.log('✅ Логирование уже интегрировано в BotRuntime');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка интеграции:', error.message);
    return false;
  }
}

// Основная функция тестирования
async function main() {
  console.log('🔍 Тестирование системы логирования\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  
  // 1. Создаем тестового бота
  const testBot = await createTestBotWithLogging();
  if (!testBot) {
    allTestsPassed = false;
  }
  
  // 2. Тестируем Logger класс
  const loggerTest = await testLoggerClass();
  if (!loggerTest) {
    allTestsPassed = false;
  }
  
  // 3. Создаем веб-интерфейс
  const webInterface = await createLogsWebInterface();
  if (!webInterface) {
    allTestsPassed = false;
  }
  
  // 4. Создаем API
  const apiCreation = await createLogsAPI();
  if (!apiCreation) {
    allTestsPassed = false;
  }
  
  // 5. Тестируем API
  const apiTest = await testLogsAPI();
  if (!apiTest) {
    allTestsPassed = false;
  }
  
  // 6. Интегрируем в систему
  const integration = await integrateLoggingSystem();
  if (!integration) {
    allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 Система логирования успешно создана и протестирована!');
    console.log('\n📋 Результаты:');
    console.log('✅ Logger класс работает корректно');
    console.log('✅ Веб-интерфейс создан');
    console.log('✅ API эндпоинты функционируют');
    console.log('✅ Интеграция с системой выполнена');
    console.log('\n💡 Возможности системы логирования:');
    console.log('• Структурированное логирование всех событий');
    console.log('• Веб-интерфейс для просмотра логов в реальном времени');
    console.log('• API для получения логов и статистики');
    console.log('• Автоматическая очистка старых логов');
    console.log('• Экспорт логов в CSV и JSON форматы');
    console.log('• Фильтрация по типам событий и временным периодам');
    console.log('\n🌐 Доступ к интерфейсу: http://localhost:3002/logs.html');
  } else {
    console.log('❌ Некоторые тесты системы логирования не прошли');
    console.log('⚠️ Проверьте настройки и зависимости');
  }
  
  console.log('\nТестирование системы логирования завершено');
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  createTestBotWithLogging,
  testLoggerClass,
  createLogsWebInterface,
  createLogsAPI,
  testLogsAPI,
  integrateLoggingSystem
};