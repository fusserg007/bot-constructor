import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './SelectionBox.module.css';

interface SelectionBoxProps {
  onSelectionChange: (selectedNodeIds: string[]) => void;
  getNodesInArea: (area: { x: number; y: number; width: number; height: number }) => string[];
  canvasRef: React.RefObject<HTMLDivElement>;
  isEnabled?: boolean;
}

interface SelectionArea {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const SelectionBox: React.FC<SelectionBoxProps> = ({
  onSelectionChange,
  getNodesInArea,
  canvasRef,
  isEnabled = true
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionArea, setSelectionArea] = useState<SelectionArea | null>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isEnabled || event.button !== 0) return; // Только левая кнопка мыши
    
    // Проверяем, что клик был по пустому месту канваса
    const target = event.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('[data-zone-id]')) {
      return; // Клик по узлу или зоне - не начинаем выделение
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;

    setSelectionArea({
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });
    setIsSelecting(true);

    event.preventDefault();
  }, [isEnabled, canvasRef]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isSelecting || !selectionArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    setSelectionArea(prev => prev ? {
      ...prev,
      currentX,
      currentY
    } : null);

    // Вычисляем область выделения
    const area = {
      x: Math.min(selectionArea.startX, currentX),
      y: Math.min(selectionArea.startY, currentY),
      width: Math.abs(currentX - selectionArea.startX),
      height: Math.abs(currentY - selectionArea.startY)
    };

    // Получаем узлы в области выделения
    const selectedNodes = getNodesInArea(area);
    onSelectionChange(selectedNodes);
  }, [isSelecting, selectionArea, canvasRef, getNodesInArea, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    setIsSelecting(false);
    setSelectionArea(null);
  }, [isSelecting]);

  // Подписываемся на события мыши на уровне документа
  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // Вычисляем стили для области выделения
  const selectionBoxStyle = selectionArea ? {
    left: Math.min(selectionArea.startX, selectionArea.currentX),
    top: Math.min(selectionArea.startY, selectionArea.currentY),
    width: Math.abs(selectionArea.currentX - selectionArea.startX),
    height: Math.abs(selectionArea.currentY - selectionArea.startY)
  } : {};

  return (
    <>
      {/* Обработчик событий мыши */}
      <div
        className={styles.selectionHandler}
        onMouseDown={handleMouseDown}
        style={{ 
          pointerEvents: isEnabled ? 'all' : 'none',
          cursor: isEnabled ? 'crosshair' : 'default'
        }}
      />

      {/* Область выделения */}
      {isSelecting && selectionArea && (
        <div
          ref={selectionRef}
          className={styles.selectionBox}
          style={selectionBoxStyle}
        />
      )}
    </>
  );
};

export default SelectionBox;