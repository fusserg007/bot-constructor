/**
 * Базовые классы узлов действий для визуального редактора
 * Оптимизированная версия с использованием вспомогательных функций
 */

// Подключаем зависимости
if (typeof BaseNode === 'undefined' && typeof require !== 'undefined') {
  const BaseNode = require('./BaseNode.js');
}

// Подключаем вспомогательные функции
let ActionValidators, PropertyFactory, ConfigUtils, ActionConstants;
if (typeof require !== 'undefined') {
  const helpers = require('./ActionNodeHelpers.js');
  ActionValidators = helpers.ActionValidators;
  PropertyFactory = helpers.PropertyFactory;
  ConfigUtils = helpers.ConfigUtils;
  ActionConstants = helpers.ActionConstants;
}

/**
 * Базовый класс для всех узлов действий
 */
class ActionNode extends BaseNode {
  constructor() {
    super();
    this.category = 'actions';
    this.addInput('trigger', 'trigger', true);
    this.addOutput('success', 'trigger');
    this.addOutput('error', 'trigger');
  }

  validateConfig() {
    const errors = [];
    
    // Базовая валидация для всех действий
    if (!this.config.enabled && this.config.enabled !== false) {
      this.config.enabled = true;
    }

    return { isValid: errors.length === 0, errors };
  }

  async execute(context = {}) {
    if (!this.config.enabled) {
      return { success: true, skipped: true };
    }

    try {
      const result = await this.performAction(context);
      this.setExecutionResult(result);
      return result;
    } catch (error) {
      const errorResult = { success: false, error: error.message };
      this.setExecutionResult(errorResult);
      return errorResult;
    }
  }

  async performAction(context) {
    throw new Error('performAction method must be implemented in derived classes');
  }
}

/**
 * Узел отправки сообщения
 */
class SendMessageNode extends ActionNode {
  constructor() {
    super();
    this.type = 'send_message';
    this.config = {
      displayName: 'Send Message',
      description: 'Отправляет текстовое сообщение',
      icon: '💬',
      text: '',
      parse_mode: 'none',
      disable_web_page_preview: false,
      reply_to_message: false,
      delete_after: 0
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    
    if (!ActionValidators) {
      // Fallback для случаев когда хелперы не загружены
      const errors = [...baseValidation.errors];
      if (!this.config.text || this.config.text.trim() === '') {
        errors.push('Message text is required');
      }
      return { isValid: errors.length === 0, errors };
    }

    return ConfigUtils.combineValidationResults(
      baseValidation,
      ActionValidators.validateRequiredText(this.config.text, 'Message text'),
      ActionValidators.validateChoice(this.config.parse_mode, 
        ActionConstants.PARSE_MODES.map(p => p.value), 'Parse mode'),
      ActionValidators.validateRange(this.config.delete_after, 0, 
        ActionConstants.MAX_DELAY_SECONDS, 'Delete after')
    );
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'text',
        label: 'Message Text',
        type: 'textarea',
        value: this.config.text,
        required: true,
        placeholder: 'Enter message text...'
      },
      {
        name: 'parse_mode',
        label: 'Parse Mode',
        type: 'select',
        value: this.config.parse_mode,
        options: [
          { value: 'none', label: 'None' },
          { value: 'HTML', label: 'HTML' },
          { value: 'Markdown', label: 'Markdown' },
          { value: 'MarkdownV2', label: 'MarkdownV2' }
        ]
      },
      {
        name: 'disable_web_page_preview',
        label: 'Disable Web Page Preview',
        type: 'checkbox',
        value: this.config.disable_web_page_preview
      },
      {
        name: 'reply_to_message',
        label: 'Reply to Message',
        type: 'checkbox',
        value: this.config.reply_to_message
      },
      {
        name: 'delete_after',
        label: 'Delete After (seconds)',
        type: 'number',
        value: this.config.delete_after,
        min: 0,
        max: 86400
      }
    ];
  }

  async performAction(context) {
    return {
      success: true,
      action: 'send_message',
      config: this.config,
      message: 'Message would be sent'
    };
  }
}

