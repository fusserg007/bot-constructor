# Настройка тестовых групп для Bot Constructor

Это руководство поможет настроить реальные Telegram группы для тестирования созданных ботов.

## Подготовка тестовых групп

### 1. Создание тестовых групп

Создайте следующие типы групп для тестирования:

#### Группа для модерации
- **Название:** "Bot Constructor - Moderation Test"
- **Тип:** Публичная группа
- **Участники:** 10-20 тестовых аккаунтов
- **Назначение:** Тестирование модерационных ботов

#### Группа для поддержки
- **Название:** "Bot Constructor - Support Test"
- **Тип:** Приватная группа
- **Участники:** 5-10 тестовых аккаунтов
- **Назначение:** Тестирование ботов поддержки

#### Группа для игр
- **Название:** "Bot Constructor - Games Test"
- **Тип:** Публичная группа
- **Участники:** 15-30 тестовых аккаунтов
- **Назначение:** Тестирование игровых ботов

#### Группа для опросов
- **Название:** "Bot Constructor - Polls Test"
- **Тип:** Приватная группа
- **Участники:** 10-15 тестовых аккаунтов
- **Назначение:** Тестирование ботов для опросов

### 2. Настройка прав администратора

Для каждой группы настройте права бота:

```
✅ Удаление сообщений
✅ Блокировка пользователей
✅ Закрепление сообщений
✅ Изменение информации о группе
✅ Приглашение пользователей
✅ Добавление администраторов
```

### 3. Создание тестовых аккаунтов

Создайте несколько тестовых Telegram аккаунтов:
- **@testuser1_botconstructor**
- **@testuser2_botconstructor**
- **@testuser3_botconstructor**
- **@moderator_botconstructor**
- **@admin_botconstructor**

## Конфигурация тестовых ботов

### 1. Модерационный бот

```json
{
  "name": "Test Moderation Bot",
  "description": "Бот для тестирования модерации в группе",
  "template": "moderation",
  "testGroup": {
    "id": "-1001234567890",
    "name": "Bot Constructor - Moderation Test",
    "type": "supergroup"
  },
  "configuration": {
    "autoDelete": {
      "spam": true,
      "links": true,
      "badWords": ["спам", "реклама"]
    },
    "warnings": {
      "maxWarnings": 3,
      "muteTime": 300
    },
    "adminIds": [123456789, 987654321]
  }
}
```

### 2. Бот поддержки

```json
{
  "name": "Test Support Bot",
  "description": "Бот для тестирования системы поддержки",
  "template": "support",
  "testGroup": {
    "id": "-1001234567891",
    "name": "Bot Constructor - Support Test",
    "type": "supergroup"
  },
  "configuration": {
    "supportHours": "9:00-18:00",
    "autoResponses": {
      "greeting": "Добро пожаловать в поддержку!",
      "offline": "Поддержка работает с 9:00 до 18:00"
    },
    "ticketSystem": true
  }
}
```

### 3. Игровой бот

```json
{
  "name": "Test Game Bot",
  "description": "Бот для тестирования игр в группе",
  "template": "game",
  "testGroup": {
    "id": "-1001234567892",
    "name": "Bot Constructor - Games Test",
    "type": "supergroup"
  },
  "configuration": {
    "games": ["quiz", "rps", "lottery"],
    "scoring": true,
    "leaderboard": true
  }
}
```

## Автоматизация тестирования

### 1. Скрипт создания тестовых ботов

```bash
#!/bin/bash
# scripts/create-test-bots-for-groups.sh

# Создание модерационного бота
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Moderation Bot",
    "token": "YOUR_BOT_TOKEN_1",
    "templateId": "moderation",
    "testGroupId": "-1001234567890"
  }'

# Создание бота поддержки
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Support Bot",
    "token": "YOUR_BOT_TOKEN_2",
    "templateId": "support",
    "testGroupId": "-1001234567891"
  }'

# Создание игрового бота
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Game Bot",
    "token": "YOUR_BOT_TOKEN_3",
    "templateId": "game",
    "testGroupId": "-1001234567892"
  }'
```

### 2. Автоматические тесты

```javascript
// test/group-integration-test.js
const TelegramBot = require('node-telegram-bot-api');

class GroupIntegrationTester {
  constructor() {
    this.testGroups = [
      { id: '-1001234567890', name: 'Moderation Test' },
      { id: '-1001234567891', name: 'Support Test' },
      { id: '-1001234567892', name: 'Games Test' }
    ];
  }

  async testModerationBot() {
    // Отправка тестового спама
    // Проверка автоматического удаления
    // Проверка системы предупреждений
  }

  async testSupportBot() {
    // Отправка запроса в поддержку
    // Проверка автоответов
    // Проверка создания тикетов
  }

  async testGameBot() {
    // Запуск игры
    // Проверка подсчета очков
    // Проверка таблицы лидеров
  }
}
```

## Мониторинг тестовых групп

### 1. Дашборд для мониторинга

```html
<!-- public/test-groups-dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Test Groups Dashboard</title>
    <style>
        .group-card {
            border: 1px solid #ddd;
            margin: 10px;
            padding: 15px;
            border-radius: 8px;
        }
        .status-active { background-color: #d4edda; }
        .status-inactive { background-color: #f8d7da; }
    </style>
</head>
<body>
    <h1>🧪 Test Groups Dashboard</h1>
    
    <div id="groups-container">
        <!-- Группы будут загружены динамически -->
    </div>

    <script>
        async function loadTestGroups() {
            const response = await fetch('/api/test-groups');
            const groups = await response.json();
            
            const container = document.getElementById('groups-container');
            container.innerHTML = groups.map(group => `
                <div class="group-card status-${group.status}">
                    <h3>${group.name}</h3>
                    <p>ID: ${group.id}</p>
                    <p>Участников: ${group.membersCount}</p>
                    <p>Активных ботов: ${group.activeBots}</p>
                    <p>Последняя активность: ${group.lastActivity}</p>
                    <button onclick="testGroup('${group.id}')">Запустить тест</button>
                </div>
            `).join('');
        }

        async function testGroup(groupId) {
            const response = await fetch(`/api/test-groups/${groupId}/test`, {
                method: 'POST'
            });
            const result = await response.json();
            alert(`Тест группы: ${result.success ? 'Успешно' : 'Ошибка'}`);
        }

        // Загрузка при старте
        loadTestGroups();
        
        // Обновление каждые 30 секунд
        setInterval(loadTestGroups, 30000);
    </script>
</body>
</html>
```

### 2. API для управления тестовыми группами

```javascript
// routes/test-groups.js
const express = require('express');
const router = express.Router();

// Получение списка тестовых групп
router.get('/', async (req, res) => {
  try {
    const groups = await getTestGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск теста для группы
router.post('/:groupId/test', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await runGroupTest(groupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение статистики группы
router.get('/:groupId/stats', async (req, res) => {
  try {
    const { groupId } = req.params;
    const stats = await getGroupStats(groupId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Сценарии тестирования

### 1. Тест модерационного бота

```javascript
// test/scenarios/moderation-test.js
class ModerationTestScenario {
  async runTest(groupId, botToken) {
    const results = [];
    
    // Тест 1: Удаление спама
    results.push(await this.testSpamDeletion(groupId, botToken));
    
    // Тест 2: Система предупреждений
    results.push(await this.testWarningSystem(groupId, botToken));
    
    // Тест 3: Блокировка пользователей
    results.push(await this.testUserBanning(groupId, botToken));
    
    return {
      success: results.every(r => r.success),
      results
    };
  }

  async testSpamDeletion(groupId, botToken) {
    // Отправка спам-сообщения
    // Проверка автоматического удаления
    // Возврат результата
  }

  async testWarningSystem(groupId, botToken) {
    // Отправка нарушающих сообщений
    // Проверка выдачи предупреждений
    // Проверка мута после превышения лимита
  }

