import { useState, useCallback, useMemo } from 'react';
import { MultiNodeData, ComponentItem } from './types';

interface UseMultiNodeStateProps {
  initialData: MultiNodeData;
  onDataChange?: (data: MultiNodeData) => void;
}

export const useMultiNodeState = ({ initialData, onDataChange }: UseMultiNodeStateProps) => {
  const [nodeData, setNodeData] = useState<MultiNodeData>(initialData);

  const updateNodeData = useCallback((updates: Partial<MultiNodeData>) => {
    const newData = { ...nodeData, ...updates };
    setNodeData(newData);
    onDataChange?.(newData);
  }, [nodeData, onDataChange]);

  const toggleExpanded = useCallback(() => {
    updateNodeData({ isExpanded: !nodeData.isExpanded });
  }, [nodeData.isExpanded, updateNodeData]);

  const addChild = useCallback((child: ComponentItem) => {
    const newChildren = [...(nodeData.children || []), child];
    updateNodeData({ children: newChildren });
  }, [nodeData.children, updateNodeData]);

  const removeChild = useCallback((childId: string) => {
    const newChildren = nodeData.children?.filter(child => child.id !== childId) || [];
    updateNodeData({ children: newChildren });
  }, [nodeData.children, updateNodeData]);

  const updateChild = useCallback((childId: string, updates: Partial<ComponentItem>) => {
    const newChildren = nodeData.children?.map(child => 
      child.id === childId ? { ...child, ...updates } : child
    ) || [];
    updateNodeData({ children: newChildren });
  }, [nodeData.children, updateNodeData]);

  const setButtonLayout = useCallback((layout: 'top' | 'bottom' | 'side') => {
    updateNodeData({ buttonLayout: layout });
  }, [updateNodeData]);

  const childrenCount = useMemo(() => nodeData.children?.length || 0, [nodeData.children]);

  const hasChildren = useMemo(() => childrenCount > 0, [childrenCount]);

  return {
    nodeData,
    updateNodeData,
    toggleExpanded,
    addChild,
    removeChild,
    updateChild,
    setButtonLayout,
    childrenCount,
    hasChildren
  };
};