import type { Node, Edge } from 'reactflow';
import type { BaseNode, NodePort } from '../types/nodes';

/**
 * Конвертер данных из старого формата в новый формат React Flow
 */

/**
 * Получает цвет для категории узла
 */
function getCategoryColor(category: BaseNode['category']): string {
  const colors: Record<BaseNode['category'], string> = {
    'triggers': '#3b82f6',
    'conditions': '#f59e0b',
    'actions': '#10b981',
    'data': '#8b5cf6',
    'integrations': '#ef4444',
    'scenarios': '#6b7280'
  };
  return colors[category] || '#6b7280';
}

/**
 * Получает иконку для категории узла
 */
function getCategoryIcon(category: BaseNode['category']): string {
  const icons: Record<BaseNode['category'], string> = {
    'triggers': '⚡',
    'conditions': '❓',
    'actions': '🎯',
    'data': '📊',
    'integrations': '🔗',
    'scenarios': '📋'
  };
  return icons[category] || '⚙️';
}

interface LegacyNode {
  id: string;
  type: string;
  data: any;
  connections?: string[];
}

interface LegacyConfiguration {
  nodes?: LegacyNode[];
  connections?: any[];
  metadata?: any;
}

/**
 * Конвертирует старую конфигурацию бота в формат React Flow
 */
export function convertLegacyToReactFlow(legacyConfig: LegacyConfiguration): { nodes: Node[], edges: Edge[] } {
  if (!legacyConfig || !legacyConfig.nodes) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Конвертируем узлы
  legacyConfig.nodes.forEach((legacyNode, index) => {
    const nodeData = convertNodeData(legacyNode);
    const node: Node = {
      id: legacyNode.id,
      type: convertNodeType(legacyNode.type),
      position: { x: 100 + (index * 200), y: 100 + (Math.floor(index / 3) * 150) },
      data: {
        ...nodeData,
        position: { x: 100 + (index * 200), y: 100 + (Math.floor(index / 3) * 150) }
      }
    };
    nodes.push(node);
  });

  // Конвертируем соединения из старого формата
  legacyConfig.nodes.forEach((legacyNode) => {
    if (legacyNode.connections && Array.isArray(legacyNode.connections)) {
      legacyNode.connections.forEach((targetId, index) => {
        const edge: Edge = {
          id: `${legacyNode.id}-${targetId}-${index}`,
          source: legacyNode.id,
          target: targetId,
          type: 'default'
        };
        edges.push(edge);
      });
    }
  });

  return { nodes, edges };
}

/**
 * Конвертирует тип узла из старого формата в новый
 */
function convertNodeType(legacyType: string): string {
  const typeMapping: Record<string, string> = {
    'action': 'action-node',
    'trigger': 'trigger-node',
    'condition': 'condition-node',
    'data': 'data-node',
    'integration': 'integration-node'
  };

  return typeMapping[legacyType] || 'action-node';
}

/**
 * Конвертирует данные узла из старого формата в новый
 */
function convertNodeData(legacyNode: LegacyNode): BaseNode {
  const data = legacyNode.data || {};
  
  // Определяем категорию на основе типа или данных
  let category: BaseNode['category'] = 'actions';
  
  if (data.triggerType || data.actionType === 'trigger') {
    category = 'triggers';
  } else if (data.conditionType) {
    category = 'conditions';
  } else if (data.dataType) {
    category = 'data';
  } else if (data.integrationType) {
    category = 'integrations';
  }

  // Создаем конфигурацию узла
  const config: Record<string, any> = {};
  
  // Копируем все свойства из старых данных в конфигурацию
  Object.keys(data).forEach(key => {
    if (key !== 'actionType' || data.actionType !== 'trigger') {
      config[key] = data[key];
    }
  });

  // Специальная обработка для триггеров
  if (category === 'triggers' && data.actionType === 'trigger') {
    config.triggerType = data.triggerType || 'command';
  }

  // Создаем порты для узла
  const inputs: NodePort[] = category === 'triggers' ? [] : [
    {
      id: 'input',
      name: 'Вход',
      type: 'control',
      dataType: 'any',
      required: false
    }
  ];

  const outputs: NodePort[] = category === 'actions' && !config.actionType?.includes('send') ? [] : [
    {
      id: 'output',
      name: 'Выход',
      type: 'control',
      dataType: 'any',
      required: false
    }
  ];

  return {
    id: legacyNode.id,
    type: legacyNode.type,
    category,
    position: { x: 0, y: 0 }, // Будет установлено в основной функции
    size: { width: 200, height: 100 },
    color: getCategoryColor(category),
    icon: getCategoryIcon(category),
    inputs,
    outputs,
    config,
    name: config.name || `${category} узел`,
    description: config.description || '',
    tags: [],
    compatibility: []
  };
}

/**
 * Проверяет, является ли конфигурация старым форматом
 */
export function isLegacyFormat(config: any): boolean {
  if (!config || !config.nodes) {
    return false;
  }

  // Проверяем, есть ли у узлов поле connections (старый формат)
  // или отсутствует поле edges (новый формат)
  const hasConnections = config.nodes.some((node: any) => node.connections);
  const hasEdges = Array.isArray(config.edges);
  
  return hasConnections || !hasEdges;
}

/**
 * Конвертирует данные React Flow обратно в старый формат для сохранения
 */
export function convertReactFlowToLegacy(nodes: Node[], edges: Edge[]): LegacyConfiguration {
  const legacyNodes: LegacyNode[] = [];

  nodes.forEach(node => {
    const nodeData = node.data as BaseNode;
    const connections: string[] = [];

    // Находим все исходящие соединения для этого узла
    edges.forEach(edge => {
      if (edge.source === node.id) {
        connections.push(edge.target);
      }
    });

    const legacyNode: LegacyNode = {
      id: node.id,
      type: 'action', // В старом формате все узлы имели тип 'action'
      data: {
        ...nodeData.config,
        actionType: nodeData.category === 'triggers' ? 'trigger' : nodeData.category
      },
      connections
    };

    legacyNodes.push(legacyNode);
  });

  return {
    nodes: legacyNodes,
    metadata: {
      convertedFrom: 'reactflow',
      convertedAt: new Date().toISOString(),
      nodeCount: nodes.length
    }
  };
}