/**
 * Узел отправки фото
 */
class SendPhotoNode extends ActionNode {
  constructor() {
    super();
    this.type = 'send_photo';
    this.config = {
      displayName: 'Send Photo',
      description: 'Отправляет изображение',
      icon: '📷',
      photo_url: '',
      photo_file: '',
      caption: '',
      parse_mode: 'none'
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    const errors = [...baseValidation.errors];

    if (!this.config.photo_url && !this.config.photo_file) {
      errors.push('Photo URL or file is required');
    }

    if (this.config.photo_url && this.config.photo_file) {
      errors.push('Specify either photo URL or file, not both');
    }

    if (this.config.photo_url && !this.isValidUrl(this.config.photo_url)) {
      errors.push('Invalid photo URL');
    }

    return { isValid: errors.length === 0, errors };
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'photo_url',
        label: 'Photo URL',
        type: 'text',
        value: this.config.photo_url,
        placeholder: 'https://example.com/image.jpg'
      },
      {
        name: 'photo_file',
        label: 'Photo File',
        type: 'file',
        value: this.config.photo_file,
        accept: 'image/*'
      },
      {
        name: 'caption',
        label: 'Caption',
        type: 'textarea',
        value: this.config.caption,
        placeholder: 'Optional caption...'
      },
      {
        name: 'parse_mode',
        label: 'Parse Mode',
        type: 'select',
        value: this.config.parse_mode,
        options: [
          { value: 'none', label: 'None' },
          { value: 'HTML', label: 'HTML' },
          { value: 'Markdown', label: 'Markdown' }
        ]
      }
    ];
  }

  async performAction(context) {
    return {
      success: true,
      action: 'send_photo',
      config: this.config,
      message: 'Photo would be sent'
    };
  }
}

/**
 * Узел создания клавиатуры
 */
class KeyboardNode extends ActionNode {
  constructor() {
    super();
    this.type = 'create_keyboard';
    this.config = {
      displayName: 'Create Keyboard',
      description: 'Создает клавиатуру для бота',
      icon: '⌨️',
      keyboard_type: 'reply',
      buttons: '[]',
      resize_keyboard: true,
      one_time_keyboard: false
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    const errors = [...baseValidation.errors];

    if (!['reply', 'inline'].includes(this.config.keyboard_type)) {
      errors.push('Invalid keyboard type');
    }

    try {
      const buttons = JSON.parse(this.config.buttons);
      if (!Array.isArray(buttons)) {
        errors.push('Buttons must be an array');
      }
    } catch (e) {
      errors.push('Invalid JSON in buttons configuration');
    }

    return { isValid: errors.length === 0, errors };
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'keyboard_type',
        label: 'Keyboard Type',
        type: 'select',
        value: this.config.keyboard_type,
        options: [
          { value: 'reply', label: 'Reply Keyboard' },
          { value: 'inline', label: 'Inline Keyboard' }
        ]
      },
      {
        name: 'buttons',
        label: 'Buttons (JSON)',
        type: 'textarea',
        value: this.config.buttons,
        placeholder: '[["Button 1", "Button 2"], ["Button 3"]]'
      },
      {
        name: 'resize_keyboard',
        label: 'Resize Keyboard',
        type: 'checkbox',
        value: this.config.resize_keyboard
      },
      {
        name: 'one_time_keyboard',
        label: 'One Time Keyboard',
        type: 'checkbox',
        value: this.config.one_time_keyboard
      }
    ];
  }

  async performAction(context) {
    return {
      success: true,
      action: 'create_keyboard',
      config: this.config,
      message: 'Keyboard would be created'
    };
  }
}

/**
 * Узел удаления сообщения
 */
