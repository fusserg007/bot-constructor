export interface MultiNodeData {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  isExpanded: boolean;
  children: ComponentItem[];
  buttonLayout: 'top' | 'bottom' | 'side';
}

export interface ComponentItem {
  id: string;
  type: 'button' | 'text' | 'input' | 'condition';
  config: any;
  position: { x: number; y: number };
}

export interface NodeExpanderProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export interface MultiNodeProps {
  data: MultiNodeData;
  selected?: boolean;
  onDataChange?: (data: MultiNodeData) => void;
}