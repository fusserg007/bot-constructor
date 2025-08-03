import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface TriggerNodeData {
  label: string;
  triggerType?: string;
  icon?: string;
  color?: string;
}

const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = React.memo(({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.triggerNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#3b82f6' }}>
        <span className={styles.nodeIcon}>{data.icon || '🚀'}</span>
        <span className={styles.nodeTitle}>Триггер</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.triggerType && (
          <div className={styles.nodeSubtext}>Тип: {data.triggerType}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#3b82f6' }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.triggerType === nextProps.data.triggerType &&
    prevProps.data.icon === nextProps.data.icon &&
    prevProps.data.color === nextProps.data.color
  );
});

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode;