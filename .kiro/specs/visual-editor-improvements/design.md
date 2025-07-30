# Design Document

## Overview

Дизайн решений для исправления критических проблем визуального редактора ботов. Основной фокус на стабильности пользовательского интерфейса, корректной локализации и улучшении пользовательского опыта.

## Architecture

### Компонентная архитектура

```
App (BrowserRouter)
├── Dashboard (главная страница)
│   ├── LoadingSpinner (индикатор загрузки)
│   ├── ErrorBoundary (обработка ошибок)
│   └── BotList (список ботов)
├── Editor (визуальный редактор)
│   ├── ReactFlowProvider (контекст ReactFlow)
│   ├── NodeLibrary (библиотека узлов)
│   ├── Canvas (рабочая область)
│   ├── PropertyPanel (панель свойств)
│   └── SaveIndicator (индикатор сохранения)
└── ErrorBoundary (глобальная обработка ошибок)
```

### Система состояний

```typescript
interface AppState {
  loading: boolean;
  error: string | null;
  bots: Bot[];
  currentBot: Bot | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}
```

## Components and Interfaces

### 1. Dashboard Stabilization

**Проблема:** Белый экран после мгновенного показа
**Решение:** Правильная обработка состояний загрузки

```typescript
interface DashboardState {
  loading: boolean;
  error: string | null;
  bots: Bot[];
  initialized: boolean;
}

// Компонент Dashboard
const Dashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    bots: [],
    initialized: false
  });

  // Предотвращение мерцания
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);
};
```

### 2. ReactFlow Stability

**Проблема:** Схема исчезает при перетаскивании
**Решение:** Стабилизация состояния узлов и соединений

```typescript
interface EditorState {
  nodes: Node[];
  edges: Edge[];
  isDragging: boolean;
  selectedNode: Node | null;
}

// Стабильные обработчики событий
const onNodeDrag = useCallback((event: MouseEvent, node: Node) => {
  // Предотвращение исчезновения схемы
  setNodes((nds) => 
    nds.map((n) => 
      n.id === node.id 
        ? { ...n, position: node.position }
        : n
    )
  );
}, [setNodes]);

const onNodeDragStop = useCallback((event: MouseEvent, node: Node) => {
  // Фиксация позиции после перетаскивания
  setNodes((nds) => 
    nds.map((n) => 
      n.id === node.id 
        ? { ...n, position: node.position, dragging: false }
        : n
    )
  );
}, [setNodes]);
```

### 3. Save Status Management

**Проблема:** Мигающая кнопка сохранения
**Решение:** Централизованное управление состоянием сохранения

```typescript
interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string | null;
  lastSaved: Date | null;
}

const useSaveStatus = () => {
  const [saveState, setSaveState] = useState<SaveState>({
    status: 'idle',
    message: null,
    lastSaved: null
  });

  const save = useCallback(async (data: any) => {
    setSaveState({ status: 'saving', message: 'Сохранение...', lastSaved: null });
    
    try {
      await saveBot(data);
      setSaveState({ 
        status: 'saved', 
        message: 'Сохранено успешно', 
        lastSaved: new Date() 
      });
      
      // Автоматически сбрасываем статус через 3 секунды
      setTimeout(() => {
        setSaveState(prev => ({ ...prev, status: 'idle', message: null }));
      }, 3000);
    } catch (error) {
      setSaveState({ 
        status: 'error', 
        message: `Ошибка сохранения: ${error.message}`, 
        lastSaved: null 
      });
    }
  }, []);

  return { saveState, save };
};
```

### 4. Localization System

**Проблема:** Отсутствие русских описаний
**Решение:** Система локализации для узлов и интерфейса

```typescript
interface NodeTypeLocalization {
  name: string;
  description: string;
  category: string;
  tooltip: string;
}

const nodeLocalization: Record<string, NodeTypeLocalization> = {
  'trigger-command': {
    name: 'Команда',
    description: 'Триггер для обработки команд бота',
    category: 'Триггеры',
    tooltip: 'Запускается при получении команды от пользователя'
  },
  'action-send-message': {
    name: 'Отправить сообщение',
    description: 'Отправляет текстовое сообщение пользователю',
    category: 'Действия',
    tooltip: 'Отправляет сообщение в чат с пользователем'
  },
  'data-variable-set': {
    name: 'Установить переменную',
    description: 'Сохраняет данные в переменную',
    category: 'Данные',
    tooltip: 'Сохраняет значение для дальнейшего использования'
  }
};

const getNodeLocalization = (nodeType: string): NodeTypeLocalization => {
  return nodeLocalization[nodeType] || {
    name: nodeType,
    description: 'Описание недоступно',
    category: 'Прочее',
    tooltip: 'Узел без описания'
  };
};
```

