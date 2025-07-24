/**
 * Реестр типов узлов для визуального редактора
 */
class NodeRegistry {
  constructor() {
    this.nodeTypes = new Map();
    this.categories = new Map();
    this.initialized = false;
  }

  /**
   * Инициализирует реестр с базовыми типами узлов
   */
  init() {
    if (this.initialized) return;

    // Регистрируем категории
    this.registerCategory('triggers', {
      name: 'Triggers',
      displayName: 'Триггеры',
      description: 'Узлы для обработки входящих событий',
      icon: '🎯',
      color: '#4CAF50'
    });

    this.registerCategory('conditions', {
      name: 'conditions',
      displayName: 'Условия',
      description: 'Узлы для проверки условий и логики',
      icon: '❓',
      color: '#FF9800'
    });

    this.registerCategory('actions', {
      name: 'actions',
      displayName: 'Действия',
      description: 'Узлы для выполнения действий',
      icon: '⚡',
      color: '#2196F3'
    });

    this.registerCategory('data', {
      name: 'data',
      displayName: 'Данные',
      description: 'Узлы для работы с данными',
      icon: '💾',
      color: '#9C27B0'
    });

    this.registerCategory('integrations', {
      name: 'integrations',
      displayName: 'Интеграции',
      description: 'Узлы для внешних интеграций',
      icon: '🔗',
      color: '#F44336'
    });

    this.initialized = true;
  }

  /**
   * Регистрирует категорию узлов
   */
  registerCategory(id, categoryInfo) {
    this.categories.set(id, {
      id,
      ...categoryInfo
    });
  }

  /**
   * Регистрирует тип узла
   */
  registerNodeType(nodeClass, metadata = {}) {
    if (!nodeClass.prototype || typeof nodeClass !== 'function') {
      throw new Error('Node class must be a constructor function');
    }

    const nodeType = metadata.type || nodeClass.name.toLowerCase().replace('node', '');
    const category = metadata.category || 'actions';

    const nodeInfo = {
      type: nodeType,
      category: category,
      class: nodeClass,
      displayName: metadata.displayName || nodeType,
      description: metadata.description || '',
      icon: metadata.icon || '⚙️',
      tags: metadata.tags || [],
      inputs: metadata.inputs || [],
      outputs: metadata.outputs || [],
      configSchema: metadata.configSchema || {},
      examples: metadata.examples || []
    };

    this.nodeTypes.set(nodeType, nodeInfo);
    return nodeInfo;
  }

  /**
   * Получает информацию о типе узла
   */
  getNodeType(type) {
    return this.nodeTypes.get(type);
  }

  /**
   * Получает все зарегистрированные типы узлов
   */
  getAllNodeTypes() {
    return Array.from(this.nodeTypes.values());
  }

  /**
   * Получает типы узлов по категории
   */
  getNodeTypesByCategory(category) {
    return Array.from(this.nodeTypes.values())
      .filter(nodeInfo => nodeInfo.category === category);
  }

  /**
   * Получает все категории
   */
  getCategories() {
    return Array.from(this.categories.values());
  }

  /**
   * Получает информацию о категории
   */
  getCategory(categoryId) {
    return this.categories.get(categoryId);
  }

  /**
   * Создает экземпляр узла по типу
   */
  createNode(type, config = {}) {
    const nodeInfo = this.getNodeType(type);
    if (!nodeInfo) {
      throw new Error(`Unknown node type: ${type}`);
    }

    const node = new nodeInfo.class();
    node.type = type;
    node.category = nodeInfo.category;
    
    // Устанавливаем базовую конфигурацию
    node.config = {
      displayName: nodeInfo.displayName,
      description: nodeInfo.description,
      icon: nodeInfo.icon,
      ...config
    };

    // Добавляем входы и выходы из метаданных
    nodeInfo.inputs.forEach(input => {
      node.addInput(input.name, input.type, input.required);
    });

    nodeInfo.outputs.forEach(output => {
      node.addOutput(output.name, output.type);
    });

    return node;
  }

