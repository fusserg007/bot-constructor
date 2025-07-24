# Документ дизайна - Визуальный редактор и улучшения

## Обзор

Система визуального редактора представляет собой интерактивный drag-and-drop интерфейс для создания ботов с использованием узлов и соединений. Архитектура включает клиентскую часть с canvas-редактором, серверную часть для валидации и хранения схем, а также систему защиты от дублирования токенов.

## Архитектура

### Клиентская часть
- **Visual Editor**: Canvas-редактор на основе HTML5 Canvas или SVG
- **Node Library**: Панель с категоризированными узлами
- **Property Panel**: Панель настройки свойств выбранного узла
- **Bot Card Manager**: Компонент для отображения улучшенных карточек ботов
- **BotFather Parser**: Утилита для извлечения данных из сообщений BotFather

### Серверная часть
- **Schema Validator**: Валидация схем узлов и соединений
- **Token Manager**: Управление уникальностью токенов
- **Bot Data Extractor**: Извлечение данных ботов из API Telegram
- **Visual Schema Converter**: Конвертация визуальных схем в исполняемую логику

## Компоненты и интерфейсы

### VisualEditor
```javascript
class VisualEditor {
  constructor(canvasElement, nodeLibrary)
  addNode(nodeType, position)
  connectNodes(sourceNode, targetNode)
  deleteNode(nodeId)
  saveSchema()
  loadSchema(schemaData)
  validateConnections()
}
```

### NodeLibrary
```javascript
class NodeLibrary {
  getNodesByCategory(category)
  createNodeInstance(nodeType, config)
  validateNodeConfig(nodeType, config)
}
```

### TokenManager
```javascript
class TokenManager {
  async checkTokenUniqueness(token)
  async reserveToken(token, userId, botId)
  async releaseToken(token)
  async getTokenStatus(token)
}
```

### BotFatherParser
```javascript
class BotFatherParser {
  parseMessage(message)
  extractToken(message)
  extractBotName(message)
  extractUsername(message)
  validateBotFatherMessage(message)
}
```

## Модели данных

### Visual Node Schema
```json
{
  "id": "string",
  "type": "string",
  "category": "string",
  "position": {"x": "number", "y": "number"},
  "config": "object",
  "inputs": ["string"],
  "outputs": ["string"]
}
```

### Connection Schema
```json
{
  "id": "string",
  "sourceNodeId": "string",
  "sourceOutput": "string",
  "targetNodeId": "string",
  "targetInput": "string"
}
```

### Bot Schema
```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "token": "string",
  "visualSchema": {
    "nodes": ["VisualNode"],
    "connections": ["Connection"]
  },
  "metadata": {
    "created": "date",
    "lastModified": "date",
    "nodeCount": "number"
  }
}
```

### Token Registry
```json
{
  "token": "string",
  "userId": "string",
  "botId": "string",
  "status": "active|inactive|error",
  "reservedAt": "date"
}
```

## Типы узлов

### Триггеры
- **Command Node**: Обработка команд (/start, /help)
- **Text Node**: Обработка текстовых сообщений
- **Callback Node**: Обработка inline-кнопок
- **Inline Query Node**: Обработка inline-запросов
- **Join Group Node**: Присоединение к группе
- **Leave Group Node**: Покидание группы

### Условия
- **Text Check Node**: Проверка содержимого текста
- **User Check Node**: Проверка пользователя (админ, участник)
- **Time Check Node**: Проверка времени
- **Data Check Node**: Проверка переменных
- **Logic Nodes**: И, ИЛИ, НЕ операторы

### Действия
- **Send Message Node**: Отправка сообщений
- **Send Photo Node**: Отправка изображений
- **Keyboard Node**: Создание клавиатур
- **Admin Action Node**: Модерационные действия
- **Delay Node**: Задержка выполнения

### Данные
- **Variable Node**: Работа с переменными
- **Counter Node**: Счетчики
- **Database Node**: Операции с БД
- **Random Node**: Случайные значения

### Интеграции
- **HTTP Node**: HTTP-запросы
- **Webhook Node**: Обработка webhook'ов
- **Scheduler Node**: Планировщик задач
- **Notification Node**: Уведомления

## Обработка ошибок

### Валидация схем
- Проверка циклических зависимостей
- Валидация типов соединений
- Проверка обязательных параметров узлов
- Валидация логической целостности схемы

### Управление токенами
- Проверка формата токена
- Валидация через Telegram API
- Обработка конфликтов токенов
- Автоматическое освобождение неактивных токенов

### Парсинг BotFather
- Валидация формата сообщения
- Обработка различных языков интерфейса
- Извлечение данных из разных версий сообщений
- Fallback для ручного ввода данных

## Стратегия тестирования

### Unit Tests
- Тестирование парсера BotFather
- Валидация узлов и соединений
- Проверка уникальности токенов
- Конвертация схем

### Integration Tests
- Тестирование визуального редактора
- Проверка сохранения/загрузки схем
- Тестирование выполнения созданных ботов
- Проверка API интеграций

### E2E Tests
- Создание бота через визуальный редактор
- Тестирование полного цикла от создания до выполнения
- Проверка работы с реальными Telegram API
- Тестирование пользовательских сценариев