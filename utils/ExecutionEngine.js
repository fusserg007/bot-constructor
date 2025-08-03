/**
 * Движок выполнения схем по принципу n8n
 * Последовательное выполнение узлов по связям
 */
class ExecutionEngine {
  constructor(botInstance) {
    this.botInstance = botInstance;
    this.config = botInstance.config;
    this.executionContext = new Map(); // Контекст выполнения
  }

  /**
   * Запуск выполнения схемы
   */
  async executeWorkflow(message, startNodeId = null) {
    try {
      // Найти стартовый узел
      const startNode = this.findStartNode(startNodeId);
      if (!startNode) {
        console.log('Стартовый узел не найден');
        return;
      }

      // Создать контекст выполнения
      const context = {
        message,
        variables: new Map(),
        executionId: Date.now().toString(),
        startTime: new Date()
      };

      // Выполнить схему начиная со стартового узла
      await this.executeNode(startNode, context);
    } catch (error) {
      console.error('Ошибка выполнения схемы:', error);
    }
  }

  /**
   * Найти стартовый узел
   */
  findStartNode(nodeId = null) {
    const nodes = this.config.configuration.nodes;
    
    if (nodeId) {
      return nodes.find(node => node.id === nodeId);
    }

    // Ищем узел типа 'start'
    const startNode = nodes.find(node => node.type === 'start');
    if (startNode) return startNode;

    // Если нет start узла, ищем триггеры
    return nodes.find(node => node.type.startsWith('trigger'));
  }

  /**
   * Выполнить узел
   */
  async executeNode(node, context) {
    console.log(`Выполняется узел: ${node.id} (${node.type})`);

    try {
      let result = null;

      // Выполнить логику узла в зависимости от типа
      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(node, context);
          break;
        case 'trigger-message':
          result = await this.executeTriggerNode(node, context);
          break;
        case 'action-send-message':
          result = await this.executeActionNode(node, context);
          break;
        case 'condition-text':
          result = await this.executeConditionNode(node, context);
          break;
        default:
          console.log(`Неизвестный тип узла: ${node.type}`);
          result = { success: true };
      }

      // Если узел выполнился успешно, переходим к следующим
      if (result && result.success) {
        await this.executeNextNodes(node, context, result);
      }

    } catch (error) {
      console.error(`Ошибка выполнения узла ${node.id}:`, error);
    }
  }

  /**
   * Выполнить следующие узлы
   */
  async executeNextNodes(currentNode, context, result) {
    const edges = this.config.configuration.edges;
    const nextEdges = edges.filter(edge => edge.source === currentNode.id);

    for (const edge of nextEdges) {
      // Для условных узлов проверяем handle
      if (currentNode.type.startsWith('condition')) {
        const shouldExecute = this.shouldExecuteConditionalEdge(edge, result);
        if (!shouldExecute) continue;
      }

      const nextNode = this.config.configuration.nodes.find(node => node.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode, context);
      }
    }
  }

  /**
   * Проверить, нужно ли выполнять условное ребро
   */
  shouldExecuteConditionalEdge(edge, result) {
    if (edge.sourceHandle === 'true' && result.conditionResult === true) return true;
    if (edge.sourceHandle === 'false' && result.conditionResult === false) return true;
    if (!edge.sourceHandle) return true; // Обычное ребро
    return false;
  }

  /**
   * Выполнить стартовый узел
   */
  async executeStartNode(node, context) {
    console.log('Выполнение стартового узла');
    return { success: true };
  }

  /**
   * Выполнить триггер
   */
  async executeTriggerNode(node, context) {
    // Логика проверки триггера уже выполнена в NodeProcessor
    return { success: true };
  }

  /**
   * Выполнить действие
   */
  async executeActionNode(node, context) {
    const data = node.data;
    
    switch (node.type) {
      case 'action-send-message':
        if (this.botInstance.telegramBot && data.message) {
          await this.botInstance.telegramBot.sendMessage(
            context.message.chat.id, 
            data.message
          );
        }
        break;
    }

    return { success: true };
  }

  /**
   * Выполнить условие
   */
  async executeConditionNode(node, context) {
    const data = node.data;
    let conditionResult = false;

    switch (node.type) {
      case 'condition-text':
        const messageText = context.message.text || '';
        switch (data.condition) {
          case 'contains':
            conditionResult = messageText.includes(data.value);
            break;
          case 'equals':
            conditionResult = messageText === data.value;
            break;
          case 'startsWith':
            conditionResult = messageText.startsWith(data.value);
            break;
        }
        break;
    }

    return { success: true, conditionResult };
  }
}

module.exports = ExecutionEngine;