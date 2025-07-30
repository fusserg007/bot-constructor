import type { Node, Edge } from 'reactflow';
// import { BaseNode } from '../types/nodes';

export interface ValidationError {
  id: string;
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
  details?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class SchemaValidator {
  private nodes: Node[];
  private edges: Edge[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Проверка на пустую схему
    if (this.nodes.length === 0) {
      warnings.push({
        id: 'empty-schema',
        type: 'warning',
        message: 'Схема не содержит узлов'
      });
    }

    // Проверка на изолированные узлы
    this.nodes.forEach(node => {
      const hasIncoming = this.edges.some(edge => edge.target === node.id);
      const hasOutgoing = this.edges.some(edge => edge.source === node.id);
      
      if (!hasIncoming && !hasOutgoing && this.nodes.length > 1) {
        warnings.push({
          id: `isolated-${node.id}`,
          type: 'warning',
          message: `Узел "${node.data?.label || node.id}" изолирован`,
          nodeId: node.id
        });
      }
    });

    // Проверка на недействительные соединения
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode) {
        errors.push({
          id: `invalid-source-${edge.id}`,
          type: 'error',
          message: `Соединение ссылается на несуществующий исходный узел`,
          edgeId: edge.id
        });
      }
      
      if (!targetNode) {
        errors.push({
          id: `invalid-target-${edge.id}`,
          type: 'error',
          message: `Соединение ссылается на несуществующий целевой узел`,
          edgeId: edge.id
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}