import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../Editor.module.css';

interface EditorHeaderProps {
  botId?: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage?: string;
  onSave: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  botId,
  saveStatus,
  saveMessage,
  onSave
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Link to="/" className={styles.backButton}>
          ← Назад
        </Link>
        <h1>{botId ? 'Редактор бота' : 'Новый бот'}</h1>
      </div>
      <div className={styles.headerRight}>
        <button 
          onClick={onSave}
          className={`${styles.saveButton} ${styles[saveStatus]}`}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' && '⏳ Сохранение...'}
          {saveStatus === 'saved' && '✅ Сохранено'}
          {saveStatus === 'error' && '❌ Ошибка'}
          {saveStatus === 'idle' && '💾 Сохранить'}
        </button>
        {saveMessage && (
          <span className={`${styles.saveMessage} ${styles[saveStatus]}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </header>
  );
};

export default EditorHeader;