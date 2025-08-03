import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface SwitchNodeData {
  label: string;
  switchType?: 'command' | 'text' | 'condition';
  routes?: Array<{ condition: string; label: string }>;
  icon?: string;
  color?: string;
}

const SwitchNode: React.FC<NodeProps<SwitchNodeData>> = ({ data, selected }) => {
  const routes = data.routes || [
    { condition: '/start', label: 'Start' },
    { condition: '/help', label: 'Help' },
    { condition: 'default', label: 'Other' }
  ];

  return (
    <div className={`${styles.customNode} ${styles.switchNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#f59e0b' }}>
        <span className={styles.nodeIcon}>{data.icon || '🔀'}</span>
        <span className={styles.nodeTitle}>SWITCH</span>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label || 'Маршрутизация команд'}</div>
        <div className={styles.nodeSubtext}>
          {data.switchType === 'command' ? 'По командам' : 'По условиям'}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#f59e0b' }}
      />
      
      {/* Множественные выходы для каждого маршрута */}
      {routes.map((_, index) => (
        <Handle
          key={`output-${index}`}
          type="source"
          position={Position.Right}
          id={`output-${index}`}
          className={styles.handle}
          style={{ 
            backgroundColor: data.color || '#f59e0b',
            top: `${30 + (index * 25)}%`
          }}
        />
      ))}
      
      {/* Лейблы для выходов */}
      <div className={styles.outputLabels}>
        {routes.map((route, index) => (
          <div 
            key={`label-${index}`}
            className={styles.outputLabel}
            style={{ top: `${25 + (index * 25)}%` }}
          >
            {route.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwitchNode;