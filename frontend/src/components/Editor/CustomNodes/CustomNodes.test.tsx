import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReactFlowProvider } from 'reactflow';
import { TriggerNode, ActionNode, ConditionNode } from './index';

const mockNodeProps = {
  id: 'test-node',
  selected: false,
  type: 'test',
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragging: false
};

const renderNode = (Component: React.ComponentType<any>, data: any) => {
  return render(
    <ReactFlowProvider>
      <Component {...mockNodeProps} data={data} />
    </ReactFlowProvider>
  );
};

describe('Custom Nodes', () => {
  describe('TriggerNode', () => {
    it('renders trigger node with correct data', () => {
      const data = {
        label: 'Message Trigger',
        icon: '📨',
        color: '#3b82f6',
        triggerType: 'text'
      };

      renderNode(TriggerNode, data);

      expect(screen.getByText('Message Trigger')).toBeInTheDocument();
      expect(screen.getByText('📨')).toBeInTheDocument();
    });

    it('shows trigger-specific styling', () => {
      const data = {
        label: 'Test Trigger',
        icon: '🚀',
        color: '#3b82f6'
      };

      const { container } = renderNode(TriggerNode, data);
      const nodeElement = container.querySelector('.triggerNode');
      
      expect(nodeElement).toBeInTheDocument();
    });
  });

  describe('ActionNode', () => {
    it('renders action node with correct data', () => {
      const data = {
        label: 'Send Message',
        icon: '💬',
        color: '#10b981',
        message: 'Hello World'
      };

      renderNode(ActionNode, data);

      expect(screen.getByText('Send Message')).toBeInTheDocument();
      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    it('shows action-specific styling', () => {
      const data = {
        label: 'Test Action',
        icon: '⚡',
        color: '#10b981'
      };

      const { container } = renderNode(ActionNode, data);
      const nodeElement = container.querySelector('.actionNode');
      
      expect(nodeElement).toBeInTheDocument();
    });
  });

  describe('ConditionNode', () => {
    it('renders condition node with correct data', () => {
      const data = {
        label: 'Text Check',
        icon: '🔍',
        color: '#f59e0b',
        condition: 'contains',
        value: 'test'
      };

      renderNode(ConditionNode, data);

      expect(screen.getByText('Text Check')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('shows condition-specific styling', () => {
      const data = {
        label: 'Test Condition',
        icon: '❓',
        color: '#f59e0b'
      };

      const { container } = renderNode(ConditionNode, data);
      const nodeElement = container.querySelector('.conditionNode');
      
      expect(nodeElement).toBeInTheDocument();
    });

    it('shows multiple output handles for conditions', () => {
      const data = {
        label: 'Test Condition',
        icon: '❓',
        color: '#f59e0b'
      };

      const { container } = renderNode(ConditionNode, data);
      
      // Condition nodes should have "true" and "false" outputs
      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBeGreaterThan(1);
    });
  });
});