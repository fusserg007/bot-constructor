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
  data?: any;
  config?: any;
  position?: { x: number; y: number };
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
      position: legacyNode.position || { x: 100 + (index * 200), y: 100 + (Math.floor(index / 3) * 150) },
      data: {
        ...nodeData,
        position: legacyNode.position || { x: 100 + (index * 200), y: 100 + (Math.floor(index / 3) * 150) }
      }
    };
    nodes.push(node);
  });

  // Конвертируем соединения из старого формата (connections в узлах)
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

  // Конвертируем соединения из нового формата (connections в корне конфигурации)
  if (legacyConfig.connections && Array.isArray(legacyConfig.connections)) {
    legacyConfig.connections.forEach((connection) => {
      const edge: Edge = {
        id: connection.id || `${connection.sourceNodeId}-${connection.targetNodeId}`,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        sourceHandle: connection.sourceOutput,
        targetHandle: connection.targetInput,
        type: 'default'
      };
      edges.push(edge);
    });
  }

  return { nodes, edges };
}

/**
 * Конвертирует тип узла из старого формата в новый
 */
function convertNodeType(legacyType: string): string {
  const typeMapping: Record<string, string> = {
    // Основные типы
    'action': 'action-send-message',
    'trigger': 'trigger-message',
    'condition': 'condition-text-contains',
    'data': 'data-save',
    'integration': 'integration-http',
    'scenario': 'scenario-welcome',
    
    // Триггеры
    'command': 'trigger-command',
    'message': 'trigger-message',
    'callback': 'trigger-callback',
    'inline_query': 'trigger-inline',
    
    // Действия
    'send_message': 'action-send-message',
    'send_photo': 'action-send-photo',
    'send_video': 'action-send-video',
    'send_audio': 'action-send-audio',
    'send_document': 'action-send-document',
    'edit_message': 'action-edit-message',
    'delete_message': 'action-delete-message',
    
    // Условия
    'text_check': 'condition-text-contains',
    'user_check': 'condition-user-role',
    'time_check': 'condition-time',
    'data_check': 'condition-variable',
    
    // Данные
    'random_number': 'data-variable-set',
    'save_data': 'data-save',
    'load_data': 'data-load',
    'variable_set': 'data-variable-set',
    'variable_get': 'data-variable-get',
    
    // Интеграции
    'http_request': 'integration-http',
    'webhook': 'integration-webhook',
    'database': 'integration-database',
    'api_call': 'integration-api'
  };

  return typeMapping[legacyType] || 'action-send-message';
}

/**
 * Конвертирует данные узла из старого формата в новый
 */
function convertNodeData(legacyNode: LegacyNode): BaseNode {
  const data = legacyNode.data || {};
  const nodeConfig = legacyNode.config || data.config || {};
  
  // Определяем категорию на основе типа узла
  let category: BaseNode['category'] = 'actions';
  
  // Улучшенное определение категории
  if (legacyNode.type === 'command' || legacyNode.type === 'trigger' || 
      data.triggerType || legacyNode.type.includes('trigger')) {
    category = 'triggers';
  } else if (legacyNode.type === 'send_message' || legacyNode.type === 'action' ||
             data.actionType === 'send_message' || legacyNode.type.includes('send_')) {
    category = 'actions';
  } else if (legacyNode.type === 'random_number' || legacyNode.type === 'data' ||
             data.actionType === 'random_number' || legacyNode.type.includes('data_') ||
             legacyNode.type.includes('variable_')) {
    category = 'data';
  } else if (legacyNode.type === 'condition' || data.conditionType || 
             legacyNode.type.includes('check') || legacyNode.type.includes('condition')) {
    category = 'conditions';
  } else if (data.integrationType || legacyNode.type.includes('integration') ||
             legacyNode.type.includes('http') || legacyNode.type.includes('api')) {
    category = 'integrations';
  } else if (legacyNode.type.includes('scenario')) {
    category = 'scenarios';
  }

  // Создаем конфигурацию узла, объединяя данные из разных источников
  const config: Record<string, any> = {
    ...data,
    ...nodeConfig
  };
  
  // Удаляем служебные поля
  delete config.actionType;
  delete config.config;

  // Специальная обработка для разных типов узлов
  if (category === 'triggers') {
    if (legacyNode.type === 'command') {
      config.triggerType = 'command';
      config.label = `Команда: ${config.command || '/start'}`;
    } else {
      config.triggerType = config.triggerType || 'message';
      config.label = config.label || 'Триггер сообщения';
    }
  } else if (category === 'actions') {
    config.actionType = config.actionType || 'send_message';
    config.label = config.label || `Отправить: ${config.text || config.message || 'сообщение'}`;
  } else if (category === 'conditions') {
    config.conditionType = config.conditionType || 'text_contains';
    config.label = config.label || 'Проверка условия';
  } else if (category === 'data') {
    config.dataType = config.dataType || 'variable';
    config.label = config.label || 'Работа с данными';
  }

  // Создаем порты для узла
  const inputs: NodePort[] = category === 'triggers' ? [] : [
    {
      id: 'input',
      name: 'Вход',
      type: 'control',
      dataType: 'any',
      required: false,
      multiple: false
    }
  ];

  const outputs: NodePort[] = [
    {
      id: 'output',
      name: 'Выход',
      type: 'control',
      dataType: 'any',
      required: false,
      multiple: true
    }
  ];

  return {
    id: legacyNode.id,
    type: convertNodeType(legacyNode.type), // Используем конвертированный тип для React Flow
    category,
    position: { x: 0, y: 0 }, // Будет установлено в основной функции
    size: { width: 200, height: 100 },
    color: getCategoryColor(category),
    icon: getCategoryIcon(category),
    inputs,
    outputs,
    config,
    name: config.label || config.name || `${category} узел`,
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
  // или есть поле connections в корне (промежуточный формат)
  // или отсутствует поле edges (новый формат React Flow)
  const hasNodeConnections = config.nodes.some((node: any) => node.connections);
  const hasRootConnections = Array.isArray(config.connections);
  const hasEdges = Array.isArray(config.edges);
  
  return hasNodeConnections || hasRootConnections || !hasEdges;
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