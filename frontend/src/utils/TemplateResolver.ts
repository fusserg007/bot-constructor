import { Node, Edge } from 'reactflow';
import { ValidationError } from './SchemaValidator';

/**
 * Интерфейс для шаблонного решения
 */
interface TemplatePattern {
  id: string;
  name: string;
  description: string;
  errorPatterns: string[];
  solution: (nodes: Node[], edges: Edge[], error: ValidationError) => { nodes: Node[], edges: Edge[] };
  priority: number;
}

/**
 * Система шаблонных решений для типичных ошибок валидации
 * Предоставляет готовые паттерны исправления распространенных проблем
 */
export class TemplateResolver {
  private templates: TemplatePattern[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Инициализация встроенных шаблонов
   */
  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'empty-schema',
        name: 'Пустая схема',
        description: 'Создание базовой схемы бота с приветствием',
        errorPatterns: ['empty', 'no nodes', 'схема пуста'],
        priority: 10,
        solution: this.createBasicBotTemplate
      },
      {
        id: 'missing-trigger',
        name: 'Отсутствует триггер',
        description: 'Добавление стартового триггера',
        errorPatterns: ['no trigger', 'missing trigger', 'нет триггера'],
        priority: 9,
        solution: this.addStartTriggerTemplate
      },
      {
        id: 'isolated-nodes',
        name: 'Изолированные узлы',
        description: 'Подключение отдельных узлов к основному потоку',
        errorPatterns: ['isolated', 'disconnected', 'изолированный'],
        priority: 8,
        solution: this.connectIsolatedNodesTemplate
      },
      {
        id: 'incomplete-condition',
        name: 'Неполное условие',
        description: 'Добавление веток для условного узла',
        errorPatterns: ['incomplete condition', 'missing branch', 'неполное условие'],
        priority: 7,
        solution: this.completeConditionTemplate
      },
      {
        id: 'missing-message',
        name: 'Отсутствует сообщение',
        description: 'Добавление текста сообщения',
        errorPatterns: ['empty message', 'no message', 'пустое сообщение'],
        priority: 6,
        solution: this.addMessageTemplate
      },
      {
        id: 'invalid-command',
        name: 'Некорректная команда',
        description: 'Исправление формата команды',
        errorPatterns: ['invalid command', 'command format', 'неверная команда'],
        priority: 5,
        solution: this.fixCommandTemplate
      },
      {
        id: 'circular-dependency',
        name: 'Циклическая зависимость',
        description: 'Разрыв циклических связей',
        errorPatterns: ['circular', 'cycle', 'циклическая'],
        priority: 4,
        solution: this.breakCircularDependencyTemplate
      },
      {
        id: 'missing-variable',
        name: 'Отсутствует переменная',
        description: 'Добавление имени переменной',
        errorPatterns: ['missing variable', 'no variable name', 'нет переменной'],
        priority: 3,
        solution: this.addVariableTemplate
      },
      {
        id: 'invalid-url',
        name: 'Некорректный URL',
        description: 'Исправление формата URL',
        errorPatterns: ['invalid url', 'malformed url', 'неверный url'],
        priority: 2,
        solution: this.fixUrlTemplate
      },
      {
        id: 'missing-action',
        name: 'Отсутствует действие',
        description: 'Добавление действия после триггера',
        errorPatterns: ['no action', 'missing action', 'нет действия'],
        priority: 1,
        solution: this.addActionTemplate
      }
    ];
  }

  /**
   * Найти подходящий шаблон для ошибки
   */
  public findTemplate(error: ValidationError): TemplatePattern | null {
    const errorText = `${error.message} ${error.details || ''}`.toLowerCase();
    
    // Ищем шаблон по паттернам ошибок
    const matchingTemplates = this.templates.filter(template => 
      template.errorPatterns.some(pattern => 
        errorText.includes(pattern.toLowerCase())
      )
    );
    
    // Возвращаем шаблон с наивысшим приоритетом
    return matchingTemplates.sort((a, b) => b.priority - a.priority)[0] || null;
  }

  /**
   * Применить шаблонное решение
   */
  public applyTemplate(
    templateId: string, 
    nodes: Node[], 
    edges: Edge[], 
    error: ValidationError
  ): { nodes: Node[], edges: Edge[], applied: boolean } {
    const template = this.templates.find(t => t.id === templateId);
    
    if (!template) {
      return { nodes, edges, applied: false };
    }
    
    try {
      const result = template.solution(nodes, edges, error);
      return { ...result, applied: true };
    } catch (err) {
      console.error(`Ошибка применения шаблона ${templateId}:`, err);
      return { nodes, edges, applied: false };
    }
  }

  /**
   * Получить список всех доступных шаблонов
   */
  public getAvailableTemplates(): Array<{id: string, name: string, description: string}> {
    return this.templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description
    }));
  }

  // Шаблонные решения

  /**
   * Создание базовой схемы бота
   */
  private createBasicBotTemplate = (_nodes: Node[], _edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const triggerNode: Node = {
      id: 'trigger-start',
      type: 'trigger-command',
      position: { x: 100, y: 100 },
      data: { 
        command: '/start',
        label: 'Команда /start'
      }
    };

    const messageNode: Node = {
      id: 'action-welcome',
      type: 'action-send-message',
      position: { x: 350, y: 100 },
      data: { 
        message: 'Привет! 👋\n\nЯ ваш новый Telegram бот. Как дела?',
        label: 'Приветственное сообщение'
      }
    };

    const edge: Edge = {
      id: 'edge-start-welcome',
      source: 'trigger-start',
      target: 'action-welcome',
      type: 'smoothstep'
    };

    return {
      nodes: [triggerNode, messageNode],
      edges: [edge]
    };
  };

  /**
   * Добавление стартового триггера
   */
  private addStartTriggerTemplate = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const triggerNode: Node = {
      id: `trigger-${Date.now()}`,
      type: 'trigger-command',
      position: { x: 50, y: 100 },
      data: { 
        command: '/start',
        label: 'Команда /start'
      }
    };

    // Подключаем к первому узлу если есть
    const newEdges = [...edges];
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      const edge: Edge = {
        id: `edge-${Date.now()}`,
        source: triggerNode.id,
        target: firstNode.id,
        type: 'smoothstep'
      };
      newEdges.push(edge);
    }

    return {
      nodes: [triggerNode, ...nodes],
      edges: newEdges
    };
  };

  /**
   * Подключение изолированных узлов
   */
  private connectIsolatedNodesTemplate = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const isolatedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    const newEdges = [...edges];

    isolatedNodes.forEach(isolatedNode => {
      // Находим ближайший подключенный узел
      const connectedNodesList = nodes.filter(node => connectedNodes.has(node.id));
      if (connectedNodesList.length > 0) {
        const nearestNode = this.findNearestNode(isolatedNode, connectedNodesList);
        if (nearestNode) {
          const edge: Edge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: nearestNode.id,
            target: isolatedNode.id,
            type: 'smoothstep'
          };
          newEdges.push(edge);
          connectedNodes.add(isolatedNode.id);
        }
      }
    });

    return { nodes, edges: newEdges };
  };

  /**
   * Завершение условного узла
   */
  private completeConditionTemplate = (nodes: Node[], edges: Edge[], error: ValidationError): { nodes: Node[], edges: Edge[] } => {
    const conditionNodeId = error.nodeId;
    const conditionNode = nodes.find(n => n.id === conditionNodeId);
    
    if (!conditionNode || !conditionNode.type?.startsWith('condition')) {
      return { nodes, edges };
    }

    const outgoingEdges = edges.filter(edge => edge.source === conditionNodeId);
    const newNodes = [...nodes];
    const newEdges = [...edges];

    // Создаем недостающие ветки
    const branches = ['true', 'false'];
    const existingBranches = outgoingEdges.map(edge => edge.sourceHandle).filter(Boolean);
    
    branches.forEach((branch, index) => {
      if (!existingBranches.includes(branch)) {
        const actionNode: Node = {
          id: `action-${Date.now()}-${branch}`,
          type: 'action-send-message',
          position: {
            x: conditionNode.position.x + 250,
            y: conditionNode.position.y + (index * 120)
          },
          data: {
            message: branch === 'true' ? 'Условие выполнено ✅' : 'Условие не выполнено ❌',
            label: `Ответ: ${branch === 'true' ? 'Да' : 'Нет'}`
          }
        };

        const edge: Edge = {
          id: `edge-${Date.now()}-${branch}`,
          source: conditionNodeId || '',
          target: actionNode.id,
          sourceHandle: branch,
          type: 'smoothstep'
        };

        newNodes.push(actionNode);
        newEdges.push(edge);
      }
    });

    return { nodes: newNodes, edges: newEdges };
  };

  /**
   * Добавление сообщения
   */
  private addMessageTemplate = (nodes: Node[], edges: Edge[], error: ValidationError): { nodes: Node[], edges: Edge[] } => {
    const nodeId = error.nodeId;
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return { nodes, edges };
    }

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            message: 'Привет! Это сообщение от бота. 🤖'
          }
        };
      }
      return n;
    });

    return { nodes: updatedNodes, edges };
  };

  /**
   * Исправление команды
   */
  private fixCommandTemplate = (nodes: Node[], edges: Edge[], error: ValidationError): { nodes: Node[], edges: Edge[] } => {
    const nodeId = error.nodeId;
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return { nodes, edges };
    }

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        let command = n.data?.command || 'start';
        // Добавляем / если отсутствует
        if (!command.startsWith('/')) {
          command = '/' + command;
        }
        // Убираем пробелы и спецсимволы
        command = command.replace(/[^a-zA-Z0-9_/]/g, '');
        
        return {
          ...n,
          data: {
            ...n.data,
            command
          }
        };
      }
      return n;
    });

    return { nodes: updatedNodes, edges };
  };

  /**
   * Разрыв циклической зависимости
   */
  private breakCircularDependencyTemplate = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    // Простой алгоритм поиска и разрыва циклов
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const edgesToRemove: string[] = [];

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Найден цикл
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) {
          edgesToRemove.push(edge.id);
          break; // Удаляем только одно соединение на цикл
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    });

    const newEdges = edges.filter(edge => !edgesToRemove.includes(edge.id));
    return { nodes, edges: newEdges };
  };

  /**
   * Добавление переменной
   */
  private addVariableTemplate = (nodes: Node[], edges: Edge[], error: ValidationError): { nodes: Node[], edges: Edge[] } => {
    const nodeId = error.nodeId;
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return { nodes, edges };
    }

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            variableName: 'userInput'
          }
        };
      }
      return n;
    });

    return { nodes: updatedNodes, edges };
  };

  /**
   * Исправление URL
   */
  private fixUrlTemplate = (nodes: Node[], edges: Edge[], error: ValidationError): { nodes: Node[], edges: Edge[] } => {
    const nodeId = error.nodeId;
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return { nodes, edges };
    }

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        let url = n.data?.url || 'example.com';
        // Добавляем протокол если отсутствует
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        return {
          ...n,
          data: {
            ...n.data,
            url
          }
        };
      }
      return n;
    });

    return { nodes: updatedNodes, edges };
  };

  /**
   * Добавление действия
   */
  private addActionTemplate = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const actionNode: Node = {
      id: `action-${Date.now()}`,
      type: 'action-send-message',
      position: { x: 300, y: 150 },
      data: {
        message: 'Это новое действие бота! 🚀',
        label: 'Новое действие'
      }
    };

    // Подключаем к последнему узлу
    const newEdges = [...edges];
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      const edge: Edge = {
        id: `edge-${Date.now()}`,
        source: lastNode.id,
        target: actionNode.id,
        type: 'smoothstep'
      };
      newEdges.push(edge);
    }

    return {
      nodes: [...nodes, actionNode],
      edges: newEdges
    };
  };

  /**
   * Найти ближайший узел
   */
  private findNearestNode(targetNode: Node, candidateNodes: Node[]): Node | null {
    let nearestNode: Node | null = null;
    let minDistance = Infinity;

    candidateNodes.forEach(node => {
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
}

/**
 * Фабрика для создания TemplateResolver
 */
export const createTemplateResolver = (): TemplateResolver => {
  return new TemplateResolver();
};