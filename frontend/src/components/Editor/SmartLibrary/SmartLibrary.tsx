import React, { useState, useMemo } from 'react';
import { NodeCategory } from '../../../types/nodes';
import { nodeRegistry } from '../NodeRegistry/NodeRegistry';
import UnifiedNodeRenderer from '../NodeRegistry/UnifiedNodeRenderer';
import styles from './SmartLibrary.module.css';

const categories: { key: NodeCategory; name: string; icon: string }[] = [
  { key: 'triggers', name: 'Триггеры', icon: '🚀' },
  { key: 'actions', name: 'Действия', icon: '⚡' },
  { key: 'conditions', name: 'Условия', icon: '❓' },
  { key: 'data', name: 'Данные', icon: '💾' },
  { key: 'integrations', name: 'Интеграции', icon: '🔗' },
  { key: 'scenarios', name: 'Сценарии', icon: '📋' }
];

interface SmartLibraryProps {
  onNodeAdd?: (nodeType: string) => void;
  onNodeHelpRequest?: (nodeType: string) => void;
}

const SmartLibrary: React.FC<SmartLibraryProps> = ({ onNodeAdd, onNodeHelpRequest }) => {
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory>('triggers');
  const [searchQuery, setSearchQuery] = useState('');

  // Получаем все конфигурации узлов из реестра
  const allNodes = useMemo(() => {
    return nodeRegistry.getAllConfigurations();
  }, []);

  // Фильтрация узлов
  const filteredNodes = useMemo(() => {
    let nodes = allNodes;

    // Фильтрация по категории
    nodes = nodes.filter(node => node.category === selectedCategory);

    // Фильтрация по поиску
    if (searchQuery) {
      nodes = nodes.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.description && node.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Сортировка по алфавиту
    return nodes.sort((a, b) => a.name.localeCompare(b.name));
  }, [allNodes, selectedCategory, searchQuery]);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (nodeType: string) => {
    if (onNodeAdd) {
      onNodeAdd(nodeType);
    }
  };

  const handleHelpRequest = (nodeType: string) => {
    if (onNodeHelpRequest) {
      onNodeHelpRequest(nodeType);
    }
  };

  return (
    <div className={styles.smartLibrary}>
      <div className={styles.header}>
        <h3 className={styles.title}>Библиотека компонентов</h3>
        
        {/* Поиск */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск компонентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={styles.clearSearch}
              title="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Категории */}
      <div className={styles.categories}>
        {categories.map(category => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`${styles.categoryButton} ${
              selectedCategory === category.key ? styles.active : ''
            }`}
            title={category.name}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span className={styles.categoryName}>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Список узлов */}
      <div className={styles.nodesList}>
        {filteredNodes.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <div className={styles.emptyText}>
                  Ничего не найдено по запросу "{searchQuery}"
                </div>
                <button
                  onClick={() => setSearchQuery('')}
                  className={styles.clearSearchButton}
                >
                  Очистить поиск
                </button>
              </>
            ) : (
              <>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>
                  В категории "{categories.find(c => c.key === selectedCategory)?.name}" пока нет компонентов
                </div>
              </>
            )}
          </div>
        ) : (
          filteredNodes.map(node => (
            <div
              key={node.type}
              className={styles.nodeItem}
              draggable
              onDragStart={(e) => handleDragStart(e, node.type)}
              onClick={() => handleNodeAdd(node.type)}
            >
              <UnifiedNodeRenderer
                nodeType={node.type}
                data={{}}
                mode="library"
                size="small"
              />
              
              <div className={styles.nodeActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHelpRequest(node.type);
                  }}
                  className={styles.helpButton}
                  title="Справка по компоненту"
                >
                  ?
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Информация о выбранной категории */}
      <div className={styles.categoryInfo}>
        <div className={styles.categoryStats}>
          Компонентов в категории: <strong>{filteredNodes.length}</strong>
        </div>
      </div>
    </div>
  );
};

export default SmartLibrary;