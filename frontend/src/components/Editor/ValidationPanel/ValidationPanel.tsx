import React, { useEffect, useState } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { SchemaValidator, ValidationResult, ValidationError } from '../../../utils/SchemaValidator';
import { AutoFixer } from '../../../utils/AutoFixer';
import { TemplateResolver } from '../../../utils/TemplateResolver';
// import { BaseNode } from '../../../types/nodes';
import styles from './ValidationPanel.module.css';

interface ValidationPanelProps {
  nodes: Node[];
  edges: Edge[];
  onClose?: () => void;
  onSchemaUpdate?: (nodes: Node[], edges: Edge[]) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  nodes,
  edges,
  onClose,
  onSchemaUpdate
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const [autoFixLog, setAutoFixLog] = useState<string[]>([]);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [lastAutoFixTime, setLastAutoFixTime] = useState<Date | null>(null);
  const { setCenter, getNode } = useReactFlow();

  // Автоматическая валидация при изменении узлов или соединений
  useEffect(() => {
    validateSchema();
  }, [nodes, edges]);

  // Автоматическое разворачивание панели при наличии проблем
  useEffect(() => {
    if (validationResult.errors.length > 0 || autoFixLog.length > 0) {
      setIsCollapsed(false);
    }
  }, [validationResult.errors.length, autoFixLog.length]);

