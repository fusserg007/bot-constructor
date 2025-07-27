/**
 * Schema Engine - движок выполнения схем для мультиплатформенного конструктора ботов
 * Интерпретирует визуальные схемы и выполняет их с поддержкой всех типов узлов
 */

// Базовые типы узлов и соединений (совместимые с React Flow)
interface BaseNode {
  id: string;
  type?: string;
  data: any;
  position: { x: number; y: number };
}

interface BaseEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}
import { MessengerAdapter } from '../adapters/MessengerAdapter';
import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { Message, MessengerPlatform } from '../types';
import { IntegrationManager } from '../integrations/IntegrationManager';

export interface SchemaExecutionContext {
  userId: string;
  chatId: string;
  platform: MessengerPlatform;
  message?: {
    text?: string;
    messageId?: string;
    callbackData?: string;
    timestamp: number;
    user?: {
      id: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  };
  variables: Record<string, any>;
  sessionData: Record<string, any>;
  adapter: MessengerAdapter;
}

export interface NodeExecutionResult {
  success: boolean;
  nextNodes: string[];
  variables?: Record<string, any>;
  sessionData?: Record<string, any>;
  error?: string;
  output?: any;
}

export interface SchemaExecutionResult {
  success: boolean;
  executedNodes: string[];
  finalVariables: Record<string, any>;
  finalSessionData: Record<string, any>;
  errors: Array<{ nodeId: string; error: string }>;
  executionTime: number;
}

export class SchemaEngine {
  private adapterRegistry: AdapterRegistry;
  private integrationManager: IntegrationManager;
  private executionHistory: Map<string, SchemaExecutionResult[]> = new Map();
  private activeExecutions: Map<string, boolean> = new Map();

  constructor() {
    this.adapterRegistry = AdapterRegistry.getInstance();
    this.integrationManager = IntegrationManager.getInstance();
  }

  /**
   * Выполнить схему для пользователя
   */
  async executeSchema(
    nodes: BaseNode[],
    edges: BaseEdge[],
    context: SchemaExecutionContext,
    startNodeId?: string
  ): Promise<SchemaExecutionResult> {
    const executionId = `${context.userId}-${context.chatId}-${Date.now()}`;
    const startTime = Date.now();

    // Проверяем, не выполняется ли уже схема для этого пользователя
    if (this.activeExecutions.get(`${context.userId}-${context.chatId}`)) {
      return {
        success: false,
        executedNodes: [],
        finalVariables: context.variables,
        finalSessionData: context.sessionData,
        errors: [{ nodeId: 'system', error: 'Schema execution already in progress' }],
        executionTime: 0
      };
    }

    this.activeExecutions.set(`${context.userId}-${context.chatId}`, true);

    try {
      const result = await this.executeSchemaInternal(nodes, edges, context, startNodeId);
      
      // Сохраняем историю выполнения
      const history = this.executionHistory.get(executionId) || [];
      history.push(result);
      this.executionHistory.set(executionId, history);

      return result;
    } finally {
      this.activeExecutions.delete(`${context.userId}-${context.chatId}`);
    }
  }

