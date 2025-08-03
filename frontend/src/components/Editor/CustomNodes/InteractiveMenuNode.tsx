import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
// import { getNodeLocalization } from '../../../utils/localization';
import { useEditor } from '../context/EditorContext';
import ButtonEditor from '../ButtonEditor/ButtonEditor';
import styles from './CustomNodes.module.css';

interface MenuButton {
  id: string;
  text: string;
  type: 'callback' | 'url' | 'contact' | 'location';
  value: string;
  row: number;
  column: number;
}

interface InteractiveMenuData {
  title: string;
  message: string;
  parse_mode: 'HTML' | 'Markdown' | 'none';
  buttons: MenuButton[];
  keyboardType: 'inline' | 'reply';
  buttonsPerRow: number;
}

const InteractiveMenuNode: React.FC<NodeProps<InteractiveMenuData>> = React.memo(({ 
  id,
  data, 
  selected
}) => {
  const { onNodeUpdate } = useEditor();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditorOpen(true);
  }, []);

  const handleButtonsChange = useCallback((buttons: MenuButton[]) => {
    onNodeUpdate(id, { buttons });
  }, [id, onNodeUpdate]);

  const handleKeyboardTypeChange = useCallback((type: 'inline' | 'reply') => {
    onNodeUpdate(id, { keyboardType: type });
  }, [id, onNodeUpdate]);

  const handleButtonsPerRowChange = useCallback((count: number) => {
    onNodeUpdate(id, { buttonsPerRow: count });
  }, [id, onNodeUpdate]);

  const getButtonPreview = () => {
    if (!data.buttons || data.buttons.length === 0) {
      return <div className={styles.emptyButtons}>Нажмите для настройки кнопок</div>;
    }

    // Группируем кнопки по рядам
    const buttonRows: MenuButton[][] = [];
    data.buttons.forEach(button => {
      if (!buttonRows[button.row]) {
        buttonRows[button.row] = [];
      }
      buttonRows[button.row][button.column] = button;
    });

    return (
      <div className={styles.buttonPreview}>
        {buttonRows.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.buttonRow}>
            {row.filter(Boolean).map((button) => (
              <div key={button.id} className={styles.previewButton}>
                {button.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`${styles.customNode} ${styles.interactiveMenuNode} ${selected ? styles.selected : ''}`}
      onClick={handleNodeClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={styles.handle}
      />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>📋</div>
        <div className={styles.nodeTitle}>
          {data.title || 'Интерактивное меню'}
        </div>
      </div>
      
      <div className={styles.nodeContent}>
        <div className={styles.messagePreview}>
          {data.message || 'Настройте сообщение...'}
        </div>
        {getButtonPreview()}
      </div>

      {/* Динамические выходные порты для каждой кнопки */}
      {data.buttons && data.buttons.map((button, index) => (
        <Handle
          key={button.id}
          type="source"
          position={Position.Right}
          id={button.id}
          className={styles.handle}
          style={{ 
            top: `${60 + (index * 25)}px`,
            background: '#3b82f6'
          }}
        />
      ))}

      {/* Основной выходной порт */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={styles.handle}
        style={{ top: '50%' }}
      />

      {/* Редактор кнопок */}
      {isEditorOpen && (
        <ButtonEditor
          buttons={data.buttons || []}
          keyboardType={data.keyboardType || 'inline'}
          buttonsPerRow={data.buttonsPerRow || 2}
          onButtonsChange={handleButtonsChange}
          onKeyboardTypeChange={handleKeyboardTypeChange}
          onButtonsPerRowChange={handleButtonsPerRowChange}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированное сравнение для предотвращения лишних ре-рендеров
  const prevButtons = prevProps.data.buttons || [];
  const nextButtons = nextProps.data.buttons || [];
  
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.title === nextProps.data.title &&
    prevProps.data.message === nextProps.data.message &&
    prevProps.data.parse_mode === nextProps.data.parse_mode &&
    prevProps.data.keyboardType === nextProps.data.keyboardType &&
    prevProps.data.buttonsPerRow === nextProps.data.buttonsPerRow &&
    prevButtons.length === nextButtons.length &&
    prevButtons.every((button, index) => {
      const nextButton = nextButtons[index];
      return nextButton && 
        button.id === nextButton.id &&
        button.text === nextButton.text &&
        button.type === nextButton.type &&
        button.value === nextButton.value &&
        button.row === nextButton.row &&
        button.column === nextButton.column;
    })
  );
});

InteractiveMenuNode.displayName = 'InteractiveMenuNode';

export default InteractiveMenuNode;