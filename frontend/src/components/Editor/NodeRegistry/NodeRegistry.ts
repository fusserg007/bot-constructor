import { NodeConfiguration } from './types';
import { NodeDefinition } from '../../../types/nodes';

// Импорты существующих компонентов узлов
import StartNode from '../CustomNodes/StartNode';
import EntryPointNode from '../CustomNodes/EntryPointNode';
import InteractiveMenuNode from '../CustomNodes/InteractiveMenuNode';
import ActionNode from '../CustomNodes/ActionNode';
import TriggerNode from '../CustomNodes/TriggerNode';
import DataNode from '../CustomNodes/DataNode';
import IntegrationNode from '../CustomNodes/IntegrationNode';
import ScenarioNode from '../CustomNodes/ScenarioNode';
import SwitchNode from '../CustomNodes/SwitchNode';
import WebhookNode from '../CustomNodes/WebhookNode';
import TextConditionNode from '../CustomNodes/TextConditionNode';
import CommandTriggerNode from '../CustomNodes/CommandTriggerNode';

class NodeRegistry {
  private static instance: NodeRegistry;
  private configurations: Map<string, NodeConfiguration> = new Map();

  private constructor() {
    this.initializeDefaultNodes();
  }

  /**
   * Импортирует определения узлов из NodeLibrary
   */
  public importFromNodeLibrary(nodeDefinitions: NodeDefinition[]): void {
    nodeDefinitions.forEach(nodeDef => {
      // Находим соответствующий компонент для рендеринга
      const renderComponent = this.getComponentForNodeType(nodeDef.type);
      
      if (renderComponent) {
        this.registerNode({
          type: nodeDef.type,
          category: nodeDef.category,
          name: nodeDef.name,
          description: nodeDef.description,
          icon: nodeDef.icon,
          color: nodeDef.color,
          usageFrequency: nodeDef.usageFrequency,
          defaultData: {
            ...nodeDef.defaultConfig,
            label: nodeDef.name,
            icon: nodeDef.icon,
            color: nodeDef.color
          },
          inputs: nodeDef.inputs,
          outputs: nodeDef.outputs,
          renderComponent
        });
      }
    });
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  private initializeDefaultNodes(): void {
    // Регистрируем все существующие узлы
    this.registerNode({
      type: 'start',
      category: 'triggers',
      name: 'Старт',
      description: 'Начальная точка выполнения схемы',
      icon: '🚀',
      color: '#22c55e',
      usageFrequency: 'frequent',
      defaultData: { 
        label: 'Начало выполнения',
        icon: '🚀',
        color: '#22c55e'
      },
      inputs: [],
      outputs: [{ 
        id: 'output', 
        name: 'Выход', 
        type: 'control', 
        dataType: 'any', 
        required: false, 
        multiple: false 
      }],
      renderComponent: StartNode
    });

    this.registerNode({
      type: 'entry-point',
      category: 'triggers',
      name: 'Точка входа',
      description: 'Определяет как пользователи попадают в бот',
      icon: '🚀',
      color: '#22c55e',
      usageFrequency: 'frequent',
      defaultData: { 
        triggerType: 'start_command',
        description: 'Начало работы бота',
        icon: '🚀',
        color: '#22c55e'
      },
      inputs: [],
      outputs: [{ 
        id: 'output', 
        name: 'Выход', 
        type: 'control', 
        dataType: 'any', 
        required: false, 
        multiple: false 
      }],
      renderComponent: EntryPointNode
    });

    this.registerNode({
      type: 'interactive-menu',
      category: 'actions',
      name: 'Интерактивное меню',
      description: 'Сообщение с настраиваемыми кнопками',
      icon: '📋',
      color: '#3b82f6',
      usageFrequency: 'frequent',
      defaultData: { 
        title: 'Интерактивное меню',
        message: 'Выберите действие:',
        parse_mode: 'HTML',
        buttons: [],
        keyboardType: 'inline',
        buttonsPerRow: 2,
        icon: '📋',
        color: '#3b82f6'
      },
      inputs: [{ 
        id: 'input', 
        name: 'Вход', 
        type: 'control', 
        dataType: 'any', 
        required: true, 
        multiple: false 
      }],
      outputs: [{ 
        id: 'output', 
        name: 'Выход', 
        type: 'control', 
        dataType: 'any', 
        required: false, 
        multiple: false 
      }],
      renderComponent: InteractiveMenuNode
    });

    this.registerNode({
      type: 'trigger-message',
      category: 'triggers',
      name: 'Сообщение',
      description: 'Реагирует на входящие сообщения',
      icon: '📨',
      color: '#3b82f6',
      usageFrequency: 'frequent',
      defaultData: { 
        label: 'Сообщение',
        triggerType: 'text',
        icon: '📨',
        color: '#3b82f6'
      },
      inputs: [],
      outputs: [{ 
        id: 'output', 
        name: 'Выход', 
        type: 'control', 
        dataType: 'any', 
        required: false, 
        multiple: false 
      }],
      renderComponent: TriggerNode
    });

    this.registerNode({
      type: 'action-send-message',
      category: 'actions',
      name: 'Отправить сообщение',
      description: 'Отправляет сообщение пользователю',
      icon: '💬',
      color: '#10b981',
      usageFrequency: 'frequent',
      defaultData: { 
        label: 'Отправить сообщение',
        actionType: 'send',
        icon: '💬',
        color: '#10b981',
        message: 'Привет!'
      },
      inputs: [{ 
        id: 'input', 
        name: 'Вход', 
        type: 'control', 
        dataType: 'any', 
        required: true, 
        multiple: false 
      }],
      outputs: [{ 
        id: 'output', 
        name: 'Выход', 
        type: 'control', 
        dataType: 'any', 
        required: false, 
        multiple: false 
      }],
      renderComponent: ActionNode
    });

    this.registerNode({
      type: 'condition-text',
      category: 'conditions',
      name: 'Проверка текста',
      description: 'Проверяет содержимое сообщения',
      icon: '🔍',
      color: '#f59e0b',
      usageFrequency: 'frequent',
      defaultData: { 
        label: 'Проверка текста',
        conditionType: 'contains',
        icon: '🔍',
        color: '#f59e0b',
        condition: 'содержит',
        value: ''
      },
      inputs: [{ 
        id: 'input', 
        name: 'Вход', 
        type: 'control', 
        dataType: 'any', 
        required: true, 
        multiple: false 
      }],
      outputs: [
        { id: 'true', name: 'Да', type: 'control', dataType: 'any', required: false, multiple: false },
        { id: 'false', name: 'Нет', type: 'control', dataType: 'any', required: false, multiple: false }
      ],
      renderComponent: TextConditionNode
    });

    // Добавляем остальные узлы...
    this.registerLegacyNodes();
  }

  private registerLegacyNodes(): void {
    // Регистрируем остальные существующие узлы для совместимости
    const legacyNodes = [
      { type: 'webhook-telegram', component: WebhookNode, category: 'triggers', icon: '📡', color: '#3b82f6' },
      { type: 'switch-command', component: SwitchNode, category: 'conditions', icon: '🔀', color: '#f59e0b' },
      { type: 'data-save', component: DataNode, category: 'data', icon: '💾', color: '#8b5cf6' },
      { type: 'integration-http', component: IntegrationNode, category: 'integrations', icon: '🔗', color: '#06b6d4' },
      { type: 'scenario-welcome', component: ScenarioNode, category: 'scenarios', icon: '👋', color: '#22c55e' },
      { type: 'command', component: CommandTriggerNode, category: 'triggers', icon: '⚡', color: '#ef4444' },
      { type: 'send_message', component: ActionNode, category: 'actions', icon: '💬', color: '#3b82f6' },
      { type: 'send_message_with_keyboard', component: ActionNode, category: 'actions', icon: '⌨️', color: '#6366f1' },
      { type: 'callback_handler', component: TriggerNode, category: 'triggers', icon: '🔄', color: '#f59e0b' }
    ];

    legacyNodes.forEach(node => {
      this.registerNode({
        type: node.type,
        category: node.category as any,
        name: this.getNodeDisplayName(node.type),
        description: this.getNodeDescription(node.type),
        icon: node.icon,
        color: node.color,
        usageFrequency: this.getNodeUsageFrequency(node.type),
        defaultData: this.getDefaultNodeData(node.type),
        inputs: this.getNodeInputs(node.type),
        outputs: this.getNodeOutputs(node.type),
        renderComponent: node.component
      });
    });
  }

  public registerNode(config: NodeConfiguration): void {
    this.configurations.set(config.type, config);
  }

  public getNodeConfiguration(nodeType: string): NodeConfiguration | undefined {
    return this.configurations.get(nodeType);
  }

  public getAllConfigurations(): NodeConfiguration[] {
    return Array.from(this.configurations.values());
  }

  public getNodesByCategory(category: string): NodeConfiguration[] {
    return this.getAllConfigurations().filter(config => config.category === category);
  }

  public getNodeTypes(): string[] {
    return Array.from(this.configurations.keys());
  }

  public hasNode(nodeType: string): boolean {
    return this.configurations.has(nodeType);
  }

  /**
   * Получает компонент для рендеринга по типу узла
   */
  private getComponentForNodeType(nodeType: string): any {
    const componentMap: Record<string, any> = {
      'start': StartNode,
      'entry-point': EntryPointNode,
      'interactive-menu': InteractiveMenuNode,
      'trigger-message': TriggerNode,
      'trigger-command': CommandTriggerNode,
      'trigger-text': TriggerNode,
      'action-send-message': ActionNode,
      'action-send-photo': ActionNode,
      'condition-text': TextConditionNode,
      'condition-user': TextConditionNode,
      'data-save': DataNode,
      'data-load': DataNode,
      'webhook-telegram': WebhookNode,
      'switch-command': SwitchNode,
      'integration-http': IntegrationNode,
      'integration-database': IntegrationNode,
      'scenario-quiz': ScenarioNode,
      'multi-node': ScenarioNode,
      'send_message_with_keyboard': InteractiveMenuNode,
      'callback_handler': TriggerNode,
      'command': CommandTriggerNode
    };

    return componentMap[nodeType] || ActionNode; // Fallback к ActionNode
  }

  // Вспомогательные методы для legacy узлов
  private getNodeDisplayName(type: string): string {
    const names: Record<string, string> = {
      'webhook-telegram': 'Telegram Webhook',
      'switch-command': 'Switch (Команды)',
      'data-save': 'Сохранить данные',
      'integration-http': 'HTTP интеграция',
      'scenario-welcome': 'Сценарий приветствия',
      'command': 'Команда бота',
      'send_message': 'Отправить сообщение',
      'send_message_with_keyboard': 'Сообщение с клавиатурой',
      'callback_handler': 'Обработчик кнопок'
    };
    return names[type] || type;
  }

  private getNodeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'webhook-telegram': 'Получает сообщения из Telegram',
      'switch-command': 'Маршрутизация по командам',
      'data-save': 'Сохраняет информацию о пользователе',
      'integration-http': 'HTTP запросы к внешним API',
      'scenario-welcome': 'Приветственный сценарий',
      'command': 'Обрабатывает команды бота',
      'send_message': 'Отправляет текстовое сообщение',
      'send_message_with_keyboard': 'Отправляет сообщение с кнопками',
      'callback_handler': 'Реагирует на нажатие кнопок'
    };
    return descriptions[type] || 'Узел бота';
  }

  private getDefaultNodeData(type: string): Record<string, any> {
    // Возвращаем базовые данные для legacy узлов
    return {
      label: this.getNodeDisplayName(type),
      icon: this.configurations.get(type)?.icon || '⚙️',
      color: this.configurations.get(type)?.color || '#6b7280'
    };
  }

  private getNodeInputs(type: string): any[] {
    // Большинство узлов имеют один вход
    const noInputNodes = ['start', 'entry-point', 'trigger-message', 'webhook-telegram', 'command', 'callback_handler'];
    if (noInputNodes.includes(type)) {
      return [];
    }
    return [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }];
  }

  private getNodeOutputs(type: string): any[] {
    // Условные узлы имеют два выхода
    const conditionNodes = ['condition-text', 'switch-command'];
    if (conditionNodes.includes(type)) {
      return [
        { id: 'true', name: 'Да', type: 'control', dataType: 'any', required: false, multiple: false },
        { id: 'false', name: 'Нет', type: 'control', dataType: 'any', required: false, multiple: false }
      ];
    }
    return [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }];
  }

  private getNodeUsageFrequency(type: string): 'frequent' | 'moderate' | 'rare' {
    // Определяем частоту использования для legacy узлов
    const frequentNodes = ['webhook-telegram', 'command', 'send_message', 'send_message_with_keyboard', 'callback_handler'];
    const moderateNodes = ['switch-command', 'data-save'];
    
    if (frequentNodes.includes(type)) return 'frequent';
    if (moderateNodes.includes(type)) return 'moderate';
    return 'rare';
  }
}

// Экспортируем singleton instance
export const nodeRegistry = NodeRegistry.getInstance();
export default NodeRegistry;