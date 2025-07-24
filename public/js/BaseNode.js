/**
 * Базовый класс для всех узлов визуального редактора
 */
class BaseNode {
  constructor(id, type, category, config = {}) {
    this.id = id || this.generateId();
    this.type = type;
    this.category = category;
    this.config = config;
    this.position = { x: 0, y: 0 };
    this.inputs = [];
    this.outputs = [];
    this.connections = [];
    this.isSelected = false;
    this.isValid = true;
    this.validationErrors = [];
  }

  /**
   * Генерирует уникальный ID для узла
   */
  generateId() {
    return 'node_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Устанавливает позицию узла
   */
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
  }

  /**
   * Получает позицию узла
   */
  getPosition() {
    return { ...this.position };
  }

  /**
   * Добавляет входной порт
   */
  addInput(name, type = 'any', required = false) {
    this.inputs.push({
      name,
      type,
      required,
      connected: false,
      connectionId: null
    });
  }

  /**
   * Добавляет выходной порт
   */
  addOutput(name, type = 'any') {
    this.outputs.push({
      name,
      type,
      connections: []
    });
  }

  /**
   * Проверяет совместимость типов портов
   */
  isCompatible(outputType, inputType) {
    if (outputType === 'any' || inputType === 'any') return true;
    return outputType === inputType;
  }

  /**
   * Соединяет узел с другим узлом
   */
  connectTo(targetNode, outputPort = 0, inputPort = 0) {
    if (!this.outputs[outputPort] || !targetNode.inputs[inputPort]) {
      return false;
    }

    const output = this.outputs[outputPort];
    const input = targetNode.inputs[inputPort];

    if (!this.isCompatible(output.type, input.type)) {
      return false;
    }

    const connectionId = this.generateId();
    
    // Добавляем соединение к выходу
    output.connections.push({
      id: connectionId,
      targetNodeId: targetNode.id,
      targetPort: inputPort
    });

    // Устанавливаем соединение на входе
    input.connected = true;
    input.connectionId = connectionId;

    return connectionId;
  }

  /**
   * Отсоединяет узел от другого узла
   */
  disconnect(connectionId) {
    // Удаляем из выходов
    this.outputs.forEach(output => {
      output.connections = output.connections.filter(conn => conn.id !== connectionId);
    });

    // Удаляем из входов
    this.inputs.forEach(input => {
      if (input.connectionId === connectionId) {
        input.connected = false;
        input.connectionId = null;
      }
    });
  }

  /**
   * Валидирует конфигурацию узла
   */
  validate() {
    this.validationErrors = [];
    this.isValid = true;

    // Проверяем обязательные входы
    this.inputs.forEach(input => {
      if (input.required && !input.connected) {
        this.validationErrors.push(`Required input '${input.name}' is not connected`);
        this.isValid = false;
      }
    });

    // Проверяем конфигурацию
    const configValidation = this.validateConfig();
    if (!configValidation.isValid) {
      this.validationErrors.push(...configValidation.errors);
      this.isValid = false;
    }

    return {
      isValid: this.isValid,
      errors: this.validationErrors
    };
  }

  /**
   * Валидирует конфигурацию узла (переопределяется в наследниках)
   */
  validateConfig() {
    return { isValid: true, errors: [] };
  }

  /**
   * Получает схему узла для сериализации
   */
  getSchema() {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      position: this.position,
      config: this.config,
      inputs: this.inputs.map(input => ({
        name: input.name,
        type: input.type,
        required: input.required,
        connected: input.connected,
        connectionId: input.connectionId
      })),
      outputs: this.outputs.map(output => ({
        name: output.name,
        type: output.type,
        connections: output.connections
      }))
    };
  }

  /**
   * Загружает схему узла
   */
  loadSchema(schema) {
    this.id = schema.id;
    this.type = schema.type;
    this.category = schema.category;
    this.position = schema.position || { x: 0, y: 0 };
    this.config = schema.config || {};
    
    if (schema.inputs) {
      this.inputs = schema.inputs.map(input => ({ ...input }));
    }
    
    if (schema.outputs) {
      this.outputs = schema.outputs.map(output => ({ ...output }));
    }
  }

  /**
   * Клонирует узел
   */
  clone() {
    const cloned = new this.constructor();
    cloned.loadSchema(this.getSchema());
    cloned.id = this.generateId(); // Новый ID для клона
    return cloned;
  }

  /**
   * Получает отображаемое имя узла
   */
  getDisplayName() {
    return this.config.displayName || this.type;
  }

  /**
   * Получает описание узла
   */
  getDescription() {
    return this.config.description || '';
  }

  /**
   * Получает иконку узла
   */
  getIcon() {
    return this.config.icon || '⚙️';
  }

  /**
   * Получает цвет узла по категории
   */
  getCategoryColor() {
    const colors = {
      'triggers': '#4CAF50',
      'conditions': '#FF9800', 
      'actions': '#2196F3',
      'data': '#9C27B0',
      'integrations': '#F44336'
    };
    return colors[this.category] || '#757575';
  }

  /**
   * Проверяет, выбран ли узел
   */
  isNodeSelected() {
    return this.isSelected;
  }

  /**
   * Выбирает/отменяет выбор узла
   */
  setSelected(selected) {
    this.isSelected = selected;
  }

  /**
   * Получает границы узла для отрисовки
   */
  getBounds() {
    const width = this.config.width || 150;
    const height = this.config.height || 80;
    
    return {
      x: this.position.x,
      y: this.position.y,
      width: width,
      height: height,
      right: this.position.x + width,
      bottom: this.position.y + height
    };
  }

  /**
   * Проверяет, попадает ли точка в границы узла
   */
  containsPoint(x, y) {
    const bounds = this.getBounds();
    return x >= bounds.x && x <= bounds.right && 
           y >= bounds.y && y <= bounds.bottom;
  }

  /**
   * Получает позицию входного порта
   */
  getInputPortPosition(portIndex) {
    const bounds = this.getBounds();
    const portHeight = bounds.height / (this.inputs.length + 1);
    
    return {
      x: bounds.x,
      y: bounds.y + portHeight * (portIndex + 1)
    };
  }

  /**
   * Получает позицию выходного порта
   */
  getOutputPortPosition(portIndex) {
    const bounds = this.getBounds();
    const portHeight = bounds.height / (this.outputs.length + 1);
    
    return {
      x: bounds.right,
      y: bounds.y + portHeight * (portIndex + 1)
    };
  }

  /**
   * Обновляет конфигурацию узла
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.validate();
  }

  /**
   * Получает список свойств для редактирования
   */
  getEditableProperties() {
    return [
      {
        name: 'displayName',
        label: 'Display Name',
        type: 'text',
        value: this.config.displayName || this.type,
        required: false
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        value: this.config.description || '',
        required: false
      }
    ];
  }

  /**
   * Выполняет узел (переопределяется в наследниках)
   */
  async execute(context = {}) {
    throw new Error('Execute method must be implemented in derived classes');
  }

  /**
   * Получает результат выполнения узла
   */
  getExecutionResult() {
    return this.executionResult || null;
  }

  /**
   * Устанавливает результат выполнения узла
   */
  setExecutionResult(result) {
    this.executionResult = result;
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseNode;
}