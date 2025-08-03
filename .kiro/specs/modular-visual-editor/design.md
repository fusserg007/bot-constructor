# Design Document

## Overview

Модульный визуальный редактор ботов представляет собой кардинально улучшенную версию существующего редактора с фокусом на модульность, удобство использования и простоту отладки.

## Architecture

### Модульная структура

```
frontend/src/components/Editor/
├── MultiNode/              # Мульти-узел система
├── SmartLibrary/           # Умная витрина компонентов  
├── GroupSystem/            # Система группировки
├── CanvasLogger/           # Система логирования
├── NavigationSystem/       # Система навигации
└── ValidationSystem/       # Система валидации с рамками
```

## Components and Interfaces

### 1. MultiNode System
- Основной компонент мульти-узла с треугольной кнопкой расширения
- Порты подключения с цветной индикацией (синий/красный)
- Поддержка вложенных компонентов

### 2. Smart Library System  
- Анализ частоты использования компонентов
- Категории: Часто/Средне/Редко используемые
- Автоматическое обновление статистики
- **Единая система рендеринга узлов для витрины и канваса**

### 3. Canvas Logger
- Логирование всех действий на канвасе
- Очистка лога при перезапуске
- Формат: [время] ДЕЙСТВИЕ: описание

### 4. Navigation System
- Двунаправленные стрелки
- Разные типы стрелок для разных связей
- Подписи на стрелках

### 5. Group System
- Цветные зоны для группировки
- Складные группы узлов
- Перемещение групп целиком

### 6. Validation System
- Цветные рамки: красная (ошибка), зеленая (ОК), желтая (предупреждение)
- Подсказки при наведении
- Интеграция с существующей валидацией
##
 Data Models

### UsageStatistics
```typescript
interface UsageStatistics {
  frequent: ComponentUsage[];    // >70% использования
  moderate: ComponentUsage[];    // 30-70% использования  
  rare: ComponentUsage[];        // <30% использования
}

interface ComponentUsage {
  type: string;
  name: string;
  usageCount: number;
  usagePercentage: number;
  lastUsed: Date;
}
```

### MultiNodeData
```typescript
interface MultiNodeData {
  id: string;
  isExpanded: boolean;
  children: ComponentItem[];
  buttonLayout: 'top' | 'bottom' | 'side';
}

interface ComponentItem {
  id: string;
  type: 'button' | 'text' | 'input' | 'condition';
  config: any;
  position: { x: number; y: number };
}
```

### CanvasLogEntry
```typescript
interface CanvasLogEntry {
  timestamp: string;
  action: 'NODE_EXPAND' | 'DRAG_START' | 'DROP_SUCCESS' | 'CONNECTION_CREATE' | 'VALIDATION_ERROR';
  details: string;
  nodeId?: string;
  error?: boolean;
}
```

## Error Handling

### Логирование ошибок
- Все ошибки записываются в canvas-debug.log
- Критические ошибки дублируются в консоль
- Пользователю показываются понятные сообщения

### Валидация
- Проверка связей между узлами
- Валидация конфигурации мульти-узлов
- Предупреждения о потенциальных проблемах

## Testing Strategy

### Модульное тестирование
- Каждый модуль имеет собственные тесты
- Тестирование изолированно от других модулей
- Моки для внешних зависимостей

### Интеграционное тестирование  
- Тестирование взаимодействия модулей
- Проверка логирования
- Тестирование системы группировки

### E2E тестирование
- Полные сценарии использования
- Тестирование drag&drop
- Проверка сохранения состояния
## Can
vas Logging System

### Расположение лог-файла
```
logs/canvas-debug.log
```

### Формат записей
```
[2024-02-08 10:30:15] NODE_EXPAND: StartNode expanded
[2024-02-08 10:30:16] DRAG_START: Button component from library  
[2024-02-08 10:30:17] DROP_SUCCESS: Button added to StartNode
[2024-02-08 10:30:18] CONNECTION_CREATE: StartNode.button1 → MenuNode
[2024-02-08 10:30:19] VALIDATION_ERROR: MenuNode missing required field
```

### Очистка логов
- Файл очищается при каждом запуске приложения
- Максимальный размер файла: 10MB
- Ротация логов при превышении размера

## Implementation Phases

### Фаза 1: Основа (2 недели)
1. Модульный мульти-узел с треугольником
2. Витрина по популярности с Drag&Drop
3. Логирование канваса для отладки  
4. Индикация связей (красные/синие точки)

### Фаза 2: Группировка (1 неделя)
5. Цветные зоны (простая реализация)
6. Складные группы
7. Валидация с рамками

### Фаза 3: Связи (1 неделя)  
8. Типы стрелок (включая двунаправленные)
9. Подписи на стрелках
10. Расположение кнопок (3 варианта)

## Migration Strategy

### Совместимость с существующим кодом
- Постепенная замена NodeLibrary на SmartLibrary
- Сохранение существующих API для CustomNodes
- Обратная совместимость с текущими схемами ботов

### Переходный период
- Возможность переключения между старой и новой витриной
- Миграция данных статистики использования
- Сохранение пользовательских настроек
#
# Node Consistency System

### Проблема
В текущей реализации витрина узлов (NodeLibrary) и узлы на канвасе (CustomNodes) используют разные компоненты и стили, что создает несоответствие между тем, что видит пользователь в витрине и что появляется на канвасе.

### Решение
Создать единую систему рендеринга узлов:

```typescript
// Общий компонент для отображения узла
interface UnifiedNodeRendererProps {
  nodeType: string;
  data: NodeData;
  mode: 'library' | 'canvas' | 'preview';
  size: 'small' | 'medium' | 'large';
}

// Единый источник конфигурации узлов
interface NodeConfiguration {
  type: string;
  icon: string;
  color: string;
  name: string;
  description: string;
  defaultData: NodeData;
  renderComponent: React.ComponentType<any>;
}
```

### Архитектура синхронизации

```
NodeRegistry (единый реестр)
├── NodeConfiguration[]     # Конфигурации всех узлов
├── UnifiedNodeRenderer     # Общий рендерер
├── NodePreviewGenerator    # Генератор превью для витрины
└── NodeInstanceFactory     # Фабрика экземпляров для канваса
```

### Преимущества
- Полное соответствие между витриной и канвасом
- Единое место для изменения внешнего вида узлов
- Упрощенное добавление новых типов узлов
- Автоматическая синхронизация при обновлениях