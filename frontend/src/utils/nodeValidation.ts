import type { Node, Edge, Connection } from 'reactflow';

export interface NodeValidationRule {
  sourceType: string;
  targetType: string;
  allowed: boolean;
  reason?: string;
}

// Правила валидации соединений между узлами
const validationRules: NodeValidationRule[] = [
  // Триггеры могут соединяться с действиями и условиями
  { sourceType: 'trigger-message', targetType: 'action-send-message', allowed: true },
  { sourceType: 'trigger-message', targetType: 'condition-text', allowed: true },
  
  // Условия могут соединяться с действиями
  { sourceType: 'condition-text', targetType: 'action-send-message', allowed: true },
  { sourceType: 'condition-text', targetType: 'condition-text', allowed: true },
  
  // Действия могут соединяться с другими действиями и условиями
  { sourceType: 'action-send-message', targetType: 'action-send-message', allowed: true },
  { sourceType: 'action-send-message', targetType: 'condition-text', allowed: true },
  
  // Запрещенные соединения
  { sourceType: 'action-send-message', targetType: 'trigger-message', allowed: false, reason: 'Действия не могут соединяться с триггерами' },
  { sourceType: 'condition-text', targetType: 'trigger-message', allowed: false, reason: 'Условия не могут соединяться с триггерами' },
];

export const validateConnection = (connection: Connection, nodes: Node[]): { valid: boolean; reason?: string } => {
  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);
  
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Узел не найден' };
  }
  
  // Проверяем, что узел не соединяется сам с собой
  if (sourceNode.id === targetNode.id) {
    return { valid: false, reason: 'Узел не может соединяться сам с собой' };
  }
  
  // Ищем правило валидации
  const rule = validationRules.find(
    rule => rule.sourceType === sourceNode.type && rule.targetType === targetNode.type
  );
  
  if (!rule) {
    return { valid: false, reason: `Соединение между ${sourceNode.type} и ${targetNode.type} не определено` };
  }
  
  return { valid: rule.allowed, reason: rule.reason };
};

export const validateSchema = (nodes: Node[], edges: Edge[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Проверяем, что есть хотя бы один триггер
  const triggerNodes = nodes.filter(node => node.type?.startsWith('trigger-'));
  if (triggerNodes.length === 0) {
    errors.push('Схема должна содержать хотя бы один триггер');
  }
  
  // Проверяем, что все узлы соединены корректно
  for (const edge of edges) {
    const validation = validateConnection({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null
    }, nodes);
    if (!validation.valid) {
      errors.push(`Некорректное соединение: ${validation.reason}`);
    }
  }
  
  // Проверяем на циклические зависимости
  const hasCycles = detectCycles(nodes, edges);
  if (hasCycles) {
    errors.push('Обнаружены циклические зависимости в схеме');
  }
  
  return { valid: errors.length === 0, errors };
};

// Простой алгоритм обнаружения циклов
const detectCycles = (nodes: Node[], edges: Edge[]): boolean => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  const dfs = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) {
      return true; // Цикл найден
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    // Находим все исходящие ребра
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  };
  
  // Проверяем каждый узел
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }
  
  return false;
};

export const getNodeCompatibility = (nodeType: string): string[] => {
  return validationRules
    .filter(rule => rule.sourceType === nodeType && rule.allowed)
    .map(rule => rule.targetType);
};