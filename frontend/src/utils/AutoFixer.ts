import { Node, Edge } from 'reactflow';
// import { ValidationError } from './SchemaValidator';

/**
 * Система автоматических исправлений схем Telegram Bot Constructor
 * Исправляет ошибки в схеме без показа их пользователю
 */
export class AutoFixer {
  private nodes: Node[];
  private edges: Edge[];
  private fixLog: string[] = [];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  /**
   * Применить все автоматические исправления
   * @returns Исправленные узлы и соединения
   */
  public applyAllFixes(): { nodes: Node[], edges: Edge[], fixLog: string[] } {
    this.fixLog = [];
    
    // Исправляем в порядке приоритета
    this.fixMissingNodeTypes();
    this.fixMissingRequiredFields();
    this.fixInvalidConnections();
    this.fixIsolatedNodes();
    this.fixMissingTriggers();
    this.fixMissingActions();
    this.fixIncompleteConditions();
    this.removeInvalidEdges();
    this.fixCyclicDependencies();
    
    return {
      nodes: this.nodes,
      edges: this.edges,
      fixLog: this.fixLog
    };
  }

  /**
   * Исправить узлы без типа
   */
  private fixMissingNodeTypes(): void {
    this.nodes.forEach(node => {
      if (!node.type || node.type === 'default') {
        // Определяем тип по позиции или устанавливаем базовый
        const isFirstNode = this.nodes.length === 1 || 
                           this.edges.filter(e => e.target === node.id).length === 0;
        
        if (isFirstNode) {
          node.type = 'trigger-command';
          node.data = { ...node.data, command: '/start' };
          this.fixLog.push(`Установлен тип 'trigger-command' для узла ${node.id}`);
        } else {
          node.type = 'action-send-message';
          node.data = { ...node.data, message: 'Привет!' };
          this.fixLog.push(`Установлен тип 'action-send-message' для узла ${node.id}`);
        }
      }
    });
  }

  /**
   * Исправить отсутствующие обязательные поля
   */
  private fixMissingRequiredFields(): void {
    this.nodes.forEach(node => {
      const nodeType = node.type;
      
      switch (nodeType) {
        case 'trigger-command':
          if (!node.data?.command) {
            node.data = { ...node.data, command: '/start' };
            this.fixLog.push(`Добавлена команда '/start' для триггера ${node.id}`);
          }
          break;
          
        case 'action-send-message':
          if (!node.data?.message) {
            node.data = { ...node.data, message: 'Сообщение от бота' };
            this.fixLog.push(`Добавлено сообщение для узла ${node.id}`);
          }
          break;
          
        case 'condition-text':
          if (!node.data?.pattern) {
            node.data = { ...node.data, pattern: '.*' };
            this.fixLog.push(`Добавлен паттерн для условия ${node.id}`);
          }
          break;
          
        case 'data-variable':
          if (!node.data?.variableName) {
            node.data = { ...node.data, variableName: 'variable1' };
            this.fixLog.push(`Добавлено имя переменной для узла ${node.id}`);
          }
          break;
          
        case 'integration-http':
          if (!node.data?.url) {
            node.data = { ...node.data, url: 'https://api.example.com' };
            this.fixLog.push(`Добавлен URL для HTTP-интеграции ${node.id}`);
          }
          break;
      }
    });
  }

  /**
   * Исправить некорректные соединения
   */
  private fixInvalidConnections(): void {
    const invalidEdges: string[] = [];
    
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) {
        invalidEdges.push(edge.id);
        return;
      }
      
      // Проверяем совместимость типов
      const sourceType = sourceNode.type?.split('-')[0];
      const targetType = targetNode.type?.split('-')[0];
      