  async testUserBanning(groupId, botToken) {
    // Симуляция серьезного нарушения
    // Проверка автоматической блокировки
    // Проверка возможности разблокировки
  }
}
```

### 2. Тест бота поддержки

```javascript
// test/scenarios/support-test.js
class SupportTestScenario {
  async runTest(groupId, botToken) {
    const results = [];
    
    // Тест 1: Автоответы
    results.push(await this.testAutoResponses(groupId, botToken));
    
    // Тест 2: Создание тикетов
    results.push(await this.testTicketCreation(groupId, botToken));
    
    // Тест 3: Эскалация
    results.push(await this.testEscalation(groupId, botToken));
    
    return {
      success: results.every(r => r.success),
      results
    };
  }
}
```

### 3. Тест игрового бота

```javascript
// test/scenarios/game-test.js
class GameTestScenario {
  async runTest(groupId, botToken) {
    const results = [];
    
    // Тест 1: Запуск игры
    results.push(await this.testGameStart(groupId, botToken));
    
    // Тест 2: Подсчет очков
    results.push(await this.testScoring(groupId, botToken));
    
    // Тест 3: Таблица лидеров
    results.push(await this.testLeaderboard(groupId, botToken));
    
    return {
      success: results.every(r => r.success),
      results
    };
  }
}
```

## Сбор обратной связи

### 1. Форма обратной связи

```html
<!-- public/feedback-form.html -->
<form id="feedback-form">
    <h3>Обратная связь по тестированию</h3>
    
    <label>Тестируемый бот:</label>
    <select name="botId" required>
        <option value="">Выберите бота</option>
        <!-- Опции загружаются динамически -->
    </select>
    
    <label>Тестовая группа:</label>
    <select name="groupId" required>
        <option value="">Выберите группу</option>
        <!-- Опции загружаются динамически -->
    </select>
    
    <label>Оценка работы (1-5):</label>
    <input type="range" name="rating" min="1" max="5" value="3">
    
    <label>Обнаруженные проблемы:</label>
    <textarea name="issues" rows="4"></textarea>
    
    <label>Предложения по улучшению:</label>
    <textarea name="suggestions" rows="4"></textarea>
    
    <button type="submit">Отправить отзыв</button>
</form>
```

### 2. Система аналитики

```javascript
// utils/TestAnalytics.js
class TestAnalytics {
  constructor() {
    this.metrics = new Map();
  }

