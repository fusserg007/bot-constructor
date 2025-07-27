import React, { useEffect, useState } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { SchemaValidator, ValidationResult, ValidationError } from '../../../utils/SchemaValidator';
import { NodeData } from '../../../types/nodes';
import styles from './ValidationPanel.module.css';

interface ValidationPanelProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  isVisible: boolean;
  onToggle: () => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  nodes,
  edges,
  isVisible,
  onToggle
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const { setCenter, getNode } = useReactFlow();

  // Автоматическая валидация при изменении узлов или соединений
  useEffect(() => {
    validateSchema();
  }, [nodes, edges]);

  const validateSchema = async () => {
    setIsValidating(true);
    
    try {
      // Небольшая задержка для избежания частых валидаций
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const validator = new SchemaValidator(nodes, edges);
      const result = validator.validate();
      setValidationResult(result);
    } catch (error) {
      console.error('Ошибка валидации схемы:', error);
      setValidationResult({
        isValid: false,
        errors: [{
          id: 'validation-error',
          type: 'error',
          message: 'Ошибка при валидации схемы'
        }],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleErrorClick = (error: ValidationError) => {
    if (error.nodeId) {
      const node = getNode(error.nodeId);
      if (node) {
        setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
      }
    }
  };

  const getSchemaStatistics = () => {
    const stats = {
      triggers: nodes.filter(n => n.type?.startsWith('trigger-')).length,
      actions: nodes.filter(n => n.type?.startsWith('action-')).length,
      conditions: nodes.filter(n => n.type?.startsWith('condition-')).length,
      data: nodes.filter(n => n.type?.startsWith('data-')).length,
      integrations: nodes.filter(n => n.type?.startsWith('integration-')).length,
      scenarios: nodes.filter(n => n.type?.startsWith('scenario-')).length
    };

    return (
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Триггеры:</span>
          <span className={styles.statValue}>{stats.triggers}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Действия:</span>
          <span className={styles.statValue}>{stats.actions}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Условия:</span>
          <span className={styles.statValue}>{stats.conditions}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Данные:</span>
          <span className={styles.statValue}>{stats.data}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Интеграции:</span>
          <span className={styles.statValue}>{stats.integrations}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Сценарии:</span>
          <span className={styles.statValue}>{stats.scenarios}</span>
        </div>
      </div>
    );
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return <span className={styles.statusIcon}>⏳</span>;
    }
    
    if (validationResult.errors.length > 0) {
      return <span className={`${styles.statusIcon} ${styles.error}`}>❌</span>;
    }
    
    if (validationResult.warnings.length > 0) {
      return <span className={`${styles.statusIcon} ${styles.warning}`}>⚠️</span>;
    }
    
    return <span className={`${styles.statusIcon} ${styles.success}`}>✅</span>;
  };

  const getStatusText = () => {
    if (isValidating) {
      return 'Проверка схемы...';
    }
    
    if (validationResult.errors.length > 0) {
      return `${validationResult.errors.length} ошибок`;
    }
    
    if (validationResult.warnings.length > 0) {
      return `${validationResult.warnings.length} предупреждений`;
    }
    
    return 'Схема корректна';
  };

  return (
    <div className={`${styles.validationPanel} ${isVisible ? styles.visible : styles.collapsed}`}>
      <div className={styles.header} onClick={onToggle}>
        <div className={styles.title}>
          {getStatusIcon()}
          <span>Валидация схемы</span>
        </div>
        <div className={styles.status}>
          {getStatusText()}
        </div>
        <button className={styles.toggleButton}>
          {isVisible ? '▼' : '▲'}
        </button>
      </div>

      {isVisible && (
        <div className={styles.content}>
          {isValidating && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Проверка схемы...</span>
            </div>
          )}

          {!isValidating && (
            <>
              {/* Ошибки */}
              {validationResult.errors.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <span className={styles.errorIcon}>❌</span>
                    Ошибки ({validationResult.errors.length})
                  </h4>
                  <div className={styles.issueList}>
                    {validationResult.errors.map((error) => (
                      <div
                        key={error.id}
                        className={`${styles.issue} ${styles.error}`}
                        onClick={() => handleErrorClick(error)}
                      >
                        <div className={styles.issueMessage}>
                          {error.message}
                        </div>
                        {error.nodeId && (
                          <div className={styles.issueLocation}>
                            Узел: {error.nodeId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Предупреждения */}
              {validationResult.warnings.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <span className={styles.warningIcon}>⚠️</span>
                    Предупреждения ({validationResult.warnings.length})
                  </h4>
                  <div className={styles.issueList}>
                    {validationResult.warnings.map((warning) => (
                      <div
                        key={warning.id}
                        className={`${styles.issue} ${styles.warning}`}
                        onClick={() => handleErrorClick(warning)}
                      >
                        <div className={styles.issueMessage}>
                          {warning.message}
                        </div>
                        {warning.nodeId && (
                          <div className={styles.issueLocation}>
                            Узел: {warning.nodeId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Успешная валидация */}
              {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                <div className={styles.success}>
                  <div className={styles.successIcon}>✅</div>
                  <div className={styles.successMessage}>
                    Схема прошла все проверки
                  </div>
                  <div className={styles.successDetails}>
                    Узлов: {nodes.length} | Соединений: {edges.length}
                  </div>
                  <div className={styles.schemaStats}>
                    {getSchemaStatistics()}
                  </div>
                </div>
              )}

              {/* Кнопка повторной валидации */}
              <div className={styles.actions}>
                <button 
                  className={styles.validateButton}
                  onClick={validateSchema}
                  disabled={isValidating}
                >
                  {isValidating ? 'Проверка...' : 'Проверить снова'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;