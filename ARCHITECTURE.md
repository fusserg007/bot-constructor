# Архитектура мультиплатформенного конструктора ботов

## Обзор

Новая архитектура построена на принципах модульности и расширяемости. Каждый компонент изолирован и может работать независимо от других.

## Структура проекта

```
src/
├── core/                    # Ядро системы
│   ├── types/              # Общие типы и интерфейсы
│   │   └── index.ts
│   └── adapters/           # Базовые классы адаптеров
│       ├── MessengerAdapter.ts
│       ├── AdapterRegistry.ts
│       └── index.ts
├── adapters/               # Конкретные адаптеры мессенджеров
│   ├── TelegramAdapter.ts
│   ├── MaxAdapter.ts
│   └── WhatsAppAdapter.ts (планируется)
├── utils/                  # Утилиты
├── test-architecture.ts   # Тест архитектуры
└── index.ts               # Главный файл
```

## Ключевые принципы

### 1. Модульность
- Каждый адаптер мессенджера изолирован
- Падение одного адаптера не влияет на другие
- Легко добавлять новые платформы

### 2. Единый интерфейс
- Все адаптеры реализуют `MessengerAdapter`
- Унифицированные методы для всех платформ
- Общие типы данных

### 3. Строгая типизация
- TypeScript с строгими настройками
- Полная типизация всех интерфейсов
- Проверка типов на этапе компиляции

## Основные компоненты

### MessengerAdapter
Базовый абстрактный класс для всех адаптеров мессенджеров.

**Основные методы:**
- `initialize(credentials)` - инициализация с учетными данными
- `sendMessage(chatId, message)` - отправка текстового сообщения
- `sendMedia(chatId, media)` - отправка медиа
- `startPolling()` / `stopPolling()` - управление polling
- `handleWebhook(request)` - обработка webhook'ов

### AdapterRegistry
Реестр для регистрации и управления адаптерами.

**Основные методы:**
- `registerAdapter(platform, adapterClass)` - регистрация адаптера
- `createAdapter(platform)` - создание экземпляра адаптера
- `getAdapter(botId, platform, credentials)` - получение активного адаптера
- `removeAdapter(adapterId)` - удаление адаптера

### Типы данных

#### Основные интерфейсы:
- `BotSchema` - схема бота с узлами и соединениями
- `Node` - узел в схеме бота
- `Edge` - соединение между узлами
- `IncomingMessage` - входящее сообщение
- `Message` - исходящее сообщение

## Использование

### Инициализация системы
```typescript
import { initializeBotConstructor, getRegistry } from './src';

// Инициализация всех адаптеров
initializeBotConstructor();

// Получение реестра
const registry = getRegistry();
```

### Создание адаптера
```typescript
// Создание Telegram адаптера
const telegramAdapter = registry.createAdapter('telegram');

// Инициализация с токеном
await telegramAdapter.initialize({
  telegram: { token: 'YOUR_BOT_TOKEN' }
});

// Подписка на сообщения
telegramAdapter.onMessage((message) => {
  console.log('Received message:', message.text);
});

// Отправка сообщения
await telegramAdapter.sendMessage('chat_id', {
  text: 'Hello, World!',
  buttons: [
    { text: 'Button 1', callbackData: 'btn1' }
  ]
});
```

### Добавление нового адаптера
```typescript
import { MessengerAdapter } from './core/adapters/MessengerAdapter';

class WhatsAppAdapter extends MessengerAdapter {
  constructor() {
    super('whatsapp');
  }

  async initialize(credentials: PlatformCredentials): Promise<void> {
    // Реализация инициализации
  }

  // Реализация остальных методов...
}

// Регистрация в системе
registry.registerAdapter('whatsapp', WhatsAppAdapter);
```

## Тестирование

Запуск теста архитектуры:
```bash
npm run dev src/test-architecture.ts
```

Тест проверяет:
- Создание адаптеров для всех платформ
- Валидацию учетных данных
- Обработку ошибок
- Изоляцию компонентов

## Следующие шаги

1. ✅ Базовая архитектура и адаптеры
2. 🔄 Унификация форматов данных
3. 📋 Система выполнения схем
4. 🎨 Визуальный редактор
5. 📦 Система шаблонов

## Преимущества новой архитектуры

- **Масштабируемость**: легко добавлять новые мессенджеры
- **Надежность**: изоляция ошибок между компонентами
- **Поддерживаемость**: четкое разделение ответственности
- **Тестируемость**: каждый компонент можно тестировать отдельно
- **Типобезопасность**: строгая типизация предотвращает ошибки