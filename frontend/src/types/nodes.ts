// Base node types for the bot constructor
export interface BaseNode {
  id: string;
  type: string;
  category: 'triggers' | 'conditions' | 'actions' | 'data' | 'integrations' | 'scenarios';
  
  // Visual properties
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  icon: string;
  
  // Logical properties
  inputs: NodePort[];
  outputs: NodePort[];
  config: NodeConfig;
  
  // Meta information
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
}

export interface NodePort {
  id: string;
  name: string;
  type: 'control' | 'data' | 'event' | 'error';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  multiple: boolean; // Can accept multiple connections
}

export interface NodeConfig {
  [key: string]: any;
}

export type NodeCategory = 'triggers' | 'conditions' | 'actions' | 'data' | 'integrations' | 'scenarios';

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: NodeConfig;
  inputs: NodePort[];
  outputs: NodePort[];
}