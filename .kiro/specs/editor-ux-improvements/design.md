# Дизайн улучшений UX визуального редактора

## Обзор

Данный дизайн описывает кардинальное улучшение пользовательского опыта визуального редактора ботов на основе анализа реального бота. Основная цель - сделать создание ботов интуитивным и визуально понятным.

## Архитектура

### Новые типы узлов

#### 1. Составной узел "InteractiveMenu"

**Структура узла:**
```typescript
interface InteractiveMenuNode {
  id: string;
  type: 'interactive-menu';
  position: { x: number; y: number };
  data: {
    title: string;
    message: string;
    parse_mode: 'HTML' | 'Markdown' | 'none';
    buttons: MenuButton[];
    keyboardType: 'inline' | 'reply';
    buttonsPerRow: number;
  };
  outputs: MenuOutput[]; // Динамически создаются на основе кнопок
}

interface MenuButton {
  id: string;
  text: string;
  type: 'callback' | 'url' | 'contact' | 'location';
  value: string; // callback_data или url
  row: number;
  column: number;
}

interface MenuOutput {
  id: string;
  buttonId: string;
  label: string;
}
```

**Визуальное представление:**
- Узел отображается как карточка с заголовком и превью кнопок
- При клике открывается модальное окно с редактором кнопок
- Выходные порты создаются автоматически для каждой кнопки

#### 2. Узел группы "NodeGroup"

**Структура группы:**
```typescript
interface NodeGroup {
  id: string;
  title: string;
  color: string;
  nodes: string[]; // ID узлов в группе
  collapsed: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}
```

**Функциональность:**
- Визуальная рамка вокруг узлов
- Возможность сворачивания/разворачивания
- Перемещение группы перемещает все узлы
- Автоматическое изменение размера при добавлении/удалении узлов

### Улучшенная система связей

#### Типы связей

```typescript
enum ConnectionType {
  FLOW = 'flow',        // Основной поток выполнения
  NAVIGATION = 'nav',   // Навигационные связи (возврат в меню)
  CONDITION = 'cond',   // Условные связи
  DATA = 'data'         // Передача данных
}

interface EnhancedConnection {
  id: string;
  type: ConnectionType;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;       // Подпись на связи
  condition?: string;   // Условие для условных связей
  bidirectional?: boolean; // Для навигационных связей
}
```

**Визуальное отображение:**
- `FLOW`: Сплошная стрелка (синяя)
- `NAVIGATION`: Пунктирная двунаправленная стрелка (зеленая)
- `CONDITION`: Стрелка с ромбом (оранжевая)
- `DATA`: Тонкая стрелка (серая)

### Компоненты и интерфейсы

#### 1. ButtonEditor Component

**Функциональность:**
- Drag & drop интерфейс для расстановки кнопок
- Превью клавиатуры в стиле Telegram
- Настройка свойств каждой кнопки
- Автоматическое создание callback_data

**Интерфейс:**
```typescript
interface ButtonEditorProps {
  buttons: MenuButton[];
  keyboardType: 'inline' | 'reply';
  buttonsPerRow: number;
  onButtonsChange: (buttons: MenuButton[]) => void;
  onKeyboardTypeChange: (type: 'inline' | 'reply') => void;
  onButtonsPerRowChange: (count: number) => void;
}
```

#### 2. NodeGroupManager Component

**Функциональность:**
- Создание и управление группами узлов
- Визуальное выделение групп
- Сворачивание/разворачивание групп

#### 3. ConnectionTypeSelector Component

**Функциональность:**
- Выбор типа связи при создании
- Настройка условий для условных связей
- Добавление подписей к связям

## Компоненты данных

### Улучшенный DataCollectionNode

```typescript
interface DataCollectionNode {
  id: string;
  type: 'data-collection';
  data: {
    variableName: string;
    dataType: 'text' | 'number' | 'file' | 'contact' | 'location';
    prompt: string;
    validation: {
      required: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      errorMessage: string;
    };
    retryLimit: number;
    retryMessage: string;
  };
}
```

### Система переменных

```typescript
interface VariableManager {
  variables: Map<string, Variable>;
  getAvailableVariables(nodeId: string): Variable[];
  addVariable(variable: Variable): void;
  removeVariable(name: string): void;
  validateVariableUsage(text: string): ValidationResult;
}

interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file';
  source: string; // ID узла, который создал переменную
  description: string;
}
```

## Переработка отображения бота 1

### Текущее состояние (9 узлов):
1. `node_start` (start)
2. `node_welcome_menu` (send_message_with_keyboard)
3. `node_help_handler` (callback_handler)
4. `node_help_text` (send_message_with_keyboard)
5. `node_test_handler` (callback_handler)
6. `node_test_response` (send_message_with_keyboard)
7. `node_about_handler` (callback_handler)
8. `node_about_text` (send_message_with_keyboard)
9. `node_main_menu_handler` (callback_handler)

### Новое отображение (4 узла + 3 группы):

#### Узлы:
1. **StartTrigger** - триггер команды /start
2. **MainMenu** - интерактивное меню с 3 кнопками
3. **HelpResponse** - ответ на справку
4. **TestResponse** - ответ на тест
5. **AboutResponse** - ответ о боте

#### Группы:
1. **"Справка"** - группирует MainMenu → HelpResponse
2. **"Тестирование"** - группирует MainMenu → TestResponse  
3. **"Информация"** - группирует MainMenu → AboutResponse

#### Связи:
- StartTrigger → MainMenu (FLOW)
- MainMenu → HelpResponse (FLOW, label: "📖 Справка")
- MainMenu → TestResponse (FLOW, label: "🧪 Тест")
- MainMenu → AboutResponse (FLOW, label: "ℹ️ О боте")
- HelpResponse → MainMenu (NAVIGATION)
- TestResponse → MainMenu (NAVIGATION)
- AboutResponse → MainMenu (NAVIGATION)

## Стратегия тестирования

### Unit тесты
- Тестирование компонентов ButtonEditor
- Тестирование логики создания групп
- Тестирование системы переменных

### Integration тесты
- Тестирование создания InteractiveMenu узлов
- Тестирование сохранения и загрузки групп
- Тестирование различных типов связей

### E2E тесты
- Создание бота с интерактивным меню
- Группировка узлов и работа с группами
- Настройка кнопок через визуальный редактор

### Тестирование на реальном боте
- Конвертация бота 1 в новый формат
- Проверка корректности работы всех функций
- Тестирование удобства использования

## Миграция существующих ботов

### Автоматическая конвертация
```typescript
interface BotMigrator {
  convertLegacyBot(bot: LegacyBot): ModernBot;
  identifyMenuPatterns(nodes: Node[]): MenuPattern[];
  createInteractiveMenus(patterns: MenuPattern[]): InteractiveMenuNode[];
  createGroups(nodes: Node[]): NodeGroup[];
}
```

### Стратегия миграции:
1. Анализ существующих узлов
2. Выявление паттернов меню (callback_handler + send_message_with_keyboard)
3. Автоматическое создание InteractiveMenu узлов
4. Создание групп для связанных узлов
5. Обновление типов связей

## Производительность

### Оптимизации:
- Виртуализация для больших схем
- Ленивая загрузка групп
- Кэширование результатов валидации
- Оптимизация рендеринга связей

### Метрики:
- Время загрузки схемы < 500ms
- Время отклика на действия пользователя < 100ms
- Поддержка схем до 1000 узлов
- Плавная анимация при 60 FPS