  /**
   * Внутренняя логика выполнения схемы
   */
  private async executeSchemaInternal(
    nodes: BaseNode[],
    edges: BaseEdge[],
    context: SchemaExecutionContext,
    startNodeId?: string
  ): Promise<SchemaExecutionResult> {
    const startTime = Date.now();
    const executedNodes: string[] = [];
    const errors: Array<{ nodeId: string; error: string }> = [];
    let currentVariables = { ...context.variables };
    let currentSessionData = { ...context.sessionData };

    // Находим стартовый узел
    let currentNodeIds: string[];
    
    if (startNodeId) {
      currentNodeIds = [startNodeId];
    } else {
      // Ищем триггерные узлы
      const triggerNodes = nodes.filter(node => 
        node.type?.startsWith('trigger-') && this.shouldTriggerNode(node, context)
      );
      
      if (triggerNodes.length === 0) {
        return {
          success: false,
          executedNodes,
          finalVariables: currentVariables,
          finalSessionData: currentSessionData,
          errors: [{ nodeId: 'system', error: 'No trigger nodes found or triggered' }],
          executionTime: Date.now() - startTime
        };
      }
      
      currentNodeIds = triggerNodes.map(node => node.id);
    }

    // Выполняем узлы последовательно
    const maxIterations = 100; // Защита от бесконечных циклов
    let iterations = 0;

    while (currentNodeIds.length > 0 && iterations < maxIterations) {
      iterations++;
      const nextNodeIds: string[] = [];

      for (const nodeId of currentNodeIds) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) {
          errors.push({ nodeId, error: 'Node not found' });
          continue;
        }

        try {
          const nodeContext = {
            ...context,
            variables: currentVariables,
            sessionData: currentSessionData
          };

          const result = await this.executeNode(node, nodeContext, edges);
          
          if (result.success) {
            executedNodes.push(nodeId);
            
            // Обновляем переменные и данные сессии
            if (result.variables) {
              currentVariables = { ...currentVariables, ...result.variables };
            }
            if (result.sessionData) {
              currentSessionData = { ...currentSessionData, ...result.sessionData };
            }
            
            // Добавляем следующие узлы для выполнения
            nextNodeIds.push(...result.nextNodes);
          } else {
            errors.push({ nodeId, error: result.error || 'Node execution failed' });
          }
        } catch (error) {
          errors.push({ 
            nodeId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      currentNodeIds = [...new Set(nextNodeIds)]; // Убираем дубликаты
    }

    if (iterations >= maxIterations) {
      errors.push({ nodeId: 'system', error: 'Maximum iterations reached - possible infinite loop' });
    }

    return {
      success: errors.length === 0,
      executedNodes,
      finalVariables: currentVariables,
      finalSessionData: currentSessionData,
      errors,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Выполнить отдельный узел
   */
  private async executeNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    if (!nodeType) {
      return {
        success: false,
        nextNodes: [],
        error: 'Node type not specified'
      };
    }

    try {
      switch (true) {
        case nodeType.startsWith('trigger-'):
          return await this.executeTriggerNode(node, context, edges);
          
        case nodeType.startsWith('action-'):
          return await this.executeActionNode(node, context, edges);
          
        case nodeType.startsWith('condition-'):
          return await this.executeConditionNode(node, context, edges);
          
        case nodeType.startsWith('data-'):
          return await this.executeDataNode(node, context, edges);
          
        case nodeType.startsWith('integration-'):
          return await this.executeIntegrationNode(node, context, edges);
          
        case nodeType.startsWith('scenario-'):
          return await this.executeScenarioNode(node, context, edges);
          
        default:
          return {
            success: false,
            nextNodes: [],
            error: `Unknown node type: ${nodeType}`
          };
      }
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Node execution error'
      };
    }
  }

  /**
   * Выполнить триггерный узел
   */
  private async executeTriggerNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    // Триггеры обычно уже сработали, просто переходим к следующим узлам
    const nextNodes = this.getNextNodes(node.id, edges);

    switch (nodeType) {
      case 'trigger-message':
        // Обработка текстового сообщения
        return {
          success: true,
          nextNodes,
          variables: {
            messageText: context.message?.text || '',
            userId: context.userId,
            chatId: context.chatId
          }
        };

      case 'trigger-command':
        // Обработка команды
        const command = nodeData.command || '';
        const messageText = context.message?.text || '';
        
        if (messageText.startsWith(command)) {
          const args = messageText.slice(command.length).trim().split(' ');
          return {
            success: true,
            nextNodes,
            variables: {
              command,
              commandArgs: args,
              userId: context.userId,
              chatId: context.chatId
            }
          };
        }
        
        return { success: false, nextNodes: [] };

      case 'trigger-callback':
        // Обработка callback кнопки
        return {
          success: true,
          nextNodes,
          variables: {
            callbackData: context.message?.callbackData || '',
            userId: context.userId,
            chatId: context.chatId
          }
        };

      case 'trigger-inline-query':
        // Обработка inline запросов
        const inlineQuery = context.message?.text || '';
        return {
          success: true,
          nextNodes,
          variables: {
            inlineQuery,
            userId: context.userId,
            chatId: context.chatId
          }
        };

      case 'trigger-join-group':
        // Обработка присоединения к группе
        return {
          success: true,
          nextNodes,
          variables: {
            userId: context.userId,
            chatId: context.chatId,
            eventType: 'join_group'
          }
        };

      case 'trigger-leave-group':
        // Обработка покидания группы
        return {
          success: true,
          nextNodes,
          variables: {
            userId: context.userId,
            chatId: context.chatId,
            eventType: 'leave_group'
          }
        };

      case 'trigger-schedule':
        // Обработка запланированных событий
        const scheduleTime = nodeData.scheduleTime || '';
        const currentTime = new Date().toISOString();
        return {
          success: true,
          nextNodes,
          variables: {
            scheduleTime,
            currentTime,
            userId: context.userId,
            chatId: context.chatId
          }
        };

      default:
        return {
          success: true,
          nextNodes,
          variables: { userId: context.userId, chatId: context.chatId }
        };
    }
  }

  /**
   * Выполнить узел действия
   */
  private async executeActionNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;
    const adapter = context.adapter;

    try {
      switch (nodeType) {
        case 'action-send-message':
          const message = this.processTemplate(nodeData.message || '', context.variables);
          await adapter.sendMessage(context.chatId, { text: message });
          break;

        case 'action-send-photo':
          const photoUrl = this.processTemplate(nodeData.photoUrl || '', context.variables);
          const caption = this.processTemplate(nodeData.caption || '', context.variables);
          await adapter.sendMedia(context.chatId, { 
            type: 'photo',
            url: photoUrl,
            caption: caption 
          });
          break;

        case 'action-send-video':
          const videoUrl = this.processTemplate(nodeData.videoUrl || '', context.variables);
          const videoCaption = this.processTemplate(nodeData.caption || '', context.variables);
          await adapter.sendMedia(context.chatId, { 
            type: 'video',
            url: videoUrl,
            caption: videoCaption 
          });
          break;

        case 'action-edit-message':
          // Пока не реализовано в базовом адаптере, пропускаем
          console.log('Edit message not implemented in base adapter');
          break;

        case 'action-delete-message':
          // Пока не реализовано в базовом адаптере, пропускаем
          console.log('Delete message not implemented in base adapter');
          break;

        case 'action-send-audio':
          const audioUrl = this.processTemplate(nodeData.audioUrl || '', context.variables);
          const audioCaption = this.processTemplate(nodeData.caption || '', context.variables);
          await adapter.sendMedia(context.chatId, { 
            type: 'audio',
            url: audioUrl,
            caption: audioCaption 
          });
          break;

        case 'action-send-document':
          const documentUrl = this.processTemplate(nodeData.documentUrl || '', context.variables);
          const documentCaption = this.processTemplate(nodeData.caption || '', context.variables);
          await adapter.sendMedia(context.chatId, { 
            type: 'document',
            url: documentUrl,
            caption: documentCaption 
          });
          break;

        case 'action-send-keyboard':
          const keyboardMessage = this.processTemplate(nodeData.message || '', context.variables);
          const buttons = nodeData.buttons || [];
          await adapter.sendMessage(context.chatId, { 
            text: keyboardMessage,
            buttons: buttons
          });
          break;

        case 'action-delay':
          const delayMs = parseInt(nodeData.delay || '1000');
          await new Promise(resolve => setTimeout(resolve, delayMs));
          break;

        case 'action-forward-message':
          const forwardToChatId = this.processTemplate(nodeData.forwardToChatId || '', context.variables);
          const forwardMessage = this.processTemplate(nodeData.message || context.message?.text || '', context.variables);
          await adapter.sendMessage(forwardToChatId, { text: forwardMessage });
          break;

        case 'action-ban-user':
          // Модерационное действие - бан пользователя
          const banUserId = nodeData.userId || context.userId;
          console.log(`Banning user ${banUserId} in chat ${context.chatId}`);
          // TODO: Реализовать через адаптер когда будет поддержка
          break;

        case 'action-mute-user':
          // Модерационное действие - мут пользователя
          const muteUserId = nodeData.userId || context.userId;
          const muteDuration = nodeData.duration || 300; // 5 минут по умолчанию
          console.log(`Muting user ${muteUserId} for ${muteDuration} seconds in chat ${context.chatId}`);
          // TODO: Реализовать через адаптер когда будет поддержка
          break;

        default:
          throw new Error(`Unknown action node type: ${nodeType}`);
      }

      return {
        success: true,
        nextNodes: this.getNextNodes(node.id, edges)
      };
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Action execution failed'
      };
    }
  }

