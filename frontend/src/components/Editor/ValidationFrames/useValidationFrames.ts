import { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { ValidationResult } from './ValidationFrames';
import { useCanvasLogger } from '../CanvasLogger';

export interface ValidationSettings {
  enabled: boolean;
  showWarnings: boolean;
  showErrors: boolean;
  autoValidate: boolean;
  validationDelay: number;
}

export interface UseValidationFramesProps {
  nodes: Node[];
  edges: Edge[];
  settings?: Partial<ValidationSettings>;
}

const DEFAULT_SETTINGS: ValidationSettings = {
  enabled: true,
  showWarnings: true,
  showErrors: true,
  autoValidate: true,
  validationDelay: 500
};

export const useValidationFrames = ({
  nodes,
  edges,
  settings = {}
}: UseValidationFramesProps) => {
  const config = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);
  const { log } = useCanvasLogger();
  
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Функция валидации одного узла
  const validateNode = useCallback((node: Node): ValidationResult => {
    const messages: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';
    const details = {
      missingFields: [] as string[],
      invalidValues: [] as string[],
      connectionIssues: [] as string[]
    };

    try {
      // Проверка обязательных полей по типу узла
      switch (node.type) {
        case 'send_message':
          if (!node.data?.message?.trim()) {
            status = 'error';
            messages.push('Не указан текст сообщения');
            details.missingFields.push('message');
          }
          break;

        case 'send_message_with_keyboard':
          if (!node.data?.message?.trim()) {
            status = 'error';
            messages.push('Не указан текст сообщения');
            details.missingFields.push('message');
          }
          if (!node.data?.buttons || node.data.buttons.length === 0) {
            status = 'error';
            messages.push('Не добавлены кнопки');
            details.missingFields.push('buttons');
          } else {
            // Проверяем каждую кнопку
            node.data.buttons.forEach((button: any, index: number) => {
              if (!button.text?.trim()) {
                status = status === 'error' ? 'error' : 'warning';
                messages.push(`Кнопка ${index + 1}: не указан текст`);
                details.invalidValues.push(`button_${index}_text`);
              }
              if (!button.callback_data?.trim()) {
                status = status === 'error' ? 'error' : 'warning';
                messages.push(`Кнопка ${index + 1}: не указан callback_data`);
                details.invalidValues.push(`button_${index}_callback`);
              }
            });
          }
          break;

        case 'callback_handler':
          if (!node.data?.callback_data?.trim()) {
            status = 'error';
            messages.push('Не указан callback_data');
            details.missingFields.push('callback_data');
          }
          break;

        case 'command':
          if (!node.data?.command?.trim()) {
            status = 'error';
            messages.push('Не указана команда');
            details.missingFields.push('command');
          }
          break;

        case 'webhook-telegram':
          if (!node.data?.token?.trim()) {
            status = 'error';
            messages.push('Не указан токен бота');
            details.missingFields.push('token');
          }
          break;

        case 'webhook-http':
          if (!node.data?.url?.trim()) {
            status = 'error';
            messages.push('Не указан URL webhook');
            details.missingFields.push('url');
          } else if (!isValidUrl(node.data.url)) {
            status = status === 'error' ? 'error' : 'warning';
            messages.push('Некорректный формат URL');
            details.invalidValues.push('url');
          }
          break;

        case 'switch-condition':
          if (!node.data?.condition?.trim()) {
            status = 'error';
            messages.push('Не указано условие');
            details.missingFields.push('condition');
          }
          break;

        case 'switch-command':
          if (!node.data?.commands || node.data.commands.length === 0) {
            status = 'error';
            messages.push('Не указаны команды для обработки');
            details.missingFields.push('commands');
          }
          break;
      }

      // Проверка соединений
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      const outgoingEdges = edges.filter(edge => edge.source === node.id);

      // Стартовый узел не должен иметь входящих соединений
      if (node.type === 'start' && incomingEdges.length > 0) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push('Стартовый узел не должен иметь входящих соединений');
        details.connectionIssues.push('unexpected_incoming');
      }

      // Большинство узлов должны иметь входящие соединения (кроме стартовых)
      if (node.type !== 'start' && incomingEdges.length === 0) {
        status = status === 'error' ? 'error' : 'warning';
        messages.push('Узел должен иметь входящее соединение');
        details.connectionIssues.push('missing_incoming');
      }

      // Узлы действий должны иметь исходящие соединения
      const actionTypes = ['send_message', 'send_message_with_keyboard', 'callback_handler'];
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

      // Проверка дополнительных параметров
      if (node.data?.delay !== undefined) {
        const delay = Number(node.data.delay);
        if (isNaN(delay) || delay < 0) {
          status = status === 'error' ? 'error' : 'warning';
          messages.push('Некорректное значение задержки');
          details.invalidValues.push('delay');
        }
      }

    } catch (error) {
      status = 'error';
      messages.push('Ошибка при валидации узла');
      details.invalidValues.push('validation_error');
      
      log('VALIDATION_ERROR', `Validation error for node ${node.id}: ${error}`, {
        metadata: { nodeId: node.id, error: String(error) }
      });
    }

    return {
      nodeId: node.id,
      status,
      messages,
      details: (details.missingFields.length > 0 || 
               details.invalidValues.length > 0 || 
               details.connectionIssues.length > 0) ? details : undefined
    };
  }, [edges, log]);

  // Функция валидации всех узлов
  const validateAllNodes = useCallback(() => {
    if (!config.enabled) return;

    setIsValidating(true);
    
    const results: Record<string, ValidationResult> = {};
    
    nodes.forEach(node => {
      const result = validateNode(node);
      results[node.id] = result;
    });

    setValidationResults(results);
    setIsValidating(false);

    // Логируем общую статистику валидации
    const errorCount = Object.values(results).filter(r => r.status === 'error').length;
    const warningCount = Object.values(results).filter(r => r.status === 'warning').length;
    
    log('VALIDATION_COMPLETE', `Validated ${nodes.length} nodes: ${errorCount} errors, ${warningCount} warnings`, {
      metadata: { totalNodes: nodes.length, errors: errorCount, warnings: warningCount }
    });

  }, [nodes, validateNode, config.enabled, log]);

  // Автоматическая валидация при изменении узлов или рёбер
  useEffect(() => {
    if (!config.autoValidate) return;

    // Очищаем предыдущий таймаут
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Устанавливаем новый таймаут для валидации
    const timeout = setTimeout(() => {
      validateAllNodes();
    }, config.validationDelay);

    setValidationTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [nodes, edges, config.autoValidate, config.validationDelay, validateAllNodes]);

  // Функция для принудительной валидации
  const forceValidation = useCallback(() => {
    validateAllNodes();
  }, [validateAllNodes]);

  // Функция для очистки результатов валидации
  const clearValidation = useCallback(() => {
    setValidationResults({});
  }, []);

  // Получение статистики валидации
  const validationStats = useMemo(() => {
    const results = Object.values(validationResults);
    return {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      warnings: results.filter(r => r.status === 'warning').length,
      errors: results.filter(r => r.status === 'error').length,
      hasIssues: results.some(r => r.status !== 'valid')
    };
  }, [validationResults]);

  // Фильтрация результатов по настройкам
  const filteredResults = useMemo(() => {
    const filtered: Record<string, ValidationResult> = {};
    
    Object.entries(validationResults).forEach(([nodeId, result]) => {
      if (result.status === 'error' && config.showErrors) {
        filtered[nodeId] = result;
      } else if (result.status === 'warning' && config.showWarnings) {
        filtered[nodeId] = result;
      }
    });

    return filtered;
  }, [validationResults, config.showErrors, config.showWarnings]);

  return {
    validationResults: filteredResults,
    validationStats,
    isValidating,
    forceValidation,
    clearValidation,
    config
  };
};

// Вспомогательная функция для проверки URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}