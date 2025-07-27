import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import styles from './CustomNodes.module.css';

interface MediaActionNodeData {
  label: string;
  mediaType?: string;
  icon?: string;
  color?: string;
  url?: string;
  caption?: string;
  fileName?: string;
}

const MediaActionNode: React.FC<NodeProps<MediaActionNodeData>> = ({ data, selected }) => {
  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'photo': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'document': return '📄';
      case 'sticker': return '😀';
      default: return data.icon || '📎';
    }
  };

  return (
    <div className={`${styles.customNode} ${styles.actionNode} ${styles.mediaActionNode} ${selected ? styles.selected : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#10b981' }}
      />

      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#10b981' }}>
        <span className={styles.nodeIcon}>{getMediaIcon(data.mediaType)}</span>
        <span className={styles.nodeTitle}>Медиа</span>
      </div>

      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label}</div>
        {data.mediaType && (
          <div className={styles.nodeSubtext}>Тип: {data.mediaType}</div>
        )}
        {data.fileName && (
          <div className={styles.nodeSubtext}>Файл: {data.fileName}</div>
        )}
        {data.caption && (
          <div className={styles.nodeDescription}>{data.caption}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        style={{ backgroundColor: data.color || '#10b981' }}
      />
    </div>
  );
};

export default MediaActionNode;