## Data Models

### Bot Configuration Model

```typescript
interface BotConfiguration {
  nodes: Node[];
  connections: Connection[];
  variables: Record<string, any>;
  settings: BotSettings;
  metadata: {
    version: string;
    lastModified: Date;
    nodeCount: number;
    connectionCount: number;
  };
}

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    localization?: NodeTypeLocalization;
  };
  dragging?: boolean;
  selected?: boolean;
}

interface Connection {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
  animated?: boolean;
}
```

### UI State Model

```typescript
interface UIState {
  dashboard: {
    loading: boolean;
    error: string | null;
    initialized: boolean;
    showContent: boolean;
  };
  editor: {
    loading: boolean;
    saving: boolean;
    error: string | null;
    selectedNode: string | null;
    dragState: {
      isDragging: boolean;
      draggedNode: string | null;
    };
  };
  notifications: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    visible: boolean;
    autoHide: boolean;
  }[];
}
```

## Error Handling

### Error Boundary Implementation

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary:', error, errorInfo);
    
    // Отправка ошибки в систему мониторинга
    this.reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Произошла ошибка</h2>
          <p>Приложение столкнулось с неожиданной ошибкой.</p>
          <button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling

```typescript
const apiErrorHandler = (error: any): string => {
  if (error.response) {
    // Ошибка от сервера
    switch (error.response.status) {
      case 404:
        return 'Ресурс не найден';
      case 500:
        return 'Внутренняя ошибка сервера';
      case 403:
        return 'Доступ запрещен';
      default:
        return `Ошибка сервера: ${error.response.status}`;
    }
  } else if (error.request) {
    // Ошибка сети
    return 'Ошибка сети. Проверьте подключение к интернету';
  } else {
    // Другие ошибки
    return error.message || 'Неизвестная ошибка';
  }
};
```

## Testing Strategy

### Unit Tests

1. **Component Testing**
   - Dashboard loading states
   - Editor node manipulation
   - Save status management
   - Localization functions

2. **Hook Testing**
   - useSaveStatus hook
   - useNodeLocalization hook
   - Custom state management hooks

3. **Utility Testing**
   - Error handling functions
   - Data conversion utilities
   - Validation functions

### Integration Tests

1. **User Flow Testing**
   - Dashboard → Editor navigation
   - Node creation and editing
   - Save and load operations
   - Error recovery scenarios

2. **API Integration**
   - Bot data loading
   - Schema saving
   - Error response handling

### E2E Tests

1. **Critical User Journeys**
   - Open dashboard → Select bot → Edit schema → Save
   - Create new bot → Add nodes → Connect nodes → Test
   - Handle network errors → Recover → Continue work

## Performance Considerations

### React Optimization

```typescript
// Мемоизация компонентов
const NodeComponent = React.memo(({ node, onUpdate }) => {
  // Компонент узла
}, (prevProps, nextProps) => {
  return prevProps.node.id === nextProps.node.id &&
         prevProps.node.position === nextProps.node.position;
});

// Оптимизация обновлений
const useOptimizedNodes = (nodes: Node[]) => {
  return useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        localization: getNodeLocalization(node.type)
      }
    }));
  }, [nodes]);
};
```

### Bundle Optimization

1. **Code Splitting**
   - Lazy loading компонентов
   - Dynamic imports для больших библиотек
   - Route-based splitting

2. **Asset Optimization**
   - Image optimization
   - CSS minification
   - Tree shaking для неиспользуемого кода

## Security Considerations

### Input Validation

```typescript
const validateBotConfiguration = (config: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!config.nodes || !Array.isArray(config.nodes)) {
    errors.push('Конфигурация должна содержать массив узлов');
  }
  
  if (!config.connections || !Array.isArray(config.connections)) {
    errors.push('Конфигурация должна содержать массив соединений');
  }
  
  // Валидация узлов
  config.nodes?.forEach((node: any, index: number) => {
    if (!node.id || typeof node.id !== 'string') {
      errors.push(`Узел ${index} должен иметь строковый ID`);
    }
    
    if (!node.type || typeof node.type !== 'string') {
      errors.push(`Узел ${index} должен иметь тип`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### XSS Protection

```typescript
const sanitizeUserInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
```

Этот дизайн обеспечивает стабильную работу визуального редактора с правильной обработкой ошибок, локализацией и оптимизированным пользовательским интерфейсом.