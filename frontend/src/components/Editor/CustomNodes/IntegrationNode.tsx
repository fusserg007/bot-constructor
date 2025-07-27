import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface IntegrationNodeData {
  label: string;
  integrationType?: string;
  icon?: string;
  color?: string;
  url?: string;
  method?: string;
  service?: string;
}

const IntegrationNode: React.FC<NodeProps<IntegrationNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.integrationNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#f97316' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#f97316' }}>
        <span className={styles.nodeIcon}>{data.icon || '🔗'}</span>
        <span className={styles.nodeTitle}>Интеграция</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.integrationType && (
          <div className={styles.nodeSubtext}>Тип: {data.integrationType}</div>
        )}
        {data.service && (
          <div className={styles.nodeSubtext}>Сервис: {data.service}</div>
        )}
        {data.method && (
          <div className={styles.nodeSubtext}>Метод: {data.method}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#f97316' }}
      />
    </div>
  );
};

export default IntegrationNode;