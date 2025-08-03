import React from 'react';
import { UnifiedNodeRendererProps } from './types';
import { nodeRegistry } from './NodeRegistry';
import { SimpleUsageHelper } from '../UsageAnalyzer/SimpleUsageHelper';
import styles from './UnifiedNodeRenderer.module.css';

/**
 * Единый компонент для рендеринга узлов в витрине и на канвасе
 */
const UnifiedNodeRenderer: React.FC<UnifiedNodeRendererProps> = ({
  nodeType,
  data,
  mode,
  size = 'medium',
  selected = false,
  dragging = false,
  onClick,
  onDoubleClick
}) => {
  const config = nodeRegistry.getNodeConfiguration(nodeType);

  if (!config) {
    // Fallback для неизвестных типов узлов
    return (
      <div 
        className={`${styles.unknownNode} ${styles[mode]} ${styles[size]}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <div className={styles.nodeIcon}>❓</div>
        <div className={styles.nodeLabel}>Unknown: {nodeType}</div>
      </div>
    );
  }

  // Для режима витрины используем упрощенное отображение
  if (mode === 'library') {
    return (
      <div 
        className={`${styles.libraryNode} ${styles[size]} ${selected ? styles.selected : ''}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        title={config.description}
      >
        <div 
          className={styles.nodeIcon}
          style={{ backgroundColor: config.color }}
        >
          {config.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeHeader}>
            <div className={styles.nodeName}>{config.name}</div>
            <div 
              className={styles.frequencyBadge}
              style={{ backgroundColor: SimpleUsageHelper.getFrequencyColor(config.usageFrequency) }}
              title={SimpleUsageHelper.getFrequencyDescription(config.usageFrequency)}
            >
              {SimpleUsageHelper.getFrequencyIcon(config.usageFrequency)}
            </div>
          </div>
          <div className={styles.nodeDescription}>{config.description}</div>
        </div>
      </div>
    );
  }

  // Для режима превью используем компактное отображение
  if (mode === 'preview') {
    return (
      <div 
        className={`${styles.previewNode} ${styles[size]} ${selected ? styles.selected : ''}`}
        onClick={onClick}
        style={{ borderColor: config.color }}
      >
        <div className={styles.previewIcon}>{config.icon}</div>
        <div className={styles.previewName}>{config.name}</div>
      </div>
    );
  }

  // Для режима канваса используем полный компонент
  if (mode === 'canvas') {
    const NodeComponent = config.renderComponent;
    
    return (
      <div 
        className={`${styles.canvasNode} ${selected ? styles.selected : ''} ${dragging ? styles.dragging : ''}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <NodeComponent 
          id={data.id || 'temp'}
          data={data}
          selected={selected}
          {...data}
        />
      </div>
    );
  }

  return null;
};

export default UnifiedNodeRenderer;