      // Триггеры не могут следовать после действий или данных
      if (targetType === 'trigger' && (sourceType === 'action' || sourceType === 'data')) {
        invalidEdges.push(edge.id);
        this.fixLog.push(`Удалено некорректное соединение от ${sourceType} к ${targetType}`);
      }
    });
    
    // Удаляем некорректные соединения
    this.edges = this.edges.filter(edge => !invalidEdges.includes(edge.id));
  }

  /**
   * Исправить изолированные узлы
   */
  private fixIsolatedNodes(): void {
    const connectedNodes = new Set<string>();
    
    // Находим все подключенные узлы
    this.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    // Подключаем изолированные узлы
    this.nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && this.nodes.length > 1) {
        // Находим ближайший узел для подключения
        const nearestNode = this.findNearestNode(node);
        if (nearestNode) {
          const newEdge: Edge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: nearestNode.id,
            target: node.id,
            type: 'smoothstep'
          };
          this.edges.push(newEdge);
          this.fixLog.push(`Подключен изолированный узел ${node.id} к ${nearestNode.id}`);
        }
      }
    });
  }

  /**
   * Добавить триггер если его нет
   */
  private fixMissingTriggers(): void {
    const hasTrigger = this.nodes.some(node => node.type?.startsWith('trigger'));
    
    if (!hasTrigger && this.nodes.length > 0) {
      // Преобразуем первый узел в триггер
      const firstNode = this.nodes[0];
      firstNode.type = 'trigger-command';
      firstNode.data = { ...firstNode.data, command: '/start' };
      this.fixLog.push(`Преобразован узел ${firstNode.id} в триггер`);
    } else if (!hasTrigger) {
      // Создаем новый триггер
      const triggerNode: Node = {
        id: `trigger-${Date.now()}`,
        type: 'trigger-command',
        position: { x: 100, y: 100 },
        data: { command: '/start' }
      };
      this.nodes.push(triggerNode);
      this.fixLog.push(`Создан новый триггер ${triggerNode.id}`);
    }
  }

  /**
   * Добавить действие если его нет
   */
  private fixMissingActions(): void {
    const hasAction = this.nodes.some(node => node.type?.startsWith('action'));
    
    if (!hasAction && this.nodes.length > 0) {
      // Создаем новое действие
      const actionNode: Node = {
        id: `action-${Date.now()}`,
        type: 'action-send-message',
        position: { x: 300, y: 100 },
        data: { message: 'Привет! Я ваш бот.' }
      };
      this.nodes.push(actionNode);
      
      // Подключаем к триггеру если есть
      const trigger = this.nodes.find(node => node.type?.startsWith('trigger'));
      if (trigger) {
        const newEdge: Edge = {
          id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: trigger.id,
          target: actionNode.id,
          type: 'smoothstep'
        };
        this.edges.push(newEdge);
      }
      
      this.fixLog.push(`Создано новое действие ${actionNode.id}`);
    }
  }

  /**
   * Исправить неполные условные узлы
   */
  private fixIncompleteConditions(): void {
    this.nodes.forEach(node => {
      if (node.type?.startsWith('condition')) {
        const outgoingEdges = this.edges.filter(edge => edge.source === node.id);
        
        // Условный узел должен иметь два выхода
        if (outgoingEdges.length < 2) {
          // Создаем недостающие действия
          for (let i = outgoingEdges.length; i < 2; i++) {
            const actionNode: Node = {
              id: `action-${Date.now()}-${i}`,
              type: 'action-send-message',
              position: { 
                x: node.position.x + 200, 
                y: node.position.y + (i * 100) 
              },
              data: { message: i === 0 ? 'Условие выполнено' : 'Условие не выполнено' }
            };
            this.nodes.push(actionNode);
            
            const newEdge: Edge = {
              id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              source: node.id,
              target: actionNode.id,
              sourceHandle: i === 0 ? 'true' : 'false',
              type: 'smoothstep'
            };
            this.edges.push(newEdge);
          }
          
          this.fixLog.push(`Добавлены выходы для условного узла ${node.id}`);
        }
      }
    });
  }

  /**
   * Удалить некорректные соединения
   */
  private removeInvalidEdges(): void {
    const validEdges = this.edges.filter(edge => {
      const sourceExists = this.nodes.some(node => node.id === edge.source);
      const targetExists = this.nodes.some(node => node.id === edge.target);
      return sourceExists && targetExists;
    });
    
    if (validEdges.length !== this.edges.length) {
      this.fixLog.push(`Удалено ${this.edges.length - validEdges.length} некорректных соединений`);
      this.edges = validEdges;
    }
  }

  /**
   * Исправить циклические зависимости (упрощенно)
   */
  private fixCyclicDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cyclicEdges: string[] = [];
    
    const dfs = (nodeId: string, path: string[]): boolean => {
      if (recursionStack.has(nodeId)) {
        // Найден цикл, удаляем последнее соединение в цепи
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart >= 0 && cycleStart < path.length - 1) {
          const edgeToRemove = this.edges.find(edge => 
            edge.source === path[path.length - 1] && edge.target === nodeId
          );
          if (edgeToRemove) {
            cyclicEdges.push(edgeToRemove.id);
          }
        }
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const outgoingEdges = this.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target, [...path, nodeId])) {
          return true;
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Проверяем каждый узел
    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });
    
    // Удаляем циклические соединения
    if (cyclicEdges.length > 0) {
      this.edges = this.edges.filter(edge => !cyclicEdges.includes(edge.id));
      this.fixLog.push(`Удалено ${cyclicEdges.length} циклических соединений`);
    }
  }

  /**
   * Найти ближайший узел для подключения
   */
  private findNearestNode(targetNode: Node): Node | null {
    let nearestNode: Node | null = null;
    let minDistance = Infinity;
    
    this.nodes.forEach(node => {
      if (node.id !== targetNode.id) {
        const distance = Math.sqrt(
          Math.pow(node.position.x - targetNode.position.x, 2) +
          Math.pow(node.position.y - targetNode.position.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestNode = node;
        }
      }
    });
    
    return nearestNode;
  }

  /**
   * Получить статистику исправлений
   */
  public getFixStats(): { totalFixes: number, fixTypes: Record<string, number> } {
    const fixTypes: Record<string, number> = {};
    
    this.fixLog.forEach(fix => {
      const type = fix.split(' ')[0];
      fixTypes[type] = (fixTypes[type] || 0) + 1;
    });
    
    return {
      totalFixes: this.fixLog.length,
      fixTypes
    };
  }
}

/**
 * Фабрика для создания AutoFixer
 */
export const createAutoFixer = (nodes: Node[], edges: Edge[]): AutoFixer => {
  return new AutoFixer(nodes, edges);
};