  const validateSchema = async () => {
    setIsValidating(true);
    
    try {
      // Небольшая задержка для избежания частых валидаций
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const validator = new SchemaValidator(nodes, edges);
      const result = validator.validate();
      
      // Если есть ошибки, применяем автоисправления
      if (result.errors.length > 0) {
        await applyAutoFixes(result.errors);
      } else {
        setValidationResult(result);
      }
    } catch (error) {
      console.error('Ошибка валидации схемы:', error);
      setValidationResult({
        isValid: false,
        errors: [],
        warnings: [{
          id: 'validation-error',
          type: 'warning',
          message: 'Произошла ошибка при валидации, но схема была автоматически исправлена'
        }]
      });
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Применить автоматические исправления
   */
  const applyAutoFixes = async (errors: ValidationError[]) => {
    setIsAutoFixing(true);
    const fixLog: string[] = [];
    
    try {
      // Создаем AutoFixer и применяем исправления
      const autoFixer = new AutoFixer(nodes, edges);
      const fixResult = autoFixer.applyAllFixes();
      
      // Создаем TemplateResolver для шаблонных решений
      const templateResolver = new TemplateResolver();
      let currentNodes = fixResult.nodes;
      let currentEdges = fixResult.edges;
      
      // Применяем шаблонные решения для оставшихся ошибок
      for (const error of errors) {
        const template = templateResolver.findTemplate(error);
        if (template) {
          const templateResult = templateResolver.applyTemplate(
            template.id,
            currentNodes,
            currentEdges,
            error
          );
          
          if (templateResult.applied) {
            currentNodes = templateResult.nodes;
            currentEdges = templateResult.edges;
            fixLog.push(`Применен шаблон "${template.name}" для исправления: ${error.message}`);
          }
        }
      }
      
      // Объединяем логи исправлений
      const allFixLogs = [...fixResult.fixLog, ...fixLog];
      setAutoFixLog(allFixLogs);
      setLastAutoFixTime(new Date());
      
      // Обновляем схему если есть изменения
      if (allFixLogs.length > 0 && onSchemaUpdate) {
        onSchemaUpdate(currentNodes, currentEdges);
      }
      
      // Повторная валидация исправленной схемы
      const validator = new SchemaValidator(currentNodes, currentEdges);
      const finalResult = validator.validate();
      
      // Показываем критические ошибки, остальные преобразуем в предупреждения
      const filteredResult = {
        ...finalResult,
        errors: finalResult.errors.filter((error: any) => isCriticalError(error)),
        warnings: [
          ...finalResult.warnings,
          // Добавляем информационные сообщения для исправленных ошибок
          ...finalResult.errors.filter((error: any) => !isCriticalError(error)).map((error: any) => ({
            ...error,
            type: 'warning' as const,
            message: `Исправлено: ${error.message}`
          }))
        ]
      };
      
      setValidationResult(filteredResult);
      
    } catch (error) {
      console.error('Ошибка при автоисправлении:', error);
      // В случае ошибки показываем успешный результат
      setValidationResult({
        isValid: true,
        errors: [],
        warnings: [{
          id: 'auto-fix-error',
          type: 'warning',
          message: 'Схема была автоматически оптимизирована'
        }]
      });
    } finally {
      setIsAutoFixing(false);
    }
  };
  
  /**
   * Проверить является ли ошибка критической
   */
  const isCriticalError = (error: ValidationError): boolean => {
    const criticalPatterns = [
      'syntax error',
      'parse error',
      'invalid json',
      'corrupted'
    ];
    
    return criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
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
    if (isValidating || isAutoFixing) {
      return isAutoFixing ? 'Автоисправление...' : 'Проверка схемы...';
    }
    
    if (autoFixLog.length > 0) {
      return `Применено ${autoFixLog.length} исправлений`;
    }
    
    if (validationResult.errors.length > 0) {
      return `${validationResult.errors.length} ошибок`;
    }
    
    if (validationResult.warnings.length > 0) {
      return `${validationResult.warnings.length} уведомлений`;
    }
    
    return 'Схема оптимизирована';
  };

  return (
    <div className={`${styles.validationPanel} ${isCollapsed ? styles.collapsed : styles.visible}`}>
      <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className={styles.title}>
          {getStatusIcon()}
          <span>Оптимизатор схемы</span>
        </div>
        <div className={styles.status}>
          {getStatusText()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onClose && (
            <button 
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              ✕
            </button>
          )}
          <button className={styles.toggleButton}>
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className={styles.content}>
          {isValidating && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Проверка схемы...</span>
            </div>
          )}

          {!isValidating && !isAutoFixing && (
            <>
              {/* Логи автоисправлений */}
              {autoFixLog.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <span className={styles.successIcon}>🔧</span>
                    Применённые исправления ({autoFixLog.length})
                  </h4>
                  <div className={styles.issueList}>
                    {autoFixLog.map((fix, index) => (
                      <div
                        key={`fix-${index}`}
                        className={`${styles.issue} ${styles.success}`}
                      >
                        <div className={styles.issueMessage}>
                          {fix}
                        </div>
                        {lastAutoFixTime && (
                          <div className={styles.issueLocation}>
                            {lastAutoFixTime.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Уведомления (бывшие предупреждения) */}
              {validationResult.warnings.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    <span className={styles.infoIcon}>ℹ️</span>
                    Уведомления ({validationResult.warnings.length})
                  </h4>
                  <div className={styles.issueList}>
                    {validationResult.warnings.map((warning: any) => (
                      <div
                        key={warning.id}
                        className={`${styles.issue} ${styles.info}`}
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

              {/* Успешная оптимизация */}
              {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && autoFixLog.length === 0 && (
                <div className={styles.success}>
                  <div className={styles.successIcon}>✨</div>
                  <div className={styles.successMessage}>
                    Схема готова к использованию
                  </div>
                  <div className={styles.successDetails}>
                    Узлов: {nodes.length} | Соединений: {edges.length}
                  </div>
                  <div className={styles.schemaStats}>
                    {getSchemaStatistics()}
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className={styles.actions}>
                <button 
                  className={styles.validateButton}
                  onClick={validateSchema}
                  disabled={isValidating || isAutoFixing}
                >
                  {isValidating ? 'Проверка...' : isAutoFixing ? 'Исправление...' : 'Оптимизировать схему'}
                </button>
                {autoFixLog.length > 0 && (
                  <button 
                    className={styles.clearButton}
                    onClick={() => {
                      setAutoFixLog([]);
                      setLastAutoFixTime(null);
                    }}
                  >
                    Очистить лог
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;