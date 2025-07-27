/**
 * Тест инструментов отладки
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

// Функция для HTTP запроса
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Функция создания системы отладки
async function createDebugSystem() {
  console.log('🔧 Создание системы отладки...\n');
  
  try {
    // Создаем класс DebugManager
    const debugManagerCode = `/**
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
      this.setError(\`Ошибка выполнения узла \${node.id}: \${error.message}\`);
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
        console.warn(\`Неизвестный тип узла: \${node.type}\`);
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
    
    console.log(\`[DEBUG] Отправка сообщения: \${messageText.substring(0, 50)}...\`);
    
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
    
    console.log(\`[DEBUG] Отправка медиа: \${mediaUrl}\`);
    
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
      const placeholder = \`{{\${key}}}\`;
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

module.exports = DebugManager;`;
    
    // Сохраняем DebugManager
    const debugManagerPath = path.join(__dirname, '..', 'utils', 'DebugManager.js');
    fs.writeFileSync(debugManagerPath, debugManagerCode);
    
    console.log('✅ DebugManager создан');
    console.log(`📄 Файл: ${debugManagerPath}`);
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка создания системы отладки:', error.message);
    return false;
  }
}

// Функция создания API для отладки
async function createDebugAPI() {
  console.log('\n🔌 Создание API для отладки...\n');
  
  try {
    // Создаем роут для API отладки
    const debugApiCode = `const express = require('express');
const DebugManager = require('../utils/DebugManager');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Глобальный экземпляр менеджера отладки
const debugManager = new DebugManager();

/**
 * Создание сессии отладки
 * POST /api/debug/session
 */
