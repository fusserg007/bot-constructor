import React, { useState, useEffect } from 'react';
import styles from './TemplateLibrary.module.css';

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  platforms: string[];
  preview?: {
    features: string[];
  };
  author?: string;
  version: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [selectedCategory, selectedDifficulty, searchQuery]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        setError(data.error || 'Ошибка загрузки шаблонов');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/templates/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const filterTemplates = async () => {
    try {
      let url = '/api/templates?';
      const params = new URLSearchParams();

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedDifficulty !== 'all') {
        params.append('difficulty', selectedDifficulty);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(url + params.toString());
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error filtering templates:', err);
    }
  };

  const createBotFromTemplate = async (templateId: string, botName: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: botName }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Бот "${botName}" успешно создан!`);
        // Можно добавить редирект на редактор бота
      } else {
        alert(data.error || 'Ошибка создания бота');
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
    }
  };

  const handleUseTemplate = (template: BotTemplate) => {
    const botName = prompt(`Введите название для нового бота на основе "${template.name}":`, `Мой ${template.name}`);
    if (botName) {
      createBotFromTemplate(template.id, botName);
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

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Начинающий';
      case 'intermediate': return 'Средний';
      case 'advanced': return 'Продвинутый';
      default: return difficulty;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка шаблонов...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  return (
    <div className={styles.templateLibrary}>
      <div className={styles.header}>
        <h1>Библиотека шаблонов</h1>
        <p>Выберите готовый шаблон для быстрого создания бота</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Поиск шаблонов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Категория:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Все категории</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Сложность:</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Любая</option>
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </div>

      <div className={styles.templatesGrid}>
        {templates.map(template => (
          <div key={template.id} className={styles.templateCard}>
            <div className={styles.templateHeader}>
              <h3>{template.name}</h3>
              <div 
                className={styles.difficultyBadge}
                style={{ backgroundColor: getDifficultyColor(template.difficulty) }}
              >
                {getDifficultyText(template.difficulty)}
              </div>
            </div>

            <p className={styles.templateDescription}>{template.description}</p>

            <div className={styles.templateTags}>
              {template.tags.map(tag => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ))}
            </div>

            <div className={styles.templatePlatforms}>
              <strong>Платформы:</strong>
              <div className={styles.platforms}>
                {template.platforms.map(platform => (
                  <span key={platform} className={styles.platform}>
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            {template.preview?.features && (
              <div className={styles.templateFeatures}>
                <strong>Возможности:</strong>
                <ul>
                  {template.preview.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.templateFooter}>
              <div className={styles.templateMeta}>
                <small>v{template.version}</small>
                {template.author && <small>by {template.author}</small>}
              </div>
              <button
                className={styles.useTemplateButton}
                onClick={() => handleUseTemplate(template)}
              >
                Использовать шаблон
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className={styles.noTemplates}>
          <p>Шаблоны не найдены</p>
          <p>Попробуйте изменить фильтры или поисковый запрос</p>
        </div>
      )}
    </div>
  );
};

export default TemplateLibrary;