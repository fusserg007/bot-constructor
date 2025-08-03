import type { Node } from 'reactflow';
import { getNodeLocalization } from '../../../utils/localization';

// Простые функции для получения иконок и цветов узлов
export const getNodeIcon = (nodeType: string): string => {
  const icons: Record<string, string> = {
    'entry-point': '🚀',
    'interactive-menu': '📋',
    'start': '🚀',
    'send_message': '💬',
    'send_message_with_keyboard': '⌨️',
    'callback_handler': '🔄',
    'command': '⚡',
    'webhook-telegram': '📡',
    'webhook-http': '🌐',
    'switch-command': '🔀',
    'switch-condition': '❓',
    'trigger-message': '📨',
    'trigger-command': '⚡',
    'trigger-callback': '🔄',
    'action-send-message': '💬',
    'condition-text-contains': '🔍',
    'data-save': '💾',
    'integration-http': '🔗',
    'scenario-welcome': '👋'
  };
  return icons[nodeType] || '⚙️';
};

export const getNodeColor = (nodeType: string): string => {
  const colors: Record<string, string> = {
    'entry-point': '#22c55e',
    'interactive-menu': '#3b82f6',
    'start': '#22c55e',
    'send_message': '#3b82f6',
    'send_message_with_keyboard': '#6366f1',
    'callback_handler': '#f59e0b',
    'command': '#ef4444',
    'webhook-telegram': '#8b5cf6',
    'webhook-http': '#06b6d4',
    'switch-command': '#84cc16',
    'switch-condition': '#f97316',
    'trigger-message': '#ef4444',
    'trigger-command': '#dc2626',
    'trigger-callback': '#f59e0b',
    'action-send-message': '#3b82f6',
    'condition-text-contains': '#f59e0b',
    'data-save': '#8b5cf6',
    'integration-http': '#06b6d4',
    'scenario-welcome': '#22c55e'
  };
  return colors[nodeType] || '#6b7280';
};

export const getDefaultNodeData = (type: string) => {
  const localization = getNodeLocalization(type);
  
  switch (type) {
    case 'entry-point':
      return {
        label: localization.name,
        triggerType: 'start_command',
        description: 'Начало работы бота',
        icon: getNodeIcon(type),
        color: getNodeColor(type)
      };
      
    case 'interactive-menu':
      return {
        label: localization.name,
        title: 'Меню',
        message: 'Выберите действие:',
        parse_mode: 'HTML',
        buttons: [],
        keyboardType: 'inline',
        buttonsPerRow: 2,
        icon: getNodeIcon(type),
        color: getNodeColor(type)
      };
      
    case 'start':
      return {
        label: localization.name,
        icon: getNodeIcon(type),
        color: getNodeColor(type)
      };
      
    case 'trigger-message':
      return {
        label: localization.name,
        triggerType: 'text',
        icon: getNodeIcon(type),
        color: getNodeColor(type)
      };
      
    case 'action-send-message':
      return {
        label: localization.name,
        actionType: 'send',
        icon: getNodeIcon(type),
        color: getNodeColor(type),
        message: 'Привет!'
      };
      
    case 'condition-text':
      return {
        label: localization.name,
        conditionType: 'contains',
        icon: getNodeIcon(type),
        color: getNodeColor(type),
        condition: 'содержит',
        value: ''
      };
      
    default:
      return { 
        label: localization.name,
        icon: getNodeIcon(type),
        color: getNodeColor(type)
      };
  }
};

// Проверка поддержки типа узла
export const isNodeTypeSupported = (nodeType: string): boolean => {
  const supportedTypes = [
    'entry-point',
    'interactive-menu',
    'start',
    'send_message',
    'send_message_with_keyboard',
    'callback_handler',
    'command',
    'webhook-telegram',
    'webhook-http',
    'switch-command',
    'switch-condition',
    'trigger-message',
    'trigger-command',
    'trigger-callback',
    'action-send-message',
    'condition-text-contains',
    'data-save',
    'integration-http',
    'scenario-welcome'
  ];
  
  return supportedTypes.includes(nodeType);
};

// Создание узла с правильными данными
export const createNodeWithDefaults = (type: string, position: { x: number; y: number }): Node => {
  return {
    id: `${type}-${Date.now()}`,
    type,
    position,
    data: getDefaultNodeData(type),
  };
};