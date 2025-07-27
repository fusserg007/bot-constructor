/**
 * Менеджер отладки для пошагового выполнения схем
 */
const EventEmitter = require('events');

class DebugManager extends EventEmitter {
  constructor() {
    super();
    this.debugSessions = new Map(); // botId -> DebugSession
    this.breakpoints = new Map();   // botId -> Set<nodeId>
    this.isDebugMode = false;
  }

  /**
   * Создает новую сессию отладки
   */
  createDebugSession(botId, schema, userId = null) {
    const session = new DebugSession(botId, schema, userId);
    this.debugSessions.set(botId, session);
    
    // Подписываемся на события сессии
    session.on('step', (data) => {
      this.emit('debug:step', { botId, ...data });
    });
    
    session.on('breakpoint', (data) => {
      this.emit('debug:breakpoint', { botId, ...data });
    });
    
    session.on('variable_change', (data) => {
      this.emit('debug:variable_change', { botId, ...data });
    });
    
    session.on('error', (data) => {
      this.emit('debug:error', { botId, ...data });
    });
    
    return session;
  }

  /**
   * Получает сессию отладки
   */
  getDebugSession(botId) {
    return this.debugSessions.get(botId);
  }

  /**
   * Удаляет сессию отладки
   */
  removeDebugSession(botId) {
    const session = this.debugSessions.get(botId);
    if (session) {
      session.stop();
      this.debugSessions.delete(botId);
    }
  }

  /**
   * Устанавливает точку останова
   */
  setBreakpoint(botId, nodeId) {
    if (!this.breakpoints.has(botId)) {
      this.breakpoints.set(botId, new Set());
    }
    this.breakpoints.get(botId).add(nodeId);
    
    const session = this.getDebugSession(botId);
    if (session) {
      session.addBreakpoint(nodeId);
    }
  }

  /**
   * Удаляет точку останова
   */
  removeBreakpoint(botId, nodeId) {
    const breakpoints = this.breakpoints.get(botId);
    if (breakpoints) {
      breakpoints.delete(nodeId);
      
      const session = this.getDebugSession(botId);
      if (session) {
        session.removeBreakpoint(nodeId);
      }
    }
  }

  /**
   * Получает все точки останова для бота
   */
  getBreakpoints(botId) {
    return Array.from(this.breakpoints.get(botId) || []);
  }

  /**
   * Включает/выключает режим отладки
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    this.emit('debug:mode_changed', { enabled });
  }

  /**
   * Получает статистику отладки
   */
  getDebugStats() {
    const stats = {
      activeSessions: this.debugSessions.size,
      totalBreakpoints: 0,
      debugMode: this.isDebugMode,
      sessions: []
    };

    for (const [botId, session] of this.debugSessions) {
      const breakpoints = this.breakpoints.get(botId) || new Set();
      stats.totalBreakpoints += breakpoints.size;
      
      stats.sessions.push({
        botId,
        status: session.getStatus(),
        currentNode: session.getCurrentNode(),
        breakpoints: Array.from(breakpoints),
        variables: session.getVariables(),
        executionTime: session.getExecutionTime()
      });
    }

    return stats;
  }
}

/**
 * Сессия отладки для конкретного бота
 */
class DebugSession extends EventEmitter {
  constructor(botId, schema, userId = null) {
    super();
    this.botId = botId;
    this.schema = schema;
    this.userId = userId;
    this.status = 'stopped'; // stopped, running, paused, error
    this.currentNode = null;
    this.executionStack = [];
    this.variables = new Map();
    this.breakpoints = new Set();
    this.startTime = null;
    this.stepCount = 0;
    this.executionHistory = [];
  }

  /**
   * Запускает выполнение схемы
   */
  start(triggerNode = null, inputData = {}) {
    this.status = 'running';
    this.startTime = Date.now();
    this.stepCount = 0;
    this.executionHistory = [];
    
    // Инициализируем переменные
    this.initializeVariables(inputData);
    
    // Находим стартовый узел
    const startNode = triggerNode || this.findStartNode();
    if (!startNode) {
      this.setError('Не найден стартовый узел для выполнения');
      return;
    }
    
    this.emit('debug:session_started', {
      botId: this.botId,
      startNode: startNode.id,
      variables: this.getVariables()
    });
    
    // Начинаем выполнение
    this.executeNode(startNode);
  }

