import type { Node, Edge } from 'reactflow';
import type { BotSchema } from '../types/flow';
import type { BaseNode, NodeCategory } from '../types/nodes';

export interface ValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  connectionId?: string;
  context?: string;
}

export interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    errorCount: number;
    warningCount: number;
    totalIssues: number;
  };
}

export interface ValidationRule {
  sourceCategory: NodeCategory;
  targetCategory: NodeCategory;
  allowed: boolean;
  reason?: string;
}

/**
 * Система валидации схем визуального редактора
 * Проверяет логическую целостность, циклические зависимости и корректность соединений
 */
export class SchemaValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private validationRules: ValidationRule[];

  constructor() {
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Инициализация правил валидации соединений между категориями узлов
   */
  private initializeValidationRules(): ValidationRule[] {
    return [
      // Триггеры могут соединяться с условиями, действиями и данными
      { sourceCategory: 'triggers', targetCategory: 'conditions', allowed: true },
      { sourceCategory: 'triggers', targetCategory: 'actions', allowed: true },
      { sourceCategory: 'triggers', targetCategory: 'data', allowed: true },
      
      // Условия могут соединяться с действиями, данными и другими условиями
      { sourceCategory: 'conditions', targetCategory: 'actions', allowed: true },
      { sourceCategory: 'conditions', targetCategory: 'data', allowed: true },
      { sourceCategory: 'conditions', targetCategory: 'conditions', allowed: true },
      
      // Действия могут соединяться с условиями, данными и другими действиями
      { sourceCategory: 'actions', targetCategory: 'conditions', allowed: true },
      { sourceCategory: 'actions', targetCategory: 'data', allowed: true },
      { sourceCategory: 'actions', targetCategory: 'actions', allowed: true },
      { sourceCategory: 'actions', targetCategory: 'integrations', allowed: true },
      
      // Данные могут соединяться с условиями, действиями и интеграциями
      { sourceCategory: 'data', targetCategory: 'conditions', allowed: true },
      { sourceCategory: 'data', targetCategory: 'actions', allowed: true },
      { sourceCategory: 'data', targetCategory: 'integrations', allowed: true },
      
      // Интеграции могут соединяться с условиями, действиями и данными
      { sourceCategory: 'integrations', targetCategory: 'conditions', allowed: true },
      { sourceCategory: 'integrations', targetCategory: 'actions', allowed: true },
      { sourceCategory: 'integrations', targetCategory: 'data', allowed: true },
      
      // Запрещенные соединения
      { sourceCategory: 'actions', targetCategory: 'triggers', allowed: false, reason: 'Действия не могут соединяться с триггерами' },
      { sourceCategory: 'conditions', targetCategory: 'triggers', allowed: false, reason: 'Условия не могут соединяться с триггерами' },
      { sourceCategory: 'data', targetCategory: 'triggers', allowed: false, reason: 'Данные не могут соединяться с триггерами' },
      { sourceCategory: 'integrations', targetCategory: 'triggers', allowed: false, reason: 'Интеграции не могут соединяться с триггерами' },
    ];
  }

  /**
   * Основной метод валидации схемы
   */
  public validateSchema(schema: BotSchema): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!schema) {
      this.addError('SCHEMA_MISSING', 'Схема не предоставлена для валидации');
      return this.getValidationResult();
    }

    // Базовая валидация структуры схемы
    this.validateSchemaStructure(schema);

    if (this.errors.length > 0) {
      return this.getValidationResult();
    }

    // Валидация узлов
    this.validateNodes(schema.nodes || []);

    // Валидация соединений
    this.validateConnections(schema.edges || [], schema.nodes || []);

    // Проверка циклических зависимостей
    this.validateCyclicDependencies(schema.nodes || [], schema.edges || []);

    // Проверка логической целостности
    this.validateLogicalIntegrity(schema.nodes || [], schema.edges || []);

    // Проверка достижимости узлов
    this.validateNodeReachability(schema.nodes || [], schema.edges || []);

    return this.getValidationResult();
  }

  /**
   * Валидация базовой структуры схемы
   */
  private validateSchemaStructure(schema: BotSchema): void {
    if (!Array.isArray(schema.nodes)) {
      this.addError('INVALID_NODES_ARRAY', 'Поле nodes должно быть массивом');
    }

    if (!Array.isArray(schema.edges)) {
      this.addError('INVALID_EDGES_ARRAY', 'Поле edges должно быть массивом');
    }

    if (schema.nodes && schema.nodes.length === 0) {
      this.addWarning('EMPTY_SCHEMA', 'Схема не содержит узлов');
    }

    if (!schema.id || !schema.name) {
      this.addWarning('MISSING_SCHEMA_INFO', 'Отсутствует ID или название схемы');
    }
  }

  /**
   * Валидация узлов
   */
  private validateNodes(nodes: Node[]): void {
    const nodeIds = new Set<string>();

    nodes.forEach((node, index) => {
      const nodeContext = `узел #${index + 1}`;

      // Проверка обязательных полей
      if (!node.id) {
        this.addError('MISSING_NODE_ID', `${nodeContext}: отсутствует ID узла`, node.id);
      }

      if (!node.type) {
        this.addError('MISSING_NODE_TYPE', `${nodeContext}: отсутствует тип узла`, node.id);
      }

      if (!node.data) {
        this.addError('MISSING_NODE_DATA', `${nodeContext}: отсутствуют данные узла`, node.id);
        return;
      }

      const nodeData = node.data as BaseNode;

      // Проверка уникальности ID
      if (node.id) {
        if (nodeIds.has(node.id)) {
          this.addError('DUPLICATE_NODE_ID', `${nodeContext}: дублирующийся ID узла "${node.id}"`, node.id);
        } else {
          nodeIds.add(node.id);
        }
      }

      // Проверка категории
      if (nodeData.category) {
        const validCategories: NodeCategory[] = ['triggers', 'conditions', 'actions', 'data', 'integrations', 'scenarios'];
        if (!validCategories.includes(nodeData.category)) {
          this.addError('INVALID_CATEGORY', `${nodeContext}: недопустимая категория "${nodeData.category}"`, node.id);
        }
      } else {
        this.addError('MISSING_CATEGORY', `${nodeContext}: отсутствует категория узла`, node.id);
      }

      // Проверка позиции
      if (node.position) {
        if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          this.addError('INVALID_POSITION', `${nodeContext}: некорректная позиция узла`, node.id);
        }
      } else {
        this.addWarning('MISSING_POSITION', `${nodeContext}: отсутствует позиция узла`, node.id);
      }

      // Валидация конфигурации узла
      this.validateNodeConfig(nodeData, nodeContext, node.id);
    });
  }

  /**
   * Валидация конфигурации узла
   */
  private validateNodeConfig(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    if (!nodeData.config) {
      this.addWarning('MISSING_NODE_CONFIG', `${nodeContext}: отсутствует конфигурация узла`, nodeId);
      return;
    }

    // Специфичная валидация по категориям узлов
    switch (nodeData.category) {
      case 'triggers':
        this.validateTriggerNode(nodeData, nodeContext, nodeId);
        break;
      case 'conditions':
        this.validateConditionNode(nodeData, nodeContext, nodeId);
        break;
      case 'actions':
        this.validateActionNode(nodeData, nodeContext, nodeId);
        break;
      case 'data':
        this.validateDataNode(nodeData, nodeContext, nodeId);
        break;
      case 'integrations':
        this.validateIntegrationNode(nodeData, nodeContext, nodeId);
        break;
    }
  }

  /**
   * Валидация триггерного узла
   */
  private validateTriggerNode(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    const config = nodeData.config;
    
    if (!config.triggerType) {
      this.addError('MISSING_TRIGGER_TYPE', `${nodeContext}: отсутствует тип триггера`, nodeId);
    }

    if (config.triggerType === 'command' && !config.command) {
      this.addError('MISSING_COMMAND', `${nodeContext}: отсутствует команда для триггера команды`, nodeId);
    }

    if (config.triggerType === 'message' && !config.pattern && !config.keywords) {
      this.addWarning('MISSING_MESSAGE_PATTERN', `${nodeContext}: отсутствует паттерн или ключевые слова для триггера сообщения`, nodeId);
    }
  }

  /**
   * Валидация узла условия
   */
  private validateConditionNode(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    const config = nodeData.config;
    
    if (!config.conditionType) {
      this.addError('MISSING_CONDITION_TYPE', `${nodeContext}: отсутствует тип условия`, nodeId);
    }

    if (config.conditionType === 'text_contains' && !config.text) {
      this.addError('MISSING_CONDITION_TEXT', `${nodeContext}: отсутствует текст для проверки условия`, nodeId);
    }

    if (config.conditionType === 'user_role' && !config.role) {
      this.addError('MISSING_USER_ROLE', `${nodeContext}: отсутствует роль пользователя для проверки`, nodeId);
    }
  }

  /**
   * Валидация узла действия
   */
  private validateActionNode(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    const config = nodeData.config;
    
    if (!config.actionType) {
      this.addError('MISSING_ACTION_TYPE', `${nodeContext}: отсутствует тип действия`, nodeId);
    }

    if (config.actionType === 'send_message' && !config.message) {
      this.addWarning('EMPTY_MESSAGE', `${nodeContext}: пустое сообщение для отправки`, nodeId);
    }

    if (config.actionType === 'send_photo' && !config.photo) {
      this.addError('MISSING_PHOTO', `${nodeContext}: отсутствует фото для отправки`, nodeId);
    }

    if (config.actionType === 'ban_user' && !config.duration) {
      this.addWarning('MISSING_BAN_DURATION', `${nodeContext}: отсутствует длительность бана`, nodeId);
    }
  }

  /**
   * Валидация узла данных
   */
  private validateDataNode(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    const config = nodeData.config;
    
    if (!config.dataType) {
      this.addError('MISSING_DATA_TYPE', `${nodeContext}: отсутствует тип данных`, nodeId);
    }

    if (config.dataType === 'variable' && !config.variableName) {
      this.addError('MISSING_VARIABLE_NAME', `${nodeContext}: отсутствует имя переменной`, nodeId);
    }

    if (config.dataType === 'counter' && typeof config.initialValue !== 'number') {
      this.addWarning('MISSING_INITIAL_VALUE', `${nodeContext}: отсутствует начальное значение счетчика`, nodeId);
    }
  }

  /**
   * Валидация узла интеграции
   */
  private validateIntegrationNode(nodeData: BaseNode, nodeContext: string, nodeId: string): void {
    const config = nodeData.config;
    
    if (!config.integrationType) {
      this.addError('MISSING_INTEGRATION_TYPE', `${nodeContext}: отсутствует тип интеграции`, nodeId);
    }

    if (config.integrationType === 'http' && !config.url) {
      this.addError('MISSING_HTTP_URL', `${nodeContext}: отсутствует URL для HTTP интеграции`, nodeId);
    }

    if (config.integrationType === 'webhook' && !config.webhookUrl) {
      this.addError('MISSING_WEBHOOK_URL', `${nodeContext}: отсутствует URL webhook'а`, nodeId);
    }

    if (config.integrationType === 'database' && !config.connectionString) {
      this.addError('MISSING_DB_CONNECTION', `${nodeContext}: отсутствует строка подключения к базе данных`, nodeId);
    }
  }

  /**
   * Валидация соединений
   */
  private validateConnections(edges: Edge[], nodes: Node[]): void {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const edgeIds = new Set<string>();

    edges.forEach((edge, index) => {
      const edgeContext = `соединение #${index + 1}`;

      // Проверка обязательных полей
      if (!edge.id) {
        this.addError('MISSING_EDGE_ID', `${edgeContext}: отсутствует ID соединения`);
      }

      if (!edge.source) {
        this.addError('MISSING_SOURCE_NODE', `${edgeContext}: отсутствует исходный узел`);
      }

      if (!edge.target) {
        this.addError('MISSING_TARGET_NODE', `${edgeContext}: отсутствует целевой узел`);
      }

      // Проверка уникальности ID соединения
      if (edge.id) {
        if (edgeIds.has(edge.id)) {
          this.addError('DUPLICATE_EDGE_ID', `${edgeContext}: дублирующийся ID соединения "${edge.id}"`, undefined, edge.id);
        } else {
          edgeIds.add(edge.id);
        }
      }

      // Проверка существования узлов
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode) {
        this.addError('SOURCE_NODE_NOT_FOUND', `${edgeContext}: исходный узел "${edge.source}" не найден`, undefined, edge.id);
      }

      if (!targetNode) {
        this.addError('TARGET_NODE_NOT_FOUND', `${edgeContext}: целевой узел "${edge.target}" не найден`, undefined, edge.id);
      }

      // Проверка правил соединения категорий
      if (sourceNode && targetNode) {
        this.validateConnectionRules(sourceNode, targetNode, edgeContext, edge.id);
      }

      // Проверка самосоединения
      if (edge.source === edge.target) {
        this.addWarning('SELF_CONNECTION', `${edgeContext}: узел соединен сам с собой`, edge.source, edge.id);
      }
    });
  }

  /**
   * Валидация правил соединения между категориями
   */
  private validateConnectionRules(sourceNode: Node, targetNode: Node, edgeContext: string, edgeId: string): void {
    const sourceData = sourceNode.data as BaseNode;
    const targetData = targetNode.data as BaseNode;
    
    if (!sourceData?.category || !targetData?.category) {
      return;
    }

    const rule = this.validationRules.find(
      r => r.sourceCategory === sourceData.category && r.targetCategory === targetData.category
    );

    if (!rule) {
      this.addWarning('UNDEFINED_CONNECTION', `${edgeContext}: соединение между "${sourceData.category}" и "${targetData.category}" не определено`, undefined, edgeId);
    } else if (!rule.allowed) {
      this.addError('FORBIDDEN_CONNECTION', `${edgeContext}: ${rule.reason || 'Запрещенное соединение'}`, undefined, edgeId);
    }
  }

  /**
   * Проверка циклических зависимостей
   */
  private validateCyclicDependencies(nodes: Node[], edges: Edge[]): void {
    const graph = this.buildGraph(nodes, edges);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        const cyclePath = this.detectCycle(graph, nodeId, visited, recursionStack, []);
        if (cyclePath.length > 0) {
          this.addError('CYCLIC_DEPENDENCY', `Обнаружена циклическая зависимость: ${cyclePath.join(' → ')}`, nodeId);
        }
      }
    }
  }

  /**
   * Построение графа из узлов и соединений
   */
  private buildGraph(nodes: Node[], edges: Edge[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // Инициализируем граф
    nodes.forEach(node => {
      graph.set(node.id, []);
    });
    
    // Добавляем соединения
    edges.forEach(edge => {
      if (graph.has(edge.source)) {
        graph.get(edge.source)!.push(edge.target);
      }
    });
    
    return graph;
  }

  /**
   * Обнаружение циклов в графе (DFS) с возвратом пути цикла
   */
  private detectCycle(
    graph: Map<string, string[]>, 
    nodeId: string, 
    visited: Set<string>, 
    recursionStack: Set<string>,
    currentPath: string[]
  ): string[] {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cyclePath = this.detectCycle(graph, neighbor, visited, recursionStack, [...currentPath]);
        if (cyclePath.length > 0) {
          return cyclePath;
        }
      } else if (recursionStack.has(neighbor)) {
        // Найден цикл, возвращаем путь от начала цикла
        const cycleStartIndex = currentPath.indexOf(neighbor);
        return [...currentPath.slice(cycleStartIndex), neighbor];
      }
    }

    recursionStack.delete(nodeId);
    return [];
  }

  /**
   * Валидация логической целостности
   */
  private validateLogicalIntegrity(nodes: Node[], edges: Edge[]): void {
    // Проверяем наличие триггеров
    const triggerNodes = nodes.filter(node => {
      const nodeData = node.data as BaseNode;
      return nodeData?.category === 'triggers';
    });
    
    if (triggerNodes.length === 0) {
      this.addWarning('NO_TRIGGERS', 'Схема не содержит триггеров - бот не будет реагировать на события');
    }

    // Проверяем наличие действий
    const actionNodes = nodes.filter(node => {
      const nodeData = node.data as BaseNode;
      return nodeData?.category === 'actions';
    });
    
    if (actionNodes.length === 0) {
      this.addWarning('NO_ACTIONS', 'Схема не содержит действий - бот не будет выполнять никаких операций');
    }

    // Проверяем изолированные узлы
    this.validateIsolatedNodes(nodes, edges);

    // Проверяем множественные триггеры одного типа
    this.validateDuplicateTriggers(triggerNodes);
  }

  /**
   * Проверка изолированных узлов
   */
  private validateIsolatedNodes(nodes: Node[], edges: Edge[]): void {
    const connectedNodes = new Set<string>();
    
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id)) {
        this.addWarning('ISOLATED_NODE', `Узел "${node.id}" изолирован и не участвует в логике бота`, node.id);
      }
    });
  }

  /**
   * Проверка дублирующихся триггеров
   */
  private validateDuplicateTriggers(triggerNodes: Node[]): void {
    const triggerTypes = new Map<string, Node[]>();

    triggerNodes.forEach(node => {
      const nodeData = node.data as BaseNode;
      const triggerType = nodeData.config?.triggerType;
      
      if (triggerType) {
        if (!triggerTypes.has(triggerType)) {
          triggerTypes.set(triggerType, []);
        }
        triggerTypes.get(triggerType)!.push(node);
      }
    });

    triggerTypes.forEach((nodes, triggerType) => {
      if (nodes.length > 1) {
        const nodeIds = nodes.map(n => n.id).join(', ');
        this.addWarning('DUPLICATE_TRIGGERS', `Найдено несколько триггеров типа "${triggerType}": ${nodeIds}`);
      }
    });
  }

  /**
   * Проверка достижимости узлов
   */
  private validateNodeReachability(nodes: Node[], edges: Edge[]): void {
    const triggerNodes = nodes.filter(node => {
      const nodeData = node.data as BaseNode;
      return nodeData?.category === 'triggers';
    });
    
    if (triggerNodes.length === 0) return;

    const graph = this.buildGraph(nodes, edges);
    const reachableNodes = new Set<string>();

    // Обход в глубину от каждого триггера
    triggerNodes.forEach(trigger => {
      this.dfsReachability(graph, trigger.id, reachableNodes);
    });

    // Проверяем недостижимые узлы
    nodes.forEach(node => {
      const nodeData = node.data as BaseNode;
      if (nodeData?.category !== 'triggers' && !reachableNodes.has(node.id)) {
        this.addWarning('UNREACHABLE_NODE', `Узел "${node.id}" недостижим от триггеров`, node.id);
      }
    });
  }

  /**
   * DFS для поиска достижимых узлов
   */
  private dfsReachability(graph: Map<string, string[]>, nodeId: string, reachableNodes: Set<string>): void {
    if (reachableNodes.has(nodeId)) return;
    
    reachableNodes.add(nodeId);
    const neighbors = graph.get(nodeId) || [];
    
    neighbors.forEach(neighbor => {
      this.dfsReachability(graph, neighbor, reachableNodes);
    });
  }

  /**
   * Быстрая валидация (только критические ошибки)
   */
  public quickValidate(schema: BotSchema): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!schema?.nodes || !schema?.edges) {
      this.addError('INVALID_SCHEMA_STRUCTURE', 'Некорректная структура схемы');
      return this.getValidationResult();
    }

    // Только базовые проверки
    this.validateNodes(schema.nodes);
    this.validateConnections(schema.edges, schema.nodes);

    return this.getValidationResult();
  }

  /**
   * Валидация конкретного узла
   */
  public validateSingleNode(node: Node): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!node) {
      this.addError('NODE_MISSING', 'Узел не предоставлен для валидации');
      return this.getValidationResult();
    }

    this.validateNodes([node]);
    return this.getValidationResult();
  }

  /**
   * Валидация конкретного соединения
   */
  public validateSingleConnection(edge: Edge, nodes: Node[]): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!edge) {
      this.addError('CONNECTION_MISSING', 'Соединение не предоставлено для валидации');
      return this.getValidationResult();
    }

    this.validateConnections([edge], nodes);
    return this.getValidationResult();
  }

  /**
   * Получение совместимых типов узлов для соединения
   */
  public getCompatibleNodeTypes(sourceCategory: NodeCategory): NodeCategory[] {
    return this.validationRules
      .filter(rule => rule.sourceCategory === sourceCategory && rule.allowed)
      .map(rule => rule.targetCategory);
  }

  /**
   * Проверка возможности соединения двух узлов
   */
  public canConnect(sourceNode: Node, targetNode: Node): { canConnect: boolean; reason?: string } {
    const sourceData = sourceNode.data as BaseNode;
    const targetData = targetNode.data as BaseNode;

    if (!sourceData?.category || !targetData?.category) {
      return { canConnect: false, reason: 'Отсутствует категория узла' };
    }

    if (sourceNode.id === targetNode.id) {
      return { canConnect: false, reason: 'Узел не может соединяться сам с собой' };
    }

    const rule = this.validationRules.find(
      r => r.sourceCategory === sourceData.category && r.targetCategory === targetData.category
    );

    if (!rule) {
      return { canConnect: false, reason: `Соединение между ${sourceData.category} и ${targetData.category} не определено` };
    }

    return { canConnect: rule.allowed, reason: rule.reason };
  }

  /**
   * Добавление ошибки
   */
  private addError(type: string, message: string, nodeId?: string, connectionId?: string): void {
    this.errors.push({
      type,
      message,
      severity: 'error',
      nodeId,
      connectionId
    });
  }

  /**
   * Добавление предупреждения
   */
  private addWarning(type: string, message: string, nodeId?: string, connectionId?: string): void {
    this.warnings.push({
      type,
      message,
      severity: 'warning',
      nodeId,
      connectionId
    });
  }

  /**
   * Получение результата валидации
   */
  private getValidationResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      hasWarnings: this.warnings.length > 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
        totalIssues: this.errors.length + this.warnings.length
      }
    };
  }
}

// Экспорт экземпляра валидатора для использования в приложении
export const schemaValidator = new SchemaValidator();