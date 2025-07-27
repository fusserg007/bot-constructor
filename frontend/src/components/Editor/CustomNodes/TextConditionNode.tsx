import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface TextConditionNodeData {
  label: string;
  conditionType?: string;
  icon?: string;
  color?: string;
  pattern?: string;
  caseSensitive?: boolean;
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
}

const TextConditionNode: React.FC<NodeProps<TextConditionNodeData>> = ({ data, selected }) => {
  const getOperatorText = (operator?: string) => {
    switch (operator) {
      case 'contains': return 'содержит';
      case 'equals': return 'равно';
      case 'startsWith': return 'начинается с';
      case 'endsWith': return 'заканчивается на';
      case 'regex': return 'регулярное выражение';
      default: return 'проверка';
    }
  };

  return (
    <div className={`${styles.customNode} ${styles.conditionNode} ${styles.textConditionNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#f59e0b' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#f59e0b' }}>
        <span className={styles.nodeIcon}>{data.icon || '📝'}</span>
        <span className={styles.nodeTitle}>Текст</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.operator && (
          <div className={styles.nodeSubtext}>Условие: {getOperatorText(data.operator)}</div>
        )}
        {data.pattern && (
          <div className={styles.nodeSubtext}>
            <code className={styles.patternText}>"{data.pattern}"</code>
          </div>
        )}
      </div>

      {/* True output */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className={`${styles.handle} ${styles.trueHandle}`}
        style={{ backgroundColor: '#10b981', top: '40%' }}
      />
      
      {/* False output */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className={`${styles.handle} ${styles.falseHandle}`}
        style={{ backgroundColor: '#ef4444', top: '60%' }}
      />
    </div>
  );
};

export default TextConditionNode;