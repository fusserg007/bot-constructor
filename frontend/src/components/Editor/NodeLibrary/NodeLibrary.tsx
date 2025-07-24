import React from 'react';
import { NodeDefinition, NodeCategory } from '../../../types/nodes';
import styles from './NodeLibrary.module.css';

const nodeDefinitions: NodeDefinition[] = [
  // Триггеры
  {
    type: 'trigger-message',
    category: 'triggers',
    name: 'Сообщение',
    description: 'Реагирует на входящие сообщения',
    icon: '📨',
    color: '#3b82f6',
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
    defaultConfig: { key: 'userData' },
    inputs: [{ id: 'input', name: 'Вход', type: 'control', dataType: 'any', required: true, multiple: false }],
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
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onNodeAdd }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<NodeCategory>('triggers');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredNodes = nodeDefinitions.filter(node => {
    const matchesCategory = node.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (nodeType: string) => {
    if (onNodeAdd) {
      onNodeAdd(nodeType);
    }
  };

  return (
    <div className={styles.nodeLibrary}>
      <div className={styles.header}>
        <h3>Библиотека узлов</h3>
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
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

      <div className={styles.nodeList}>
        {filteredNodes.map(node => (
          <div
            key={node.type}
            className={styles.nodeItem}
            draggable
            onDragStart={(e) => handleNodeDragStart(e, node.type)}
            onClick={() => handleNodeAdd(node.type)}
          >
            <div 
              className={styles.nodeIcon}
              style={{ backgroundColor: node.color }}
            >
              {node.icon}
            </div>
            <div className={styles.nodeInfo}>
              <div className={styles.nodeName}>{node.name}</div>
              <div className={styles.nodeDescription}>{node.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeLibrary;