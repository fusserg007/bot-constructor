import React, { useState, useEffect } from 'react';
import styles from './HelpSystem.module.css';

interface NodeHelpInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  examples: NodeExample[];
  bestPractices: string[];
  commonIssues: CommonIssue[];
  relatedNodes: string[];
  platforms: string[];
}

interface NodeExample {
  title: string;
  description: string;
  config: Record<string, any>;
  useCase: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface CommonIssue {
  problem: string;
  solution: string;
  prevention: string;
}

interface SearchResult {
  type: 'node' | 'template' | 'example' | 'guide';
  id: string;
  title: string;
  description: string;
  relevance: number;
  category?: string;
}

interface HelpSystemProps {
  selectedNodeType?: string;
  onClose?: () => void;
  isVisible: boolean;
}

export const HelpSystem: React.FC<HelpSystemProps> = ({
  selectedNodeType,
  onClose,
  isVisible
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedHelp, setSelectedHelp] = useState<NodeHelpInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'examples' | 'issues' | 'related'>('overview');

  useEffect(() => {
    if (selectedNodeType) {
      loadNodeHelp(selectedNodeType);
    }
  }, [selectedNodeType]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadNodeHelp = async (nodeType: string) => {
    try {
      const response = await fetch(`/api/help/nodes/${nodeType}`);
      if (response.ok) {
        const helpInfo = await response.json();
        setSelectedHelp(helpInfo);
      }
    } catch (error) {
      console.error('Ошибка загрузки справки:', error);
    }
  };

  const performSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/help/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#757575';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'triggers': return '⚡';
      case 'actions': return '🎯';
      case 'conditions': return '❓';
      case 'data': return '📊';
      case 'integrations': return '🔗';
      default: return '📄';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.helpSystem}>
      <div className={styles.helpHeader}>
        <h2>Справочная система</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="Поиск по справке..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        
        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={styles.searchResult}
                onClick={() => {
                  if (result.type === 'node') {
                    loadNodeHelp(result.id);
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.resultIcon}>
                    {getCategoryIcon(result.category || '')}
                  </span>
                  <span className={styles.resultTitle}>{result.title}</span>
                  <span className={styles.resultType}>{result.type}</span>
                </div>
                <div className={styles.resultDescription}>
                  {result.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedHelp && (
        <div className={styles.helpContent}>
          <div className={styles.helpTitle}>
            <span className={styles.categoryIcon}>
              {getCategoryIcon(selectedHelp.category)}
            </span>
            <h3>{selectedHelp.title}</h3>
            <div className={styles.platforms}>
              {selectedHelp.platforms.map(platform => (
                <span key={platform} className={styles.platform}>
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.helpTabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Обзор
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'examples' ? styles.active : ''}`}
              onClick={() => setActiveTab('examples')}
            >
              Примеры ({selectedHelp.examples.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'issues' ? styles.active : ''}`}
              onClick={() => setActiveTab('issues')}
            >
              Проблемы ({selectedHelp.commonIssues.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'related' ? styles.active : ''}`}
              onClick={() => setActiveTab('related')}
            >
              Связанные ({selectedHelp.relatedNodes.length})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'overview' && (
              <div className={styles.overview}>
                <div className={styles.description}>
                  {selectedHelp.description}
                </div>
                
                {selectedHelp.bestPractices.length > 0 && (
                  <div className={styles.bestPractices}>
                    <h4>💡 Лучшие практики</h4>
                    <ul>
                      {selectedHelp.bestPractices.map((practice, index) => (
                        <li key={index}>{practice}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'examples' && (
              <div className={styles.examples}>
                {selectedHelp.examples.map((example, index) => (
                  <div key={index} className={styles.example}>
                    <div className={styles.exampleHeader}>
                      <h4>{example.title}</h4>
                      <span
                        className={styles.difficulty}
                        style={{ backgroundColor: getDifficultyColor(example.difficulty) }}
                      >
                        {example.difficulty}
                      </span>
                    </div>
                    <div className={styles.exampleDescription}>
                      {example.description}
                    </div>
                    <div className={styles.useCase}>
                      <strong>Применение:</strong> {example.useCase}
                    </div>
                    <div className={styles.config}>
                      <strong>Конфигурация:</strong>
                      <pre>{JSON.stringify(example.config, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'issues' && (
              <div className={styles.issues}>
                {selectedHelp.commonIssues.map((issue, index) => (
                  <div key={index} className={styles.issue}>
                    <div className={styles.problem}>
                      <strong>❌ Проблема:</strong> {issue.problem}
                    </div>
                    <div className={styles.solution}>
                      <strong>✅ Решение:</strong> {issue.solution}
                    </div>
                    <div className={styles.prevention}>
                      <strong>🛡️ Профилактика:</strong> {issue.prevention}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'related' && (
              <div className={styles.related}>
                <div className={styles.relatedNodes}>
                  {selectedHelp.relatedNodes.map((nodeId, index) => (
                    <button
                      key={index}
                      className={styles.relatedNode}
                      onClick={() => loadNodeHelp(nodeId)}
                    >
                      {getCategoryIcon('')} {nodeId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedHelp && !searchQuery && (
        <div className={styles.welcomeMessage}>
          <h3>Добро пожаловать в справочную систему!</h3>
          <p>
            Здесь вы можете найти подробную информацию о всех блоках конструктора ботов,
            примеры их использования и решения типичных проблем.
          </p>
          <div className={styles.quickActions}>
            <button onClick={() => setSearchQuery('триггер')}>
              🔍 Найти триггеры
            </button>
            <button onClick={() => setSearchQuery('сообщение')}>
              🔍 Найти действия с сообщениями
            </button>
            <button onClick={() => setSearchQuery('условие')}>
              🔍 Найти условия
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSystem;