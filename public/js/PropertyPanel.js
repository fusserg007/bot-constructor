/**
 * Панель свойств для настройки узлов визуального редактора
 */
class PropertyPanel {
    constructor(containerElement, nodeLibrary) {
        this.container = containerElement;
        this.nodeLibrary = nodeLibrary;
        this.currentNode = null;
        this.onNodeUpdate = null; // Callback для обновления узла
        
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="property-panel">
                <div class="property-header">
                    <h3>Свойства узла</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
                </div>
                <div class="property-content">
                    <div class="no-selection">
                        <div class="no-selection-icon">⚙️</div>
                        <p>Выберите узел для настройки его свойств</p>
                    </div>
                </div>
            </div>
        `;

        this.headerElement = this.container.querySelector('.property-header h3');
        this.contentElement = this.container.querySelector('.property-content');
        this.noSelectionElement = this.container.querySelector('.no-selection');
    }

    // Показать свойства выбранного узла
    showNodeProperties(node) {
        this.currentNode = node;
        
        if (!node) {
            this.showNoSelection();
            return;
        }

        const nodeType = this.nodeLibrary.getNodeType(node.type);
        if (!nodeType) {
            this.showError(`Неизвестный тип узла: ${node.type}`);
            return;
        }

        this.headerElement.textContent = `${nodeType.name} - Свойства`;
        this.renderNodeForm(node, nodeType);
    }

    // Показать состояние "ничего не выбрано"
    showNoSelection() {
        this.headerElement.textContent = 'Свойства узла';
        this.contentElement.innerHTML = `
            <div class="no-selection">
                <div class="no-selection-icon">⚙️</div>
                <p>Выберите узел для настройки его свойств</p>
            </div>
        `;
    }

    // Показать ошибку
    showError(message) {
        this.contentElement.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }

    // Отрендерить форму настроек узла
    renderNodeForm(node, nodeType) {
        const formHTML = `
            <div class="node-form">
                <div class="node-info">
                    <div class="node-icon">${nodeType.icon}</div>
                    <div class="node-details">
                        <div class="node-name">${nodeType.name}</div>
                        <div class="node-description">${nodeType.description}</div>
                        <div class="node-category">${this.getCategoryName(nodeType.category)}</div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4>Основные настройки</h4>
                    <div class="form-group">
                        <label for="node-title">Название узла:</label>
                        <input type="text" id="node-title" value="${node.title || nodeType.name}" 
                               onchange="propertyPanel.updateNodeProperty('title', this.value)">
                    </div>
                </div>

                <div class="form-section">
                    <h4>Конфигурация</h4>
                    <div class="config-fields">
                        ${this.renderConfigFields(node, nodeType)}
                    </div>
                </div>

                <div class="form-section">
                    <h4>Соединения</h4>
                    <div class="connections-info">
                        <div class="inputs-info">
                            <strong>Входы:</strong> ${nodeType.inputs.join(', ') || 'Нет'}
                        </div>
                        <div class="outputs-info">
                            <strong>Выходы:</strong> ${nodeType.outputs.join(', ') || 'Нет'}
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn-primary" onclick="propertyPanel.validateAndSave()">
                        Применить изменения
                    </button>
                    <button class="btn-secondary" onclick="propertyPanel.resetToDefaults()">
                        Сбросить
                    </button>
                </div>
            </div>
        `;

        this.contentElement.innerHTML = formHTML;
    }

    // Отрендерить поля конфигурации
    renderConfigFields(node, nodeType) {
        if (!nodeType.config || Object.keys(nodeType.config).length === 0) {
            return '<p class="no-config">Этот узел не имеет настраиваемых параметров</p>';
        }

        let fieldsHTML = '';
        
        for (const [fieldName, fieldConfig] of Object.entries(nodeType.config)) {
            const currentValue = node.config?.[fieldName] ?? fieldConfig.default;
            fieldsHTML += this.renderConfigField(fieldName, fieldConfig, currentValue);
        }

        return fieldsHTML;
    }

    // Отрендерить отдельное поле конфигурации
    renderConfigField(fieldName, fieldConfig, currentValue) {
        const fieldId = `config-${fieldName}`;
        let fieldHTML = '';

        switch (fieldConfig.type) {
            case 'text':
                fieldHTML = `
                    <input type="text" id="${fieldId}" value="${currentValue || ''}" 
                           onchange="propertyPanel.updateConfigProperty('${fieldName}', this.value)">
                `;
                break;

            case 'textarea':
                fieldHTML = `
                    <textarea id="${fieldId}" rows="3" 
                              onchange="propertyPanel.updateConfigProperty('${fieldName}', this.value)">${currentValue || ''}</textarea>
                `;
                break;

            case 'number':
                fieldHTML = `
                    <input type="number" id="${fieldId}" value="${currentValue || 0}" 
                           onchange="propertyPanel.updateConfigProperty('${fieldName}', parseFloat(this.value))">
                `;
                break;

            case 'checkbox':
                fieldHTML = `
                    <input type="checkbox" id="${fieldId}" ${currentValue ? 'checked' : ''} 
                           onchange="propertyPanel.updateConfigProperty('${fieldName}', this.checked)">
                    <label for="${fieldId}" class="checkbox-label">Включено</label>
                `;
                break;

            case 'select':
                const options = fieldConfig.options.map(option => 
                    `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`
                ).join('');
                fieldHTML = `
                    <select id="${fieldId}" onchange="propertyPanel.updateConfigProperty('${fieldName}', this.value)">
                        ${options}
                    </select>
                `;
                break;

            default:
                fieldHTML = `
                    <input type="text" id="${fieldId}" value="${currentValue || ''}" 
                           onchange="propertyPanel.updateConfigProperty('${fieldName}', this.value)">
                `;
        }

        return `
            <div class="form-group">
                <label for="${fieldId}">${fieldConfig.label}:</label>
                ${fieldHTML}
                ${fieldConfig.description ? `<div class="field-description">${fieldConfig.description}</div>` : ''}
            </div>
        `;
    }

    // Получить название категории
    getCategoryName(categoryKey) {
        const categories = this.nodeLibrary.getCategories();
        return categories[categoryKey]?.name || categoryKey;
    }

    // Обновить свойство узла
    updateNodeProperty(property, value) {
        if (!this.currentNode) return;

        this.currentNode[property] = value;
        this.notifyNodeUpdate();
    }

    // Обновить свойство конфигурации
    updateConfigProperty(property, value) {
        if (!this.currentNode) return;

        if (!this.currentNode.config) {
            this.currentNode.config = {};
        }

        this.currentNode.config[property] = value;
        this.notifyNodeUpdate();
    }

    // Уведомить об обновлении узла
    notifyNodeUpdate() {
        if (this.onNodeUpdate && typeof this.onNodeUpdate === 'function') {
            this.onNodeUpdate(this.currentNode);
        }
    }

    // Валидация и сохранение
    validateAndSave() {
        if (!this.currentNode) return;

        const nodeType = this.nodeLibrary.getNodeType(this.currentNode.type);
        if (!nodeType) return;

        // Валидация конфигурации
        const validation = this.nodeLibrary.validateNodeConfig(this.currentNode.type, this.currentNode.config);
        
        if (!validation.valid) {
            this.showValidationErrors(validation.errors);
            return;
        }

        // Показать успешное сохранение
        this.showSuccessMessage('Настройки успешно применены!');
        this.notifyNodeUpdate();
    }

    // Показать ошибки валидации
    showValidationErrors(errors) {
        const errorHTML = `
            <div class="validation-errors">
                <h4>Ошибки валидации:</h4>
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;

        // Добавляем ошибки в начало формы
        const formSection = this.contentElement.querySelector('.node-form');
        if (formSection) {
            formSection.insertAdjacentHTML('afterbegin', errorHTML);
            
            // Удаляем ошибки через 5 секунд
            setTimeout(() => {
                const errorElement = formSection.querySelector('.validation-errors');
                if (errorElement) {
                    errorElement.remove();
                }
            }, 5000);
        }
    }

