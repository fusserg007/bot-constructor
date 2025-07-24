import React from 'react';
import type { Node } from 'reactflow';
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

  const renderPropertyField = (key: string, value: any) => {
    if (typeof value === 'string') {
      return (
        <div key={key} className={styles.field}>
          <label className={styles.label}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
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
            {key.charAt(0).toUpperCase() + key.slice(1)}
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
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </label>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={key} className={styles.field}>
          <label className={styles.label}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
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
        <div className={styles.nodeType}>{selectedNode.type}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h4>Основные настройки</h4>
          
          <div className={styles.field}>
            <label className={styles.label}>ID узла</label>
            <input
              type="text"
              value={selectedNode.id}
              disabled
              className={`${styles.input} ${styles.disabled}`}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Тип узла</label>
            <input
              type="text"
              value={selectedNode.type}
              disabled
              className={`${styles.input} ${styles.disabled}`}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Название</label>
            <input
              type="text"
              value={selectedNode.data?.label || ''}
              onChange={(e) => handleInputChange('label', e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        {Object.keys(nodeData).length > 0 && (
          <div className={styles.section}>
            <h4>Конфигурация</h4>
            {Object.entries(nodeData).map(([key, value]) => {
              if (key === 'label') return null; // Already handled above
              return renderPropertyField(key, value);
            })}
          </div>
        )}

        <div className={styles.section}>
          <h4>Позиция</h4>
          <div className={styles.positionFields}>
            <div className={styles.field}>
              <label className={styles.label}>X</label>
              <input
                type="number"
                value={Math.round(selectedNode.position.x)}
                disabled
                className={`${styles.input} ${styles.disabled}`}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Y</label>
              <input
                type="number"
                value={Math.round(selectedNode.position.y)}
                disabled
                className={`${styles.input} ${styles.disabled}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;