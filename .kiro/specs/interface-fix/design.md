# Design Document

## Overview

Данный документ описывает дизайн решения для исправления проблем с пользовательским интерфейсом Bot Constructor. Основная проблема заключается в том, что React приложение не может загрузиться из-за ошибок с ES модулями, а старый интерфейс не работает из-за проблем с JavaScript файлами.

## Architecture

### Компонентная архитектура

```
Bot Constructor Interface
├── Server Layer (Express.js)
│   ├── Static File Serving
│   ├── API Routes
│   └── Interface Routing
├── Frontend Layer
│   ├── React Application (новый интерфейс)
│   │   ├── Dashboard Component
│   │   ├── Visual Editor Component
│   │   └── Shared Components
│   └── Legacy Interface (старый интерфейс)
│       ├── HTML Templates
│       ├── Vanilla JavaScript
│       └── CSS Styles
└── Diagnostic Tools
    ├── Debug Pages
    ├── Test Pages
    └── Error Reporting
```

### Стратегия исправления

1. **Приоритет 1**: Исправить старый интерфейс для немедленной работоспособности
2. **Приоритет 2**: Исправить React приложение для долгосрочного использования
3. **Приоритет 3**: Создать систему автоматического переключения между интерфейсами

## Components and Interfaces

### 1. Server Configuration Component

**Назначение**: Правильная настройка сервера для обслуживания статических файлов и интерфейсов.

**Интерфейсы**:
- Настройка MIME типов для JavaScript модулей
- Маршрутизация между старым и новым интерфейсом
- Обработка статических файлов

**Ключевые функции**:
```javascript
// Настройка MIME типов
app.use('/assets', setMimeTypes);
app.use('/js', setMimeTypes);

// Интеллектуальная маршрутизация
app.get('*', intelligentRouting);
```

### 2. Legacy Interface Repair Component

**Назначение**: Исправление проблем в старом JavaScript интерфейсе.

**Проблемы для исправления**:
- Ошибки в загрузке JavaScript файлов
- Проблемы с обработчиками событий
- Конфликты в глобальных переменных
- Проблемы с API вызовами

**Файлы для проверки и исправления**:
- `public/app.js`
- `public/js/VisualEditor.js`
- `public/js/*.js`

### 3. React Application Fix Component

**Назначение**: Исправление проблем с React приложением.

**Проблемы для исправления**:
- Ошибка "Cannot use 'import.meta' outside a module"
- Проблемы с загрузкой ES модулей
- Конфликты Content Security Policy

**Решения**:
- Правильная настройка Vite сборки
- Корректные MIME типы для модулей
- Настройка CSP заголовков

### 4. Diagnostic System Component

**Назначение**: Система диагностики для быстрого выявления проблем.

**Компоненты**:
- Debug Dashboard (`/debug.html`)
- Simple Test Page (`/simple-test.html`)
- Error Logging System
- Health Check Endpoints

### 5. Interface Switching Component

**Назначение**: Автоматическое переключение между интерфейсами в зависимости от их работоспособности.

**Логика переключения**:
```javascript
function selectInterface(req, res) {
  if (isReactWorking()) {
    return serveReactApp(res);
  } else if (isLegacyWorking()) {
    return serveLegacyApp(res);
  } else {
    return serveErrorPage(res);
  }
}
```

## Data Models

### Interface Status Model
```javascript
{
  react: {
    available: boolean,
    working: boolean,
    lastError: string,
    lastCheck: timestamp
  },
  legacy: {
    available: boolean,
    working: boolean,
    lastError: string,
    lastCheck: timestamp
  },
  current: 'react' | 'legacy' | 'error'
}
```

### Diagnostic Data Model
```javascript
{
  timestamp: Date,
  tests: [
    {
      name: string,
      status: 'pass' | 'fail' | 'warning',
      message: string,
      details: object
    }
  ],
  environment: {
    nodeVersion: string,
    platform: string,
    memory: object
  }
}
```

## Error Handling

### JavaScript Error Handling
- Глобальный обработчик ошибок для старого интерфейса
- Error boundaries для React приложения
- Логирование ошибок в файлы и консоль

### Network Error Handling
- Retry механизмы для API вызовов
- Fallback на кэшированные данные
- Graceful degradation функциональности

### File Loading Error Handling
- Проверка доступности статических файлов
- Альтернативные пути загрузки
- Информативные сообщения об ошибках

## Testing Strategy

### Unit Tests
- Тестирование отдельных JavaScript функций
- Тестирование React компонентов
- Тестирование API endpoints

### Integration Tests
- Тестирование взаимодействия между компонентами
- Тестирование полного цикла создания бота
- Тестирование переключения интерфейсов

### End-to-End Tests
- Автоматизированное тестирование пользовательских сценариев
- Тестирование в разных браузерах
- Тестирование производительности

### Manual Testing Checklist
1. Загрузка главной страницы
2. Отображение списка ботов
3. Создание нового бота
4. Редактирование существующего бота
5. Сохранение изменений
6. Переключение между интерфейсами

## Implementation Plan

### Phase 1: Emergency Fix (Legacy Interface)
1. Диагностика проблем в старом интерфейсе
2. Исправление JavaScript ошибок
3. Восстановление базовой функциональности
4. Тестирование основных сценариев

### Phase 2: React Application Fix
1. Исправление проблем со сборкой
2. Настройка правильных MIME типов
3. Решение проблем с CSP
4. Тестирование React приложения

### Phase 3: Integration and Optimization
1. Создание системы переключения интерфейсов
2. Улучшение диагностических инструментов
3. Оптимизация производительности
4. Документирование решений

## Security Considerations

- Безопасная настройка CSP заголовков
- Валидация пользовательского ввода
- Защита от XSS атак
- Безопасное хранение конфигурации ботов

## Performance Considerations

- Ленивая загрузка компонентов
- Кэширование статических ресурсов
- Оптимизация размера JavaScript бандлов
- Минимизация количества HTTP запросов