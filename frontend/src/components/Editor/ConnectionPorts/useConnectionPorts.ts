import { useState, useCallback, useMemo } from 'react';
import { ConnectionPortData } from './types';

interface UseConnectionPortsProps {
  nodeId: string;
  initialPorts: ConnectionPortData[];
  onPortStatusChange?: (portId: string, isConnected: boolean) => void;
}

export const useConnectionPorts = ({ 
  initialPorts, 
  onPortStatusChange 
}: UseConnectionPortsProps) => {
  const [ports, setPorts] = useState<ConnectionPortData[]>(initialPorts);
  const [hoveredPort, setHoveredPort] = useState<string | null>(null);
  const [connectingPort, setConnectingPort] = useState<string | null>(null);

  // Обновление статуса порта
  const updatePortStatus = useCallback((portId: string, updates: Partial<ConnectionPortData>) => {
    setPorts(prevPorts => 
      prevPorts.map(port => 
        port.id === portId ? { ...port, ...updates } : port
      )
    );

    // Уведомляем о изменении статуса подключения
    if ('isConnected' in updates) {
      onPortStatusChange?.(portId, updates.isConnected!);
    }
  }, [onPortStatusChange]);

  // Подключение порта
  const connectPort = useCallback((portId: string) => {
    updatePortStatus(portId, { isConnected: true, isAvailable: false });
  }, [updatePortStatus]);

  // Отключение порта
  const disconnectPort = useCallback((portId: string) => {
    updatePortStatus(portId, { isConnected: false, isAvailable: true });
  }, [updatePortStatus]);

  // Установка доступности порта
  const setPortAvailability = useCallback((portId: string, isAvailable: boolean) => {
    updatePortStatus(portId, { isAvailable });
  }, [updatePortStatus]);

  // Обработка наведения на порт
  const handlePortHover = useCallback((portId: string, isHovering: boolean) => {
    setHoveredPort(isHovering ? portId : null);
  }, []);

  // Обработка клика по порту
  const handlePortClick = useCallback((portId: string) => {
    const port = ports.find(p => p.id === portId);
    if (!port || !port.isAvailable) return;

    if (connectingPort) {
      // Если уже есть порт в процессе подключения, пытаемся создать связь
      if (connectingPort !== portId) {
        // Логика создания связи между портами
        console.log(`Connecting ${connectingPort} to ${portId}`);
        setConnectingPort(null);
      }
    } else {
      // Начинаем процесс подключения
      setConnectingPort(portId);
    }
  }, [ports, connectingPort]);

  // Отмена процесса подключения
  const cancelConnection = useCallback(() => {
    setConnectingPort(null);
  }, []);

  // Получение порта по ID
  const getPort = useCallback((portId: string) => {
    return ports.find(port => port.id === portId);
  }, [ports]);

  // Получение портов по типу
  const getPortsByType = useCallback((type: 'input' | 'output') => {
    return ports.filter(port => port.type === type);
  }, [ports]);

  // Получение доступных портов
  const getAvailablePorts = useCallback(() => {
    return ports.filter(port => port.isAvailable && !port.isConnected);
  }, [ports]);

  // Получение подключенных портов
  const getConnectedPorts = useCallback(() => {
    return ports.filter(port => port.isConnected);
  }, [ports]);

  // Статистика портов
  const portsStats = useMemo(() => {
    const total = ports.length;
    const connected = ports.filter(p => p.isConnected).length;
    const available = ports.filter(p => p.isAvailable && !p.isConnected).length;
    const unavailable = ports.filter(p => !p.isAvailable && !p.isConnected).length;

    return {
      total,
      connected,
      available,
      unavailable,
      connectionRate: total > 0 ? (connected / total) * 100 : 0
    };
  }, [ports]);

  return {
    ports,
    hoveredPort,
    connectingPort,
    portsStats,
    updatePortStatus,
    connectPort,
    disconnectPort,
    setPortAvailability,
    handlePortHover,
    handlePortClick,
    cancelConnection,
    getPort,
    getPortsByType,
    getAvailablePorts,
    getConnectedPorts
  };
};