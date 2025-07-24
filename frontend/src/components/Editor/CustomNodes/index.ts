import TriggerNode from './TriggerNode';
import ActionNode from './ActionNode';
import ConditionNode from './ConditionNode';

export const nodeTypes = {
  'trigger-message': TriggerNode,
  'action-send-message': ActionNode,
  'condition-text': ConditionNode,
};

export { TriggerNode, ActionNode, ConditionNode };