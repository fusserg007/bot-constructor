# Design Document

## Overview

Полная очистка проекта от устаревшего Canvas-редактора и исправление проблем с отображением схемы в новом React-редакторе.

## Architecture

### Файлы для удаления

#### 1. Старый Canvas-редактор
- `public/app.js` - основная логика старого редактора
- `public/styles.css` - стили старого редактора  
- `public/index.html` - HTML старого редактора
- `public/js/` - вся папка с JavaScript файлами старого редактора
- `public/editor-test.html` - тестовые файлы
- `public/test-schema-loading.html` - тестовые файлы

#### 2. Утилиты конвертации
- `utils/VisualSchemaConverter.js` - конвертер между форматами
- `utils/SchemaConverter.js` - дополнительный конвертер
- Части `utils/SchemaValidator.js` связанные со старым форматом

#### 3. Маршруты и настройки
- Маршруты в `server.js` для старого редактора
- Настройки статических файлов для `public/` (кроме `public/dist/`)

### Компоненты для исправления

#### 1. React-редактор
- Проверка загрузки схемы в `frontend/src/components/Editor/Editor.tsx`
- Адаптация размеров в CSS модулях
- Валидация схемы в `frontend/src/utils/SchemaValidator.ts`

#### 2. Серверная часть
- Упрощение маршрутов в `server.js`
- Обновление API для работы только с новым форматом

## Components and Interfaces

### Удаляемые интерфейсы
- Старый формат схемы с `edges` и `data`
- Конвертеры между форматами
- Валидаторы старого формата

### Обновляемые интерфейсы
- `BotSchema` - только новый формат с `connections` и `config`
- API endpoints - только новый формат
- Типы в `frontend/src/types/` - очистка от старых типов

## Data Models

### Единый формат схемы
```typescript
interface BotSchema {
  nodes: Node[];
  connections: Connection[];
  variables: Record<string, any>;
  settings: Record<string, any>;
}

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>; // НЕ data!
}

interface Connection {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}
```

## Error Handling

### Проблемы с отображением схемы
1. **Проблема**: Схема не отображается в редакторе
   - **Причина**: Возможно конфликт форматов или проблемы с размерами
   - **Решение**: Проверить загрузку данных и CSS стили

2. **Проблема**: Размер окна не адаптируется
   - **Причина**: Фиксированные размеры в CSS
   - **Решение**: Использовать responsive дизайн

## Testing Strategy

### Тестирование очистки
1. Проверка отсутствия старых файлов
2. Проверка работы только нового редактора
3. Проверка корректности маршрутов

### Тестирование редактора
1. Загрузка схемы бота
2. Отображение узлов и соединений
3. Адаптивность интерфейса
4. Сохранение изменений