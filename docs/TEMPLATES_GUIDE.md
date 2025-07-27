# Руководство по системе шаблонов

## Обзор

Система шаблонов Bot Constructor предоставляет библиотеку готовых шаблонов ботов, которые пользователи могут использовать как основу для создания своих проектов. Это значительно ускоряет процесс разработки ботов.

## Архитектура

### Основные компоненты

1. **TemplateManager** - основной менеджер шаблонов
2. **TemplateService** - сервис для работы с шаблонами
3. **API Routes** - REST API для фронтенда
4. **React Components** - интерфейс для работы с шаблонами

### Структура шаблона

```typescript
interface BotTemplate {
  id: string;                    // Уникальный идентификатор
  name: string;                  // Название шаблона
  description: string;           // Описание
  category: string;              // Категория (business, support, etc.)
  tags: string[];               // Теги для поиска
  difficulty: string;           // Уровень сложности
  platforms: string[];          // Поддерживаемые платформы
  schema: BotSchema;            // Схема бота
  preview?: {                   // Превью шаблона
    features: string[];
  };
  author?: string;              // Автор
  version: string;              // Версия
  createdAt: string;            // Дата создания
  updatedAt: string;            // Дата обновления
}
```

## Доступные шаблоны

### 1. Приветственный бот (welcome-bot)
- **Категория**: Бизнес
- **Сложность**: Начинающий
- **Платформы**: Telegram, Discord, WhatsApp
- **Возможности**:
  - Приветствие новых пользователей
  - Справочная система
  - Информация о боте
  - Базовые команды

### 2. FAQ бот (faq-bot)
- **Категория**: Поддержка
- **Сложность**: Средний
- **Платформы**: Telegram, Discord
- **Возможности**:
  - Автоматические ответы на FAQ
  - Распознавание ключевых слов
  - База знаний
  - Информация о контактах

### 3. Бот поддержки (support-bot)
- **Категория**: Поддержка
- **Сложность**: Продвинутый
- **Платформы**: Telegram, Discord, WhatsApp
- **Возможности**:
  - Создание и отслеживание тикетов
  - Сбор информации о проблеме
  - База знаний и FAQ
  - Уведомления операторов

### 4. Квиз-бот (quiz-bot)
- **Категория**: Образование
- **Сложность**: Средний
- **Платформы**: Telegram, Discord
- **Возможности**:
  - Интерактивные викторины
  - Подсчет баллов
  - Разнообразные вопросы
  - Мотивационные сообщения

### 5. Интернет-магазин бот (shop-bot)
- **Категория**: Электронная коммерция
- **Сложность**: Продвинутый
- **Платформы**: Telegram, WhatsApp
- **Возможности**:
  - Каталог товаров с ценами
  - Корзина покупок
  - Оформление заказов
  - История покупок

## API Endpoints

### Получить все шаблоны
```
GET /api/templates
Query параметры:
- category: фильтр по категории
- difficulty: фильтр по сложности
- platform: фильтр по платформе
- search: поисковый запрос
```

### Получить конкретный шаблон
```
GET /api/templates/:id
```

### Получить категории
```
GET /api/templates/categories
```

### Создать бота из шаблона
```
POST /api/templates/:id/clone
Body: { "name": "Название нового бота" }
```

### Поиск шаблонов
```
GET /api/templates/search/:query
Query параметры:
- category: фильтр по категории
- difficulty: фильтр по сложности
- platform: фильтр по платформе
```

### Шаблоны по категории
```
GET /api/templates/category/:category
```

## Использование в коде

### Инициализация TemplateManager

```typescript
import { TemplateManager } from './core/templates/TemplateManager';

const templateManager = TemplateManager.getInstance();
```

### Получение всех шаблонов

```typescript
const templates = templateManager.getAllTemplates();
console.log(`Доступно ${templates.length} шаблонов`);
```

### Поиск шаблонов

