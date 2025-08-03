import React, { useCallback, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import NodeExpander from './NodeExpander';
import { ConnectionPorts } from '../ConnectionPorts';
import { MultiNodeData } from './types';
import { useCanvasLogger } from '../CanvasLogger/useCanvasLogger';
import styles from './MultiNode.module.css';

const MultiNode: React.FC<NodeProps<MultiNodeData>> = React.memo(({ 
  data, 
  selected, 
  id 
}) => {
  const { log } = useCanvasLogger();

  // Создаем порты для мульти-узла
  const connectionPorts = useMemo(() => [
    {
      id: `${id}-input`,
      type: 'input' as const,
      dataType: 'control' as const,
      label: 'Вход',
      isConnected: false,
      isAvailable: true,
      position: 'left' as const,
      tooltip: 'Входящее подключение'
    },
    {
      id: `${id}-output`,
      type: 'output' as const,
      dataType: 'control' as const,
      label: 'Выход',
      isConnected: false,
      isAvailable: true,
      position: 'right' as const,
      tooltip: 'Исходящее подключение'
    }
  ], [id]);

  const handleToggleExpand = useCallback(() => {
    // const newData = { ...data, isExpanded: !data.isExpanded };
    
    // Логируем действие
    log(data.isExpanded ? 'NODE_COLLAPSE' : 'NODE_EXPAND', 
      `MultiNode ${data.label} ${data.isExpanded ? 'collapsed' : 'expanded'}`, 
      { nodeId: id }
    );
    
    // В реальном приложении здесь бы был вызов onDataChange
    // onDataChange?.(newData);
  }, [data, id, log]);

  const colorClass = useMemo(() => {
    if (data.color) {
      switch (data.color) {
        case '#3b82f6': return 'primary';
        case '#22c55e': return 'success';
        case '#f59e0b': return 'warning';
        case '#ef4444': return 'danger';
        default: return 'primary';
      }
    }
    return 'primary';
  }, [data.color]);

  const renderChildren = useCallback(() => {
    if (!data.children || data.children.length === 0) {
      return (
        <div className={styles.emptyState}>
          Нет компонентов
          <br />
          <small>Перетащите элементы сюда</small>
        </div>
      );
    }

    return (
      <div className={styles.childrenContainer}>
        {data.children.map((child) => (
          <div 
            key={child.id} 
            className={`${styles.childItem} ${styles[child.type]}`}
          >
            {child.type === 'button' && `🔘 ${child.config?.text || 'Кнопка'}`}
            {child.type === 'text' && `📝 ${child.config?.content || 'Текст'}`}
            {child.type === 'input' && `📥 ${child.config?.placeholder || 'Ввод'}`}
            {child.type === 'condition' && `❓ ${child.config?.condition || 'Условие'}`}
          </div>
        ))}
      </div>
    );
  }, [data.children]);

  const layoutClass = useMemo(() => {
    switch (data.buttonLayout) {
      case 'top': return styles.buttonLayoutTop;
      case 'bottom': return styles.buttonLayoutBottom;
      case 'side': return styles.buttonLayoutSide;
      default: return '';
    }
  }, [data.buttonLayout]);

  const handlePortHover = useCallback((portId: string, isHovering: boolean) => {
    log('PORT_HOVER', 
      `Port ${portId} ${isHovering ? 'hovered' : 'unhovered'} on MultiNode ${data.label}`, 
      { nodeId: id }
    );
  }, [log, data.label, id]);

  const handlePortClick = useCallback((portId: string) => {
    log('PORT_CLICK', 
      `Port ${portId} clicked on MultiNode ${data.label}`, 
      { nodeId: id }
    );
  }, [log, data.label, id]);

  return (
    <div className={`
      ${styles.multiNode} 
      ${styles[colorClass]} 
      ${layoutClass}
      ${data.isExpanded ? styles.expanded : ''} 
      ${selected ? styles.selected : ''}
    `}>
      <div className={styles.nodeHeader} style={{ backgroundColor: data.color || '#3b82f6' }}>
        <span className={styles.nodeIcon}>{data.icon || '📦'}</span>
        <span className={styles.nodeTitle}>{data.label || 'МУЛЬТИ-УЗЕЛ'}</span>
        <NodeExpander 
          isExpanded={data.isExpanded} 
          onToggle={handleToggleExpand}
        />
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.nodeLabel}>{data.label || 'Мульти-узел'}</div>
        <div className={styles.nodeSubtext}>
          {data.isExpanded 
            ? `${data.children?.length || 0} компонентов` 
            : 'Нажмите ▶ для расширения'
          }
        </div>
      </div>

      {data.isExpanded && (
        <div className={styles.expandedContent}>
          {renderChildren()}
        </div>
      )}

      {/* Connection Ports with Indicators */}
      <ConnectionPorts
        nodeId={id}
        ports={connectionPorts}
        onPortHover={handlePortHover}
        onPortClick={handlePortClick}
      />

      {/* Legacy ReactFlow Handles (hidden but required for compatibility) */}
      <Handle
        type="target"
        position={Position.Left}
        className={styles.hiddenHandle}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        className={styles.hiddenHandle}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированное сравнение для предотвращения лишних ре-рендеров
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.icon === nextProps.data.icon &&
    prevProps.data.color === nextProps.data.color &&
    prevProps.data.isExpanded === nextProps.data.isExpanded &&
    prevProps.data.children?.length === nextProps.data.children?.length &&
    prevProps.data.buttonLayout === nextProps.data.buttonLayout
  );
});

MultiNode.displayName = 'MultiNode';

export default MultiNode;