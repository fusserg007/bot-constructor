import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface CommandTriggerNodeData {
  label: string;
  command?: string;
  icon?: string;
  color?: string;
  caseSensitive?: boolean;
  description?: string;
}

const CommandTriggerNode: React.FC<NodeProps<CommandTriggerNodeData>> = ({ data, selected }) => {
  return (
    <div className={`${styles.customNode} ${styles.triggerNode} ${styles.commandTriggerNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#3b82f6' }}>
        <span className={styles.nodeIcon}>{data.icon || '⚡'}</span>
        <span className={styles.nodeTitle}>Команда</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.command && (
          <div className={styles.nodeSubtext}>
            <code className={styles.commandText}>{data.command}</code>
          </div>
        )}
        {data.description && (
          <div className={styles.nodeDescription}>{data.description}</div>
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
};

export default CommandTriggerNode;