```typescript
const results = templateManager.searchTemplates('бот', {
  category: 'business',
  difficulty: 'beginner'
});
```

### Клонирование шаблона

```typescript
const botSchema = templateManager.cloneTemplate('welcome-bot', 'Мой бот');
if (botSchema) {
  console.log('Бот создан:', botSchema.name);
}
```

### Использование TemplateService

```typescript
import { TemplateService } from './core/templates/TemplateService';

const templateService = new TemplateService();

// Получить статистику
const stats = await templateService.getTemplateStats();
console.log('Статистика:', stats);

// Получить рекомендации
const recommended = await templateService.getRecommendedTemplates();
console.log('Рекомендуемые шаблоны:', recommended);

// Валидация шаблона
const validation = await templateService.validateTemplate(template);
if (!validation.isValid) {
  console.error('Ошибки:', validation.errors);
}
```

## Использование в React

```tsx
import TemplateLibrary from './components/Templates/TemplateLibrary';

function App() {
  return (
    <div>
      <TemplateLibrary />
    </div>
  );
}
```

## Добавление новых шаблонов

### 1. Через код

Добавьте новый метод в `TemplateManager`:

```typescript
private addMyCustomTemplate(): void {
  const template: BotTemplate = {
    id: 'my-custom-bot',
    name: 'Мой кастомный бот',
    description: 'Описание бота',
    category: 'utility',
    tags: ['кастом', 'утилита'],
    difficulty: 'intermediate',
    platforms: ['telegram'],
    schema: {
      // Схема бота
    },
    // ... остальные поля
  };
  this.addTemplate(template);
}
```

Затем вызовите метод в `initializeDefaultTemplates()`.

### 2. Через API

```javascript
// Экспорт существующего шаблона
const response = await fetch('/api/templates/welcome-bot');
const template = await response.json();

// Модификация и импорт
template.id = 'my-new-template';
template.name = 'Мой новый шаблон';

const importResponse = await fetch('/api/templates/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(template)
});
```

## Категории шаблонов

- **business** (💼) - Бизнес-процессы и автоматизация
- **support** (🎧) - Клиентская поддержка и FAQ
- **ecommerce** (🛒) - Интернет-магазины и продажи
- **education** (📚) - Обучающие боты и квизы
- **utility** (🔧) - Полезные инструменты и сервисы
- **entertainment** (🎮) - Игровые боты и развлечения
- **social** (👥) - Социальные сети и сообщества

## Уровни сложности

- **beginner** - Начинающий (простые боты с базовым функционалом)
- **intermediate** - Средний (боты с условной логикой и переменными)
- **advanced** - Продвинутый (сложные боты с интеграциями и базами данных)

## Тестирование

Запустите тесты системы шаблонов:

```bash
npm run test:templates
# или
node -r ts-node/register src/test-templates.ts
```

## Лучшие практики

1. **Именование**: Используйте понятные ID и названия
2. **Описания**: Добавляйте подробные описания возможностей
3. **Теги**: Используйте релевантные теги для поиска
4. **Валидация**: Всегда валидируйте шаблоны перед добавлением
5. **Версионирование**: Обновляйте версии при изменениях
6. **Документация**: Документируйте особенности шаблонов

## Устранение неполадок

### Шаблон не загружается
- Проверьте правильность ID шаблона
- Убедитесь, что шаблон добавлен в `initializeDefaultTemplates()`
- Проверьте валидность схемы бота

### Ошибки валидации
- Проверьте обязательные поля
- Убедитесь в корректности схемы бота
- Проверьте формат данных

### Проблемы с API
- Проверьте подключение роутов в `server.js`
- Убедитесь, что сервер запущен
- Проверьте консоль браузера на ошибки

## Планы развития

- Добавление новых категорий шаблонов
- Система рейтингов и отзывов
- Возможность создания пользовательских шаблонов
- Импорт/экспорт шаблонов
- Система версионирования шаблонов
- Интеграция с внешними библиотеками шаблонов