  /**
   * Поиск узлов по тексту
   */
  searchNodes(query) {
    if (!query || query.trim() === '') {
      return this.getAllNodeTypes();
    }

    const searchTerm = query.toLowerCase().trim();
    
    return Array.from(this.nodeTypes.values()).filter(nodeInfo => {
      return nodeInfo.displayName.toLowerCase().includes(searchTerm) ||
             nodeInfo.description.toLowerCase().includes(searchTerm) ||
             nodeInfo.type.toLowerCase().includes(searchTerm) ||
             nodeInfo.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    });
  }

  /**
   * Валидирует схему узла
   */
  validateNodeSchema(schema) {
    const nodeInfo = this.getNodeType(schema.type);
    if (!nodeInfo) {
      return {
        isValid: false,
        errors: [`Unknown node type: ${schema.type}`]
      };
    }

    const errors = [];

    // Проверяем обязательные поля конфигурации
    if (nodeInfo.configSchema.required) {
      nodeInfo.configSchema.required.forEach(field => {
        if (!schema.config || schema.config[field] === undefined) {
          errors.push(`Required field '${field}' is missing`);
        }
      });
    }

    // Проверяем типы полей
    if (nodeInfo.configSchema.properties && schema.config) {
      Object.entries(nodeInfo.configSchema.properties).forEach(([field, fieldSchema]) => {
        const value = schema.config[field];
        if (value !== undefined) {
          if (!this.validateFieldType(value, fieldSchema)) {
            errors.push(`Field '${field}' has invalid type`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Валидирует тип поля
   */
  validateFieldType(value, fieldSchema) {
    switch (fieldSchema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Получает схему конфигурации для типа узла
   */
  getConfigSchema(type) {
    const nodeInfo = this.getNodeType(type);
    return nodeInfo ? nodeInfo.configSchema : null;
  }

  /**
   * Проверяет совместимость соединения между узлами
   */
  canConnect(sourceType, sourceOutput, targetType, targetInput) {
    const sourceInfo = this.getNodeType(sourceType);
    const targetInfo = this.getNodeType(targetType);

    if (!sourceInfo || !targetInfo) {
      return false;
    }

    const sourceOutputInfo = sourceInfo.outputs[sourceOutput];
    const targetInputInfo = targetInfo.inputs[targetInput];

    if (!sourceOutputInfo || !targetInputInfo) {
      return false;
    }

    // Проверяем совместимость типов
    if (sourceOutputInfo.type === 'any' || targetInputInfo.type === 'any') {
      return true;
    }

    return sourceOutputInfo.type === targetInputInfo.type;
  }

  /**
   * Получает статистику по узлам
   */
  getStats() {
    const stats = {
      totalNodes: this.nodeTypes.size,
      categories: {}
    };

    this.categories.forEach((category, id) => {
      stats.categories[id] = {
        name: category.displayName,
        count: this.getNodeTypesByCategory(id).length
      };
    });

    return stats;
  }

  /**
   * Экспортирует реестр в JSON
   */
  export() {
    return {
      categories: Array.from(this.categories.entries()),
      nodeTypes: Array.from(this.nodeTypes.entries()).map(([type, info]) => ({
        type,
        category: info.category,
        displayName: info.displayName,
        description: info.description,
        icon: info.icon,
        tags: info.tags,
        inputs: info.inputs,
        outputs: info.outputs,
        configSchema: info.configSchema
      }))
    };
  }

  /**
   * Импортирует реестр из JSON
   */
  import(data) {
    // Импортируем категории
    if (data.categories) {
      data.categories.forEach(([id, category]) => {
        this.categories.set(id, category);
      });
    }

    // Импортируем типы узлов (без классов - только метаданные)
    if (data.nodeTypes) {
      data.nodeTypes.forEach(nodeInfo => {
        // Создаем заглушку класса для импортированных узлов
        const PlaceholderClass = class extends BaseNode {
          constructor() {
            super();
          }
        };

        this.nodeTypes.set(nodeInfo.type, {
          ...nodeInfo,
          class: PlaceholderClass
        });
      });
    }
  }

  /**
   * Очищает реестр
   */
  clear() {
    this.nodeTypes.clear();
    this.categories.clear();
    this.initialized = false;
  }
}

// Создаем глобальный экземпляр реестра
const nodeRegistry = new NodeRegistry();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NodeRegistry, nodeRegistry };
} else if (typeof window !== 'undefined') {
  window.NodeRegistry = NodeRegistry;
  window.nodeRegistry = nodeRegistry;
}