import React from 'react';
import { NodeExpanderProps } from './types';
import styles from './MultiNode.module.css';

const NodeExpander: React.FC<NodeExpanderProps> = ({ isExpanded, onToggle, className }) => {
  return (
    <button
      className={`${styles.nodeExpander} ${className || ''}`}
      onClick={onToggle}
      title={isExpanded ? 'Свернуть узел' : 'Развернуть узел'}
      type="button"
    >
      <span className={`${styles.expanderIcon} ${isExpanded ? styles.expanded : ''}`}>
        ▶
      </span>
    </button>
  );
};

export default NodeExpander;