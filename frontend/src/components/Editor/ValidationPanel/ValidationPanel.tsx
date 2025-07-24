import React from 'react';
import type { ValidationError } from '../../../utils/schemaValidator';
import styles from './ValidationPanel.module.css';

interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  onClose?: () => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ errors, warnings, onClose }) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={styles.validationPanel}>
      <div className={styles.header}>
        <h3>Валидация схемы</h3>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        )}
      </div>
      
      {errors.length > 0 && (
        <div className={styles.validationErrors}>
          <h4>❌ Ошибки ({errors.length})</h4>
          <ul>
            {errors.map((error, index) => (
              <li key={index} title={`Тип: ${error.type}`}>
                {error.message}
                {error.nodeId && <span className={styles.nodeId}> (узел: {error.nodeId})</span>}
                {error.connectionId && <span className={styles.connectionId}> (соединение: {error.connectionId})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className={styles.validationWarnings}>
          <h4>⚠️ Предупреждения ({warnings.length})</h4>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index} title={`Тип: ${warning.type}`}>
                {warning.message}
                {warning.nodeId && <span className={styles.nodeId}> (узел: {warning.nodeId})</span>}
                {warning.connectionId && <span className={styles.connectionId}> (соединение: {warning.connectionId})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.summary}>
        <small>
          Всего проблем: {errors.length + warnings.length}
          {errors.length > 0 && ' • Есть критические ошибки'}
        </small>
      </div>
    </div>
  );
};

export default ValidationPanel;