  /**
   * Выполнить узел условия
   */
  private async executeConditionNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    let conditionResult = false;

    try {
      switch (nodeType) {
        case 'condition-text-contains':
          const text = context.message?.text || '';
          const pattern = nodeData.pattern || '';
          conditionResult = text.toLowerCase().includes(pattern.toLowerCase());
          break;

        case 'condition-text-equals':
          const messageTextEquals = context.message?.text || '';
          const expectedText = nodeData.expectedText || '';
          conditionResult = messageTextEquals.toLowerCase() === expectedText.toLowerCase();
          break;

        case 'condition-user-role':
          const userRole = context.variables.userRole || 'user';
          const requiredRole = nodeData.requiredRole || 'user';
          conditionResult = userRole === requiredRole;
          break;

        case 'condition-variable':
          const variableName = nodeData.variableName || '';
          const expectedValue = nodeData.expectedValue || '';
          const actualValue = context.variables[variableName];
          conditionResult = String(actualValue) === String(expectedValue);
          break;

        case 'condition-time-range':
          const startTime = nodeData.startTime || '00:00';
          const endTime = nodeData.endTime || '23:59';
          const currentHour = new Date().getHours();
          const currentMinute = new Date().getMinutes();
          const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          conditionResult = currentTimeStr >= startTime && currentTimeStr <= endTime;
          break;

        case 'condition-user-in-list':
          const userList = nodeData.userList || [];
          conditionResult = userList.includes(context.userId);
          break;

        case 'condition-message-length':
          const messageTextLength = context.message?.text || '';
          const minLength = parseInt(nodeData.minLength || '0');
          const maxLength = parseInt(nodeData.maxLength || '1000');
          conditionResult = messageTextLength.length >= minLength && messageTextLength.length <= maxLength;
          break;

        case 'condition-regex-match':
          const regexPattern = nodeData.pattern || '';
          const testText = context.message?.text || '';
          try {
            const regex = new RegExp(regexPattern, 'i');
            conditionResult = regex.test(testText);
          } catch (error) {
            conditionResult = false;
          }
          break;

        case 'condition-counter':
          const counterName = nodeData.counterName || 'default';
          const counterValue = context.sessionData[`counter_${counterName}`] || 0;
          const compareOperator = nodeData.operator || 'equals'; // equals, greater, less
          const compareValue = parseInt(nodeData.value || '0');
          
          switch (compareOperator) {
            case 'greater':
              conditionResult = counterValue > compareValue;
              break;
            case 'less':
              conditionResult = counterValue < compareValue;
              break;
            case 'equals':
            default:
              conditionResult = counterValue === compareValue;
              break;
          }
          break;

        case 'condition-random':
          const probability = parseFloat(nodeData.probability || '0.5'); // 50% по умолчанию
          conditionResult = Math.random() < probability;
          break;

        default:
          throw new Error(`Unknown condition node type: ${nodeType}`);
      }

      // Получаем следующие узлы в зависимости от результата условия
      const trueEdges = edges.filter(edge => 
        edge.source === node.id && edge.sourceHandle === 'true'
      );
      const falseEdges = edges.filter(edge => 
        edge.source === node.id && edge.sourceHandle === 'false'
      );

      const nextNodes = conditionResult 
        ? trueEdges.map(edge => edge.target)
        : falseEdges.map(edge => edge.target);

      return {
        success: true,
        nextNodes,
        variables: {
          [`${node.id}_result`]: conditionResult
        }
      };
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Condition evaluation failed'
      };
    }
  }

  /**
   * Выполнить узел данных
   */
  private async executeDataNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    try {
      switch (nodeType) {
        case 'data-variable-set':
          const variableName = nodeData.variableName || '';
          const variableValue = this.processTemplate(nodeData.variableValue || '', context.variables);
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [variableName]: variableValue
            }
          };

        case 'data-variable-get':
          const getVariableName = nodeData.variableName || '';
          const value = context.variables[getVariableName];
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_value`]: value
            }
          };

        case 'data-save':
          const saveKey = nodeData.key || '';
          const saveValue = this.processTemplate(nodeData.value || '', context.variables);
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [saveKey]: saveValue
            }
          };

        case 'data-load':
          const loadKey = nodeData.key || '';
          const loadedValue = context.sessionData[loadKey];
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_loaded`]: loadedValue
            }
          };

        case 'data-counter-increment':
          const incCounterName = nodeData.counterName || 'default';
          const incAmount = parseInt(nodeData.amount || '1');
          const currentIncValue = context.sessionData[`counter_${incCounterName}`] || 0;
          const newIncValue = currentIncValue + incAmount;
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [`counter_${incCounterName}`]: newIncValue
            },
            variables: {
              [`${node.id}_counter_value`]: newIncValue
            }
          };

        case 'data-counter-decrement':
          const decCounterName = nodeData.counterName || 'default';
          const decAmount = parseInt(nodeData.amount || '1');
          const currentDecValue = context.sessionData[`counter_${decCounterName}`] || 0;
          const newDecValue = Math.max(0, currentDecValue - decAmount);
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [`counter_${decCounterName}`]: newDecValue
            },
            variables: {
              [`${node.id}_counter_value`]: newDecValue
            }
          };

        case 'data-counter-reset':
          const resetCounterName = nodeData.counterName || 'default';
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [`counter_${resetCounterName}`]: 0
            },
            variables: {
              [`${node.id}_counter_value`]: 0
            }
          };

        case 'data-array-add':
          const arrayName = nodeData.arrayName || 'default';
          const itemToAdd = this.processTemplate(nodeData.item || '', context.variables);
          const currentArray = context.sessionData[`array_${arrayName}`] || [];
          const newArray = [...currentArray, itemToAdd];
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [`array_${arrayName}`]: newArray
            },
            variables: {
              [`${node.id}_array_length`]: newArray.length
            }
          };

        case 'data-array-remove':
          const removeArrayName = nodeData.arrayName || 'default';
          const itemToRemove = this.processTemplate(nodeData.item || '', context.variables);
          const currentRemoveArray = context.sessionData[`array_${removeArrayName}`] || [];
          const filteredArray = currentRemoveArray.filter((item: any) => item !== itemToRemove);
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            sessionData: {
              [`array_${removeArrayName}`]: filteredArray
            },
            variables: {
              [`${node.id}_array_length`]: filteredArray.length
            }
          };

        case 'data-random-choice':
          const choices = nodeData.choices || [];
          const randomChoice = choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)] : '';
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_choice`]: randomChoice
            }
          };

        case 'data-timestamp':
          const timestampFormat = nodeData.format || 'iso'; // iso, unix, readable
          let timestamp;
          const now = new Date();
          
          switch (timestampFormat) {
            case 'unix':
              timestamp = Math.floor(now.getTime() / 1000);
              break;
            case 'readable':
              timestamp = now.toLocaleString('ru-RU');
              break;
            case 'iso':
            default:
              timestamp = now.toISOString();
              break;
          }
          
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_timestamp`]: timestamp
            }
          };

        default:
          throw new Error(`Unknown data node type: ${nodeType}`);
      }
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Data operation failed'
      };
    }
  }

  /**
   * Выполнить узел интеграции
   */
  private async executeIntegrationNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    try {
      switch (nodeType) {
        case 'integration-http':
          const url = this.processTemplate(nodeData.url || '', context.variables);
          const method = nodeData.method || 'GET';
          const headers = nodeData.headers || {};
          const body = nodeData.body ? this.processTemplate(nodeData.body, context.variables) : undefined;
          const timeout = parseInt(nodeData.timeout || '10000');
          const retries = parseInt(nodeData.retries || '0');

          // Настройка аутентификации
          const auth = nodeData.auth ? {
            type: nodeData.auth.type || 'bearer',
            token: nodeData.auth.token,
            username: nodeData.auth.username,
            password: nodeData.auth.password,
            apiKey: nodeData.auth.apiKey,
            apiKeyHeader: nodeData.auth.apiKeyHeader
          } : undefined;

          const response = await this.integrationManager.executeHttpRequest({
            url,
            method,
            headers,
            body,
            timeout,
            retries,
            auth
          });

          return {
            success: response.success,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_response`]: response.data,
              [`${node.id}_status`]: response.status,
              [`${node.id}_headers`]: response.headers,
              [`${node.id}_success`]: response.success
            }
          };

        case 'integration-webhook':
          // Регистрация webhook endpoint
          const webhookUrl = this.processTemplate(nodeData.webhookUrl || '', context.variables);
          const webhookSecret = nodeData.secret || '';
          
          const webhookResult = await this.integrationManager.createWebhook(webhookUrl, webhookSecret);
          
          return {
            success: webhookResult.success,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_webhook_url`]: webhookUrl,
              [`${node.id}_webhook_id`]: webhookResult.webhookId,
              [`${node.id}_webhook_registered`]: webhookResult.success
            }
          };

        case 'integration-database':
          // Работа с базой данных через IntegrationManager
          const dbOperation = nodeData.operation || 'read';
          const dbTable = nodeData.table || 'default';
          const dbData = nodeData.data ? JSON.parse(this.processTemplate(JSON.stringify(nodeData.data), context.variables)) : {};
          
          const dbResult = await this.integrationManager.databaseOperation(dbOperation, dbTable, dbData);
          
          return {
            success: true,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_db_operation`]: dbOperation,
              [`${node.id}_db_result`]: dbResult,
              [`${node.id}_db_table`]: dbTable
            }
          };

        case 'integration-email':
          // Отправка email через IntegrationManager
          const emailTo = this.processTemplate(nodeData.to || '', context.variables);
          const emailSubject = this.processTemplate(nodeData.subject || '', context.variables);
          const emailBody = this.processTemplate(nodeData.body || '', context.variables);
          const emailFrom = nodeData.from || '';
          
          const emailSent = await this.integrationManager.sendEmail(emailTo, emailSubject, emailBody, emailFrom);
          
          return {
            success: emailSent,
            nextNodes: this.getNextNodes(node.id, edges),
            variables: {
              [`${node.id}_email_sent`]: emailSent,
              [`${node.id}_email_to`]: emailTo,
              [`${node.id}_email_subject`]: emailSubject
            }
          };

        case 'integration-json-parse':
          // Парсинг JSON данных через IntegrationManager
          const jsonString = this.processTemplate(nodeData.jsonString || '', context.variables);
          try {
            const parsedData = await this.integrationManager.parseData({
              data: jsonString,
              format: 'json'
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_parsed_data`]: parsedData,
                [`${node.id}_parse_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-csv-parse':
          // Парсинг CSV через IntegrationManager
          const csvString = this.processTemplate(nodeData.csvString || '', context.variables);
          const delimiter = nodeData.delimiter || ',';
          
          try {
            const parsedData = await this.integrationManager.parseData({
              data: csvString,
              format: 'csv',
              options: { delimiter }
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_csv_data`]: parsedData,
                [`${node.id}_csv_rows_count`]: parsedData.length,
                [`${node.id}_parse_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `CSV parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-xml-parse':
          // Парсинг XML данных
          const xmlString = this.processTemplate(nodeData.xmlString || '', context.variables);
          
          try {
            const parsedXml = await this.integrationManager.parseData({
              data: xmlString,
              format: 'xml'
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_xml_data`]: parsedXml,
                [`${node.id}_parse_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `XML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-html-parse':
          // Парсинг HTML данных
          const htmlString = this.processTemplate(nodeData.htmlString || '', context.variables);
          const htmlSelector = nodeData.selector || '';
          
          try {
            const parsedHtml = await this.integrationManager.parseData({
              data: htmlString,
              format: 'html',
              options: { selector: htmlSelector }
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_html_data`]: parsedHtml,
                [`${node.id}_parse_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `HTML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-web-scraping':
          // Веб-скрапинг
          const scrapeUrl = this.processTemplate(nodeData.url || '', context.variables);
          const selectors = nodeData.selectors || {};
          const userAgent = nodeData.userAgent || '';
          const waitFor = nodeData.waitFor || '';
          const scrapeTimeout = parseInt(nodeData.timeout || '30000');
          
          try {
            const scrapedData = await this.integrationManager.performWebScraping({
              url: scrapeUrl,
              selectors,
              userAgent,
              waitFor,
              timeout: scrapeTimeout
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_scraped_data`]: scrapedData,
                [`${node.id}_scrape_success`]: true,
                [`${node.id}_scraped_url`]: scrapeUrl
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `Web scraping error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-yaml-parse':
          // Парсинг YAML данных
          const yamlString = this.processTemplate(nodeData.yamlString || '', context.variables);
          
          try {
            const parsedYaml = await this.integrationManager.parseData({
              data: yamlString,
              format: 'yaml'
            });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_yaml_data`]: parsedYaml,
                [`${node.id}_parse_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `YAML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-api-auth':
          // Аутентификация для API
          const authType = nodeData.authType || 'bearer'; // bearer, basic, oauth
          const authUrl = this.processTemplate(nodeData.authUrl || '', context.variables);
          const clientId = nodeData.clientId || '';
          const clientSecret = nodeData.clientSecret || '';
          const username = nodeData.username || '';
          const password = nodeData.password || '';
          
          try {
            // Простая имитация получения токена
            let authToken = '';
            
            switch (authType) {
              case 'bearer':
                // Имитируем получение Bearer токена
                authToken = `bearer_token_${Date.now()}`;
                break;
              case 'basic':
                // Создаем Basic auth токен
                authToken = btoa(`${username}:${password}`);
                break;
              case 'oauth':
                // Имитируем OAuth flow
                authToken = `oauth_token_${Date.now()}`;
                break;
            }
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_auth_token`]: authToken,
                [`${node.id}_auth_type`]: authType,
                [`${node.id}_auth_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        case 'integration-file-upload':
          // Загрузка файлов (заглушка)
          const uploadUrl = this.processTemplate(nodeData.uploadUrl || '', context.variables);
          const fileName = nodeData.fileName || 'file.txt';
          const fileContent = this.processTemplate(nodeData.fileContent || '', context.variables);
          const uploadHeaders = nodeData.headers || {};
          
          try {
            console.log(`Uploading file ${fileName} to ${uploadUrl}`);
            console.log(`File content length: ${fileContent.length} characters`);
            
            // Имитируем успешную загрузку
            const uploadResult = {
              fileId: `file_${Date.now()}`,
              fileName,
              size: fileContent.length,
              url: `${uploadUrl}/${fileName}`
            };
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              variables: {
                [`${node.id}_upload_result`]: uploadResult,
                [`${node.id}_file_id`]: uploadResult.fileId,
                [`${node.id}_file_url`]: uploadResult.url,
                [`${node.id}_upload_success`]: true
              }
            };
          } catch (error) {
            return {
              success: false,
              nextNodes: [],
              error: `File upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }

        default:
          throw new Error(`Unknown integration node type: ${nodeType}`);
      }
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Integration failed'
      };
    }
  }

  /**
   * Выполнить узел сценария
   */
  private async executeScenarioNode(
    node: BaseNode,
    context: SchemaExecutionContext,
    edges: BaseEdge[]
  ): Promise<NodeExecutionResult> {
    const nodeType = node.type;
    const nodeData = node.data;

    // Сценарии - это комплексные узлы, которые могут выполнять несколько действий
    try {
      switch (nodeType) {
        case 'scenario-welcome':
          await context.adapter.sendMessage(context.chatId, {
            text: `Добро пожаловать, ${context.variables.userName || 'пользователь'}! 👋`
          });
          break;

        case 'scenario-support':
          await context.adapter.sendMessage(context.chatId, {
            text: 'Обращение в поддержку зарегистрировано. Мы свяжемся с вами в ближайшее время.'
          });
          break;

        case 'scenario-faq':
          const faqQuestion = context.message?.text || '';
          const faqAnswers = nodeData.faqAnswers || {};
          
          // Простой поиск ответа по ключевым словам
          let answer = 'Извините, я не нашел ответ на ваш вопрос. Обратитесь в поддержку.';
          for (const [keywords, faqAnswer] of Object.entries(faqAnswers)) {
            if (faqQuestion.toLowerCase().includes(keywords.toLowerCase())) {
              answer = faqAnswer as string;
              break;
            }
          }
          
          await context.adapter.sendMessage(context.chatId, { text: answer });
          break;

        case 'scenario-survey':
          const surveyStep = context.sessionData.surveyStep || 0;
          const surveyQuestions = nodeData.questions || [];
          
          if (surveyStep < surveyQuestions.length) {
            const question = surveyQuestions[surveyStep];
            await context.adapter.sendMessage(context.chatId, { text: question });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              sessionData: {
                surveyStep: surveyStep + 1
              }
            };
          } else {
            await context.adapter.sendMessage(context.chatId, {
              text: 'Спасибо за участие в опросе!'
            });
          }
          break;

        case 'scenario-quiz':
          const quizStep = context.sessionData.quizStep || 0;
          const quizQuestions = nodeData.questions || [];
          const userAnswer = context.message?.text || '';
          
          if (quizStep < quizQuestions.length) {
            const question = quizQuestions[quizStep];
            
            // Проверяем ответ на предыдущий вопрос
            if (quizStep > 0 && userAnswer) {
              const previousQuestion = quizQuestions[quizStep - 1];
              const isCorrect = userAnswer.toLowerCase() === previousQuestion.correctAnswer?.toLowerCase();
              const score = context.sessionData.quizScore || 0;
              
              if (isCorrect) {
                await context.adapter.sendMessage(context.chatId, { text: '✅ Правильно!' });
                context.sessionData.quizScore = score + 1;
              } else {
                await context.adapter.sendMessage(context.chatId, { text: '❌ Неправильно.' });
              }
            }
            
            // Отправляем следующий вопрос
            await context.adapter.sendMessage(context.chatId, { text: question.text });
            
            return {
              success: true,
              nextNodes: this.getNextNodes(node.id, edges),
              sessionData: {
                quizStep: quizStep + 1,
                quizScore: context.sessionData.quizScore || 0
              }
            };
          } else {
            const finalScore = context.sessionData.quizScore || 0;
            await context.adapter.sendMessage(context.chatId, {
              text: `Квиз завершен! Ваш результат: ${finalScore}/${quizQuestions.length}`
            });
          }
          break;

        case 'scenario-booking':
          const bookingStep = context.sessionData.bookingStep || 'start';
          const userInput = context.message?.text || '';
          
          switch (bookingStep) {
            case 'start':
              await context.adapter.sendMessage(context.chatId, {
                text: 'Добро пожаловать в систему бронирования! Введите желаемую дату (ДД.ММ.ГГГГ):'
              });
              return {
                success: true,
                nextNodes: this.getNextNodes(node.id, edges),
                sessionData: { bookingStep: 'date' }
              };
              
            case 'date':
              await context.adapter.sendMessage(context.chatId, {
                text: `Дата ${userInput} принята. Введите желаемое время (ЧЧ:ММ):`
              });
              return {
                success: true,
                nextNodes: this.getNextNodes(node.id, edges),
                sessionData: { 
                  bookingStep: 'time',
                  bookingDate: userInput
                }
              };
              
            case 'time':
              await context.adapter.sendMessage(context.chatId, {
                text: `Бронирование на ${context.sessionData.bookingDate} в ${userInput} подтверждено!`
              });
              return {
                success: true,
                nextNodes: this.getNextNodes(node.id, edges),
                sessionData: { 
                  bookingStep: 'completed',
                  bookingTime: userInput
                }
              };
              
            default:
              await context.adapter.sendMessage(context.chatId, {
                text: 'Бронирование уже завершено.'
              });
          }
          break;

        case 'scenario-moderation':
          const messageText = context.message?.text || '';
          const bannedWords = nodeData.bannedWords || [];
          const moderationAction = nodeData.action || 'warn'; // warn, delete, ban
          
          const containsBannedWord = bannedWords.some((word: string) => 
            messageText.toLowerCase().includes(word.toLowerCase())
          );
          
          if (containsBannedWord) {
            switch (moderationAction) {
              case 'warn':
                await context.adapter.sendMessage(context.chatId, {
                  text: '⚠️ Предупреждение: сообщение содержит недопустимый контент.'
                });
                break;
              case 'delete':
                console.log(`Deleting message with banned content: ${messageText}`);
                await context.adapter.sendMessage(context.chatId, {
                  text: '🗑️ Сообщение удалено за нарушение правил.'
                });
                break;
              case 'ban':
                console.log(`Banning user ${context.userId} for banned content`);
                await context.adapter.sendMessage(context.chatId, {
                  text: '🚫 Пользователь заблокирован за нарушение правил.'
                });
                break;
            }
          }
          break;

        default:
          throw new Error(`Unknown scenario node type: ${nodeType}`);
      }

      return {
        success: true,
        nextNodes: this.getNextNodes(node.id, edges)
      };
    } catch (error) {
      return {
        success: false,
        nextNodes: [],
        error: error instanceof Error ? error.message : 'Scenario execution failed'
      };
    }
  }

  /**
   * Проверить, должен ли сработать триггерный узел
   */
  private shouldTriggerNode(node: BaseNode, context: SchemaExecutionContext): boolean {
    const nodeType = node.type;
    const nodeData = node.data;

    switch (nodeType) {
      case 'trigger-message':
        return !!context.message?.text;

      case 'trigger-command':
        const command = nodeData.command || '';
        return context.message?.text?.startsWith(command) || false;

      case 'trigger-callback':
        return !!context.message?.callbackData;

      case 'trigger-inline-query':
        return !!context.message?.text && context.message.text.startsWith('@');

      case 'trigger-join-group':
        return context.variables.eventType === 'join_group';

      case 'trigger-leave-group':
        return context.variables.eventType === 'leave_group';

      case 'trigger-schedule':
        // Проверяем, наступило ли запланированное время
        const scheduleTime = nodeData.scheduleTime || '';
        const currentTime = new Date().toISOString();
        return currentTime >= scheduleTime;

      default:
        return true;
    }
  }

  /**
   * Получить следующие узлы для выполнения
   */
  private getNextNodes(nodeId: string, edges: BaseEdge[]): string[] {
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
  }

  /**
   * Обработать шаблон с переменными
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Заменяем переменные в формате {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * Получить историю выполнения схем
   */
  getExecutionHistory(executionId?: string): SchemaExecutionResult[] {
    if (executionId) {
      return this.executionHistory.get(executionId) || [];
    }
    
    const allHistory: SchemaExecutionResult[] = [];
    for (const history of this.executionHistory.values()) {
      allHistory.push(...history);
    }
    
    return allHistory.sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * Очистить историю выполнения
   */
  clearExecutionHistory(executionId?: string): void {
    if (executionId) {
      this.executionHistory.delete(executionId);
    } else {
      this.executionHistory.clear();
    }
  }

  /**
   * Получить активные выполнения
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Остановить выполнение схемы
   */
  stopExecution(userId: string, chatId: string): boolean {
    const key = `${userId}-${chatId}`;
    return this.activeExecutions.delete(key);
  }

  /**
   * Получить статистику выполнения
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    activeExecutions: number;
  } {
    const allHistory = this.getExecutionHistory();
    const successful = allHistory.filter(h => h.success);
    const failed = allHistory.filter(h => !h.success);
    const avgTime = allHistory.length > 0 
      ? allHistory.reduce((sum, h) => sum + h.executionTime, 0) / allHistory.length 
      : 0;

    return {
      totalExecutions: allHistory.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: avgTime,
      activeExecutions: this.activeExecutions.size
    };
  }
}