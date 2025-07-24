import { describe, it, expect } from 'vitest';
import type { Node, Edge, Connection } from 'reactflow';
import { validateConnection, validateSchema, getNodeCompatibility } from './nodeValidation';

const mockNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger-message',
    position: { x: 0, y: 0 },
    data: {}
  },
  {
    id: 'action-1',
    type: 'action-send-message',
    position: { x: 100, y: 0 },
    data: {}
  },
  {
    id: 'condition-1',
    type: 'condition-text',
    position: { x: 200, y: 0 },
    data: {}
  }
];

describe('nodeValidation', () => {
  describe('validateConnection', () => {
    it('allows valid connections', () => {
      const connection: Connection = {
        source: 'trigger-1',
        target: 'action-1',
        sourceHandle: null,
        targetHandle: null
      };

      const result = validateConnection(connection, mockNodes);
      expect(result.valid).toBe(true);
    });

    it('prevents invalid connections', () => {
      const connection: Connection = {
        source: 'action-1',
        target: 'trigger-1',
        sourceHandle: null,
        targetHandle: null
      };

      const result = validateConnection(connection, mockNodes);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Действия не могут соединяться с триггерами');
    });

    it('prevents self-connections', () => {
      const connection: Connection = {
        source: 'trigger-1',
        target: 'trigger-1',
        sourceHandle: null,
        targetHandle: null
      };

      const result = validateConnection(connection, mockNodes);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Узел не может соединяться сам с собой');
    });

    it('handles missing nodes', () => {
      const connection: Connection = {
        source: 'nonexistent',
        target: 'action-1',
        sourceHandle: null,
        targetHandle: null
      };

      const result = validateConnection(connection, mockNodes);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Узел не найден');
    });
  });

  describe('validateSchema', () => {
    it('validates correct schema', () => {
      const edges: Edge[] = [
        {
          id: 'e1',
          source: 'trigger-1',
          target: 'action-1'
        }
      ];

      const result = validateSchema(mockNodes, edges);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires at least one trigger', () => {
      const nodesWithoutTrigger = mockNodes.filter(node => !node.type?.startsWith('trigger-'));
      const result = validateSchema(nodesWithoutTrigger, []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Схема должна содержать хотя бы один триггер');
    });

    it('detects invalid connections in schema', () => {
      const edges: Edge[] = [
        {
          id: 'e1',
          source: 'action-1',
          target: 'trigger-1'
        }
      ];

      const result = validateSchema(mockNodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Некорректное соединение'))).toBe(true);
    });

    it('detects cycles', () => {
      const nodesWithCycle: Node[] = [
        ...mockNodes,
        {
          id: 'action-2',
          type: 'action-send-message',
          position: { x: 300, y: 0 },
          data: {}
        }
      ];

      const edgesWithCycle: Edge[] = [
        {
          id: 'e1',
          source: 'trigger-1',
          target: 'action-1'
        },
        {
          id: 'e2',
          source: 'action-1',
          target: 'action-2'
        },
        {
          id: 'e3',
          source: 'action-2',
          target: 'action-1'
        }
      ];

      const result = validateSchema(nodesWithCycle, edgesWithCycle);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Обнаружены циклические зависимости в схеме');
    });
  });

  describe('getNodeCompatibility', () => {
    it('returns compatible node types for trigger', () => {
      const compatibility = getNodeCompatibility('trigger-message');
      expect(compatibility).toContain('action-send-message');
      expect(compatibility).toContain('condition-text');
    });

    it('returns compatible node types for action', () => {
      const compatibility = getNodeCompatibility('action-send-message');
      expect(compatibility).toContain('action-send-message');
      expect(compatibility).toContain('condition-text');
      expect(compatibility).not.toContain('trigger-message');
    });

    it('returns compatible node types for condition', () => {
      const compatibility = getNodeCompatibility('condition-text');
      expect(compatibility).toContain('action-send-message');
      expect(compatibility).toContain('condition-text');
      expect(compatibility).not.toContain('trigger-message');
    });
  });
});