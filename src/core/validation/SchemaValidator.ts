/**
 * Валидатор схем для мультиплатформенного конструктора ботов
 * Обеспечивает проверку целостности и корректности данных
 */

import {
  BotSchema,
  Node,
  Edge,
  ValidationResult,
  ValidationError,
  NodeCategory,
  MessengerPlatform
} from '../types';

export class SchemaValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Валидация полной схемы бота
   */
  validateSchema(schema: BotSchema): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!schema) {
      this.addError('SCHEMA_MISSING', 'Схема не предоставлена для валидации');
      return this.getValidationResult();
    }

    // Базовая валидация структуры
    this.validateSchemaStructure(schema);

    if (this.errors.length > 0) {
      return this.getValidationResult();
    }

    // Валидация узлов
    this.validateNodes(schema.nodes);

    // Валидация соединений
    this.validateEdges(schema.edges, schema.nodes);

    // Проверка циклических зависимостей
    this.validateCyclicDependencies(schema.nodes, schema.edges);

    // Проверка логической целостности
    this.validateLogicalIntegrity(schema.nodes, schema.edges);

    return this.getValidationResult();
  }

  /**
   * Валидация структуры схемы
   */
  private validateSchemaStructure(schema: BotSchema): void {
    // Проверка обязательных полей
    if (!schema.id) {
      this.addError('MISSING_SCHEMA_ID', 'Отсутствует ID схемы');
    }

    if (!schema.name) {
      this.addError('MISSING_SCHEMA_NAME', 'Отсутствует название схемы');
    }

    if (!Array.isArray(schema.nodes)) {
      this.addError('INVALID_NODES_ARRAY', 'Поле nodes должно быть массивом');
    }

    if (!Array.isArray(schema.edges)) {
      this.addError('INVALID_EDGES_ARRAY', 'Поле edges должно быть массивом');
    }

    if (!schema.version) {
      this.addWarning('MISSING_VERSION', 'Отсутствует версия схемы');
    }

    // Проверка настроек
    if (!schema.settings) {
      this.addError('MISSING_SETTINGS', 'Отсутствуют настройки бота');
    } else {
      this.validateBotSettings(schema.settings);
    }
  }

  /**
   * Валидация настроек бота
   */
  private validateBotSettings(settings: any): void {
    if (!settings.platforms || !Array.isArray(settings.platforms)) {
      this.addError('MISSING_PLATFORMS', 'Не указаны платформы для бота');
    } else if (settings.platforms.length === 0) {
      this.addError('EMPTY_PLATFORMS', 'Должна быть указана хотя бы одна платформа');
    }

    if (!settings.mode || !['polling', 'webhook'].includes(settings.mode)) {
      this.addError('INVALID_MODE', 'Режим работы должен быть polling или webhook');
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
        this.addError('MISSING_NODE_ID', `${nodeContext}: отсутствует ID узла`);
        return;
      }

      if (!node.type) {
        this.addError('MISSING_NODE_TYPE', `${nodeContext}: отсутствует тип узла`, node.id);
      }

      if (!node.category) {
        this.addError('MISSING_NODE_CATEGORY', `${nodeContext}: отсутствует категория узла`, node.id);
      }

      if (!node.data) {
        this.addError('MISSING_NODE_DATA', `${nodeContext}: отсутствуют данные узла`, node.id);
        return;
      }

      // Проверка уникальности ID
      if (nodeIds.has(node.id)) {
        this.addError('DUPLICATE_NODE_ID', `${nodeContext}: дублирующийся ID узла "${node.id}"`, node.id);
      } else {
        nodeIds.add(node.id);
      }

      // Проверка позиции
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        this.addWarning('INVALID_POSITION', `${nodeContext}: некорректная позиция узла`, node.id);
      }

      // Валидация данных узла
      this.validateNodeData(node.data, nodeContext, node.id);

      // Проверка ограничений по платформам
      if (node.platforms && node.platforms.length === 0) {
        this.addWarning('EMPTY_PLATFORMS', `${nodeContext}: пустой список платформ`, node.id);
      }
    });
  }

  /**
   * Валидация данных узла
   */
  private validateNodeData(data: any, nodeContext: string, nodeId: string): void {
    if (!data.label) {
      this.addWarning('MISSING_NODE_LABEL', `${nodeContext}: отсутствует подпись узла`, nodeId);
    }

    if (!data.config) {
      this.addWarning('MISSING_NODE_CONFIG', `${nodeContext}: отсутствует конфигурация узла`, nodeId);
    }

    if (!Array.isArray(data.inputs)) {
      this.addError('INVALID_INPUTS', `${nodeContext}: inputs должно быть массивом`, nodeId);
    }

    if (!Array.isArray(data.outputs)) {
      this.addError('INVALID_OUTPUTS', `${nodeContext}: outputs должно быть массивом`, nodeId);
    }
  }

  /**
   * Валидация соединений
   */
  private validateEdges(edges: Edge[], nodes: Node[]): void {
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

      // Проверка уникальности ID
      if (edge.id && edgeIds.has(edge.id)) {
        this.addError('DUPLICATE_EDGE_ID', `${edgeContext}: дублирующийся ID соединения "${edge.id}"`);
      } else if (edge.id) {
        edgeIds.add(edge.id);
      }

      // Проверка существования узлов
      if (edge.source && !nodeMap.has(edge.source)) {
        this.addError('SOURCE_NODE_NOT_FOUND', `${edgeContext}: исходный узел "${edge.source}" не найден`);
      }

      if (edge.target && !nodeMap.has(edge.target)) {
        this.addError('TARGET_NODE_NOT_FOUND', `${edgeContext}: целевой узел "${edge.target}" не найден`);
      }

      // Проверка самосоединения
      if (edge.source === edge.target) {
        this.addWarning('SELF_CONNECTION', `${edgeContext}: узел соединен сам с собой`, edge.source);
      }

      // Проверка совместимости узлов
      if (edge.source && edge.target && nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        this.validateNodeCompatibility(
          nodeMap.get(edge.source)!,
          nodeMap.get(edge.target)!,
          edgeContext
        );
      }
    });
  }

  /**
   * Проверка совместимости узлов
   */
  private validateNodeCompatibility(sourceNode: Node, targetNode: Node, edgeContext: string): void {
    const sourceCategory = sourceNode.category;
    const targetCategory = targetNode.category;

    // Правила совместимости
    const compatibilityRules: Record<NodeCategory, NodeCategory[]> = {
      'triggers': ['conditions', 'actions', 'data'],
      'conditions': ['actions', 'data', 'conditions'],
      'actions': ['conditions', 'data', 'actions', 'integrations'],
      'data': ['conditions', 'actions', 'integrations'],
      'integrations': ['conditions', 'actions', 'data']
    };

    const allowedTargets = compatibilityRules[sourceCategory];
    if (!allowedTargets?.includes(targetCategory)) {
      this.addError(
        'INCOMPATIBLE_CONNECTION',
        `${edgeContext}: нельзя соединить ${sourceCategory} с ${targetCategory}`,
        sourceNode.id
      );
    }

    // Проверка совместимости платформ
    if (sourceNode.platforms && targetNode.platforms) {
      const commonPlatforms = sourceNode.platforms.filter(p => 
        targetNode.platforms!.includes(p)
      );
      
      if (commonPlatforms.length === 0) {
        this.addWarning(
          'PLATFORM_MISMATCH',
          `${edgeContext}: узлы не имеют общих платформ`,
          sourceNode.id
        );
      }
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
          this.addError(
            'CYCLIC_DEPENDENCY',
            `Обнаружена циклическая зависимость: ${cyclePath.join(' → ')}`,
            nodeId
          );
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
   * Обнаружение циклов в графе (DFS)
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
        // Найден цикл
        const cycleStartIndex = currentPath.indexOf(neighbor);
        return [...currentPath.slice(cycleStartIndex), neighbor];
      }
    }

    recursionStack.delete(nodeId);
    return [];
  }

  /**
   * Проверка логической целостности
   */
  private validateLogicalIntegrity(nodes: Node[], edges: Edge[]): void {
    // Проверяем наличие триггеров
    const triggerNodes = nodes.filter(node => node.category === 'triggers');
    if (triggerNodes.length === 0) {
      this.addWarning('NO_TRIGGERS', 'Схема не содержит триггеров - бот не будет реагировать на события');
    }

    // Проверяем наличие действий
    const actionNodes = nodes.filter(node => node.category === 'actions');
    if (actionNodes.length === 0) {
      this.addWarning('NO_ACTIONS', 'Схема не содержит действий - бот не будет выполнять никаких операций');
    }

    // Проверяем изолированные узлы
    this.validateIsolatedNodes(nodes, edges);

    // Проверяем достижимость узлов от триггеров
    this.validateNodeReachability(nodes, edges, triggerNodes);
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
   * Проверка достижимости узлов от триггеров
   */
  private validateNodeReachability(nodes: Node[], edges: Edge[], triggerNodes: Node[]): void {
    if (triggerNodes.length === 0) return;

    const graph = this.buildGraph(nodes, edges);
    const reachableNodes = new Set<string>();

    // Обход в глубину от каждого триггера
    triggerNodes.forEach(trigger => {
      this.dfsReachability(graph, trigger.id, reachableNodes);
    });

    // Проверяем недостижимые узлы
    nodes.forEach(node => {
      if (node.category !== 'triggers' && !reachableNodes.has(node.id)) {
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