import TriggerNode from './TriggerNode';
import ActionNode from './ActionNode';
import ConditionNode from './ConditionNode';
import DataNode from './DataNode';
import IntegrationNode from './IntegrationNode';
import ScenarioNode from './ScenarioNode';
import CommandTriggerNode from './CommandTriggerNode';
import MediaActionNode from './MediaActionNode';
import TextConditionNode from './TextConditionNode';

export const nodeTypes = {
  // Триггеры
  'trigger-message': TriggerNode,
  'trigger-command': CommandTriggerNode,
  'trigger-callback': TriggerNode,
  'trigger-inline': TriggerNode,
  
  // Действия
  'action-send-message': ActionNode,
  'action-send-photo': MediaActionNode,
  'action-send-video': MediaActionNode,
  'action-send-audio': MediaActionNode,
  'action-send-document': MediaActionNode,
  'action-edit-message': ActionNode,
  'action-delete-message': ActionNode,
  
  // Условия
  'condition-text-contains': TextConditionNode,
  'condition-text-equals': TextConditionNode,
  'condition-user-role': ConditionNode,
  'condition-user-subscription': ConditionNode,
  'condition-time': ConditionNode,
  'condition-variable': ConditionNode,
  
  // Данные
  'data-save': DataNode,
  'data-load': DataNode,
  'data-delete': DataNode,
  'data-variable-set': DataNode,
  'data-variable-get': DataNode,
  
  // Интеграции
  'integration-http': IntegrationNode,
  'integration-webhook': IntegrationNode,
  'integration-database': IntegrationNode,
  'integration-api': IntegrationNode,
  
  // Сценарии
  'scenario-welcome': ScenarioNode,
  'scenario-support': ScenarioNode,
  'scenario-survey': ScenarioNode,
  'scenario-quiz': ScenarioNode,
};

export { 
  TriggerNode, 
  ActionNode, 
  ConditionNode, 
  DataNode, 
  IntegrationNode, 
  ScenarioNode,
  CommandTriggerNode,
  MediaActionNode,
  TextConditionNode
};