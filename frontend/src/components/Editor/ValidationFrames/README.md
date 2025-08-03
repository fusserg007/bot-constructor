# ValidationFrames System

Система валидации с цветными рамками для визуального редактора ботов. Показывает ошибки и предупреждения прямо на узлах схемы.

## Компоненты

### ValidationFrames

Основной компонент для отображения валидационных рамок вокруг узлов.

```tsx
import { ValidationFrames } from './ValidationFrames';

<ValidationFrames
  nodes={nodes}
  edges={edges}
  visible={true}
/>
```

**Props:**
- `nodes: Node[]` - Массив узлов для валидации
- `edges: Edge[]` - Массив связей между узлами
- `visible?: boolean` - Видимость рамок (по умолчанию true)

### useValidationFrames

Хук для управления валидацией узлов.

```tsx
import { useValidationFrames } from './useValidationFrames';

const {
  validationResults,
  validationStats,
  isValidating,
  forceValidation,
  clearValidation
} = useValidationFrames({
  nodes,
  edges,
  settings: {
    enabled: true,
    showWarnings: true,
    showErrors: true,
    autoValidate: true,
    validationDelay: 500
  }
});
```

## Типы валидации

### Ошибки (красная рамка)
- Отсутствуют обязательные поля
- Некорректные значения
- Критические проблемы с соединениями

### Предупреждения (желтая рамка)
- Неполные данные
- Потенциальные проблемы
- Рекомендации по улучшению

### Валидные узлы
- Все поля заполнены корректно
- Соединения настроены правильно
- Нет проблем с конфигурацией

## Правила валидации

### По типам узлов

#### send_message
- **Ошибка**: Отсутствует текст сообщения
- **Предупреждение**: Нет исходящих соединений

#### send_message_with_keyboard
- **Ошибка**: Отсутствует текст сообщения или кнопки
- **Предупреждение**: У кнопок не заполнен текст или callback_data

#### callback_handler
- **Ошибка**: Не указан callback_data
- **Предупреждение**: Нет исходящих соединений

#### command
- **Ошибка**: Не указана команда
- **Предупреждение**: Нет исходящих соединений

#### webhook-telegram
- **Ошибка**: Не указан токен бота

#### webhook-http
- **Ошибка**: Не указан URL webhook
- **Предупреждение**: Некорректный формат URL

#### switch-command / switch-condition
- **Ошибка**: Не указаны команды/условия
- **Предупреждение**: Менее 2 исходящих соединений

### По соединениям

#### Стартовые узлы
- **Предупреждение**: Имеют входящие соединения

#### Обычные узлы
- **Предупреждение**: Нет входящих соединений (кроме стартовых)
- **Предупреждение**: Нет исходящих соединений (для узлов действий)

#### Условные узлы
- **Предупреждение**: Менее 2 исходящих соединений

## Настройки

### ValidationSettings
```tsx
interface ValidationSettings {
  enabled: boolean;           // Включена ли валидация
  showWarnings: boolean;      // Показывать предупреждения
  showErrors: boolean;        // Показывать ошибки
  autoValidate: boolean;      // Автоматическая валидация
  validationDelay: number;    // Задержка валидации (мс)
}
```

### Значения по умолчанию
```tsx
{
  enabled: true,
  showWarnings: true,
  showErrors: true,
  autoValidate: true,
  validationDelay: 500
}
```

## Использование

### Базовое использование

```tsx
import React from 'react';
import { ValidationFrames } from './ValidationFrames';

const Editor = ({ nodes, edges }) => {
  return (
    <div className="editor">
      <ReactFlow nodes={nodes} edges={edges}>
        <ValidationFrames 
          nodes={nodes} 
          edges={edges} 
          visible={true} 
        />
      </ReactFlow>
    </div>
  );
};
```

### С настройками валидации

```tsx
import React from 'react';
import { ValidationFrames, useValidationFrames } from './ValidationFrames';

const Editor = ({ nodes, edges }) => {
  const {
    validationResults,
    validationStats,
    forceValidation
  } = useValidationFrames({
    nodes,
    edges,
    settings: {
      enabled: true,
      showWarnings: true,
      showErrors: true,
      autoValidate: true,
      validationDelay: 300
    }
  });

  return (
    <div className="editor">
      <div className="validation-stats">
        Ошибок: {validationStats.errors}, 
        Предупреждений: {validationStats.warnings}
      </div>
      
      <button onClick={forceValidation}>
        Проверить схему
      </button>
      
      <ReactFlow nodes={nodes} edges={edges}>
        <ValidationFrames 
          nodes={nodes} 
          edges={edges} 
          visible={true} 
        />
      </ReactFlow>
    </div>
  );
};
```

### Интеграция с существующей валидацией

```tsx
import { SchemaValidator } from '../../../utils/SchemaValidator';

// ValidationFrames автоматически интегрируется с SchemaValidator
// и использует существующие правила валидации
```

## Стили

### CSS классы
- `.validationFrame` - Основная рамка
- `.validationFrame.error` - Рамка ошибки (красная)
- `.validationFrame.warning` - Рамка предупреждения (желтая)
- `.validationFrame.valid` - Рамка валидного узла (зеленая)
- `.validationTooltip` - Тултип с подробностями

### Кастомизация стилей

```css
.validationFrame.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.validationFrame.warning {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
```

## Логирование

Система автоматически логирует события валидации:

```
[2024-02-08 10:30:15] VALIDATION_ERROR: Node node1 (send_message): Не указан текст сообщения
[2024-02-08 10:30:16] VALIDATION_COMPLETE: Validated 5 nodes: 1 errors, 2 warnings
```

## Производительность

- Валидация выполняется с задержкой (debounce)
- Результаты кешируются до изменения узлов
- Рамки отображаются только для проблемных узлов
- Автоматическая очистка при размонтировании

## Тестирование

```bash
npm test ValidationFrames
```

Тесты покрывают:
- Валидацию разных типов узлов
- Проверку соединений
- Отображение рамок и тултипов
- Обработку ошибок валидации

## Совместимость

- Работает с ReactFlow v11+
- Совместимо с существующим SchemaValidator
- Поддерживает все типы узлов проекта
- Адаптивный дизайн для мобильных устройств