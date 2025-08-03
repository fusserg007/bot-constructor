import React, { useMemo, useCallback } from 'react';
import PortIndicator from './PortIndicator';
import { ConnectionPortsProps, ConnectionPortData } from './types';
import { useCanvasLogger } from '../CanvasLogger/useCanvasLogger';
import styles from './ConnectionPorts.module.css';

const ConnectionPorts: React.FC<ConnectionPortsProps> = ({
  nodeId,
  ports,
  onPortHover,
  onPortClick,
  className
}) => {
  const { log } = useCanvasLogger();

  // Группируем порты по позициям
  const portsByPosition = useMemo(() => {
    return ports.reduce((acc, port) => {
      if (!acc[port.position]) {
        acc[port.position] = [];
      }
      acc[port.position].push(port);
      return acc;
    }, {} as Record<string, ConnectionPortData[]>);
  }, [ports]);

  const handlePortHover = useCallback((portId: string, isHovering: boolean) => {
    onPortHover?.(portId, isHovering);
    
    if (isHovering) {
      log('PORTS_HOVER_START', 
        `Started hovering port ${portId} on node ${nodeId}`, 
        { nodeId }
      );
    }
  }, [onPortHover, log, nodeId]);

  const handlePortClick = useCallback((portId: string) => {
    const port = ports.find(p => p.id === portId);
    if (port && port.isAvailable) {
      onPortClick?.(portId);
      log('PORT_CONNECTION_ATTEMPT', 
        `Attempting connection to port ${portId} (${port.type}) on node ${nodeId}`, 
        { nodeId }
      );
    }
  }, [onPortClick, log, nodeId, ports]);

  const renderPortsGroup = useCallback((position: string, positionPorts: ConnectionPortData[]) => {
    if (positionPorts.length === 0) return null;

    // Если один порт, рендерим его напрямую
    if (positionPorts.length === 1) {
      const port = positionPorts[0];
      return (
        <PortIndicator
          key={port.id}
          port={port}
          onHover={(isHovering) => handlePortHover(port.id, isHovering)}
          onClick={() => handlePortClick(port.id)}
        />
      );
    }

    // Если несколько портов, группируем их
    const isHorizontal = position === 'top' || position === 'bottom';
    const groupClass = `
      ${styles.portsGroup} 
      ${styles[position]} 
      ${isHorizontal ? styles.horizontal : styles.vertical}
    `.trim();

    return (
      <div key={position} className={groupClass}>
        {positionPorts.map((port) => (
          <PortIndicator
            key={port.id}
            port={{
              ...port,
              position: position as any // Переопределяем позицию для группы
            }}
            onHover={(isHovering) => handlePortHover(port.id, isHovering)}
            onClick={() => handlePortClick(port.id)}
            className={styles.groupedPort}
          />
        ))}
      </div>
    );
  }, [handlePortHover, handlePortClick]);

  const containerClass = `${styles.connectionPorts} ${className || ''}`.trim();

  return (
    <div className={containerClass} data-node-id={nodeId}>
      {Object.entries(portsByPosition).map(([position, positionPorts]) =>
        renderPortsGroup(position, positionPorts)
      )}
    </div>
  );
};

export default ConnectionPorts;