import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/nodes';

export interface ValidationError {
  id: string;
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class SchemaValidator {
  private nodes: Node<NodeData>[];
  private edges: Edge[];

  constructor(nodes: Node<NodeData>[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Основной метод валидации схемы
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Проверка циклических зависимостей
    const cycleErrors = this.checkCyclicDependencies();
    errors.push(...cycleErrors);

    // Проверка совместимости соединений
    const connectionErrors = this.validateConnections();
    errors.push(...connectionErrors);

    // Проверка обязательных параметров узлов
    const nodeErrors = this.validateNodes();
    errors.push(...nodeErrors);

    // Проверка семантической корректности
    const semanticErrors = this.checkSemanticCorrectness();
    errors.push(...semanticErrors);

    // Проверка логической целостности
    const logicWarnings = this.checkLogicalIntegrity();
    warnings.push(...logicWarnings);

    // Проверка недостижимых узлов
    const reachabilityWarnings = this.checkNodeReachability();
    warnings.push(...reachabilityWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Проверка циклических зависимостей в схеме
   */
  private checkCyclicDependencies(): ValidationError[] {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Получаем все исходящие соединения для текущего узла
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
      
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) {
          errors.push({
            id: `cycle-${nodeId}-${edge.target}`,
            type: 'error',
            message: `Обнаружена циклическая зависимость между узлами`,
            nodeId: nodeId,
            edgeId: edge.id
          });
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Проверяем каждый узел на циклические зависимости
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        hasCycle(node.id);
      }
    }

    return errors;
  }

  /**
   * Валидация совместимости соединений между узлами
   */
  private validateConnections(): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const edge of this.edges) {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        errors.push({
          id: `missing-node-${edge.id}`,
          type: 'error',
          message: 'Соединение ссылается на несуществующий узел',
          edgeId: edge.id
        });
        continue;
      }

      // Проверка совместимости типов соединений
      const connectionError = this.validateConnectionTypes(sourceNode, targetNode, edge);
      if (connectionError) {
        errors.push(connectionError);
      }
    }

    return errors;
  }

  /**
   * Проверка совместимости типов соединений
   */
  private validateConnectionTypes(
    sourceNode: Node<NodeData>, 
    targetNode: Node<NodeData>, 
    edge: Edge
  ): ValidationError | null {
    const sourceType = sourceNode.type;
    const targetType = targetNode.type;

    // Правила совместимости соединений
    const incompatibleConnections = [
      // Триггеры не могут быть целью соединения (кроме условий)
      {
        source: /^(action-|data-|integration-)/,
        target: /^trigger-/,
        message: 'Триггеры не могут следовать после действий или данных'
      },
      // Условия должны иметь два выхода
      {
        source: /^condition-/,
        target: /.*/,
        validate: (edge: Edge) => {
          const outgoingEdges = this.edges.filter(e => e.source === sourceNode.id);
          return outgoingEdges.length > 2;
        },
        message: 'Условный узел может иметь максимум 2 исходящих соединения'
      }
    ];

    for (const rule of incompatibleConnections) {
      if (rule.source.test(sourceType || '') && rule.target.test(targetType || '')) {
        if (rule.validate && !rule.validate(edge)) {
          return {
            id: `incompatible-${edge.id}`,
            type: 'error',
            message: rule.message,
            edgeId: edge.id
          };
        } else if (!rule.validate) {
          return {
            id: `incompatible-${edge.id}`,
            type: 'error',
            message: rule.message,
            edgeId: edge.id
          };
        }
      }
    }

    return null;
  }

  /**
   * Валидация конфигурации узлов
   */
  private validateNodes(): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of this.nodes) {
      const nodeErrors = this.validateSingleNode(node);
      errors.push(...nodeErrors);
    }

    return errors;
  }

  /**
   * Валидация одного узла
   */
  private validateSingleNode(node: Node<NodeData>): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeType = node.type;
    const nodeData = node.data;

    if (!nodeType) {
      errors.push({
        id: `no-type-${node.id}`,
        type: 'error',
        message: 'Узел не имеет типа',
        nodeId: node.id
      });
      return errors;
    }

    // Проверка обязательных полей в зависимости от типа узла
    switch (true) {
      case nodeType.startsWith('trigger-command'):
        if (!nodeData.command) {
          errors.push({
            id: `missing-command-${node.id}`,
            type: 'error',
            message: 'Не указана команда для триггера',
            nodeId: node.id
          });
        }
        break;

      case nodeType.startsWith('action-send-message'):
        if (!nodeData.message) {
          errors.push({
            id: `missing-message-${node.id}`,
            type: 'error',
            message: 'Не указан текст сообщения',
            nodeId: node.id
          });
        }
        break;

      case nodeType.startsWith('condition-text'):
        if (!nodeData.pattern) {
          errors.push({
            id: `missing-pattern-${node.id}`,
            type: 'error',
            message: 'Не указан паттерн для проверки текста',
            nodeId: node.id
          });
        }
        break;

      case nodeType.startsWith('data-variable'):
        if (!nodeData.variableName) {
          errors.push({
            id: `missing-variable-${node.id}`,
            type: 'error',
            message: 'Не указано имя переменной',
            nodeId: node.id
          });
        }
        break;

      case nodeType.startsWith('integration-http'):
        if (!nodeData.url) {
          errors.push({
            id: `missing-url-${node.id}`,
            type: 'error',
            message: 'Не указан URL для HTTP-запроса',
            nodeId: node.id
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Проверка логической целостности схемы
   */
  private checkLogicalIntegrity(): ValidationError[] {
    const warnings: ValidationError[] = [];

    // Проверка наличия стартового узла (триггера)
    const triggerNodes = this.nodes.filter(node => 
      node.type?.startsWith('trigger-')
    );

    if (triggerNodes.length === 0) {
      warnings.push({
        id: 'no-triggers',
        type: 'warning',
        message: 'Схема не содержит триггеров. Бот не сможет реагировать на события.'
      });
    }

    // Проверка наличия действий
    const actionNodes = this.nodes.filter(node => 
      node.type?.startsWith('action-')
    );

    if (actionNodes.length === 0) {
      warnings.push({
        id: 'no-actions',
        type: 'warning',
        message: 'Схема не содержит действий. Бот не будет выполнять никаких операций.'
      });
    }

    // Проверка условных узлов без двух выходов
    const conditionNodes = this.nodes.filter(node => 
      node.type?.startsWith('condition-')
    );

    for (const conditionNode of conditionNodes) {
      const outgoingEdges = this.edges.filter(edge => edge.source === conditionNode.id);
      
      if (outgoingEdges.length < 2) {
        warnings.push({
          id: `incomplete-condition-${conditionNode.id}`,
          type: 'warning',
          message: 'Условный узел должен иметь два выхода (true и false)',
          nodeId: conditionNode.id
        });
      }

      // Проверка правильности подключения выходов условий
      const trueEdge = outgoingEdges.find(edge => edge.sourceHandle === 'true');
      const falseEdge = outgoingEdges.find(edge => edge.sourceHandle === 'false');
      
      if (outgoingEdges.length === 2 && (!trueEdge || !falseEdge)) {
        warnings.push({
          id: `incorrect-condition-outputs-${conditionNode.id}`,
          type: 'warning',
          message: 'Условный узел должен иметь отдельные выходы для true и false',
          nodeId: conditionNode.id
        });
      }
    }

    // Проверка изолированных узлов
    const isolatedNodes = this.findIsolatedNodes();
    for (const nodeId of isolatedNodes) {
      warnings.push({
        id: `isolated-${nodeId}`,
        type: 'warning',
        message: 'Изолированный узел не связан с остальной схемой',
        nodeId: nodeId
      });
    }

    // Проверка потенциальных бесконечных циклов
    const potentialLoops = this.findPotentialInfiniteLoops();
    for (const loop of potentialLoops) {
      warnings.push({
        id: `potential-loop-${loop.join('-')}`,
        type: 'warning',
        message: 'Потенциальный бесконечный цикл в схеме',
        nodeId: loop[0]
      });
    }

    // Проверка производительности схемы
    const performanceWarnings = this.checkPerformanceIssues();
    warnings.push(...performanceWarnings);

    return warnings;
  }

  /**
   * Проверка достижимости узлов
   */
  private checkNodeReachability(): ValidationError[] {
    const warnings: ValidationError[] = [];
    const reachableNodes = new Set<string>();

    // Начинаем с триггеров
    const triggerNodes = this.nodes.filter(node => 
      node.type?.startsWith('trigger-')
    );

    // Обход в глубину для поиска достижимых узлов
    const markReachable = (nodeId: string) => {
      if (reachableNodes.has(nodeId)) return;
      
      reachableNodes.add(nodeId);
      
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        markReachable(edge.target);
      }
    };

    // Отмечаем все достижимые узлы
    for (const trigger of triggerNodes) {
      markReachable(trigger.id);
    }

    // Находим недостижимые узлы
    for (const node of this.nodes) {
      if (!reachableNodes.has(node.id) && !node.type?.startsWith('trigger-')) {
        warnings.push({
          id: `unreachable-${node.id}`,
          type: 'warning',
          message: 'Узел недостижим из триггеров',
          nodeId: node.id
        });
      }
    }

    return warnings;
  }

  /**
   * Быстрая проверка валидности соединения
   */
  static canConnect(sourceType: string, targetType: string): boolean {
    // Триггеры не могут быть целью (кроме особых случаев)
    if (targetType.startsWith('trigger-') && !sourceType.startsWith('condition-')) {
      return false;
    }

    // Другие правила совместимости
    return true;
  }

  /**
   * Получение описания ошибки для типа соединения
   */
  static getConnectionError(sourceType: string, targetType: string): string | null {
    if (!SchemaValidator.canConnect(sourceType, targetType)) {
      if (targetType.startsWith('trigger-')) {
        return 'Триггеры не могут следовать после других узлов';
      }
    }
    return null;
  }

  /**
   * Поиск изолированных узлов
   */
  private findIsolatedNodes(): string[] {
    const connectedNodes = new Set<string>();
    
    // Добавляем все узлы, участвующие в соединениях
    for (const edge of this.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    // Находим узлы без соединений (кроме триггеров, которые могут быть стартовыми)
    const isolatedNodes: string[] = [];
    for (const node of this.nodes) {
      if (!connectedNodes.has(node.id) && !node.type?.startsWith('trigger-')) {
        isolatedNodes.push(node.id);
      }
    }

    return isolatedNodes;
  }

  /**
   * Поиск потенциальных бесконечных циклов
   */
  private findPotentialInfiniteLoops(): string[][] {
    const loops: string[][] = [];
    const visited = new Set<string>();

    const findLoopsFromNode = (nodeId: string, path: string[]): void => {
      if (path.includes(nodeId)) {
        // Найден цикл
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        
        // Проверяем, является ли цикл потенциально бесконечным
        if (this.isPotentiallyInfiniteLoop(cycle)) {
          loops.push([...cycle, nodeId]);
        }
        return;
      }

      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        findLoopsFromNode(edge.target, [...path, nodeId]);
      }
    };

    // Начинаем поиск с триггеров
    const triggerNodes = this.nodes.filter(node => node.type?.startsWith('trigger-'));
    for (const trigger of triggerNodes) {
      visited.clear();
      findLoopsFromNode(trigger.id, []);
    }

    return loops;
  }

  /**
   * Проверка, является ли цикл потенциально бесконечным
   */
  private isPotentiallyInfiniteLoop(cycle: string[]): boolean {
    // Цикл считается потенциально бесконечным, если:
    // 1. Не содержит условных узлов с внешними выходами
    // 2. Не содержит узлов с задержкой или ограничениями
    
    for (const nodeId of cycle) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Если есть условный узел с выходом наружу цикла - цикл может завершиться
      if (node.type?.startsWith('condition-')) {
        const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
        const hasExternalExit = outgoingEdges.some(edge => !cycle.includes(edge.target));
        if (hasExternalExit) return false;
      }

      // Если есть узел с задержкой - цикл не бесконечный
      if (node.data?.delay && node.data.delay > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Проверка проблем производительности
   */
  private checkPerformanceIssues(): ValidationError[] {
    const warnings: ValidationError[] = [];

    // Проверка слишком большого количества узлов
    if (this.nodes.length > 100) {
      warnings.push({
        id: 'too-many-nodes',
        type: 'warning',
        message: `Схема содержит ${this.nodes.length} узлов. Рекомендуется разбить на более мелкие схемы.`
      });
    }

    // Проверка слишком глубокой вложенности
    const maxDepth = this.calculateMaxDepth();
    if (maxDepth > 20) {
      warnings.push({
        id: 'deep-nesting',
        type: 'warning',
        message: `Максимальная глубина схемы: ${maxDepth}. Это может замедлить выполнение.`
      });
    }

    // Проверка узлов с множественными входами
    const nodesWithManyInputs = this.findNodesWithManyInputs();
    for (const nodeId of nodesWithManyInputs) {
      warnings.push({
        id: `many-inputs-${nodeId}`,
        type: 'warning',
        message: 'Узел имеет много входящих соединений, что может усложнить логику',
        nodeId: nodeId
      });
    }

    return warnings;
  }

  /**
   * Вычисление максимальной глубины схемы
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;

    const calculateDepth = (nodeId: string, currentDepth: number, visited: Set<string>): number => {
      if (visited.has(nodeId)) return currentDepth;
      visited.add(nodeId);

      let depth = currentDepth;
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
      
      for (const edge of outgoingEdges) {
        const childDepth = calculateDepth(edge.target, currentDepth + 1, new Set(visited));
        depth = Math.max(depth, childDepth);
      }

      return depth;
    };

    // Начинаем с триггеров
    const triggerNodes = this.nodes.filter(node => node.type?.startsWith('trigger-'));
    for (const trigger of triggerNodes) {
      const depth = calculateDepth(trigger.id, 1, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * Поиск узлов с множественными входами
   */
  private findNodesWithManyInputs(): string[] {
    const inputCounts = new Map<string, number>();

    // Подсчитываем входящие соединения для каждого узла
    for (const edge of this.edges) {
      const count = inputCounts.get(edge.target) || 0;
      inputCounts.set(edge.target, count + 1);
    }

    // Находим узлы с более чем 3 входами
    const nodesWithManyInputs: string[] = [];
    for (const [nodeId, count] of inputCounts.entries()) {
      if (count > 3) {
        nodesWithManyInputs.push(nodeId);
      }
    }

    return nodesWithManyInputs;
  }

  /**
   * Проверка семантической корректности схемы
   */
  private checkSemanticCorrectness(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Проверка корректности последовательности узлов
    for (const edge of this.edges) {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        const semanticError = this.validateSemanticConnection(sourceNode, targetNode);
        if (semanticError) {
          errors.push({
            id: `semantic-${edge.id}`,
            type: 'error',
            message: semanticError,
            edgeId: edge.id
          });
        }
      }
    }

    return errors;
  }

  /**
   * Валидация семантической корректности соединения
   */
  private validateSemanticConnection(sourceNode: Node<NodeData>, targetNode: Node<NodeData>): string | null {
    const sourceType = sourceNode.type;
    const targetType = targetNode.type;

    // Проверка логической последовательности
    if (sourceType?.startsWith('data-save') && targetType?.startsWith('data-load')) {
      // Проверяем, что сохраняемая и загружаемая переменная совпадают
      if (sourceNode.data?.variableName && targetNode.data?.variableName) {
        if (sourceNode.data.variableName !== targetNode.data.variableName) {
          return 'Сохранение и загрузка разных переменных может быть ошибкой';
        }
      }
    }

    // Проверка HTTP интеграций
    if (sourceType?.startsWith('integration-http') && targetType?.startsWith('action-send-message')) {
      if (!targetNode.data?.message?.includes('{{response}}')) {
        return 'HTTP-запрос не используется в следующем сообщении';
      }
    }

    return null;
  }
}