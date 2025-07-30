import React from 'react';
import type { Node } from 'reactflow';
import { getFieldTranslation, getNodeTypeTranslation } from '../../../utils/localization';
import styles from './PropertyPanel.module.css';

interface PropertyPanelProps {
  selectedNode: Node | null;
  onNodeUpdate?: (nodeId: string, data: any) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedNode, onNodeUpdate }) => {
  const [nodeData, setNodeData] = React.useState<any>({});

  React.useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data || {});
    }
  }, [selectedNode]);

  const handleInputChange = (key: string, value: any) => {
    const updatedData = { ...nodeData, [key]: value };
    setNodeData(updatedData);
    
    if (selectedNode && onNodeUpdate) {
      onNodeUpdate(selectedNode.id, updatedData);
    }
  };

  if (!selectedNode) {
    return (
      <div className={styles.propertyPanel}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <h3>Выберите узел</h3>
          <p>Кликните на узел в редакторе, чтобы настроить его свойства</p>
        </div>
      </div>
    );
  }

  const getSelectOptions = (key: string) => {
    switch (key) {
      case 'condition':
        return [
          { value: 'contains', label: 'содержит' },
          { value: 'equals', label: 'равно' },
          { value: 'startsWith', label: 'начинается с' },
          { value: 'endsWith', label: 'заканчивается на' },
          { value: 'regex', label: 'регулярное выражение' }
        ];
      case 'parseMode':
        return [
          { value: 'HTML', label: 'HTML' },
          { value: 'Markdown', label: 'Markdown' },
          { value: 'plain', label: 'обычный текст' }
        ];
      case 'messageType':
      case 'triggerType':
        return [
          { value: 'text', label: 'текст' },
          { value: 'photo', label: 'фото' },
          { value: 'video', label: 'видео' },
          { value: 'audio', label: 'аудио' },
          { value: 'document', label: 'документ' }
        ];
      case 'checkType':
        return [
          { value: 'isAdmin', label: 'является администратором' },
          { value: 'isBanned', label: 'заблокирован' },
          { value: 'hasRole', label: 'имеет роль' }
        ];
      default:
        return null;
    }
  };

  const renderPropertyField = (key: string, value: any) => {
    const selectOptions = getSelectOptions(key);
    
    if (typeof value === 'string') {
      if (selectOptions) {
        return (
          <div key={key} className={styles.field}>
            <label className={styles.label}>
              {getFieldTranslation(key)}
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              className={styles.select}
            >
              {selectOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      }
      
      return (
        <div key={key} className={styles.field}>
          <label className={styles.label}>
            {getFieldTranslation(key)}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className={styles.input}
          />
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div key={key} className={styles.field}>
          <label className={styles.label}>
            {getFieldTranslation(key)}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(key, Number(e.target.value))}
            className={styles.input}
          />
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleInputChange(key, e.target.checked)}
              className={styles.checkbox}
            />
            {getFieldTranslation(key)}
          </label>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={key} className={styles.field}>
          <label className={styles.label}>
            {getFieldTranslation(key)}
          </label>
          <textarea
            value={value.join('\n')}
            onChange={(e) => handleInputChange(key, e.target.value.split('\n').filter(Boolean))}
            className={styles.textarea}
            rows={3}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.propertyPanel}>
      <div className={styles.header}>
        <h3>Свойства узла</h3>
        <div className={styles.nodeType}>{getNodeTypeTranslation(selectedNode.type || '')}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.field}>
            <label className={styles.label}>Название</label>
            <input
              type="text"
              value={selectedNode.data?.label || ''}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className={styles.input}
              placeholder="Введите название узла"
            />
          </div>
        </div>

        {Object.keys(nodeData).length > 0 && (
          <div className={styles.section}>
            <h4>Настройки</h4>
            {Object.entries(nodeData).map(([key, value]) => {
              // Скрываем технические поля
              if (['label', 'id', 'type', 'category', 'color', 'icon', 'inputs', 'outputs', 'name', 'description', 'tags', 'compatibility'].includes(key.toLowerCase())) {
                return null;
              }
              return renderPropertyField(key, value);
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;