import React from 'react';
import { NodePreviewProps } from './types';
import { nodeRegistry } from './NodeRegistry';
import UnifiedNodeRenderer from './UnifiedNodeRenderer';

/**
 * Генератор превью узлов для витрины
 */
const NodePreviewGenerator: React.FC<NodePreviewProps> = ({
  nodeType,
  data,
  size,
  onClick
}) => {
  const config = nodeRegistry.getNodeConfiguration(nodeType);

  if (!config) {
    return null;
  }

  // Создаем данные для превью, объединяя конфигурацию и переданные данные
  const previewData = {
    ...config.defaultData,
    ...data,
    // Обеспечиваем наличие базовых свойств
    label: data.label || config.name,
    icon: data.icon || config.icon,
    color: data.color || config.color
  };

  return (
    <UnifiedNodeRenderer
      nodeType={nodeType}
      data={previewData}
      mode="library"
      size={size}
      onClick={onClick}
    />
  );
};

export default NodePreviewGenerator;