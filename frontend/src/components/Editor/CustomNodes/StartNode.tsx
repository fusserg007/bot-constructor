import React, { useMemo, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { ConnectionPorts } from '../ConnectionPorts';
import { useCanvasLogger } from '../CanvasLogger/useCanvasLogger';
import styles from './CustomNodes.module.css';

interface StartNodeData {
  label: string;
  icon?: string;
  color?: string;
}

const StartNode: React.FC<NodeProps<StartNodeData>> = React.memo(({ data, selected, id }) => {
  const { log } = useCanvasLogger();

  // Создаем порты для стартового узла
  const connectionPorts = useMemo(() => [
    {
      id: `${id}-output`,
      type: 'output' as const,
      dataType: 'control' as const,
      label: 'Начать выполнение',
      isConnected: false,
      isAvailable: true,
      position: 'right' as const,
      tooltip: 'Начальная точка выполнения схемы'
    }
  ], [id]);

  const handlePortHover = useCallback((portId: string, isHovering: boolean) => {
    log('PORT_HOVER', 
      `Port ${portId} ${isHovering ? 'hovered' : 'unhovered'} on StartNode`, 
      { nodeId: id }
    );
  }, [log, id]);

  const handlePortClick = useCallback((portId: string) => {
    log('PORT_CLICK', 
      `Port ${portId} clicked on StartNode`, 
      { nodeId: id }
    );
  }, [log, id]);

  return (
    <div className={`${styles.customNode} ${styles.startNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#22c55e' }}>
        <span className={styles.nodeIcon}>{data.icon || '▶️'}</span>
        <span className={styles.nodeTitle}>СТАРТ</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label || 'Начало выполнения'}</div>
        <div className={styles.nodeSubtext}>Точка входа в схему</div>
      </div>

      {/* Connection Ports with Indicators */}
      <ConnectionPorts
        nodeId={id || 'start-node'}
        ports={connectionPorts}
        onPortHover={handlePortHover}
        onPortClick={handlePortClick}
      />

      {/* Legacy ReactFlow Handle (hidden but required for compatibility) */}
      <Handle
        type="source"
        position={Position.Right}
        className={styles.hiddenHandle}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированное сравнение для предотвращения лишних ре-рендеров
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.icon === nextProps.data.icon &&
    prevProps.data.color === nextProps.data.color
  );
});

StartNode.displayName = 'StartNode';

export default StartNode;