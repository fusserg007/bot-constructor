import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { useCanvasLogger } from '../CanvasLogger';
import styles from './BidirectionalEdge.module.css';

export interface BidirectionalEdgeData {
  label?: string;
  bidirectional?: boolean;
  sourceLabel?: string;
  targetLabel?: string;
  animated?: boolean;
  style?: React.CSSProperties;
}

const BidirectionalEdge: React.FC<EdgeProps<BidirectionalEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style = {},
  selected
}) => {
  const { log } = useCanvasLogger();
  const isBidirectional = data?.bidirectional ?? false;

  // Вычисляем путь для стрелки
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Обработчик клика по стрелке
  const handleEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    log('EDGE_CLICK', `Clicked ${isBidirectional ? 'bidirectional' : 'unidirectional'} edge ${id}`, {
      metadata: { 
        edgeId: id, 
        bidirectional: isBidirectional,
        hasLabel: !!data?.label 
      }
    });
  };

  // Стили для стрелки
  const edgeStyle = {
    ...style,
    strokeWidth: selected ? 3 : 2,
    stroke: selected ? '#3b82f6' : (isBidirectional ? '#10b981' : '#6b7280'),
    ...(data?.animated && { 
      strokeDasharray: '5,5',
      animation: 'dash 1s linear infinite'
    })
  };

  // Создаем маркеры для двунаправленной стрелки
  const sourceMarkerId = `bidirectional-start-${id}`;
  const targetMarkerId = `bidirectional-end-${id}`;

  return (
    <>
      {/* Определяем маркеры для стрелок */}
      <defs>
        {isBidirectional && (
          <>
            <marker
              id={sourceMarkerId}
              markerWidth="12"
              markerHeight="12"
              refX="0"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,0 0,6 9,3"
                fill={selected ? '#3b82f6' : '#10b981'}
                className={styles.arrowHead}
              />
            </marker>
            <marker
              id={targetMarkerId}
              markerWidth="12"
              markerHeight="12"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0,3 9,0 9,6"
                fill={selected ? '#3b82f6' : '#10b981'}
                className={styles.arrowHead}
              />
            </marker>
          </>
        )}
      </defs>

      {/* Основная линия стрелки */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerStart={isBidirectional ? `url(#${sourceMarkerId})` : undefined}
        markerEnd={isBidirectional ? `url(#${targetMarkerId})` : markerEnd}
        onClick={handleEdgeClick}
        className={`${styles.bidirectionalEdge} ${
          isBidirectional ? styles.bidirectional : styles.unidirectional
        } ${selected ? styles.selected : ''}`}
      />

      {/* Подписи на стрелке */}
      {(data?.label || data?.sourceLabel || data?.targetLabel) && (
        <EdgeLabelRenderer>
          {/* Центральная подпись */}
          {data?.label && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={styles.edgeLabel}
              onClick={handleEdgeClick}
            >
              <div className={`${styles.labelContent} ${styles.centerLabel}`}>
                {data.label}
              </div>
            </div>
          )}

          {/* Подпись у источника (для двунаправленных) */}
          {isBidirectional && data?.sourceLabel && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${sourceX + (labelX - sourceX) * 0.25}px,${sourceY + (labelY - sourceY) * 0.25}px)`,
                pointerEvents: 'all',
              }}
              className={styles.edgeLabel}
            >
              <div className={`${styles.labelContent} ${styles.sourceLabel}`}>
                {data.sourceLabel}
              </div>
            </div>
          )}

          {/* Подпись у цели (для двунаправленных) */}
          {isBidirectional && data?.targetLabel && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${targetX + (labelX - targetX) * 0.25}px,${targetY + (labelY - targetY) * 0.25}px)`,
                pointerEvents: 'all',
              }}
              className={styles.edgeLabel}
            >
              <div className={`${styles.labelContent} ${styles.targetLabel}`}>
                {data.targetLabel}
              </div>
            </div>
          )}
        </EdgeLabelRenderer>
      )}

      {/* Индикатор двунаправленности */}
      {isBidirectional && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 20}px)`,
              pointerEvents: 'none',
            }}
            className={styles.bidirectionalIndicator}
          >
            ↔
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default BidirectionalEdge;