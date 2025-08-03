import { ComponentType } from 'react';
import { UsageFrequency } from '../UsageAnalyzer/SimpleUsageHelper';

// Базовые типы для системы единого рендеринга узлов

export interface NodePort {
  id: string;
  name: string;
  type: 'control' | 'data' | 'event' | 'error';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  multiple: boolean;
}

export interface NodeConfiguration {
  type: string;
  category: 'triggers' | 'actions' | 'conditions' | 'data' | 'integrations' | 'scenarios';
  name: string;
  description: string;
  icon: string;
  color: string;
  usageFrequency: UsageFrequency;
  defaultData: Record<string, any>;
  inputs: NodePort[];
  outputs: NodePort[];
  renderComponent: ComponentType<any>;
  previewComponent?: ComponentType<any>; // Для витрины
}

export type RenderMode = 'library' | 'canvas' | 'preview';
export type NodeSize = 'small' | 'medium' | 'large';

export interface UnifiedNodeRendererProps {
  nodeType: string;
  data: Record<string, any>;
  mode: RenderMode;
  size?: NodeSize;
  selected?: boolean;
  dragging?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export interface NodePreviewProps {
  nodeType: string;
  data: Record<string, any>;
  size: NodeSize;
  onClick?: () => void;
}