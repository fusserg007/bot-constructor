import React, { useState, useMemo, useEffect } from 'react';
import { NodeDefinition, NodeCategory } from '../../../types/nodes';
import { getNodeLocalization } from '../../../utils/localization';
import { useCanvasLogger } from '../CanvasLogger';
import { SimpleUsageHelper } from '../UsageAnalyzer/SimpleUsageHelper';
import UsageStatistics from '../UsageAnalyzer/UsageStatistics';
import { nodeRegistry } from '../NodeRegistry/NodeRegistry';
import styles from './NodeLibrary.module.css';

const nodeDefinitions: NodeDefinition[] = [
  // Точка входа
  {
    type: 'entry-point',
    category: 'triggers',
    name: 'Точка входа',
    description: 'Определяет как пользователи попадают в бот',
    icon: '🚀',
    color: '#22c55e',
    usageFrequency: 'frequent', // 95% ботов
    defaultConfig: { 
      triggerType: 'start_command',
      description: 'Начало работы бота'
    },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },

  // Мульти-узел
  {
    type: 'multi-node',
    category: 'scenarios',
    name: 'Мульти-узел',
    description: 'Узел с возможностью расширения и вложенными компонентами',
    icon: '📦',
    color: '#3b82f6',
    usageFrequency: 'moderate', // 45% ботов
    defaultConfig: { 
      label: 'Мульти-узел',
      isExpanded: false,
      children: [],
      buttonLayout: 'bottom'
    },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Интерактивное меню
  {
    type: 'interactive-menu',
    category: 'actions',
    name: 'Интерактивное меню',
    description: 'Сообщение с настраиваемыми кнопками',
    icon: '📋',
    color: '#3b82f6',
    usageFrequency: 'frequent', // 85% ботов
    defaultConfig: { 
      title: 'Меню',
      message: 'Выберите действие:',
      parse_mode: 'HTML',
      buttons: [],
      keyboardType: 'inline',
      buttonsPerRow: 2
    },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },

  // Стартовый узел (legacy)
  {
    type: 'start',
    category: 'triggers',
    name: 'Старт',
    description: 'Начальная точка выполнения схемы',
    icon: '▶️',
    color: '#22c55e',
    usageFrequency: 'frequent', // 90% ботов (legacy)
    defaultConfig: { label: 'Начало выполнения' },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Webhook узлы (как в n8n)
  {
    type: 'webhook-telegram',
    category: 'triggers',
    name: 'Telegram Webhook',
    description: 'Получает сообщения из Telegram',
    icon: '🔗',
    color: '#3b82f6',
    usageFrequency: 'moderate', // 40% ботов
    defaultConfig: { label: 'Telegram Webhook', webhookType: 'telegram' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: false, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Switch узел для маршрутизации
  {
    type: 'switch-command',
    category: 'conditions',
    name: 'Switch (Команды)',
    description: 'Маршрутизация по командам',
    icon: '🔀',
    color: '#f59e0b',
    usageFrequency: 'moderate', // 40% ботов
    defaultConfig: { 
      label: 'Маршрутизация команд',
      switchType: 'command',
      routes: [
        { condition: '/start', label: 'Start' },
        { condition: '/help', label: 'Help' },
        { condition: 'default', label: 'Other' }
      ]
    },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [
      { id: 'output-0', name: '/start', type: 'control', dataType: 'any', required: false, multiple: false },
      { id: 'output-1', name: '/help', type: 'control', dataType: 'any', required: false, multiple: false },
      { id: 'output-2', name: 'Other', type: 'control', dataType: 'any', required: false, multiple: false }
    ]
  },
  
  // Триггеры
  {
    type: 'trigger-message',
    category: 'triggers',
    name: 'Сообщение',
    description: 'Реагирует на входящие сообщения',
    icon: '📨',
    color: '#3b82f6',
    usageFrequency: 'frequent', // 70% ботов
    defaultConfig: { messageType: 'text', filters: [] },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  {
    type: 'trigger-command',
    category: 'triggers',
    name: 'Команда',
    description: 'Реагирует на команды (/start, /help)',
    icon: '⚡',
    color: '#3b82f6',
    usageFrequency: 'frequent', // 80% ботов
    defaultConfig: { command: '/start' },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Действия
  {
    type: 'action-send-message',
    category: 'actions',
    name: 'Отправить сообщение',
    description: 'Отправляет сообщение пользователю',
    icon: '💬',
    color: '#10b981',
    usageFrequency: 'frequent', // 90% ботов
    defaultConfig: { message: 'Привет!', parseMode: 'HTML' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  {
    type: 'action-send-photo',
    category: 'actions',
    name: 'Отправить фото',
    description: 'Отправляет изображение',
    icon: '🖼️',
    color: '#10b981',
    usageFrequency: 'rare', // 30% ботов
    defaultConfig: { photo: '', caption: '' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Условия
  {
    type: 'condition-text',
    category: 'conditions',
    name: 'Проверка текста',
    description: 'Проверяет содержимое сообщения',
    icon: '🔍',
    color: '#f59e0b',
    usageFrequency: 'frequent', // 75% ботов
    defaultConfig: { condition: 'contains', value: '', caseSensitive: false },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [
      { id: 'true', name: 'Да', type: 'control', dataType: 'any', required: false, multiple: false },
      { id: 'false', name: 'Нет', type: 'control', dataType: 'any', required: false, multiple: false }
    ]
  },
  {
    type: 'condition-user',
    category: 'conditions',
    name: 'Проверка пользователя',
    description: 'Проверяет права пользователя',
    icon: '👤',
    color: '#f59e0b',
    usageFrequency: 'moderate', // 50% ботов
    defaultConfig: { checkType: 'isAdmin' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [
      { id: 'true', name: 'Да', type: 'control', dataType: 'any', required: false, multiple: false },
      { id: 'false', name: 'Нет', type: 'control', dataType: 'any', required: false, multiple: false }
    ]
  },
  
  // Данные
  {
    type: 'data-save',
    category: 'data',
    name: 'Сохранить данные',
    description: 'Сохраняет информацию о пользователе',
    icon: '💾',
    color: '#8b5cf6',
    usageFrequency: 'moderate', // 60% ботов
    defaultConfig: { key: 'userData', value: '' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  {
    type: 'data-load',
    category: 'data',
    name: 'Загрузить данные',
    description: 'Загружает сохраненную информацию',
    icon: '📂',
    color: '#8b5cf6',
    usageFrequency: 'moderate', // 55% ботов
    defaultConfig: { key: 'userData' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  
  // Новые узлы из схемы n8n
  {
    type: 'send_message_with_keyboard',
    category: 'actions',
    name: 'Сообщение с клавиатурой',
    description: 'Отправляет сообщение с интерактивными кнопками',
    icon: '⌨️',
    color: '#6366f1',
    usageFrequency: 'frequent', // 80% ботов
    defaultConfig: { 
      text: 'Выберите действие:',
      parse_mode: 'HTML',
      keyboard: {
        type: 'inline',
        buttons: [
          [{ text: 'Кнопка 1', callback_data: 'btn1' }]
        ]
      }
    },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  {
    type: 'callback_handler',
    category: 'triggers',
    name: 'Обработчик кнопок',
    description: 'Реагирует на нажатие inline-кнопок',
    icon: '🔄',
    color: '#f59e0b',
    usageFrequency: 'frequent', // 75% ботов
    defaultConfig: { 
      callback_data: 'button_clicked',
      name: 'Обработчик кнопки'
    },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  },
  {
    type: 'command',
    category: 'triggers',
    name: 'Команда бота',
    description: 'Обрабатывает команды бота (/start, /help)',
    icon: '⚡',
    color: '#ef4444',
    usageFrequency: 'frequent', // 85% ботов
    defaultConfig: { 
      command: '/start',
      name: 'Команда /start'
    },
    inputs: [],
    outputs: [{ id: 'output', name: 'Выход', type: 'control', dataType: 'any', required: false, multiple: false }]
  }
];

const categories: { key: NodeCategory; name: string; icon: string }[] = [
  { key: 'triggers', name: 'Триггеры', icon: '🚀' },
  { key: 'actions', name: 'Действия', icon: '⚡' },
  { key: 'conditions', name: 'Условия', icon: '❓' },
  { key: 'data', name: 'Данные', icon: '💾' },
  { key: 'integrations', name: 'Интеграции', icon: '🔗' },
  { key: 'scenarios', name: 'Сценарии', icon: '📋' }
];

interface NodeLibraryProps {
  onNodeAdd?: (nodeType: string) => void;
  onNodeHelpRequest?: (nodeType: string) => void;
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onNodeAdd, onNodeHelpRequest }) => {
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory>('triggers');
  const [searchQuery, setSearchQuery] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'frequent' | 'moderate' | 'rare'>('all');
  const { logDragStart, logLibraryOpen } = useCanvasLogger();

  // Инициализируем NodeRegistry с данными узлов
  useEffect(() => {
    nodeRegistry.importFromNodeLibrary(nodeDefinitions);
  }, []);

  // Логируем открытие библиотеки при монтировании
  React.useEffect(() => {
    logLibraryOpen();
  }, [logLibraryOpen]);

  const filteredNodes = useMemo(() => {
    let nodes = nodeDefinitions.filter(node => {
      const matchesCategory = node.category === selectedCategory;
      const matchesFrequency = frequencyFilter === 'all' || node.usageFrequency === frequencyFilter;
      
      return matchesCategory && matchesFrequency;
    });

    // Сортируем по приоритету (частые узлы сначала)
    const sortedNodes = SimpleUsageHelper.sortByPriority(nodes);

    // Фильтрация по поиску с логикой "минимум первые три"
    if (searchQuery) {
      const searchResults = sortedNodes.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      // Если найдено меньше 3 узлов, добавляем первые узлы из категории до 3
      if (searchResults.length < 3) {
        const firstThree = sortedNodes.slice(0, 3);
        const combined = [...searchResults];
        
        // Добавляем узлы из первых трех, которых еще нет в результатах поиска
        firstThree.forEach(node => {
          if (!combined.find(existing => existing.type === node.type)) {
            combined.push(node);
          }
        });
        
        return combined.slice(0, Math.max(3, searchResults.length));
      }
      
      return searchResults;
    }

    return sortedNodes;
  }, [selectedCategory, searchQuery, frequencyFilter]);

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    // Логируем начало перетаскивания
    logDragStart(nodeType, 'library');
  };

  const handleNodeAdd = (nodeType: string) => {
    if (onNodeAdd) {
      onNodeAdd(nodeType);
    }
  };

  // Проверяем, показываем ли дополнительные узлы при поиске
  const showingExtraNodes = useMemo(() => {
    if (!searchQuery) return false;
    
    let categoryNodes = nodeDefinitions.filter(node => {
      const matchesCategory = node.category === selectedCategory;
      const matchesFrequency = frequencyFilter === 'all' || node.usageFrequency === frequencyFilter;
      return matchesCategory && matchesFrequency;
    });
    
    const searchResults = categoryNodes.filter(node => 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    return searchResults.length < 3 && filteredNodes.length > searchResults.length;
  }, [searchQuery, selectedCategory, frequencyFilter, filteredNodes]);

  return (
    <div className={styles.nodeLibrary}>
      <div className={styles.header}>
        <h3>Библиотека узлов</h3>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск узлов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.searchHint}>
            💡 Используйте поиск или прокрутите список для поиска узлов
          </div>
        </div>
        
        <div className={styles.frequencyFilter}>
          <label>Частота использования:</label>
          <select 
            value={frequencyFilter} 
            onChange={(e) => setFrequencyFilter(e.target.value as any)}
            className={styles.frequencySelect}
          >
            <option value="all">Все узлы</option>
            <option value="frequent">🔥 Частые (&gt;70%)</option>
            <option value="moderate">📊 Средние (30-70%)</option>
            <option value="rare">💎 Редкие (&lt;30%)</option>
          </select>
        </div>
      </div>

      <div className={styles.categories}>
        {categories.map(category => (
          <button
            key={category.key}
            className={`${styles.categoryButton} ${
              selectedCategory === category.key ? styles.active : ''
            }`}
            onClick={() => setSelectedCategory(category.key)}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span className={styles.categoryName}>{category.name}</span>
          </button>
        ))}
      </div>

      <UsageStatistics nodes={nodeDefinitions} />

      <div className={styles.nodeList}>
        {/* Подсказка о дополнительных узлах при поиске */}
        {showingExtraNodes && (
          <div className={styles.searchNotice}>
            <div className={styles.noticeIcon}>ℹ️</div>
            <div className={styles.noticeText}>
              Показаны дополнительные узлы для удобства выбора
            </div>
          </div>
        )}

        {filteredNodes.map(node => {
          const localization = getNodeLocalization(node.type);
          return (
            <div
              key={node.type}
              className={styles.nodeItem}
              draggable
              onDragStart={(e) => handleNodeDragStart(e, node.type)}
              title={localization.tooltip}
            >
              <div 
                className={styles.nodeIcon}
                style={{ backgroundColor: node.color }}
              >
                {node.icon}
              </div>
              <div className={styles.nodeInfo} onClick={() => handleNodeAdd(node.type)}>
                <div className={styles.nodeHeader}>
                  <div className={styles.nodeName}>{localization.name}</div>
                  <div 
                    className={styles.frequencyBadge}
                    style={{ backgroundColor: SimpleUsageHelper.getFrequencyColor(node.usageFrequency) }}
                    title={SimpleUsageHelper.getFrequencyDescription(node.usageFrequency)}
                  >
                    {SimpleUsageHelper.getFrequencyIcon(node.usageFrequency)}
                  </div>
                </div>
                <div className={styles.nodeDescription}>{localization.description}</div>
              </div>
              {onNodeHelpRequest && (
                <button
                  className={styles.helpButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeHelpRequest(node.type);
                  }}
                  title="Справка по узлу"
                >
                  ❓
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NodeLibrary;