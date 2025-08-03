import React, { useState, useCallback, useMemo } from 'react';
import { useCanvasLogger } from '../CanvasLogger';
import styles from './ColorZones.module.css';

export interface ColorZone {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  nodes: string[]; // IDs узлов в этой зоне
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ColorZonesProps {
  zones: ColorZone[];
  selectedNodes: string[];
  onZoneCreate: (zone: Omit<ColorZone, 'id'>) => void;
  onZoneUpdate: (zoneId: string, updates: Partial<ColorZone>) => void;
  onZoneDelete: (zoneId: string) => void;
  onNodesGroup: (nodeIds: string[], zoneId: string) => void;
  onNodesUngroup: (nodeIds: string[]) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
}

const COLOR_PALETTE = [
  { name: 'Синий', color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  { name: 'Зеленый', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  { name: 'Красный', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  { name: 'Желтый', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' },
  { name: 'Фиолетовый', color: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: '#8b5cf6' },
  { name: 'Розовый', color: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: '#ec4899' },
  { name: 'Индиго', color: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: '#6366f1' },
  { name: 'Серый', color: '#6b7280', backgroundColor: 'rgba(107, 114, 128, 0.1)', borderColor: '#6b7280' }
];

const ColorZones: React.FC<ColorZonesProps> = ({
  zones,
  selectedNodes,
  onZoneCreate,
  onZoneUpdate,
  onZoneDelete,
  onNodesGroup: _onNodesGroup,
  onNodesUngroup,
  canvasRef: _canvasRef
}) => {
  const [isCreatingZone, setIsCreatingZone] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [zoneName, setZoneName] = useState('');
  const [showColorPalette, setShowColorPalette] = useState<string | false>(false);
  const { log } = useCanvasLogger();

  // Проверяем, можно ли создать группу
  const canCreateGroup = useMemo(() => {
    return selectedNodes.length >= 2;
  }, [selectedNodes]);

  // Проверяем, можно ли разгруппировать
  const canUngroup = useMemo(() => {
    return selectedNodes.some(nodeId => 
      zones.some(zone => zone.nodes.includes(nodeId))
    );
  }, [selectedNodes, zones]);

  const handleCreateZone = useCallback(() => {
    if (!canCreateGroup || !zoneName.trim()) return;

    // Вычисляем границы выделенных узлов для создания зоны
    // В реальной реализации здесь будет логика получения позиций узлов
    const newZone: Omit<ColorZone, 'id'> = {
      name: zoneName.trim(),
      color: selectedColor.color,
      backgroundColor: selectedColor.backgroundColor,
      borderColor: selectedColor.borderColor,
      nodes: [...selectedNodes],
      position: {
        x: 100, // Временные значения
        y: 100,
        width: 300,
        height: 200
      }
    };

    onZoneCreate(newZone);
    
    // Логируем создание группы
    log('GROUP_CREATE', `Created group "${zoneName}" with ${selectedNodes.length} nodes`, {
      metadata: { 
        groupName: zoneName, 
        nodeCount: selectedNodes.length,
        color: selectedColor.name
      }
    });

    // Сбрасываем состояние
    setIsCreatingZone(false);
    setZoneName('');
    setSelectedColor(COLOR_PALETTE[0]);
  }, [canCreateGroup, zoneName, selectedColor, selectedNodes, onZoneCreate, log]);

  const handleUngroup = useCallback(() => {
    if (!canUngroup) return;

    // Находим узлы, которые нужно разгруппировать
    const nodesToUngroup = selectedNodes.filter(nodeId => 
      zones.some(zone => zone.nodes.includes(nodeId))
    );

    onNodesUngroup(nodesToUngroup);

    // Логируем разгруппировку
    log('GROUP_DELETE', `Ungrouped ${nodesToUngroup.length} nodes`, {
      metadata: { nodeCount: nodesToUngroup.length }
    });
  }, [canUngroup, selectedNodes, zones, onNodesUngroup, log]);

  const handleColorChange = useCallback((color: typeof COLOR_PALETTE[0]) => {
    setSelectedColor(color);
    setShowColorPalette(false);
  }, []);

  const handleZoneColorChange = useCallback((zoneId: string, color: typeof COLOR_PALETTE[0]) => {
    onZoneUpdate(zoneId, {
      color: color.color,
      backgroundColor: color.backgroundColor,
      borderColor: color.borderColor
    });

    log('GROUP_UPDATE', `Changed group color to ${color.name}`, {
      metadata: { zoneId, color: color.name }
    });
  }, [onZoneUpdate, log]);

  const handleZoneDelete = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      onZoneDelete(zoneId);
      log('GROUP_DELETE', `Deleted group "${zone.name}"`, {
        metadata: { zoneId, groupName: zone.name }
      });
    }
  }, [zones, onZoneDelete, log]);

  return (
    <div className={styles.colorZones}>
      {/* Панель управления группировкой */}
      <div className={styles.controlPanel}>
        <div className={styles.groupActions}>
          {/* Кнопка создания группы */}
          <button
            className={`${styles.actionButton} ${canCreateGroup ? styles.enabled : styles.disabled}`}
            onClick={() => setIsCreatingZone(true)}
            disabled={!canCreateGroup}
            title={canCreateGroup ? 'Создать группу из выделенных узлов' : 'Выберите 2 или более узлов для группировки'}
          >
            <span className={styles.buttonIcon}>🎨</span>
            <span className={styles.buttonText}>Группировать ({selectedNodes.length})</span>
          </button>

          {/* Кнопка разгруппировки */}
          <button
            className={`${styles.actionButton} ${canUngroup ? styles.enabled : styles.disabled}`}
            onClick={handleUngroup}
            disabled={!canUngroup}
            title={canUngroup ? 'Разгруппировать выделенные узлы' : 'Выберите узлы в группах для разгруппировки'}
          >
            <span className={styles.buttonIcon}>🔓</span>
            <span className={styles.buttonText}>Разгруппировать</span>
          </button>
        </div>

        {/* Список существующих групп */}
        {zones.length > 0 && (
          <div className={styles.groupsList}>
            <h4 className={styles.groupsTitle}>Группы ({zones.length})</h4>
            {zones.map(zone => (
              <div key={zone.id} className={styles.groupItem}>
                <div 
                  className={styles.groupColor}
                  style={{ backgroundColor: zone.color }}
                />
                <span className={styles.groupName}>{zone.name}</span>
                <span className={styles.groupNodeCount}>({zone.nodes.length})</span>
                
                {/* Кнопки управления группой */}
                <div className={styles.groupControls}>
                  <button
                    className={styles.controlButton}
                    onClick={() => setShowColorPalette(zone.id)}
                    title="Изменить цвет группы"
                  >
                    🎨
                  </button>
                  <button
                    className={styles.controlButton}
                    onClick={() => handleZoneDelete(zone.id)}
                    title="Удалить группу"
                  >
                    🗑️
                  </button>
                </div>

                {/* Палитра цветов для группы */}
                {showColorPalette === zone.id && (
                  <div className={styles.colorPalette}>
                    {COLOR_PALETTE.map(color => (
                      <button
                        key={color.name}
                        className={styles.colorOption}
                        style={{ backgroundColor: color.color }}
                        onClick={() => {
                          handleZoneColorChange(zone.id, color);
                          setShowColorPalette(false);
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания группы */}
      {isCreatingZone && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Создать группу</h3>
            
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Название группы:</label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Введите название группы"
                className={styles.textInput}
                autoFocus
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Цвет группы:</label>
              <div className={styles.colorSelector}>
                <button
                  className={styles.selectedColor}
                  style={{ backgroundColor: selectedColor.color }}
                  onClick={() => setShowColorPalette(showColorPalette ? false : 'modal')}
                >
                  {selectedColor.name}
                </button>
                
                {showColorPalette === 'modal' && (
                  <div className={styles.colorPalette}>
                    {COLOR_PALETTE.map(color => (
                      <button
                        key={color.name}
                        className={`${styles.colorOption} ${selectedColor.name === color.name ? styles.selected : ''}`}
                        style={{ backgroundColor: color.color }}
                        onClick={() => handleColorChange(color)}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsCreatingZone(false);
                  setZoneName('');
                  setShowColorPalette(false);
                }}
              >
                Отмена
              </button>
              <button
                className={`${styles.createButton} ${zoneName.trim() ? styles.enabled : styles.disabled}`}
                onClick={handleCreateZone}
                disabled={!zoneName.trim()}
              >
                Создать группу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorZones;