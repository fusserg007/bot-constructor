import { SchemaValidator } from './SchemaValidator';
import type { BotSchema } from '../types/flow';
import type { Node, Edge } from 'reactflow';
import type { BaseNode } from '../types/nodes';

describe('SchemaValidator - Simple Tests', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  it('should create validator instance', () => {
    expect(validator).toBeInstanceOf(SchemaValidator);
  });

  it('should return error for null schema', () => {
    const result = validator.validateSchema(null as any);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('SCHEMA_MISSING');
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
          data: {
            id: '',
            category: 'triggers'
          } as BaseNode
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

  it('should detect cycles in schema', () => {
    const schema: BotSchema = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      nodes: [
        {
          id: 'node-1',
          type: 'action-send-message',
          position: { x: 0, y: 0 },
          data: { 
            id: 'node-1', 
            category: 'actions', 
            config: { actionType: 'send_message' } 
          } as BaseNode
        },
        {
          id: 'node-2',
          type: 'action-send-message',
          position: { x: 100, y: 0 },
          data: { 
            id: 'node-2', 
            category: 'actions', 
            config: { actionType: 'send_message' } 
          } as BaseNode
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

  it('should validate connection compatibility', () => {
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

  it('should get compatible node types', () => {
    const compatibleTypes = validator.getCompatibleNodeTypes('triggers');
    
    expect(compatibleTypes).toContain('conditions');
    expect(compatibleTypes).toContain('actions');
    expect(compatibleTypes).toContain('data');
    expect(compatibleTypes).not.toContain('triggers');
  });

  it('should perform quick validation', () => {
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
            category: 'triggers',
            config: { triggerType: 'message' }
          } as BaseNode
        }
      ],
      edges: [],
      variables: {},
      settings: {}
    };

    const result = validator.quickValidate(schema);
    
    // Quick validation should not check for logical integrity issues
    expect(result.warnings.some(w => w.type === 'NO_ACTIONS')).toBe(false);
  });
});