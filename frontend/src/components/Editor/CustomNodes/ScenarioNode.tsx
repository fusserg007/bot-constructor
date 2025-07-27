import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface ScenarioNodeData {
  label: string;
  scenarioType?: string;
  icon?: string;
  color?: string;
  steps?: number;
  description?: string;
}

const ScenarioNode: React.FC<NodeProps<ScenarioNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.scenarioNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#06b6d4' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#06b6d4' }}>
        <span className={styles.nodeIcon}>{data.icon || '📋'}</span>
        <span className={styles.nodeTitle}>Сценарий</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.scenarioType && (
          <div className={styles.nodeSubtext}>Тип: {data.scenarioType}</div>
        )}
        {data.steps && (
          <div className={styles.nodeSubtext}>Шагов: {data.steps}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#06b6d4' }}
      />
    </div>
  );
};

export default ScenarioNode;