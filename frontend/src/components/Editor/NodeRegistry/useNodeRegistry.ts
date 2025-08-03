import { useMemo } from 'react';
import { nodeRegistry } from './NodeRegistry';
import { NodeConfiguration } from './types';

/**
 * Хук для работы с реестром узлов
 */
export const useNodeRegistry = () => {
  const getNodeConfiguration = (nodeType: string): NodeConfiguration | undefined => {
    return nodeRegistry.getNodeConfiguration(nodeType);
  };

  const getAllConfigurations = (): NodeConfiguration[] => {
    return nodeRegistry.getAllConfigurations();
  };

  const getNodesByCategory = (category: string): NodeConfiguration[] => {
    return nodeRegistry.getNodesByCategory(category);
  };

  const getNodeTypes = (): string[] => {
    return nodeRegistry.getNodeTypes();
  };

  const hasNode = (nodeType: string): boolean => {
    return nodeRegistry.hasNode(nodeType);
  };

  const createNodeData = (nodeType: string, overrides: Record<string, any> = {}): Record<string, any> => {
    const config = nodeRegistry.getNodeConfiguration(nodeType);
    if (!config) {
      return { label: nodeType, ...overrides };
    }

    return {
      ...config.defaultData,
      ...overrides
    };
  };

  // Мемоизированные списки для производительности
  const nodesByCategory = useMemo(() => {
    const categories = ['triggers', 'actions', 'conditions', 'data', 'integrations', 'scenarios'];
    const result: Record<string, NodeConfiguration[]> = {};
    
    categories.forEach(category => {
      result[category] = getNodesByCategory(category);
    });
    
    return result;
  }, []);

  const allNodes = useMemo(() => {
    return getAllConfigurations();
  }, []);

  return {
    getNodeConfiguration,
    getAllConfigurations,
    getNodesByCategory,
    getNodeTypes,
    hasNode,
    createNodeData,
    nodesByCategory,
    allNodes
  };
};