class DeleteMessageNode extends ActionNode {
  constructor() {
    super();
    this.type = 'delete_message';
    this.config = {
      displayName: 'Delete Message',
      description: 'Удаляет сообщение',
      icon: '🗑️',
      target: 'current_message',
      message_id: '',
      delay: 0
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    const errors = [...baseValidation.errors];

    if (!['current_message', 'reply_message', 'by_id'].includes(this.config.target)) {
      errors.push('Invalid target type');
    }

    if (this.config.target === 'by_id' && !this.config.message_id) {
      errors.push('Message ID is required when target is by_id');
    }

    if (this.config.delay < 0 || this.config.delay > 86400) {
      errors.push('Delay must be between 0 and 86400 seconds');
    }

    return { isValid: errors.length === 0, errors };
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'target',
        label: 'Target Message',
        type: 'select',
        value: this.config.target,
        options: [
          { value: 'current_message', label: 'Current Message' },
          { value: 'reply_message', label: 'Reply Message' },
          { value: 'by_id', label: 'By Message ID' }
        ]
      },
      {
        name: 'message_id',
        label: 'Message ID',
        type: 'text',
        value: this.config.message_id,
        visible: this.config.target === 'by_id'
      },
      {
        name: 'delay',
        label: 'Delay (seconds)',
        type: 'number',
        value: this.config.delay,
        min: 0,
        max: 86400
      }
    ];
  }

  async performAction(context) {
    return {
      success: true,
      action: 'delete_message',
      config: this.config,
      message: 'Message would be deleted'
    };
  }
}

/**
 * Узел административных действий
 */
class AdminActionNode extends ActionNode {
  constructor() {
    super();
    this.type = 'admin_action';
    this.config = {
      displayName: 'Admin Action',
      description: 'Выполняет административные действия',
      icon: '👮',
      action: 'kick_user',
      target_user: 'message_author',
      user_id: '',
      duration: 0,
      reason: ''
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    const errors = [...baseValidation.errors];

    const validActions = ['kick_user', 'ban_user', 'unban_user', 'mute_user', 'unmute_user'];
    if (!validActions.includes(this.config.action)) {
      errors.push('Invalid admin action');
    }

    const validTargets = ['message_author', 'reply_user', 'by_id'];
    if (!validTargets.includes(this.config.target_user)) {
      errors.push('Invalid target user type');
    }

    if (this.config.target_user === 'by_id' && !this.config.user_id) {
      errors.push('User ID is required when target is by_id');
    }

    if (this.config.duration < 0 || this.config.duration > 525600) {
      errors.push('Duration must be between 0 and 525600 minutes');
    }

    return { isValid: errors.length === 0, errors };
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        value: this.config.action,
        options: [
          { value: 'kick_user', label: 'Kick User' },
          { value: 'ban_user', label: 'Ban User' },
          { value: 'unban_user', label: 'Unban User' },
          { value: 'mute_user', label: 'Mute User' },
          { value: 'unmute_user', label: 'Unmute User' }
        ]
      },
      {
        name: 'target_user',
        label: 'Target User',
        type: 'select',
        value: this.config.target_user,
        options: [
          { value: 'message_author', label: 'Message Author' },
          { value: 'reply_user', label: 'Reply User' },
          { value: 'by_id', label: 'By User ID' }
        ]
      },
      {
        name: 'user_id',
        label: 'User ID',
        type: 'text',
        value: this.config.user_id,
        visible: this.config.target_user === 'by_id'
      },
      {
        name: 'duration',
        label: 'Duration (minutes)',
        type: 'number',
        value: this.config.duration,
        min: 0,
        max: 525600
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'text',
        value: this.config.reason,
        placeholder: 'Optional reason...'
      }
    ];
  }

  async performAction(context) {
    return {
      success: true,
      action: 'admin_action',
      config: this.config,
      message: 'Admin action would be performed'
    };
  }
}

/**
 * Узел задержки
 */
class DelayNode extends ActionNode {
  constructor() {
    super();
    this.type = 'delay_action';
    this.config = {
      displayName: 'Delay',
      description: 'Добавляет задержку перед следующим действием',
      icon: '⏱️',
      delay: 1,
      unit: 'seconds'
    };
  }

