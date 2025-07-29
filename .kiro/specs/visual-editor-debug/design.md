# Design Document - Visual Editor Debug System

## Overview

Система отладки визуального редактора представляет собой комплексный инструмент для диагностики и исправления проблем с отображением схем ботов. Система включает в себя логирование, интерактивную отладку, диагностику и автоматические исправления.

## Architecture

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Debug System                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Logger    │  │ Diagnostics │  │   Interactive       │  │
│  │   System    │  │   Engine    │  │   Debug Panel       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Canvas    │  │   Schema     │  │   Auto-Fix          │  │
│  │   Monitor   │  │   Inspector  │  │   Engine            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. DebugLogger Class

```javascript
class DebugLogger {
    constructor() {
        this.logs = [];
        this.isEnabled = true;
        this.logLevel = 'debug'; // debug, info, warn, error
        this.maxLogs = 1000;
    }
    
    log(level, category, message, data = null) {
        // Записывает лог с timestamp, уровнем и категорией
    }
    
    getLogs(filter = null) {
        // Возвращает отфильтрованные логи
    }
    
    exportLogs() {
        // Экспортирует логи в JSON
    }
    
    clear() {
        // Очищает все логи
    }
}
```

### 2. CanvasMonitor Class

```javascript
class CanvasMonitor {
    constructor(canvas, botConstructor) {
        this.canvas = canvas;
        this.botConstructor = botConstructor;
        this.isMonitoring = false;
    }
    
    startMonitoring() {
        // Начинает отслеживание событий canvas
    }
    
    getCanvasState() {
        // Возвращает текущее состояние canvas
    }
    
    validateCanvas() {
        // Проверяет корректность canvas
    }
    
    forceRedraw() {
        // Принудительная перерисовка
    }
}
```

### 3. SchemaInspector Class

```javascript
class SchemaInspector {
    constructor(botConstructor) {
        this.botConstructor = botConstructor;
    }
    
    inspectCurrentSchema() {
        // Анализирует текущую схему
    }
    
    validateNodes() {
        // Проверяет корректность всех узлов
    }
    
    getSchemaStats() {
        // Возвращает статистику схемы
    }
    
    findProblems() {
        // Ищет проблемы в схеме
    }
}
```

### 4. AutoFixEngine Class

```javascript
class AutoFixEngine {
    constructor(debugLogger, canvasMonitor, schemaInspector) {
        this.logger = debugLogger;
        this.canvasMonitor = canvasMonitor;
        this.schemaInspector = schemaInspector;
        this.fixes = new Map();
    }
    
    registerFix(problemType, fixFunction) {
        // Регистрирует автоматическое исправление
    }
    
    diagnoseProblems() {
        // Диагностирует все проблемы
    }
    
    suggestFixes(problems) {
        // Предлагает исправления
    }
    
    applyFix(fixId) {
        // Применяет исправление
    }
}
```

## Data Models

### LogEntry Model
```javascript
{
    id: string,
    timestamp: Date,
    level: 'debug' | 'info' | 'warn' | 'error',
    category: string,
    message: string,
    data: any,
    stackTrace: string?
}
```

### CanvasState Model
```javascript
{
    width: number,
    height: number,
    nodesCount: number,
    connectionsCount: number,
    selectedNode: string?,
    isVisible: boolean,
    hasErrors: boolean,
    lastRedraw: Date
}
```

### SchemaStats Model
```javascript
{
    totalNodes: number,
    nodesByType: Map<string, number>,
    totalConnections: number,
    orphanedNodes: string[],
    invalidNodes: string[],
    missingConnections: string[]
}
```

### Problem Model
```javascript
{
    id: string,
    type: 'initialization' | 'canvas' | 'schema' | 'interaction',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    context: any,
    suggestedFixes: Fix[]
}
```

### Fix Model
```javascript
{
    id: string,
    name: string,
    description: string,
    canAutoApply: boolean,
    apply: Function,
    rollback: Function?
}
```

## Error Handling

### Категории ошибок

1. **Initialization Errors**
   - BotConstructor не создается
   - Отсутствуют необходимые методы
   - Конфликты скриптов

2. **Canvas Errors**
   - Canvas не найден
   - Неправильные размеры
   - Ошибки отрисовки

3. **Schema Errors**
   - Некорректные данные схемы
   - Отсутствующие узлы
   - Неправильные связи

4. **Interaction Errors**
   - События не обрабатываются
   - Drag&Drop не работает
   - Клики не регистрируются

### Стратегии обработки

```javascript
const errorHandlers = {
    'initialization': {
        'botConstructor-missing': () => {
            // Принудительная инициализация
        },
        'methods-missing': () => {
            // Добавление недостающих методов
        }
    },
    'canvas': {
        'canvas-not-found': () => {
            // Создание canvas
        },
        'invalid-size': () => {
            // Исправление размеров
        }
    }
};
```

## Testing Strategy

### Unit Tests
- Тестирование каждого компонента отладчика
- Мокирование BotConstructor и canvas
- Проверка корректности логирования

### Integration Tests
- Тестирование взаимодействия компонентов
- Проверка автоматических исправлений
- Тестирование экспорта/импорта

### Manual Tests
- Интерактивное тестирование панели отладки
- Проверка работы в разных браузерах
- Тестирование производительности

## Implementation Plan

### Phase 1: Core Logging System
- Создание DebugLogger
- Интеграция с BotConstructor
- Базовая панель логов

### Phase 2: Canvas Monitoring
- Создание CanvasMonitor
- Отслеживание событий
- Диагностика canvas

### Phase 3: Schema Inspection
- Создание SchemaInspector
- Анализ схем
- Поиск проблем

### Phase 4: Auto-Fix Engine
- Создание AutoFixEngine
- Регистрация исправлений
- Автоматическая диагностика

### Phase 5: Interactive Debug Panel
- Создание UI панели
- Интеграция всех компонентов
- Экспорт/импорт данных