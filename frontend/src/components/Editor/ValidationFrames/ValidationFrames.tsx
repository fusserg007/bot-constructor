import React, { useMemo } from 'react';
import { Node } from 'reactflow';
import { SchemaValidator } from '../../../utils/SchemaValidator';
import { useCanvasLogger } from '../CanvasLogger';
import styles from './ValidationFrames.module.css';

export interface ValidationResult {
  nodeId: string;
  status: 'valid' | 'warning' | 'error';
  messages: string[];
  details?: {
    missingFields?: string[];
    invalidValues?: string[];
    connectionIssues?: string[];
  };
}

export interface ValidationFramesProps {
  nodes: Node[];
  edges: any[];
  visible?: boolean;
}

const ValidationFrames: React.FC<ValidationFramesProps> = ({
  nodes,
  edges,
  visible = true
}) => {
  const { log } = useCanvasLogger();

  // Валидация всех узлов
  const validationResults = useMemo(() => {
    const results: Record<string, ValidationResult> = {};

    nodes.forEach(node => {
      try {
        // Используем существующий SchemaValidator
        const validation = SchemaValidator.validateNode(node);
        
        let status: 'valid' | 'warning' | 'error' = 'valid';
        const messages: string[] = [];
        const details = {
          missingFields: [] as string[],
          invalidValues: [] as string[],
          connectionIssues: [] as string[]
        };

        // Проверяем обязательные поля
        if (node.type === 'send_message' && !node.data?.message) {
          status = 'error';
          messages.push('Не указан текст сообщения');
          details.missingFields.push('message');
        }

        if (node.type === 'send_message_with_keyboard' && (!node.data?.message || !node.data?.buttons?.length)) {
          status = 'error';
          if (!node.data?.message) {
            messages.push('Не указан текст сообщения');
            details.missingFields.push('message');
          }
          if (!node.data?.buttons?.length) {
            messages.push('Не добавлены кнопки');
            details.missingFields.push('buttons');
          }
        }

        if (node.type === 'callback_handler' && !node.data?.callback_data) {
          status = 'error';
          messages.push('Не указан callback_data');
          details.missingFields.push('callback_data');
        }

        if (node.type === 'command' && !node.data?.command) {
          status = 'error';
          messages.push('Не указана команда');
          details.missingFields.push('command');
        }

        if (node.type === 'webhook-telegram' && !node.data?.token) {
          status = 'error';
          messages.push('Не указан токен бота');
          details.missingFields.push('token');
        }

        if (node.type === 'webhook-http' && !node.data?.url) {
          status = 'error';
          messages.push('Не указан URL webhook');
          details.missingFields.push('url');
        }

        // Проверяем подключения
        const incomingEdges = edges.filter(edge => edge.target === node.id);
        const outgoingEdges = edges.filter(edge => edge.source === node.id);

        // Стартовый узел не должен иметь входящих соединений
        if (node.type === 'start' && incomingEdges.length > 0) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Стартовый узел не должен иметь входящих соединений');
          details.connectionIssues.push('unexpected_incoming');
        }

        // Узлы действий должны иметь исходящие соединения (кроме конечных)
        const actionTypes = ['send_message', 'send_message_with_keyboard'];
        if (actionTypes.includes(node.type) && outgoingEdges.length === 0) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Узел должен иметь исходящее соединение');
          details.connectionIssues.push('missing_outgoing');
        }

        // Условные узлы должны иметь минимум 2 исходящих соединения
        const conditionTypes = ['switch-command', 'switch-condition'];
        if (conditionTypes.includes(node.type) && outgoingEdges.length < 2) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Условный узел должен иметь минимум 2 исходящих соединения');
          details.connectionIssues.push('insufficient_branches');
        }

        // Проверяем валидность значений
        if (node.data?.delay && (isNaN(node.data.delay) || node.data.delay < 0)) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Некорректное значение задержки');
          details.invalidValues.push('delay');
        }

        if (node.data?.buttons) {
          node.data.buttons.forEach((button: any, index: number) => {
            if (!button.text || !button.callback_data) {
              status = status === 'error' ? 'error' : 'warning';
              messages.push(`Кнопка ${index + 1}: не заполнен текст или callback_data`);
              details.invalidValues.push(`button_${index}`);
            }
          });
        }

        results[node.id] = {
          nodeId: node.id,
          status,
          messages,
          details: Object.keys(details.missingFields).length > 0 || 
                  Object.keys(details.invalidValues).length > 0 || 
                  Object.keys(details.connectionIssues).length > 0 ? details : undefined
        };

        // Логируем ошибки валидации
        if (status === 'error') {
          log('VALIDATION_ERROR', `Node ${node.id} (${node.type}): ${messages.join(', ')}`, {
            metadata: { nodeId: node.id, nodeType: node.type, errors: messages }
          });
        }

      } catch (error) {
        results[node.id] = {
          nodeId: node.id,
          status: 'error',
          messages: ['Ошибка валидации узла'],
          details: {
            missingFields: [],
            invalidValues: ['validation_error'],
            connectionIssues: []
          }
        };

        log('VALIDATION_ERROR', `Validation failed for node ${node.id}: ${error}`, {
          metadata: { nodeId: node.id, error: String(error) }
        });
      }
    });

    return results;
  }, [nodes, edges, log]);

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.validationFrames}>
      {nodes.map(node => {
        const validation = validationResults[node.id];
        if (!validation || validation.status === 'valid') {
          return null;
        }

        return (
          <div
            key={node.id}
            className={`${styles.validationFrame} ${styles[validation.status]}`}
            style={{
              left: node.position.x - 5,
              top: node.position.y - 5,
              width: (node.width || 200) + 10,
              height: (node.height || 100) + 10,
            }}
            title={validation.messages.join('\n')}
          >
            <div className={styles.validationTooltip}>
              <div className={styles.tooltipHeader}>
                <span className={styles.tooltipIcon}>
                  {validation.status === 'error' ? '❌' : '⚠️'}
                </span>
                <span className={styles.tooltipTitle}>
                  {validation.status === 'error' ? 'Ошибка' : 'Предупреждение'}
                </span>
              </div>
              <div className={styles.tooltipContent}>
                {validation.messages.map((message, index) => (
                  <div key={index} className={styles.tooltipMessage}>
                    {message}
                  </div>
                ))}
              </div>
              {validation.details && (
                <div className={styles.tooltipDetails}>
                  {validation.details.missingFields && validation.details.missingFields.length > 0 && (
                    <div className={styles.detailSection}>
                      <strong>Отсутствуют поля:</strong> {validation.details.missingFields.join(', ')}
                    </div>
                  )}
                  {validation.details.invalidValues && validation.details.invalidValues.length > 0 && (
                    <div className={styles.detailSection}>
                      <strong>Некорректные значения:</strong> {validation.details.invalidValues.join(', ')}
                    </div>
                  )}
                  {validation.details.connectionIssues && validation.details.connectionIssues.length > 0 && (
                    <div className={styles.detailSection}>
                      <strong>Проблемы соединений:</strong> {validation.details.connectionIssues.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ValidationFrames;