    // Показать сообщение об успехе
    showSuccessMessage(message) {
        const successHTML = `
            <div class="success-message">
                <div class="success-icon">✅</div>
                <p>${message}</p>
            </div>
        `;

        const formSection = this.contentElement.querySelector('.node-form');
        if (formSection) {
            formSection.insertAdjacentHTML('afterbegin', successHTML);
            
            // Удаляем сообщение через 3 секунды
            setTimeout(() => {
                const successElement = formSection.querySelector('.success-message');
                if (successElement) {
                    successElement.remove();
                }
            }, 3000);
        }
    }

    // Сбросить к значениям по умолчанию
    resetToDefaults() {
        if (!this.currentNode) return;

        const nodeType = this.nodeLibrary.getNodeType(this.currentNode.type);
        if (!nodeType) return;

        // Сбрасываем конфигурацию к значениям по умолчанию
        this.currentNode.config = {};
        for (const [fieldName, fieldConfig] of Object.entries(nodeType.config)) {
            this.currentNode.config[fieldName] = fieldConfig.default;
        }

        // Перерендериваем форму
        this.renderNodeForm(this.currentNode, nodeType);
        this.notifyNodeUpdate();
        
        this.showSuccessMessage('Настройки сброшены к значениям по умолчанию');
    }

    // Установить callback для обновления узла
    setNodeUpdateCallback(callback) {
        this.onNodeUpdate = callback;
    }

    // Показать/скрыть панель
    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    // Переключить видимость панели
    toggle() {
        if (this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
}

// Глобальная переменная для доступа из HTML
let propertyPanel = null;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PropertyPanel;
}