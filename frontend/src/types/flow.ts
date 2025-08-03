import { Node, NodeProps } from 'reactflow';
import { BaseNode } from './nodes';

// React Flow specific types
export interface FlowNode extends Node {
  data: BaseNode;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface CustomNodeProps extends NodeProps {
  data: BaseNode;
}

export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface BotConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutput: string;
  targetInput: string;
}

export interface BotSchema {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  connections: BotConnection[]; // Новый формат
  edges?: FlowEdge[]; // Старый формат для совместимости
  variables: Record<string, any>;
  settings: Record<string, any>;
}