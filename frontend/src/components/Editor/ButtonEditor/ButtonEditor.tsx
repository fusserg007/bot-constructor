import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import styles from './ButtonEditor.module.css';

interface MenuButton {
  id: string;
  text: string;
  type: 'callback' | 'url' | 'contact' | 'location';
  value: string;
  row: number;
  column: number;
}

interface ButtonEditorProps {
  buttons: MenuButton[];
  keyboardType: 'inline' | 'reply';
  buttonsPerRow: number;
  onButtonsChange: (buttons: MenuButton[]) => void;
  onKeyboardTypeChange: (type: 'inline' | 'reply') => void;
  onButtonsPerRowChange: (count: number) => void;
  onClose: () => void;
}

const ButtonEditor: React.FC<ButtonEditorProps> = ({
  buttons,
  keyboardType,
  buttonsPerRow,
  onButtonsChange,
  onKeyboardTypeChange,
  onButtonsPerRowChange,
  onClose
}) => {
  const [editingButton, setEditingButton] = useState<MenuButton | null>(null);
  const [newButtonText, setNewButtonText] = useState('');

  const addButton = useCallback(() => {
    if (!newButtonText.trim()) return;

    const newButton: MenuButton = {
      id: `btn_${Date.now()}`,
      text: newButtonText.trim(),
      type: 'callback',
      value: newButtonText.toLowerCase().replace(/\s+/g, '_'),
      row: Math.floor(buttons.length / buttonsPerRow),
      column: buttons.length % buttonsPerRow
    };

    onButtonsChange([...buttons, newButton]);
    setNewButtonText('');
  }, [newButtonText, buttons, buttonsPerRow, onButtonsChange]);

  const removeButton = useCallback((buttonId: string) => {
    const updatedButtons = buttons.filter(btn => btn.id !== buttonId);
    // Пересчитываем позиции
    const reindexedButtons = updatedButtons.map((btn, index) => ({
      ...btn,
      row: Math.floor(index / buttonsPerRow),
      column: index % buttonsPerRow
    }));
    onButtonsChange(reindexedButtons);
  }, [buttons, buttonsPerRow, onButtonsChange]);

  const updateButton = useCallback((buttonId: string, updates: Partial<MenuButton>) => {
    const updatedButtons = buttons.map(btn => 
      btn.id === buttonId ? { ...btn, ...updates } : btn
    );
    onButtonsChange(updatedButtons);
    setEditingButton(null);
  }, [buttons, onButtonsChange]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(buttons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Пересчитываем позиции после перестановки
    const reindexedButtons = items.map((btn, index) => ({
      ...btn,
      row: Math.floor(index / buttonsPerRow),
      column: index % buttonsPerRow
    }));

    onButtonsChange(reindexedButtons);
  }, [buttons, buttonsPerRow, onButtonsChange]);

  const renderKeyboardPreview = () => {
    const buttonRows: MenuButton[][] = [];
    buttons.forEach(button => {
      if (!buttonRows[button.row]) {
        buttonRows[button.row] = [];
      }
      buttonRows[button.row][button.column] = button;
    });

    return (
      <div className={styles.keyboardPreview}>
        <div className={styles.previewHeader}>
          Превью клавиатуры ({keyboardType})
        </div>
        <div className={`${styles.keyboard} ${styles[keyboardType]}`}>
          {buttonRows.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.keyboardRow}>
              {row.filter(Boolean).map((button) => (
                <button
                  key={button.id}
                  className={styles.keyboardButton}
                  onClick={() => setEditingButton(button)}
                >
                  {button.text}
                  {button.type === 'url' && ' 🔗'}
                  {button.type === 'contact' && ' 📞'}
                  {button.type === 'location' && ' 📍'}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.buttonEditor}>
      <div className={styles.editorHeader}>
        <h3>Редактор кнопок</h3>
        <button onClick={onClose} className={styles.closeButton}>✕</button>
      </div>

      <div className={styles.editorContent}>
        {/* Настройки клавиатуры */}
        <div className={styles.keyboardSettings}>
          <div className={styles.settingGroup}>
            <label>Тип клавиатуры:</label>
            <select 
              value={keyboardType} 
              onChange={(e) => onKeyboardTypeChange(e.target.value as 'inline' | 'reply')}
            >
              <option value="inline">Inline (под сообщением)</option>
              <option value="reply">Reply (вместо клавиатуры)</option>
            </select>
          </div>

          <div className={styles.settingGroup}>
            <label>Кнопок в ряду:</label>
            <input
              type="number"
              min="1"
              max="4"
              value={buttonsPerRow}
              onChange={(e) => onButtonsPerRowChange(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Превью клавиатуры */}
        {renderKeyboardPreview()}

        {/* Список кнопок с drag & drop */}
        <div className={styles.buttonsList}>
          <h4>Кнопки ({buttons.length})</h4>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="buttons">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {buttons.map((button, index) => (
                    <Draggable key={button.id} draggableId={button.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={styles.buttonItem}
                        >
                          <div className={styles.buttonInfo}>
                            <span className={styles.buttonText}>{button.text}</span>
                            <span className={styles.buttonType}>({button.type})</span>
                          </div>
                          <div className={styles.buttonActions}>
                            <button 
                              onClick={() => setEditingButton(button)}
                              className={styles.editButton}
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => removeButton(button.id)}
                              className={styles.deleteButton}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Добавление новой кнопки */}
          <div className={styles.addButton}>
            <input
              type="text"
              placeholder="Текст новой кнопки"
              value={newButtonText}
              onChange={(e) => setNewButtonText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addButton()}
            />
            <button onClick={addButton} disabled={!newButtonText.trim()}>
              Добавить
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования кнопки */}
      {editingButton && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h4>Редактировать кнопку</h4>
            
            <div className={styles.formGroup}>
              <label>Текст кнопки:</label>
              <input
                type="text"
                value={editingButton.text}
                onChange={(e) => setEditingButton({...editingButton, text: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Тип кнопки:</label>
              <select
                value={editingButton.type}
                onChange={(e) => setEditingButton({...editingButton, type: e.target.value as any})}
              >
                <option value="callback">Callback (обычная кнопка)</option>
                <option value="url">URL (ссылка)</option>
                <option value="contact">Контакт</option>
                <option value="location">Геолокация</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
                {editingButton.type === 'callback' ? 'Callback Data:' : 
                 editingButton.type === 'url' ? 'URL:' : 'Значение:'}
              </label>
              <input
                type="text"
                value={editingButton.value}
                onChange={(e) => setEditingButton({...editingButton, value: e.target.value})}
                placeholder={
                  editingButton.type === 'callback' ? 'callback_data' :
                  editingButton.type === 'url' ? 'https://example.com' : 'значение'
                }
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={() => updateButton(editingButton.id, editingButton)}
                className={styles.saveButton}
              >
                Сохранить
              </button>
              <button 
                onClick={() => setEditingButton(null)}
                className={styles.cancelButton}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ButtonEditor;