  /**
   * Останавливает выполнение
   */
  stop() {
    this.status = 'stopped';
    this.currentNode = null;
    this.executionStack = [];
    
    this.emit('debug:session_stopped', {
      botId: this.botId,
      executionTime: this.getExecutionTime(),
      stepCount: this.stepCount
    });
  }

  /**
   * Пауза выполнения
   */
  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.emit('debug:session_paused', {
        botId: this.botId,
        currentNode: this.currentNode?.id,
        variables: this.getVariables()
      });
    }
  }

  /**
   * Продолжение выполнения
   */
  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this.emit('debug:session_resumed', {
        botId: this.botId,
        currentNode: this.currentNode?.id
      });
      
      // Продолжаем с текущего узла
      if (this.currentNode) {
        this.executeNextStep();
      }
    }
  }

  /**
   * Выполнение одного шага
   */
  stepOver() {
    if (this.status === 'paused' && this.currentNode) {
      this.executeNextStep();
    }
  }

  /**
   * Выполняет узел схемы
   */
  executeNode(node) {
    if (this.status !== 'running') {
      return;
    }

    this.currentNode = node;
    this.stepCount++;
    
    // Проверяем точку останова
    if (this.breakpoints.has(node.id)) {
      this.pause();
      this.emit('breakpoint', {
        nodeId: node.id,
        nodeType: node.type,
        nodeData: node.data,
        variables: this.getVariables()
      });
      return;
    }

    // Записываем шаг в историю
    const stepData = {
      timestamp: Date.now(),
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.data?.label || node.type,
      variables: { ...this.getVariables() },
      stepNumber: this.stepCount
    };
    
    this.executionHistory.push(stepData);
    
    this.emit('step', stepData);

    // Выполняем узел в зависимости от типа
    try {
      this.processNode(node);
    } catch (error) {
      this.setError(`Ошибка выполнения узла ${node.id}: ${error.message}`);
    }
  }

  /**
   * Обрабатывает узел в зависимости от типа
   */
  processNode(node) {
    switch (node.type) {
      case 'trigger-command':
        this.processTriggerCommand(node);
        break;
      case 'action-send-message':
        this.processActionSendMessage(node);
        break;
      case 'action-send-media':
        this.processActionSendMedia(node);
        break;
      case 'condition-text':
        this.processConditionText(node);
        break;
      case 'action-set-variable':
        this.processActionSetVariable(node);
        break;
      default:
        console.warn(`Неизвестный тип узла: ${node.type}`);
        this.executeNextStep();
    }
  }

  /**
   * Обработка триггера команды
   */
  processTriggerCommand(node) {
    // Симуляция получения команды
    this.setVariable('last_command', node.data.command);
    this.setVariable('trigger_time', new Date().toISOString());
    
    setTimeout(() => {
      this.executeNextStep();
    }, 100);
  }

  /**
   * Обработка отправки сообщения
   */
  processActionSendMessage(node) {
    const messageText = this.replaceVariables(node.data.text || '');
    
    // Симуляция отправки сообщения
    this.setVariable('last_message', messageText);
    this.setVariable('message_sent_at', new Date().toISOString());
    
    console.log(`[DEBUG] Отправка сообщения: ${messageText.substring(0, 50)}...`);
    
    setTimeout(() => {
      this.executeNextStep();
    }, 200);
  }

  /**
   * Обработка отправки медиа
   */
  processActionSendMedia(node) {
    const mediaUrl = this.replaceVariables(node.data.mediaUrl || '');
    const caption = this.replaceVariables(node.data.caption || '');
    
    this.setVariable('last_media_url', mediaUrl);
    this.setVariable('last_media_caption', caption);
    
    console.log(`[DEBUG] Отправка медиа: ${mediaUrl}`);
    
    setTimeout(() => {
      this.executeNextStep();
    }, 300);
  }

  /**
   * Обработка текстового условия
   */
  processConditionText(node) {
    const conditions = node.data.conditions || [];
    const operator = node.data.operator || 'AND';
    const testText = this.getVariable('message_text') || '';
    
    let result = operator === 'AND';
    
    for (const condition of conditions) {
      const conditionResult = this.evaluateTextCondition(condition, testText);
      
      if (operator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }
    
    this.setVariable('condition_result', result);
    
    // Переходим к соответствующему выходу
    setTimeout(() => {
      this.executeNextStep(result ? 'true' : 'false');
    }, 100);
  }

  /**
   * Обработка установки переменной
   */
  processActionSetVariable(node) {
    const variableName = node.data.variableName;
    const variableValue = this.replaceVariables(node.data.variableValue || '');
    
    this.setVariable(variableName, variableValue);
    
    setTimeout(() => {
      this.executeNextStep();
    }, 50);
  }

  /**
   * Выполняет следующий шаг
   */
  executeNextStep(outputHandle = null) {
    if (this.status !== 'running') {
      return;
    }

    const nextNodes = this.getNextNodes(this.currentNode, outputHandle);
    
    if (nextNodes.length === 0) {
      // Завершаем выполнение
      this.stop();
      return;
    }
    
    if (nextNodes.length === 1) {
      // Переходим к следующему узлу
      this.executeNode(nextNodes[0]);
    } else {
      // Множественные выходы - выполняем параллельно
      for (const nextNode of nextNodes) {
        setTimeout(() => {
          this.executeNode(nextNode);
        }, 10);
      }
    }
  }

  /**
   * Получает следующие узлы для выполнения
   */
  getNextNodes(currentNode, outputHandle = null) {
    const edges = this.schema.configuration?.edges || [];
    const nodes = this.schema.configuration?.nodes || [];
    
    const outgoingEdges = edges.filter(edge => {
      if (edge.source !== currentNode.id) return false;
      if (outputHandle && edge.sourceHandle !== outputHandle) return false;
      return true;
    });
    
    return outgoingEdges.map(edge => {
      return nodes.find(node => node.id === edge.target);
    }).filter(Boolean);
  }

  /**
   * Находит стартовый узел
   */
  findStartNode() {
    const nodes = this.schema.configuration?.nodes || [];
    return nodes.find(node => node.type?.startsWith('trigger-'));
  }

  /**
   * Инициализирует переменные
   */
  initializeVariables(inputData = {}) {
    // Глобальные переменные из схемы
    const schemaVariables = this.schema.configuration?.variables || {};
    for (const [key, variable] of Object.entries(schemaVariables)) {
      this.setVariable(key, variable.defaultValue || '');
    }
    
    // Входные данные
    for (const [key, value] of Object.entries(inputData)) {
      this.setVariable(key, value);
    }
    
    // Системные переменные
    this.setVariable('user_id', this.userId || 'debug_user');
    this.setVariable('bot_id', this.botId);
    this.setVariable('debug_mode', true);
    this.setVariable('session_start', new Date().toISOString());
  }

  /**
   * Устанавливает переменную
   */
  setVariable(name, value) {
    const oldValue = this.variables.get(name);
    this.variables.set(name, value);
    
    if (oldValue !== value) {
      this.emit('variable_change', {
        name,
        oldValue,
        newValue: value,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Получает переменную
   */
  getVariable(name) {
    return this.variables.get(name);
  }

  /**
   * Получает все переменные
   */
  getVariables() {
    return Object.fromEntries(this.variables);
  }

  /**
   * Заменяет переменные в тексте
   */
  replaceVariables(text) {
    let result = text;
    
    for (const [key, value] of this.variables) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  /**
   * Оценивает текстовое условие
   */
  evaluateTextCondition(condition, text) {
    const value = condition.value.toLowerCase();
    const testText = text.toLowerCase();
    
    switch (condition.type) {
      case 'contains':
        return testText.includes(value);
      case 'equals':
        return testText === value;
      case 'starts_with':
        return testText.startsWith(value);
      case 'ends_with':
        return testText.endsWith(value);
      default:
        return false;
    }
  }

  /**
   * Добавляет точку останова
   */
  addBreakpoint(nodeId) {
    this.breakpoints.add(nodeId);
  }

  /**
   * Удаляет точку останова
   */
  removeBreakpoint(nodeId) {
    this.breakpoints.delete(nodeId);
  }

  /**
   * Устанавливает ошибку
   */
  setError(message) {
    this.status = 'error';
    this.emit('error', {
      message,
      currentNode: this.currentNode?.id,
      variables: this.getVariables(),
      executionHistory: this.executionHistory
    });
  }

  /**
   * Получает текущий статус
   */
  getStatus() {
    return this.status;
  }

  /**
   * Получает текущий узел
   */
  getCurrentNode() {
    return this.currentNode;
  }

  /**
   * Получает время выполнения
   */
  getExecutionTime() {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  /**
   * Получает историю выполнения
   */
  getExecutionHistory() {
    return this.executionHistory;
  }
}

module.exports = DebugManager;