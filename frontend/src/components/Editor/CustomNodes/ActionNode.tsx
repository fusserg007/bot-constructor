import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface ActionNodeData {
  label: string;
  actionType?: string;
  icon?: string;
  color?: string;
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.actionNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#10b981' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#10b981' }}>
        <span className={styles.nodeIcon}>{data.icon || '⚡'}</span>
        <span className={styles.nodeTitle}>Действие</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.actionType && (
          <div className={styles.nodeSubtext}>Тип: {data.actionType}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#10b981' }}
      />
    </div>
  );
};

export default ActionNode;