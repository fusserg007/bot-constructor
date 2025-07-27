import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface DataNodeData {
  label: string;
  dataType?: string;
  icon?: string;
  color?: string;
  key?: string;
  value?: string;
}

const DataNode: React.FC<NodeProps<DataNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.dataNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#8b5cf6' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#8b5cf6' }}>
        <span className={styles.nodeIcon}>{data.icon || '💾'}</span>
        <span className={styles.nodeTitle}>Данные</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.dataType && (
          <div className={styles.nodeSubtext}>Тип: {data.dataType}</div>
        )}
        {data.key && (
          <div className={styles.nodeSubtext}>Ключ: {data.key}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#8b5cf6' }}
      />
    </div>
  );
};

export default DataNode;