router.post('/session', async (req, res) => {
  try {
    const { botId, userId } = req.body;
    
    if (!botId) {
      return res.status(400).json({
        success: false,
        error: 'botId обязателен'
      });
    }
    
    // Загружаем схему бота
    const botPath = path.join(__dirname, '..', 'data', 'bots', \`bot_\${botId}.json\`);
    
    if (!fs.existsSync(botPath)) {
      return res.status(404).json({
        success: false,
        error: 'Бот не найден'
      });
    }
    
    const botData = JSON.parse(fs.readFileSync(botPath, 'utf8'));
    
    // Создаем сессию отладки
    const session = debugManager.createDebugSession(botId, botData, userId);
    
    res.json({
      success: true,
      sessionId: botId,
      status: session.getStatus(),
      message: 'Сессия отладки создана'
    });
    
  } catch (error) {
    console.error('Ошибка создания сессии отладки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Запуск отладки
 * POST /api/debug/:botId/start
 */
router.post('/:botId/start', async (req, res) => {
  try {
    const { botId } = req.params;
    const { triggerNode, inputData = {} } = req.body;
    
    const session = debugManager.getDebugSession(botId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    // Запускаем отладку
    session.start(triggerNode, inputData);
    
    res.json({
      success: true,
      status: session.getStatus(),
      currentNode: session.getCurrentNode()?.id,
      variables: session.getVariables()
    });
    
  } catch (error) {
    console.error('Ошибка запуска отладки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Остановка отладки
 * POST /api/debug/:botId/stop
 */
router.post('/:botId/stop', async (req, res) => {
  try {
    const { botId } = req.params;
    
    const session = debugManager.getDebugSession(botId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    session.stop();
    
    res.json({
      success: true,
      status: session.getStatus(),
      executionTime: session.getExecutionTime(),
      stepCount: session.stepCount
    });
    
  } catch (error) {
    console.error('Ошибка остановки отладки:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Пауза/продолжение отладки
 * POST /api/debug/:botId/pause
 * POST /api/debug/:botId/resume
 */
router.post('/:botId/pause', async (req, res) => {
  try {
    const { botId } = req.params;
    const session = debugManager.getDebugSession(botId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    session.pause();
    
    res.json({
      success: true,
      status: session.getStatus(),
      currentNode: session.getCurrentNode()?.id
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:botId/resume', async (req, res) => {
  try {
    const { botId } = req.params;
    const session = debugManager.getDebugSession(botId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    session.resume();
    
    res.json({
      success: true,
      status: session.getStatus(),
      currentNode: session.getCurrentNode()?.id
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Пошаговое выполнение
 * POST /api/debug/:botId/step
 */
router.post('/:botId/step', async (req, res) => {
  try {
    const { botId } = req.params;
    const session = debugManager.getDebugSession(botId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    session.stepOver();
    
    res.json({
      success: true,
      status: session.getStatus(),
      currentNode: session.getCurrentNode()?.id,
      variables: session.getVariables()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Управление точками останова
 * POST /api/debug/:botId/breakpoint
 * DELETE /api/debug/:botId/breakpoint/:nodeId
 */
router.post('/:botId/breakpoint', async (req, res) => {
  try {
    const { botId } = req.params;
    const { nodeId } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: 'nodeId обязателен'
      });
    }
    
    debugManager.setBreakpoint(botId, nodeId);
    
    res.json({
      success: true,
      breakpoints: debugManager.getBreakpoints(botId)
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:botId/breakpoint/:nodeId', async (req, res) => {
  try {
    const { botId, nodeId } = req.params;
    
    debugManager.removeBreakpoint(botId, nodeId);
    
    res.json({
      success: true,
      breakpoints: debugManager.getBreakpoints(botId)
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Получение состояния отладки
 * GET /api/debug/:botId/status
 */
router.get('/:botId/status', async (req, res) => {
  try {
    const { botId } = req.params;
    const session = debugManager.getDebugSession(botId);
    
    if (!session) {
      return res.json({
        success: true,
        exists: false,
        status: 'no_session'
      });
    }
    
    res.json({
      success: true,
      exists: true,
      status: session.getStatus(),
      currentNode: session.getCurrentNode()?.id,
      variables: session.getVariables(),
      executionTime: session.getExecutionTime(),
      stepCount: session.stepCount,
      breakpoints: debugManager.getBreakpoints(botId),
      executionHistory: session.getExecutionHistory()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Получение переменных
 * GET /api/debug/:botId/variables
 */
router.get('/:botId/variables', async (req, res) => {
  try {
    const { botId } = req.params;
    const session = debugManager.getDebugSession(botId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    res.json({
      success: true,
      variables: session.getVariables()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Установка переменной
 * POST /api/debug/:botId/variables
 */
router.post('/:botId/variables', async (req, res) => {
  try {
    const { botId } = req.params;
    const { name, value } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name обязателен'
      });
    }
    
    const session = debugManager.getDebugSession(botId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Сессия отладки не найдена'
      });
    }
    
    session.setVariable(name, value);
    
    res.json({
      success: true,
      variables: session.getVariables()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Получение статистики отладки
 * GET /api/debug/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = debugManager.getDebugStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;`;    

    // Сохраняем API роут
    const debugApiPath = path.join(__dirname, '..', 'routes', 'debug.js');
    fs.writeFileSync(debugApiPath, debugApiCode);
    
    console.log('✅ API отладки создан');
    console.log(`📄 Файл: ${debugApiPath}`);
    console.log('🔌 Эндпоинты:');
    console.log('  • POST /api/debug/session - создание сессии');
    console.log('  • POST /api/debug/:botId/start - запуск отладки');
    console.log('  • POST /api/debug/:botId/stop - остановка');
    console.log('  • POST /api/debug/:botId/pause - пауза');
    console.log('  • POST /api/debug/:botId/resume - продолжение');
    console.log('  • POST /api/debug/:botId/step - пошаговое выполнение');
    console.log('  • GET /api/debug/:botId/status - состояние отладки');
    console.log('  • GET /api/debug/:botId/variables - переменные');
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка создания API отладки:', error.message);
    return false;
  }
}

// Функция создания веб-интерфейса отладки
async function createDebugInterface() {
  console.log('\n🌐 Создание веб-интерфейса отладки...\n');
  
  try {
    // Создаем HTML страницу для отладки
    const debugHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отладчик ботов - Bot Constructor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            height: 100vh;
            overflow: hidden;
        }
        
        .debug-container {
            display: grid;
            grid-template-columns: 300px 1fr 350px;
            grid-template-rows: 60px 1fr;
            height: 100vh;
        }
        
        .debug-header {
            grid-column: 1 / -1;
            background: #1f2937;
            color: white;
            padding: 0 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .debug-header h1 {
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .debug-controls {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #2563eb;
        }
        
        .btn:disabled {
            background: #6b7280;
            cursor: not-allowed;
        }
        
        .btn-success { background: #10b981; }
        .btn-success:hover { background: #059669; }
        
        .btn-warning { background: #f59e0b; }
        .btn-warning:hover { background: #d97706; }
        
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        
        .debug-sidebar {
            background: white;
            border-right: 1px solid #e5e7eb;
            overflow-y: auto;
        }
        
        .debug-main {
            background: white;
            overflow-y: auto;
        }
        
        .debug-inspector {
            background: white;
            border-left: 1px solid #e5e7eb;
            overflow-y: auto;
        }
        
        .panel {
            padding: 1rem;
        }
        
        .panel h2 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.5rem;
        }
        
        .bot-selector {
            margin-bottom: 1rem;
        }
        
        .bot-selector input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .session-info {
            background: #f9fafb;
            padding: 0.75rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 0.8rem;
        }
        
        .session-info.running {
            background: #d1fae5;
            border-left: 4px solid #10b981;
        }
        
        .session-info.paused {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
        }
        
        .session-info.error {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
        }
        
        .execution-history {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
        }
        
        .history-item {
            padding: 0.5rem;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.8rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .history-item:hover {
            background: #f9fafb;
        }
        
        .history-item.current {
            background: #dbeafe;
            border-left: 3px solid #3b82f6;
        }
        
        .history-item .step-number {
            font-weight: 600;
            color: #6b7280;
        }
        
        .history-item .node-label {
            font-weight: 500;
            color: #1f2937;
        }
        
        .history-item .timestamp {
            color: #6b7280;
            font-size: 0.7rem;
        }
        
        .variables-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .variable-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.8rem;
        }
        
        .variable-name {
            font-weight: 500;
            color: #1f2937;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        .variable-value {
            color: #6b7280;
            font-family: 'Monaco', 'Menlo', monospace;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .variable-value.string {
            color: #059669;
        }
        
        .variable-value.number {
            color: #dc2626;
        }
        
        .variable-value.boolean {
            color: #7c3aed;
        }
        
        .breakpoints-list {
            max-height: 200px;
            overflow-y: auto;
        }
        
        .breakpoint-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.8rem;
        }
        
        .breakpoint-node {
            font-family: 'Monaco', 'Menlo', monospace;
            color: #1f2937;
        }
        
        .breakpoint-remove {
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.2rem 0.4rem;
            border-radius: 2px;
            cursor: pointer;
            font-size: 0.7rem;
        }
        
        .schema-viewer {
            padding: 1rem;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.8rem;
            background: #f9fafb;
            border-radius: 4px;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .node-item {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .node-item:hover {
            border-color: #3b82f6;
        }
        
        .node-item.current {
            border-color: #10b981;
            background: #d1fae5;
        }
        
        .node-item.breakpoint {
            border-color: #ef4444;
            background: #fee2e2;
        }
        
        .node-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.25rem;
        }
        
        .node-type {
            font-size: 0.7rem;
            padding: 0.1rem 0.3rem;
            border-radius: 2px;
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .node-label {
            font-weight: 500;
            color: #1f2937;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }
        
        .status-indicator.stopped { background: #6b7280; }
        .status-indicator.running { background: #10b981; }
        .status-indicator.paused { background: #f59e0b; }
        .status-indicator.error { background: #ef4444; }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }
        
        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
            font-size: 0.9rem;
        }
        
        .success {
            background: #d1fae5;
            color: #065f46;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="debug-container">
        <div class="debug-header">
            <h1>🐛 Отладчик ботов</h1>
            <div class="debug-controls">
                <button class="btn btn-success" id="startBtn" onclick="startDebugging()">▶ Запуск</button>
                <button class="btn btn-warning" id="pauseBtn" onclick="pauseDebugging()" disabled>⏸ Пауза</button>
                <button class="btn" id="stepBtn" onclick="stepDebugging()" disabled>⏭ Шаг</button>
                <button class="btn btn-danger" id="stopBtn" onclick="stopDebugging()" disabled>⏹ Стоп</button>
            </div>
        </div>
        
        <div class="debug-sidebar">
            <div class="panel">
                <h2>Настройки сессии</h2>
                
                <div class="bot-selector">
                    <input type="text" id="botIdInput" placeholder="ID бота для отладки">
                    <button class="btn" onclick="createSession()" style="margin-top: 0.5rem; width: 100%;">Создать сессию</button>
                </div>
                
                <div class="session-info" id="sessionInfo">
                    <div><span class="status-indicator stopped"></span>Сессия не создана</div>
                </div>
            </div>
            
            <div class="panel">
                <h2>История выполнения</h2>
                <div class="execution-history" id="executionHistory">
                    <div class="loading">Запустите отладку для просмотра истории</div>
                </div>
            </div>
            
            <div class="panel">
                <h2>Точки останова</h2>
                <div class="breakpoints-list" id="breakpointsList">
                    <div class="loading">Нет точек останова</div>
                </div>
            </div>
        </div>
        
        <div class="debug-main">
            <div class="panel">
                <h2>Схема бота</h2>
                <div class="schema-viewer" id="schemaViewer">
                    <div class="loading">Создайте сессию для просмотра схемы</div>
                </div>
            </div>
        </div>
        
        <div class="debug-inspector">
            <div class="panel">
                <h2>Переменные</h2>
                <div class="variables-list" id="variablesList">
                    <div class="loading">Нет активных переменных</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let currentBotId = null;
        let debugStatus = 'stopped';
        let updateInterval = null;
        
        // Создание сессии отладки
        async function createSession() {
            const botId = document.getElementById('botIdInput').value.trim();
            if (!botId) {
                alert('Введите ID бота');
                return;
            }
            
            try {
                const response = await fetch('/api/debug/session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        botId: botId,
                        userId: 'debug_user'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentBotId = botId;
                    updateSessionInfo();
                    loadBotSchema();
                    startStatusUpdates();
                    showSuccess('Сессия отладки создана');
                } else {
                    showError('Ошибка создания сессии: ' + data.error);
                }
                
            } catch (error) {
                showError('Ошибка создания сессии: ' + error.message);
            }
        }
        
        // Запуск отладки
        async function startDebugging() {
            if (!currentBotId) {
                alert('Сначала создайте сессию');
                return;
            }
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/start\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputData: {
                            message_text: 'Тестовое сообщение для отладки',
                            user_id: 'debug_user_123'
                        }
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    debugStatus = data.status;
                    updateControls();
                    updateSessionInfo();
                } else {
                    showError('Ошибка запуска: ' + data.error);
                }
                
            } catch (error) {
                showError('Ошибка запуска: ' + error.message);
            }
        }
        
        // Пауза отладки
        async function pauseDebugging() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/pause\`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    debugStatus = data.status;
                    updateControls();
                    updateSessionInfo();
                }
                
            } catch (error) {
                showError('Ошибка паузы: ' + error.message);
            }
        }
        
        // Продолжение отладки
        async function resumeDebugging() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/resume\`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    debugStatus = data.status;
                    updateControls();
                    updateSessionInfo();
                }
                
            } catch (error) {
                showError('Ошибка продолжения: ' + error.message);
            }
        }
        
        // Пошаговое выполнение
        async function stepDebugging() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/step\`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    debugStatus = data.status;
                    updateControls();
                    updateSessionInfo();
                    updateVariables();
                }
                
            } catch (error) {
                showError('Ошибка шага: ' + error.message);
            }
        }
        
        // Остановка отладки
        async function stopDebugging() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/stop\`, {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    debugStatus = data.status;
                    updateControls();
                    updateSessionInfo();
                }
                
            } catch (error) {
                showError('Ошибка остановки: ' + error.message);
            }
        }
        
        // Обновление информации о сессии
        async function updateSessionInfo() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/status\`);
                const data = await response.json();
                
                if (data.success && data.exists) {
                    const sessionInfo = document.getElementById('sessionInfo');
                    sessionInfo.className = \`session-info \${data.status}\`;
                    
                    const statusText = {
                        'stopped': 'Остановлена',
                        'running': 'Выполняется',
                        'paused': 'На паузе',
                        'error': 'Ошибка'
                    }[data.status] || data.status;
                    
                    sessionInfo.innerHTML = \`
                        <div><span class="status-indicator \${data.status}"></span>\${statusText}</div>
                        <div>Бот: \${currentBotId}</div>
                        <div>Текущий узел: \${data.currentNode || 'Нет'}</div>
                        <div>Время выполнения: \${data.executionTime || 0}мс</div>
                        <div>Шагов: \${data.stepCount || 0}</div>
                    \`;
                    
                    debugStatus = data.status;
                    updateControls();
                    
                    if (data.executionHistory) {
                        updateExecutionHistory(data.executionHistory);
                    }
                    
                    if (data.variables) {
                        displayVariables(data.variables);
                    }
                }
                
            } catch (error) {
                console.error('Ошибка обновления статуса:', error);
            }
        }
        
        // Обновление переменных
        async function updateVariables() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/debug/\${currentBotId}/variables\`);
                const data = await response.json();
                
                if (data.success) {
                    displayVariables(data.variables);
                }
                
            } catch (error) {
                console.error('Ошибка обновления переменных:', error);
            }
        }
        
        // Отображение переменных
        function displayVariables(variables) {
            const variablesList = document.getElementById('variablesList');
            
            if (!variables || Object.keys(variables).length === 0) {
                variablesList.innerHTML = '<div class="loading">Нет переменных</div>';
                return;
            }
            
            const variablesHtml = Object.entries(variables).map(([name, value]) => {
                const valueType = typeof value;
                const displayValue = String(value).length > 20 ? 
                    String(value).substring(0, 20) + '...' : 
                    String(value);
                
                return \`
                    <div class="variable-item">
                        <div class="variable-name">\${name}</div>
                        <div class="variable-value \${valueType}">\${displayValue}</div>
                    </div>
                \`;
            }).join('');
            
            variablesList.innerHTML = variablesHtml;
        }
        
        // Обновление истории выполнения
        function updateExecutionHistory(history) {
            const historyContainer = document.getElementById('executionHistory');
            
            if (!history || history.length === 0) {
                historyContainer.innerHTML = '<div class="loading">История пуста</div>';
                return;
            }
            
            const historyHtml = history.map((step, index) => {
                const timestamp = new Date(step.timestamp).toLocaleTimeString();
                const isCurrent = index === history.length - 1;
                
                return \`
                    <div class="history-item \${isCurrent ? 'current' : ''}">
                        <div class="step-number">Шаг \${step.stepNumber}</div>
                        <div class="node-label">\${step.nodeLabel}</div>
                        <div class="timestamp">\${timestamp}</div>
                    </div>
                \`;
            }).join('');
            
            historyContainer.innerHTML = historyHtml;
            historyContainer.scrollTop = historyContainer.scrollHeight;
        }
        
        // Загрузка схемы бота
        async function loadBotSchema() {
            if (!currentBotId) return;
            
            try {
                const response = await fetch(\`/api/bots/\${currentBotId}\`);
                const data = await response.json();
                
                if (data.success || data.data) {
                    const botData = data.data || data;
                    displayBotSchema(botData);
                }
                
            } catch (error) {
                console.error('Ошибка загрузки схемы:', error);
            }
        }
        
        // Отображение схемы бота
        function displayBotSchema(botData) {
            const schemaViewer = document.getElementById('schemaViewer');
            const nodes = botData.configuration?.nodes || [];
            
            if (nodes.length === 0) {
                schemaViewer.innerHTML = '<div class="loading">Схема пуста</div>';
                return;
            }
            
            const nodesHtml = nodes.map(node => {
                return \`
                    <div class="node-item" data-node-id="\${node.id}" onclick="toggleBreakpoint('\${node.id}')">
                        <div class="node-header">
                            <div class="node-type">\${node.type}</div>
                        </div>
                        <div class="node-label">\${node.data?.label || node.id}</div>
                    </div>
                \`;
            }).join('');
            
            schemaViewer.innerHTML = nodesHtml;
        }
        
        // Переключение точки останова
        async function toggleBreakpoint(nodeId) {
            if (!currentBotId) return;
            
            try {
                // Проверяем, есть ли уже точка останова
                const nodeElement = document.querySelector(\`[data-node-id="\${nodeId}"]\`);
                const hasBreakpoint = nodeElement.classList.contains('breakpoint');
                
                if (hasBreakpoint) {
                    // Удаляем точку останова
                    const response = await fetch(\`/api/debug/\${currentBotId}/breakpoint/\${nodeId}\`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        nodeElement.classList.remove('breakpoint');
                    }
                } else {
                    // Добавляем точку останова
                    const response = await fetch(\`/api/debug/\${currentBotId}/breakpoint\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ nodeId })
                    });
                    
                    if (response.ok) {
                        nodeElement.classList.add('breakpoint');
                    }
                }
                
            } catch (error) {
                showError('Ошибка управления точкой останова: ' + error.message);
            }
        }
        
        // Обновление элементов управления
        function updateControls() {
            const startBtn = document.getElementById('startBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            const stepBtn = document.getElementById('stepBtn');
            const stopBtn = document.getElementById('stopBtn');
            
            switch (debugStatus) {
                case 'stopped':
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    stepBtn.disabled = true;
                    stopBtn.disabled = true;
                    pauseBtn.textContent = '⏸ Пауза';
                    pauseBtn.onclick = pauseDebugging;
                    break;
                    
                case 'running':
                    startBtn.disabled = true;
                    pauseBtn.disabled = false;
                    stepBtn.disabled = true;
                    stopBtn.disabled = false;
                    pauseBtn.textContent = '⏸ Пауза';
                    pauseBtn.onclick = pauseDebugging;
                    break;
                    
                case 'paused':
                    startBtn.disabled = true;
                    pauseBtn.disabled = false;
                    stepBtn.disabled = false;
                    stopBtn.disabled = false;
                    pauseBtn.textContent = '▶ Продолжить';
                    pauseBtn.onclick = resumeDebugging;
                    break;
                    
                case 'error':
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    stepBtn.disabled = true;
                    stopBtn.disabled = false;
                    break;
            }
        }
        
        // Автоматическое обновление статуса
        function startStatusUpdates() {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            
            updateInterval = setInterval(() => {
                if (currentBotId && (debugStatus === 'running' || debugStatus === 'paused')) {
                    updateSessionInfo();
                }
            }, 1000);
        }
        
        // Показать ошибку
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            document.body.appendChild(errorDiv);
            
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 5000);
        }
        
        // Показать успех
        function showSuccess(message) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success';
            successDiv.textContent = message;
            document.body.appendChild(successDiv);
            
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 3000);
        }
        
        // Инициализация
        document.addEventListener('DOMContentLoaded', function() {
            updateControls();
        });
    </script>
</body>
</html>`;    
  
  // Сохраняем HTML файл
    const debugHtmlPath = path.join(__dirname, '..', 'public', 'debug.html');
    fs.writeFileSync(debugHtmlPath, debugHtml);
    
    console.log('✅ Веб-интерфейс отладки создан');
    console.log(`📄 Файл: ${debugHtmlPath}`);
    console.log('🌐 Доступен по адресу: http://localhost:3002/debug.html');
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка создания веб-интерфейса:', error.message);
    return false;
  }
}

// Функция тестирования системы отладки
async function testDebugSystem() {
  console.log('\n🧪 Тестирование системы отладки...\n');
  
  try {
    // Создаем тестового бота для отладки
    const testBotId = `debug-test-bot-${Date.now()}`;
    const testBotData = {
      id: testBotId,
      name: "Debug Test Bot",
      description: "Тестовый бот для отладки",
      token: "DEBUG_TEST_TOKEN",
      status: "draft",
      configuration: {
        nodes: [
          {
            id: "start-trigger",
            type: "trigger-command",
            position: { x: 100, y: 100 },
            data: {
              label: "Start Command",
              command: "/start",
              description: "Команда запуска"
            }
          },
          {
            id: "welcome-action",
            type: "action-send-message",
            position: { x: 400, y: 100 },
            data: {
              label: "Welcome Message",
              text: "Добро пожаловать! Ваш ID: {{user_id}}"
            }
          },
          {
            id: "condition-check",
            type: "condition-text",
            position: { x: 700, y: 100 },
            data: {
              label: "Text Condition",
              conditions: [
                { type: "contains", value: "привет" }
              ],
              operator: "OR"
            }
          },
          {
            id: "positive-response",
            type: "action-send-message",
            position: { x: 1000, y: 50 },
            data: {
              label: "Positive Response",
              text: "Отлично! Вы сказали привет!"
            }
          },
          {
            id: "negative-response",
            type: "action-send-message",
            position: { x: 1000, y: 150 },
            data: {
              label: "Negative Response",
              text: "Попробуйте сказать 'привет'"
            }
          }
        ],
        edges: [
          {
            id: "start-to-welcome",
            source: "start-trigger",
            target: "welcome-action"
          },
          {
            id: "welcome-to-condition",
            source: "welcome-action",
            target: "condition-check"
          },
          {
            id: "condition-to-positive",
            source: "condition-check",
            target: "positive-response",
            sourceHandle: "true"
          },
          {
            id: "condition-to-negative",
            source: "condition-check",
            target: "negative-response",
            sourceHandle: "false"
          }
        ],
        variables: {
          user_id: {
            type: "string",
            defaultValue: "test_user",
            description: "ID пользователя"
          },
          message_text: {
            type: "string",
            defaultValue: "привет",
            description: "Текст сообщения"
          }
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем тестового бота
    const botsDir = path.join(__dirname, '..', 'data', 'bots');
    if (!fs.existsSync(botsDir)) {
      fs.mkdirSync(botsDir, { recursive: true });
    }
    
    const botPath = path.join(botsDir, `bot_${testBotId}.json`);
    fs.writeFileSync(botPath, JSON.stringify(testBotData, null, 2));
    
    console.log('✅ Тестовый бот создан:', testBotId);
    
    // Тестируем DebugManager напрямую
    const DebugManager = require('../utils/DebugManager');
    const debugManager = new DebugManager();
    
    console.log('🔧 Тестирование DebugManager...');
    
    // Создаем сессию отладки
    const session = debugManager.createDebugSession(testBotId, testBotData, 'test_user');
    console.log('✅ Сессия отладки создана');
    
    // Устанавливаем точки останова
    debugManager.setBreakpoint(testBotId, 'condition-check');
    debugManager.setBreakpoint(testBotId, 'positive-response');
    console.log('✅ Точки останова установлены');
    
    // Подписываемся на события
    let stepCount = 0;
    let breakpointHit = false;
    
    session.on('step', (data) => {
      stepCount++;
      console.log(`📍 Шаг ${stepCount}: ${data.nodeLabel} (${data.nodeId})`);
    });
    
    session.on('breakpoint', (data) => {
      breakpointHit = true;
      console.log(`🛑 Точка останова: ${data.nodeId}`);
      
      // Продолжаем выполнение через 100мс
      setTimeout(() => {
        session.resume();
      }, 100);
    });
    
    session.on('debug:session_stopped', (data) => {
      console.log(`🏁 Сессия завершена: ${data.executionTime}мс, ${data.stepCount} шагов`);
    });
    
    // Запускаем отладку
    console.log('🚀 Запуск отладки...');
    session.start();
    
    // Ждем завершения
    await new Promise(resolve => {
      session.on('debug:session_stopped', resolve);
      
      // Таймаут на случай зависания
      setTimeout(resolve, 5000);
    });
    
    // Проверяем результаты
    const stats = debugManager.getDebugStats();
    console.log('📊 Статистика отладки:');
    console.log(`  • Активных сессий: ${stats.activeSessions}`);
    console.log(`  • Точек останова: ${stats.totalBreakpoints}`);
    console.log(`  • Шагов выполнено: ${stepCount}`);
    console.log(`  • Точки останова сработали: ${breakpointHit ? 'Да' : 'Нет'}`);
    
    // Очищаем сессию
    debugManager.removeDebugSession(testBotId);
    
    return stepCount > 0 && breakpointHit;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования системы отладки:', error.message);
    return false;
  }
}

// Функция тестирования API отладки
async function testDebugAPI() {
  console.log('\n🌐 Тестирование API отладки...\n');
  
  try {
    const testBotId = 'debug-test-bot-api';
    
    // Создаем простого тестового бота
    const testBotData = {
      id: testBotId,
      name: "API Debug Test Bot",
      configuration: {
        nodes: [
          {
            id: "test-trigger",
            type: "trigger-command",
            data: { label: "Test", command: "/test" }
          },
          {
            id: "test-action",
            type: "action-send-message",
            data: { label: "Test Message", text: "Hello {{user_id}}" }
          }
        ],
        edges: [
          { source: "test-trigger", target: "test-action" }
        ],
        variables: {
          user_id: { defaultValue: "api_user" }
        }
      }
    };
    
    // Сохраняем бота
    const botPath = path.join(__dirname, '..', 'data', 'bots', `bot_${testBotId}.json`);
    fs.writeFileSync(botPath, JSON.stringify(testBotData, null, 2));
    
    console.log('✅ Тестовый бот для API создан');
    
    // Тестируем создание сессии
    console.log('🧪 Тестирование создания сессии...');
    const sessionResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: '/api/debug/session',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      botId: testBotId,
      userId: 'api_test_user'
    }));
    
    if (sessionResponse.statusCode === 200) {
      const sessionData = JSON.parse(sessionResponse.data);
      console.log('✅ Сессия создана:', sessionData.success);
    } else {
      console.error('❌ Ошибка создания сессии:', sessionResponse.statusCode);
      return false;
    }
    
    // Тестируем запуск отладки
    console.log('🧪 Тестирование запуска отладки...');
    const startResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/debug/${testBotId}/start`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      inputData: { message_text: 'test message' }
    }));
    
    if (startResponse.statusCode === 200) {
      const startData = JSON.parse(startResponse.data);
      console.log('✅ Отладка запущена:', startData.success);
    } else {
      console.error('❌ Ошибка запуска отладки:', startResponse.statusCode);
      return false;
    }
    
    // Ждем немного для выполнения
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Тестируем получение статуса
    console.log('🧪 Тестирование получения статуса...');
    const statusResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/debug/${testBotId}/status`,
      method: 'GET'
    });
    
    if (statusResponse.statusCode === 200) {
      const statusData = JSON.parse(statusResponse.data);
      console.log('✅ Статус получен:', statusData.success);
      console.log(`📊 Статус: ${statusData.status}, Шагов: ${statusData.stepCount}`);
    } else {
      console.error('❌ Ошибка получения статуса:', statusResponse.statusCode);
      return false;
    }
    
    // Тестируем получение переменных
    console.log('🧪 Тестирование получения переменных...');
    const variablesResponse = await makeRequest({
      hostname: 'localhost',
      port: 3002,
      path: `/api/debug/${testBotId}/variables`,
      method: 'GET'
    });
    
    if (variablesResponse.statusCode === 200) {
      const variablesData = JSON.parse(variablesResponse.data);
      console.log('✅ Переменные получены:', variablesData.success);
      console.log(`📊 Переменных: ${Object.keys(variablesData.variables || {}).length}`);
    } else {
      console.error('❌ Ошибка получения переменных:', variablesResponse.statusCode);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Ошибка тестирования API:', error.message);
    return false;
  }
}

// Основная функция тестирования
async function main() {
  console.log('🐛 Тестирование инструментов отладки\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  
  // 1. Создаем систему отладки
  const debugSystemCreated = await createDebugSystem();
  if (!debugSystemCreated) {
    allTestsPassed = false;
  }
  
  // 2. Создаем API отладки
  const debugApiCreated = await createDebugAPI();
  if (!debugApiCreated) {
    allTestsPassed = false;
  }
  
  // 3. Создаем веб-интерфейс
  const debugInterfaceCreated = await createDebugInterface();
  if (!debugInterfaceCreated) {
    allTestsPassed = false;
  }
  
  // 4. Тестируем систему отладки
  const debugSystemTested = await testDebugSystem();
  if (!debugSystemTested) {
    allTestsPassed = false;
  }
  
  // 5. Тестируем API отладки
  const debugApiTested = await testDebugAPI();
  if (!debugApiTested) {
    allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 Все тесты инструментов отладки прошли успешно!');
    console.log('\n📋 Результаты:');
    console.log('✅ DebugManager создан и протестирован');
    console.log('✅ API отладки функционирует');
    console.log('✅ Веб-интерфейс отладки создан');
    console.log('✅ Пошаговое выполнение работает');
    console.log('✅ Точки останова функционируют');
    console.log('✅ Инспектор переменных работает');
    console.log('\n💡 Возможности системы отладки:');
    console.log('• Пошаговое выполнение схем ботов');
    console.log('• Точки останова на любых узлах');
    console.log('• Инспектор переменных в реальном времени');
    console.log('• История выполнения с временными метками');
    console.log('• Веб-интерфейс для удобной отладки');
    console.log('• API для программного управления');
    console.log('\n🌐 Доступ к отладчику: http://localhost:3002/debug.html');
  } else {
    console.log('❌ Некоторые тесты инструментов отладки не прошли');
    console.log('⚠️ Проверьте настройки и зависимости');
  }
  
  console.log('\nТестирование инструментов отладки завершено');
}

// Запуск тестирования
if (require.main === module) {
  main();
}

module.exports = {
  createDebugSystem,
  createDebugAPI,
  createDebugInterface,
  testDebugSystem,
  testDebugAPI
};