  recordTestResult(botId, groupId, testType, result) {
    const key = `${botId}-${groupId}-${testType}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        averageResponseTime: 0,
        lastTested: null
      });
    }

    const metric = this.metrics.get(key);
    metric.totalTests++;
    
    if (result.success) {
      metric.successfulTests++;
    } else {
      metric.failedTests++;
    }
    
    metric.averageResponseTime = (
      (metric.averageResponseTime * (metric.totalTests - 1) + result.responseTime) / 
      metric.totalTests
    );
    
    metric.lastTested = new Date().toISOString();
  }

  getSuccessRate(botId, groupId, testType) {
    const key = `${botId}-${groupId}-${testType}`;
    const metric = this.metrics.get(key);
    
    if (!metric || metric.totalTests === 0) return 0;
    
    return (metric.successfulTests / metric.totalTests) * 100;
  }

  generateReport() {
    const report = {
      totalBots: new Set([...this.metrics.keys()].map(k => k.split('-')[0])).size,
      totalGroups: new Set([...this.metrics.keys()].map(k => k.split('-')[1])).size,
      overallSuccessRate: 0,
      botPerformance: {},
      groupActivity: {}
    };

    // Расчет общей статистики
    let totalTests = 0;
    let totalSuccessful = 0;

    for (const [key, metric] of this.metrics) {
      totalTests += metric.totalTests;
      totalSuccessful += metric.successfulTests;
    }

    report.overallSuccessRate = totalTests > 0 ? (totalSuccessful / totalTests) * 100 : 0;

    return report;
  }
}
```

## Автоматизация тестирования

### 1. Cron задачи для регулярного тестирования

```bash
# Добавить в crontab
# Тестирование каждые 2 часа
0 */2 * * * cd /home/pi/bot-constructor && node scripts/run-group-tests.js

# Еженедельный полный тест
0 2 * * 0 cd /home/pi/bot-constructor && node scripts/comprehensive-group-test.js
```

### 2. Уведомления о проблемах

```javascript
// utils/TestNotifications.js
class TestNotifications {
  async sendFailureAlert(botId, groupId, error) {
    const message = `
🚨 Тест бота провален!

Бот: ${botId}
Группа: ${groupId}
Ошибка: ${error.message}
Время: ${new Date().toLocaleString()}

Требуется проверка!
    `;

    // Отправка в админскую группу
    await this.sendToAdminGroup(message);
    
    // Логирование
    console.error('Test failure:', { botId, groupId, error });
  }

  async sendSuccessReport(summary) {
    const message = `
✅ Еженедельный отчет по тестированию

Всего тестов: ${summary.totalTests}
Успешных: ${summary.successful}
Провалено: ${summary.failed}
Процент успеха: ${summary.successRate}%

Детали в дашборде.
    `;

    await this.sendToAdminGroup(message);
  }
}
```

## Безопасность тестирования

### 1. Изоляция тестовых данных

```javascript
// config/test-isolation.js
const TEST_CONFIG = {
  // Префикс для всех тестовых данных
  dataPrefix: 'TEST_',
  
  // Отдельная база данных для тестов
  testDatabase: 'bot_constructor_test',
  
  // Ограничения для тестовых ботов
  limits: {
    maxMessagesPerMinute: 10,
    maxGroupsPerBot: 1,
    testDuration: 3600 // 1 час
  },
  
  // Автоочистка тестовых данных
  cleanup: {
    enabled: true,
    retentionDays: 7
  }
};
```

### 2. Мониторинг безопасности

```javascript
// utils/TestSecurityMonitor.js
class TestSecurityMonitor {
  checkTestLimits(botId, action) {
    // Проверка лимитов для тестовых ботов
    // Предотвращение спама и злоупотреблений
    // Автоматическая остановка при превышении лимитов
  }

  auditTestActivity(botId, groupId, action) {
    // Логирование всех действий в тестовых группах
    // Отслеживание подозрительной активности
    // Генерация отчетов по безопасности
  }
}
```

## Результаты и отчетность

### 1. Еженедельные отчеты

```javascript
// scripts/generate-weekly-report.js
async function generateWeeklyReport() {
  const analytics = new TestAnalytics();
  const report = analytics.generateReport();
  
  const htmlReport = `
    <h1>Еженедельный отчет по тестированию</h1>
    <h2>Общая статистика</h2>
    <ul>
      <li>Всего ботов в тестировании: ${report.totalBots}</li>
      <li>Активных групп: ${report.totalGroups}</li>
      <li>Общий процент успеха: ${report.overallSuccessRate.toFixed(1)}%</li>
    </ul>
    
    <h2>Производительность ботов</h2>
    <!-- Детальная статистика по каждому боту -->
    
    <h2>Рекомендации</h2>
    <!-- Автоматически генерируемые рекомендации -->
  `;
  
  // Сохранение отчета
  await fs.writeFile(`reports/weekly-${Date.now()}.html`, htmlReport);
}
```

### 2. Дашборд реального времени

```javascript
// public/js/test-dashboard.js
class TestDashboard {
  constructor() {
    this.socket = io();
    this.initializeCharts();
    this.setupEventListeners();
  }

  initializeCharts() {
    // Инициализация графиков для отображения метрик
    this.successRateChart = new Chart(/* ... */);
    this.responseTimeChart = new Chart(/* ... */);
    this.activityChart = new Chart(/* ... */);
  }

  updateMetrics(data) {
    // Обновление графиков в реальном времени
    this.successRateChart.update(data.successRate);
    this.responseTimeChart.update(data.responseTime);
    this.activityChart.update(data.activity);
  }
}
```

Эта система обеспечивает полную интеграцию с реальными Telegram группами для тестирования ботов, включая автоматизацию, мониторинг и отчетность.