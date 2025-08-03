export interface ConnectionPortData {
  id: string;
  type: 'input' | 'output';
  dataType: 'control' | 'data' | 'event' | 'error';
  label: string;
  isConnected: boolean;
  isAvailable: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  tooltip?: string;
}

export interface ConnectionPortsProps {
  nodeId: string;
  ports: ConnectionPortData[];
  onPortHover?: (portId: string, isHovering: boolean) => void;
  onPortClick?: (portId: string) => void;
  className?: string;
}

export interface PortIndicatorProps {
  port: ConnectionPortData;
  onHover?: (isHovering: boolean) => void;
  onClick?: () => void;
  className?: string;
}

export type PortStatus = 'available' | 'connected' | 'unavailable' | 'error';

export interface PortColors {
  available: string;
  connected: string;
  unavailable: string;
  error: string;
}

export const PORT_COLORS: PortColors = {
  available: '#3b82f6',    // Синий - доступен
  connected: '#22c55e',    // Зеленый - подключен
  unavailable: '#ef4444',  // Красный - недоступен
  error: '#f59e0b'         // Желтый - ошибка
};