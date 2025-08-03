import React, { useCallback } from 'react';
import { ColorZone } from './ColorZones';
import styles from './ZoneRenderer.module.css';

interface ZoneRendererProps {
  zones: ColorZone[];
  onZoneSelect?: (zoneId: string) => void;
  onZoneResize?: (zoneId: string, newPosition: ColorZone['position']) => void;
  selectedZoneId?: string;
}

const ZoneRenderer: React.FC<ZoneRendererProps> = ({
  zones,
  onZoneSelect,
  onZoneResize: _onZoneResize,
  selectedZoneId
}) => {
  const handleZoneClick = useCallback((zoneId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onZoneSelect?.(zoneId);
  }, [onZoneSelect]);

  const handleResizeStart = useCallback((_zoneId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Здесь будет логика изменения размера зоны
    // В полной реализации добавим drag handlers
  }, []);

  return (
    <div className={styles.zoneRenderer}>
      {zones.map(zone => (
        <div
          key={zone.id}
          className={`${styles.zone} ${selectedZoneId === zone.id ? styles.selected : ''}`}
          style={{
            left: zone.position.x,
            top: zone.position.y,
            width: zone.position.width,
            height: zone.position.height,
            backgroundColor: zone.backgroundColor,
            borderColor: zone.borderColor
          }}
          onClick={(e) => handleZoneClick(zone.id, e)}
        >
          {/* Заголовок зоны */}
          <div 
            className={styles.zoneHeader}
            style={{ backgroundColor: zone.color }}
          >
            <span className={styles.zoneName}>{zone.name}</span>
            <span className={styles.zoneNodeCount}>({zone.nodes.length})</span>
          </div>

          {/* Область содержимого зоны */}
          <div className={styles.zoneContent}>
            {/* Здесь будут отображаться узлы группы */}
          </div>

          {/* Ручки для изменения размера */}
          {selectedZoneId === zone.id && (
            <>
              <div 
                className={`${styles.resizeHandle} ${styles.topLeft}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.topRight}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.bottomLeft}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.bottomRight}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.top}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.bottom}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.left}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
              <div 
                className={`${styles.resizeHandle} ${styles.right}`}
                onMouseDown={(e) => handleResizeStart(zone.id, e)}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default ZoneRenderer;