import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface ConditionNodeData {
  label: string;
  conditionType?: string;
  icon?: string;
  color?: string;
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = React.memo(({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.conditionNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#f59e0b' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#f59e0b' }}>
        <span className={styles.nodeIcon}>{data.icon || '❓'}</span>
        <span className={styles.nodeTitle}>Условие</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.conditionType && (
          <div className={styles.nodeSubtext}>Тип: {data.conditionType}</div>
        )}
      </div>

      <div className={styles.conditionOutputs}>
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className={`${styles.handle} ${styles.trueHandle}`}
          style={{ backgroundColor: '#10b981', top: '40%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className={`${styles.handle} ${styles.falseHandle}`}
          style={{ backgroundColor: '#ef4444', top: '60%' }}
        />
      </div>

      <div className={styles.outputLabels}>
        <div className={styles.outputLabel} style={{ top: '35%' }}>Да</div>
        <div className={styles.outputLabel} style={{ top: '55%' }}>Нет</div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.conditionType === nextProps.data.conditionType &&
    prevProps.data.icon === nextProps.data.icon &&
    prevProps.data.color === nextProps.data.color
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;