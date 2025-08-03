import React, { useState, useCallback } from 'react';
import { PortIndicatorProps, PORT_COLORS, PortStatus } from './types';
import { useCanvasLogger } from '../CanvasLogger/useCanvasLogger';
import styles from './ConnectionPorts.module.css';

const PortIndicator: React.FC<PortIndicatorProps> = ({ 
  port, 
  onHover, 
  onClick, 
  className 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { log } = useCanvasLogger();

  const getPortStatus = useCallback((): PortStatus => {
    if (!port.isAvailable) return 'unavailable';
    if (port.isConnected) return 'connected';
    if (port.dataType === 'error') return 'error';
    return 'available';
  }, [port.isAvailable, port.isConnected, port.dataType]);

  const getPortColor = useCallback(() => {
    const status = getPortStatus();
    return PORT_COLORS[status];
  }, [getPortStatus]);

  const getPortIcon = useCallback(() => {
    switch (port.dataType) {
      case 'control': return '⚡';
      case 'data': return '📊';
      case 'event': return '🔔';
      case 'error': return '⚠️';
      default: return '●';
    }
  }, [port.dataType]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
    
    log('PORT_HOVER', 
      `Port ${port.id} (${port.type}) hovered`, 
      { nodeId: port.id }
    );
  }, [onHover, log, port.id, port.type]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  const handleClick = useCallback(() => {
    if (port.isAvailable) {
      onClick?.();
      log('PORT_CLICK', 
        `Port ${port.id} (${port.type}) clicked`, 
        { nodeId: port.id }
      );
    }
  }, [onClick, log, port.id, port.type, port.isAvailable]);

  const portClass = `
    ${styles.portIndicator} 
    ${styles[port.type]} 
    ${styles[port.position]} 
    ${styles[getPortStatus()]}
    ${isHovered ? styles.hovered : ''}
    ${className || ''}
  `.trim();

  return (
    <div
      className={portClass}
      style={{ 
        backgroundColor: getPortColor(),
        borderColor: isHovered ? '#ffffff' : 'transparent'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={port.tooltip || `${port.label} (${port.dataType})`}
      data-port-id={port.id}
      data-port-type={port.type}
    >
      <span className={styles.portIcon}>
        {getPortIcon()}
      </span>
      
      {isHovered && (
        <div className={styles.portLabel}>
          {port.label}
        </div>
      )}
      
      {port.isConnected && (
        <div className={styles.connectionIndicator} />
      )}
    </div>
  );
};

export default PortIndicator;