import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface WebhookNodeData {
  label: string;
  webhookType?: 'telegram' | 'http' | 'manual';
  icon?: string;
  color?: string;
}

const WebhookNode: React.FC<NodeProps<WebhookNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.webhookNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#3b82f6' }}>
        <span className={styles.nodeIcon}>{data.icon || '🔗'}</span>
        <span className={styles.nodeTitle}>WEBHOOK</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label || 'Telegram Webhook'}</div>
        <div className={styles.nodeSubtext}>
          {data.webhookType === 'telegram' ? 'Получает сообщения из Telegram' : 'HTTP Webhook'}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#3b82f6' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#3b82f6' }}
      />
    </div>
  );
};

export default WebhookNode;