  validateConfig() {
    const baseValidation = super.validateConfig();
    const errors = [...baseValidation.errors];

    if (!this.config.delay || this.config.delay <= 0) {
      errors.push('Delay must be greater than 0');
    }

    if (!['seconds', 'minutes', 'hours'].includes(this.config.unit)) {
      errors.push('Invalid time unit');
    }

    const maxDelays = {
      seconds: 3600,
      minutes: 60,
      hours: 24
    };

    if (this.config.delay > maxDelays[this.config.unit]) {
      errors.push(`Delay cannot exceed ${maxDelays[this.config.unit]} ${this.config.unit}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  getEditableProperties() {
    return [
      ...super.getEditableProperties(),
      {
        name: 'delay',
        label: 'Delay Amount',
        type: 'number',
        value: this.config.delay,
        min: 1,
        required: true
      },
      {
        name: 'unit',
        label: 'Time Unit',
        type: 'select',
        value: this.config.unit,
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' }
        ]
      }
    ];
  }

  async performAction(context) {
    const delayMs = this.getDelayInMilliseconds();
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          action: 'delay_action',
          config: this.config,
          message: `Delayed for ${this.config.delay} ${this.config.unit}`
        });
      }, delayMs);
    });
  }

  getDelayInMilliseconds() {
    const multipliers = {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000
    };
    
    return this.config.delay * multipliers[this.config.unit];
  }
}

// Регистрируем узлы в реестре
if (typeof nodeRegistry !== 'undefined') {
  // Инициализируем реестр если еще не инициализирован
  nodeRegistry.init();

  // Регистрируем узлы действий
  nodeRegistry.registerNodeType(SendMessageNode, {
    type: 'send_message',
    category: 'actions',
    displayName: 'Send Message',
    description: 'Отправляет текстовое сообщение пользователю',
    icon: '💬',
    tags: ['message', 'text', 'send'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' },
      { name: 'error', type: 'trigger' }
    ]
  });

  nodeRegistry.registerNodeType(SendPhotoNode, {
    type: 'send_photo',
    category: 'actions',
    displayName: 'Send Photo',
    description: 'Отправляет изображение пользователю',
    icon: '📷',
    tags: ['photo', 'image', 'send'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' },
      { name: 'error', type: 'trigger' }
    ]
  });

  nodeRegistry.registerNodeType(KeyboardNode, {
    type: 'create_keyboard',
    category: 'actions',
    displayName: 'Create Keyboard',
    description: 'Создает клавиатуру для взаимодействия с пользователем',
    icon: '⌨️',
    tags: ['keyboard', 'buttons', 'interface'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' },
      { name: 'error', type: 'trigger' }
    ]
  });

  nodeRegistry.registerNodeType(DeleteMessageNode, {
    type: 'delete_message',
    category: 'actions',
    displayName: 'Delete Message',
    description: 'Удаляет сообщение из чата',
    icon: '🗑️',
    tags: ['delete', 'remove', 'message'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' },
      { name: 'error', type: 'trigger' }
    ]
  });

  nodeRegistry.registerNodeType(AdminActionNode, {
    type: 'admin_action',
    category: 'actions',
    displayName: 'Admin Action',
    description: 'Выполняет административные действия в чате',
    icon: '👮',
    tags: ['admin', 'moderation', 'ban', 'kick'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' },
      { name: 'error', type: 'trigger' }
    ]
  });

  nodeRegistry.registerNodeType(DelayNode, {
    type: 'delay_action',
    category: 'actions',
    displayName: 'Delay',
    description: 'Добавляет задержку перед выполнением следующего действия',
    icon: '⏱️',
    tags: ['delay', 'wait', 'pause'],
    inputs: [
      { name: 'trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { name: 'success', type: 'trigger' }
    ]
  });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ActionNode,
    SendMessageNode,
    SendPhotoNode,
    KeyboardNode,
    DeleteMessageNode,
    AdminActionNode,
    DelayNode
  };
}