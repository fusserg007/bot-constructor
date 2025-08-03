import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
// import { getNodeLocalization } from '../../../utils/localization';
import styles from './CustomNodes.module.css';

interface EntryPointData {
  triggerType: 'start_command' | 'first_message' | 'webhook' | 'custom_command';
  command?: string;
  description: string;
  webhookUrl?: string;
}

const EntryPointNode: React.FC<NodeProps<EntryPointData>> = React.memo(({ 
  data, 
  selected 
}) => {
  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'start_command':
        return '🚀';
      case 'first_message':
        return '💬';
      case 'webhook':
        return '📡';
      case 'custom_command':
        return '⚡';
      default:
        return '🚀';
    }
  };

  const getTriggerLabel = () => {
    switch (data.triggerType) {
      case 'start_command':
        return '/start';
      case 'first_message':
        return 'Первое сообщение';
      case 'webhook':
        return 'Webhook';
      case 'custom_command':
        return data.command || '/команда';
      default:
        return 'Точка входа';
    }
  };

  return (
    <div 
      className={`${styles.customNode} ${styles.entryPointNode} ${selected ? styles.selected : ''}`}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>{getTriggerIcon()}</div>
        <div className={styles.nodeTitle}>Точка входа</div>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.triggerInfo}>
          <div className={styles.triggerLabel}>{getTriggerLabel()}</div>
          <div className={styles.triggerDescription}>
            {data.description || 'Начало работы бота'}
          </div>
        </div>
      </div>

      {/* Только выходной порт - точка входа не имеет входов */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={styles.handle}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированное сравнение для предотвращения лишних ре-рендеров
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.triggerType === nextProps.data.triggerType &&
    prevProps.data.command === nextProps.data.command &&
    prevProps.data.description === nextProps.data.description &&
    prevProps.data.webhookUrl === nextProps.data.webhookUrl
  );
});

EntryPointNode.displayName = 'EntryPointNode';

export default EntryPointNode;