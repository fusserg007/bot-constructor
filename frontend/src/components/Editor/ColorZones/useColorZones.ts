import { useState, useCallback, useMemo } from 'react';
import { ColorZone } from './ColorZones';

export interface UseColorZonesProps {
  initialZones?: ColorZone[];
  onZonesChange?: (zones: ColorZone[]) => void;
}

export const useColorZones = ({ 
  initialZones = [], 
  onZonesChange 
}: UseColorZonesProps = {}) => {
  const [zones, setZones] = useState<ColorZone[]>(initialZones);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Создание новой зоны
  const createZone = useCallback((zoneData: Omit<ColorZone, 'id'>) => {
    const newZone: ColorZone = {
      ...zoneData,
      id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const updatedZones = [...zones, newZone];
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
    
    return newZone.id;
  }, [zones, onZonesChange]);

  // Обновление зоны
  const updateZone = useCallback((zoneId: string, updates: Partial<ColorZone>) => {
    const updatedZones = zones.map(zone => 
      zone.id === zoneId ? { ...zone, ...updates } : zone
    );
    
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
  }, [zones, onZonesChange]);

  // Удаление зоны
  const deleteZone = useCallback((zoneId: string) => {
    const updatedZones = zones.filter(zone => zone.id !== zoneId);
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
    
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
  }, [zones, selectedZoneId, onZonesChange]);

  // Добавление узлов в зону
  const addNodesToZone = useCallback((nodeIds: string[], zoneId: string) => {
    const updatedZones = zones.map(zone => {
      if (zone.id === zoneId) {
        // Убираем дубликаты
        const uniqueNodes = Array.from(new Set([...zone.nodes, ...nodeIds]));
        return { ...zone, nodes: uniqueNodes };
      }
      // Убираем узлы из других зон
      return { ...zone, nodes: zone.nodes.filter(nodeId => !nodeIds.includes(nodeId)) };
    });
    
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
  }, [zones, onZonesChange]);

  // Удаление узлов из всех зон
  const removeNodesFromZones = useCallback((nodeIds: string[]) => {
    const updatedZones = zones.map(zone => ({
      ...zone,
      nodes: zone.nodes.filter(nodeId => !nodeIds.includes(nodeId))
    }));
    
    setZones(updatedZones);
    onZonesChange?.(updatedZones);
  }, [zones, onZonesChange]);

  // Получение зоны по ID узла
  const getZoneByNodeId = useCallback((nodeId: string): ColorZone | null => {
    return zones.find(zone => zone.nodes.includes(nodeId)) || null;
  }, [zones]);

  // Получение всех узлов в зонах
  const getNodesInZones = useMemo(() => {
    return zones.reduce((acc, zone) => {
      zone.nodes.forEach(nodeId => {
        acc[nodeId] = zone.id;
      });
      return acc;
    }, {} as Record<string, string>);
  }, [zones]);

  // Проверка, находится ли узел в зоне
  const isNodeInZone = useCallback((nodeId: string): boolean => {
    return zones.some(zone => zone.nodes.includes(nodeId));
  }, [zones]);

  // Получение статистики зон
  const getZoneStats = useMemo(() => {
    return {
      totalZones: zones.length,
      totalNodesInZones: zones.reduce((sum, zone) => sum + zone.nodes.length, 0),
      emptyZones: zones.filter(zone => zone.nodes.length === 0).length,
      averageNodesPerZone: zones.length > 0 
        ? Math.round(zones.reduce((sum, zone) => sum + zone.nodes.length, 0) / zones.length)
        : 0
    };
  }, [zones]);

  // Очистка пустых зон
  const cleanupEmptyZones = useCallback(() => {
    const nonEmptyZones = zones.filter(zone => zone.nodes.length > 0);
    if (nonEmptyZones.length !== zones.length) {
      setZones(nonEmptyZones);
      onZonesChange?.(nonEmptyZones);
    }
  }, [zones, onZonesChange]);

  // Автоматическое вычисление границ зоны на основе позиций узлов
  const calculateZoneBounds = useCallback((nodePositions: Record<string, { x: number; y: number; width: number; height: number }>) => {
    return zones.map(zone => {
      if (zone.nodes.length === 0) return zone;

      const nodeRects = zone.nodes
        .map(nodeId => nodePositions[nodeId])
        .filter(Boolean);

      if (nodeRects.length === 0) return zone;

      const minX = Math.min(...nodeRects.map(rect => rect.x)) - 20;
      const minY = Math.min(...nodeRects.map(rect => rect.y)) - 40; // Место для заголовка
      const maxX = Math.max(...nodeRects.map(rect => rect.x + rect.width)) + 20;
      const maxY = Math.max(...nodeRects.map(rect => rect.y + rect.height)) + 20;

      return {
        ...zone,
        position: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        }
      };
    });
  }, [zones]);

  return {
    // Состояние
    zones,
    selectedZoneId,
    
    // Действия
    createZone,
    updateZone,
    deleteZone,
    addNodesToZone,
    removeNodesFromZones,
    setSelectedZoneId,
    
    // Утилиты
    getZoneByNodeId,
    getNodesInZones,
    isNodeInZone,
    getZoneStats,
    cleanupEmptyZones,
    calculateZoneBounds,
    
    // Сеттеры для внешнего управления
    setZones
  };
};