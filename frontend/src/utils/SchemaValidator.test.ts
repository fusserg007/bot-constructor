import { SchemaValidator, schemaValidator } from './SchemaValidator';
import type { BotSchema } from '../types/flow';
import type { Node, Edge } from 'reactflow';
import type { BaseNode } from '../types/nodes';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validateSchema', () => {
    it('should return error for missing schema', () => {
      const result = validator.validateSchema(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('SCHEMA_MISSING');
    });

    it('should return error for invalid schema structure', () => {
      const invalidSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test schema',
        nodes: 'invalid' as any,
        edges: 'invalid' as any,
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(invalidSchema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_NODES_ARRAY')).toBe(true);
      expect(result.errors.some(e => e.type === 'INVALID_EDGES_ARRAY')).toBe(true);
    });

    it('should validate empty schema with warnings', () => {
      const emptySchema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test schema',
        nodes: [],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(emptySchema);
      
      expect(result.isValid).toBe(true);
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.type === 'EMPTY_SCHEMA')).toBe(true);
    });

    it('should validate valid schema with trigger and action', () => {
      const validSchema: BotSchema = {
        id: 'test',
        name: 'Test Bot',
        description: 'Test schema',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: {
              id: 'trigger-1',
              type: 'trigger-message',
              category: 'triggers',
              position: { x: 0, y: 0 },
              size: { width: 200, height: 100 },
              color: '#4CAF50',
              icon: 'message',
              inputs: [],
              outputs: [{ id: 'out1', name: 'output', type: 'control', dataType: 'any', required: false, multiple: false }],
              config: { triggerType: 'message', pattern: 'hello' },
              name: 'Message Trigger',
              description: 'Triggers on message',
              tags: [],
              compatibility: []
            } as BaseNode
          },
          {
            id: 'action-1',
            type: 'action-send-message',
            position: { x: 300, y: 0 },
            data: {
              id: 'action-1',
              type: 'action-send-message',
              category: 'actions',
              position: { x: 300, y: 0 },
              size: { width: 200, height: 100 },
              color: '#2196F3',
              icon: 'send',
              inputs: [{ id: 'in1', name: 'input', type: 'control', dataType: 'any', required: true, multiple: false }],
              outputs: [],
              config: { actionType: 'send_message', message: 'Hello!' },
              name: 'Send Message',
              description: 'Sends a message',
              tags: [],
              compatibility: []
            } as BaseNode
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'action-1',
            type: 'default'
          }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(validSchema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateNodes', () => {
    it('should detect missing node ID', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: '',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: {} as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_NODE_ID')).toBe(true);
    });

    it('should detect duplicate node IDs', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: {
              id: 'node-1',
              category: 'triggers'
            } as BaseNode
          },
          {
            id: 'node-1',
            type: 'action-send-message',
            position: { x: 100, y: 0 },
            data: {
              id: 'node-1',
              category: 'actions'
            } as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'DUPLICATE_NODE_ID')).toBe(true);
    });

    it('should detect invalid node category', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'invalid-type',
            position: { x: 0, y: 0 },
            data: {
              id: 'node-1',
              category: 'invalid' as any
            } as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'INVALID_CATEGORY')).toBe(true);
    });
  });

  describe('validateConnections', () => {
    it('should detect missing edge fields', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [],
        edges: [
          {
            id: '',
            source: '',
            target: '',
            type: 'default'
          }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MISSING_EDGE_ID')).toBe(true);
      expect(result.errors.some(e => e.type === 'MISSING_SOURCE_NODE')).toBe(true);
      expect(result.errors.some(e => e.type === 'MISSING_TARGET_NODE')).toBe(true);
    });

    it('should detect non-existent nodes in connections', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [],
        edges: [
          {
            id: 'edge-1',
            source: 'non-existent-1',
            target: 'non-existent-2',
            type: 'default'
          }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'SOURCE_NODE_NOT_FOUND')).toBe(true);
      expect(result.errors.some(e => e.type === 'TARGET_NODE_NOT_FOUND')).toBe(true);
    });

    it('should detect self-connections', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: {
              id: 'node-1',
              category: 'triggers'
            } as BaseNode
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-1',
            type: 'default'
          }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.warnings.some(w => w.type === 'SELF_CONNECTION')).toBe(true);
    });
  });

  describe('validateCyclicDependencies', () => {
    it('should detect simple cycle', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'action-send-message',
            position: { x: 0, y: 0 },
            data: { id: 'node-1', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          },
          {
            id: 'node-2',
            type: 'action-send-message',
            position: { x: 100, y: 0 },
            data: { id: 'node-2', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default' },
          { id: 'edge-2', source: 'node-2', target: 'node-1', type: 'default' }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CYCLIC_DEPENDENCY')).toBe(true);
    });

    it('should detect complex cycle', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'action-send-message',
            position: { x: 0, y: 0 },
            data: { id: 'node-1', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          },
          {
            id: 'node-2',
            type: 'action-send-message',
            position: { x: 100, y: 0 },
            data: { id: 'node-2', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          },
          {
            id: 'node-3',
            type: 'action-send-message',
            position: { x: 200, y: 0 },
            data: { id: 'node-3', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default' },
          { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'default' },
          { id: 'edge-3', source: 'node-3', target: 'node-1', type: 'default' }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'CYCLIC_DEPENDENCY')).toBe(true);
    });
  });

  describe('validateLogicalIntegrity', () => {
    it('should warn about missing triggers', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'action-1',
            type: 'action-send-message',
            position: { x: 0, y: 0 },
            data: {
              id: 'action-1',
              category: 'actions',
              config: { actionType: 'send_message', message: 'Hello' }
            } as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.warnings.some(w => w.type === 'NO_TRIGGERS')).toBe(true);
    });

    it('should warn about missing actions', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: {
              id: 'trigger-1',
              category: 'triggers',
              config: { triggerType: 'message' }
            } as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.warnings.some(w => w.type === 'NO_ACTIONS')).toBe(true);
    });

    it('should detect isolated nodes', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: { id: 'trigger-1', category: 'triggers', config: { triggerType: 'message' } } as BaseNode
          },
          {
            id: 'action-1',
            type: 'action-send-message',
            position: { x: 100, y: 0 },
            data: { id: 'action-1', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          },
          {
            id: 'isolated-1',
            type: 'action-send-message',
            position: { x: 200, y: 0 },
            data: { id: 'isolated-1', category: 'actions', config: { actionType: 'send_message' } } as BaseNode
          }
        ],
        edges: [
          { id: 'edge-1', source: 'trigger-1', target: 'action-1', type: 'default' }
        ],
        variables: {},
        settings: {}
      };

      const result = validator.validateSchema(schema);
      
      expect(result.warnings.some(w => w.type === 'ISOLATED_NODE' && w.nodeId === 'isolated-1')).toBe(true);
    });
  });

  describe('canConnect', () => {
    it('should allow valid connections', () => {
      const triggerNode: Node = {
        id: 'trigger-1',
        type: 'trigger-message',
        position: { x: 0, y: 0 },
        data: { category: 'triggers' } as BaseNode
      };

      const actionNode: Node = {
        id: 'action-1',
        type: 'action-send-message',
        position: { x: 100, y: 0 },
        data: { category: 'actions' } as BaseNode
      };

      const result = validator.canConnect(triggerNode, actionNode);
      
      expect(result.canConnect).toBe(true);
    });

    it('should reject invalid connections', () => {
      const actionNode: Node = {
        id: 'action-1',
        type: 'action-send-message',
        position: { x: 0, y: 0 },
        data: { category: 'actions' } as BaseNode
      };

      const triggerNode: Node = {
        id: 'trigger-1',
        type: 'trigger-message',
        position: { x: 100, y: 0 },
        data: { category: 'triggers' } as BaseNode
      };

      const result = validator.canConnect(actionNode, triggerNode);
      
      expect(result.canConnect).toBe(false);
      expect(result.reason).toContain('не могут соединяться с триггерами');
    });

    it('should reject self-connections', () => {
      const node: Node = {
        id: 'node-1',
        type: 'action-send-message',
        position: { x: 0, y: 0 },
        data: { category: 'actions' } as BaseNode
      };

      const result = validator.canConnect(node, node);
      
      expect(result.canConnect).toBe(false);
      expect(result.reason).toContain('сам с собой');
    });
  });

  describe('getCompatibleNodeTypes', () => {
    it('should return compatible types for triggers', () => {
      const compatibleTypes = validator.getCompatibleNodeTypes('triggers');
      
      expect(compatibleTypes).toContain('conditions');
      expect(compatibleTypes).toContain('actions');
      expect(compatibleTypes).toContain('data');
      expect(compatibleTypes).not.toContain('triggers');
    });

    it('should return compatible types for actions', () => {
      const compatibleTypes = validator.getCompatibleNodeTypes('actions');
      
      expect(compatibleTypes).toContain('conditions');
      expect(compatibleTypes).toContain('actions');
      expect(compatibleTypes).toContain('data');
      expect(compatibleTypes).toContain('integrations');
      expect(compatibleTypes).not.toContain('triggers');
    });
  });

  describe('quickValidate', () => {
    it('should perform basic validation only', () => {
      const schema: BotSchema = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-message',
            position: { x: 0, y: 0 },
            data: { id: 'node-1', category: 'triggers' } as BaseNode
          }
        ],
        edges: [],
        variables: {},
        settings: {}
      };

      const result = validator.quickValidate(schema);
      
      // Quick validation should not check for logical integrity issues like missing actions
      expect(result.warnings.some(w => w.type === 'NO_ACTIONS')).toBe(false);
    });
  });
});