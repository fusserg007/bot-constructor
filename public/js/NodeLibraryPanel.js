/**
 * Панель библиотеки узлов для визуального редактора
 */
class NodeLibraryPanel {
    constructor(containerElement, nodeLibrary = null) {
        this.container = containerElement;
        this.nodeLibrary = nodeLibrary || (typeof window !== 'undefined' ? window.nodeLibrary : null);
        this.searchQuery = '';
        this.selectedCategory = null;
        this.collapsedCategories = new Set();
        this.favorites = new Set(JSON.parse(localStorage.getItem('nodeFavorites') || '[]'));
        this.onNodeDrop = null; // Callback для добавления узла на canvas
        this.onNodeSelect = null; // Callback для выбора узла
        this.visualEditor = null; // Ссылка на VisualEditor
        
        // Инициализируем библиотеку если она доступна
        if (this.nodeLibrary && !this.nodeLibrary.initialized) {
            this.nodeLibrary.init();
        }
        
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="node-library-panel">
                <div class="library-header">
                    <h3>Библиотека узлов</h3>
                    <div class="library-stats">
                        <span class="stats-text">${this.getTotalNodesCount()} узлов</span>
                    </div>
                </div>
                
                <div class="library-search">
                    <input type="text" 
                           id="nodeSearch" 
                           placeholder="🔍 Поиск узлов..." 
                           onkeyup="nodeLibraryPanel.onSearch(this.value)">
                    <button class="clear-search" onclick="nodeLibraryPanel.clearSearch()" style="display: none;">×</button>
                </div>
                
                <div class="library-filters">
                    <button class="filter-btn active" onclick="nodeLibraryPanel.showAllCategories()">
                        Все категории
                    </button>
                    <button class="filter-btn" onclick="nodeLibraryPanel.showFavorites()">
                        ⭐ Избранное
                    </button>
                </div>
                
                <div class="library-content" id="libraryContent">
                    ${this.renderCategories()}
                </div>
                
                <div class="library-footer">
                    <div class="usage-hint">
                        💡 Перетащите узел на canvas или кликните для добавления
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Обработка drag and drop
        this.container.addEventListener('dragstart', this.onDragStart.bind(this));
        this.container.addEventListener('dragend', this.onDragEnd.bind(this));
        
        // Обработка кликов по узлам
        this.container.addEventListener('click', this.onNodeClick.bind(this));
        
        // Обработка сворачивания категорий
        this.container.addEventListener('click', this.onCategoryToggle.bind(this));
    }

    renderCategories() {
        if (!this.nodeLibrary) {
            return '<div class="no-library">NodeLibrary не инициализирована</div>';
        }
        
        const categories = this.nodeLibrary.getCategories();
        
        return categories.map(category => {
            const nodes = this.nodeLibrary.getNodeTypesByCategory(category.id);
            const isCollapsed = this.collapsedCategories.has(category.id);
            
            return `
                <div class="node-category" data-category="${category.id}">
                    <div class="category-header ${isCollapsed ? 'collapsed' : ''}" 
                         data-category-id="${category.id}">
                        <div class="category-info">
                            <span class="category-icon">${category.icon}</span>
                            <span class="category-name">${category.displayName}</span>
                            <span class="category-count">(${nodes.length})</span>
                        </div>
                        <span class="category-toggle">${isCollapsed ? '▶' : '▼'}</span>
                    </div>
                    
                    <div class="category-description">
                        ${category.description}
                    </div>
                    
                    <div class="category-nodes ${isCollapsed ? 'collapsed' : ''}" 
                         id="category-${category.id}">
                        ${this.renderCategoryNodes(category.id, nodes)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCategoryNodes(categoryId, nodes) {
        if (!nodes || nodes.length === 0) {
            return '<div class="no-nodes">Узлы не найдены</div>';
        }

        return nodes.map(node => `
            <div class="node-item" 
                 draggable="true" 
                 data-node-type="${node.type}"
                 data-category="${categoryId}"
                 title="${node.description}">
                
                <div class="node-header">
                    <span class="node-icon">${node.icon}</span>
                    <div class="node-actions">
                        <button class="node-favorite" onclick="nodeLibraryPanel.toggleFavorite('${node.type}')" title="Добавить в избранное">
                            ☆
                        </button>
                        <button class="node-info" onclick="nodeLibraryPanel.showNodeInfo('${node.type}')" title="Подробная информация">
                            ℹ️
                        </button>
                    </div>
                </div>
                
                <div class="node-content">
                    <div class="node-name">${node.name}</div>
                    <div class="node-description">${node.description}</div>
                    
                    <div class="node-meta">
                        <div class="node-io">
                            <span class="io-info">
                                <span class="io-label">Входы:</span>
                                <span class="io-count">${node.inputs?.length || 0}</span>
                            </span>
                            <span class="io-info">
                                <span class="io-label">Выходы:</span>
                                <span class="io-count">${node.outputs?.length || 0}</span>
                            </span>
                        </div>
                        
                        ${this.renderNodeTags(node)}
                    </div>
                </div>
                
                <div class="node-overlay">
                    <div class="overlay-content">
                        <span class="overlay-icon">+</span>
                        <span class="overlay-text">Добавить</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderNodeTags(node) {
        const tags = [];
        
        // Добавляем теги на основе конфигурации
        if (node.config) {
            const configCount = Object.keys(node.config).length;
            if (configCount > 0) {
                tags.push(`${configCount} настроек`);
            }
        }
        
        // Добавляем специальные теги
        if (node.type.includes('api')) {
            tags.push('API');
        }
        if (node.outputs?.includes('error')) {
            tags.push('Обработка ошибок');
        }
        if (node.config && Object.values(node.config).some(field => field.type === 'select')) {
            tags.push('Настраиваемый');
        }

        if (tags.length === 0) return '';

        return `
            <div class="node-tags">
                ${tags.map(tag => `<span class="node-tag">${tag}</span>`).join('')}
            </div>
        `;
    }

    // Поиск узлов
    onSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        const clearBtn = this.container.querySelector('.clear-search');
        
        if (this.searchQuery) {
            clearBtn.style.display = 'block';
            this.renderSearchResults();
        } else {
            clearBtn.style.display = 'none';
            this.renderCategories();
            this.updateContent();
        }
    }

    clearSearch() {
        const searchInput = this.container.querySelector('#nodeSearch');
        searchInput.value = '';
        this.onSearch('');
    }

    renderSearchResults() {
        if (!this.nodeLibrary) return;
        
        const results = this.nodeLibrary.searchNodes(this.searchQuery);
        const content = this.container.querySelector('#libraryContent');
        
        if (results.length === 0) {
            content.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">
                        <h4>Ничего не найдено</h4>
                        <p>Попробуйте изменить поисковый запрос</p>
                    </div>
                </div>
            `;
            return;
        }

        // Группируем результаты по категориям
        const groupedResults = {};
        results.forEach(node => {
            if (!groupedResults[node.category]) {
                groupedResults[node.category] = [];
            }
            groupedResults[node.category].push(node);
        });

        const categories = this.nodeLibrary.getCategories();
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat;
        });
        
        content.innerHTML = `
            <div class="search-results">
                <div class="search-header">
                    <h4>Результаты поиска (${results.length})</h4>
                </div>
                
                ${Object.entries(groupedResults).map(([categoryId, nodes]) => `
                    <div class="search-category">
                        <div class="search-category-header">
                            <span class="category-icon">${categoryMap[categoryId]?.icon || '📁'}</span>
                            <span class="category-name">${categoryMap[categoryId]?.displayName || categoryId}</span>
                            <span class="category-count">(${nodes.length})</span>
                        </div>
                        <div class="search-category-nodes">
                            ${this.renderCategoryNodes(categoryId, nodes)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Обработка drag and drop
    onDragStart(event) {
        if (!event.target.classList.contains('node-item')) return;
        
        const nodeType = event.target.dataset.nodeType;
        event.dataTransfer.setData('text/plain', nodeType);
        event.dataTransfer.effectAllowed = 'copy';
        
        // Добавляем визуальный эффект
        event.target.classList.add('dragging');
        
        setTimeout(() => {
            event.target.classList.remove('dragging');
        }, 100);
        
        // Debug: console.log(`🎯 Начато перетаскивание узла: ${nodeType}`);
    }

    onDragEnd(event) {
        if (!event.target.classList.contains('node-item')) return;
        
        // Убираем визуальные эффекты
        event.target.classList.remove('dragging');
        
        // Сбрасываем стили курсора
        document.body.style.cursor = 'default';
    }

    // Обработка кликов по узлам
    onNodeClick(event) {
        const nodeItem = event.target.closest('.node-item');
        if (!nodeItem) return;
        
        // Игнорируем клики по кнопкам действий
        if (event.target.closest('.node-actions')) return;
        
        const nodeType = nodeItem.dataset.nodeType;
        
        // Добавляем узел на canvas
        if (this.onNodeDrop) {
            this.onNodeDrop(nodeType);
        }
        
        // Визуальная обратная связь
        nodeItem.classList.add('clicked');
        setTimeout(() => {
            nodeItem.classList.remove('clicked');
        }, 200);
        
        console.log(`➕ Добавлен узел через клик: ${nodeType}`);
    }

    // Обработка сворачивания категорий
    onCategoryToggle(event) {
        const categoryHeader = event.target.closest('.category-header');
        if (!categoryHeader) return;
        
        const categoryId = categoryHeader.dataset.categoryId;
        if (!categoryId) return;
        
        const categoryNodes = this.container.querySelector(`#category-${categoryId}`);
        const toggleIcon = categoryHeader.querySelector('.category-toggle');
        
        if (this.collapsedCategories.has(categoryId)) {
            // Разворачиваем
            this.collapsedCategories.delete(categoryId);
            categoryHeader.classList.remove('collapsed');
            categoryNodes.classList.remove('collapsed');
            toggleIcon.textContent = '▼';
        } else {
            // Сворачиваем
            this.collapsedCategories.add(categoryId);
            categoryHeader.classList.add('collapsed');
            categoryNodes.classList.add('collapsed');
            toggleIcon.textContent = '▶';
        }
    }

    // Показать все категории
    showAllCategories() {
        this.selectedCategory = null;
        this.updateFilterButtons('Все категории');
        this.updateContent();
    }

    // Показать избранное
    showFavorites() {
        this.selectedCategory = 'favorites';
        this.updateFilterButtons('⭐ Избранное');
        this.renderFavorites();
    }

    updateFilterButtons(activeText) {
        const buttons = this.container.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.trim() === activeText) {
                btn.classList.add('active');
            }
        });
    }

    renderFavorites() {
        const favorites = this.getFavorites();
        const content = this.container.querySelector('#libraryContent');
        
        if (favorites.length === 0) {
            content.innerHTML = `
                <div class="no-favorites">
                    <div class="no-favorites-icon">⭐</div>
                    <div class="no-favorites-text">
                        <h4>Нет избранных узлов</h4>
                        <p>Добавьте узлы в избранное, нажав на ☆</p>
                    </div>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="favorites-section">
                <div class="favorites-header">
                    <h4>Избранные узлы (${favorites.length})</h4>
                </div>
                <div class="favorites-nodes">
                    ${this.renderCategoryNodes('favorites', favorites)}
                </div>
            </div>
        `;
    }

    // Управление избранным
    toggleFavorite(nodeType) {
        const favorites = this.getFavorites();
        const index = favorites.findIndex(node => node.type === nodeType);
        
        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            const node = this.nodeLibrary ? this.nodeLibrary.getNodeType(nodeType) : null;
            if (node) {
                favorites.push({ ...node, type: nodeType });
            }
        }
        
        this.saveFavorites(favorites);
        this.updateFavoriteButtons();
        
        if (this.selectedCategory === 'favorites') {
            this.renderFavorites();
        }
    }

    getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('nodeLibrary_favorites') || '[]');
        } catch {
            return [];
        }
    }

    saveFavorites(favorites) {
        localStorage.setItem('nodeLibrary_favorites', JSON.stringify(favorites));
    }

    updateFavoriteButtons() {
        const favorites = this.getFavorites();
        const favoriteTypes = favorites.map(node => node.type);
        
        this.container.querySelectorAll('.node-favorite').forEach(btn => {
            const nodeType = btn.closest('.node-item').dataset.nodeType;
            btn.textContent = favoriteTypes.includes(nodeType) ? '★' : '☆';
            btn.classList.toggle('active', favoriteTypes.includes(nodeType));
        });
    }

    // Показать информацию о узле
    showNodeInfo(nodeType) {
        const node = this.nodeLibrary ? this.nodeLibrary.getNodeType(nodeType) : null;
        if (!node) return;
        
        // Создаем модальное окно с информацией
        const modal = document.createElement('div');
        modal.className = 'node-info-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${node.icon} ${node.name}</h3>
                    <button class="modal-close" onclick="this.closest('.node-info-modal').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="node-full-description">
                        <p>${node.description}</p>
                    </div>
                    
                    <div class="node-details">
                        <div class="detail-section">
                            <h4>Входы и выходы</h4>
                            <div class="io-details">
                                <div class="io-group">
                                    <strong>Входы:</strong> ${node.inputs?.join(', ') || 'Нет'}
                                </div>
                                <div class="io-group">
                                    <strong>Выходы:</strong> ${node.outputs?.join(', ') || 'Нет'}
                                </div>
                            </div>
                        </div>
                        
                        ${node.config && Object.keys(node.config).length > 0 ? `
                            <div class="detail-section">
                                <h4>Настройки (${Object.keys(node.config).length})</h4>
                                <div class="config-details">
                                    ${Object.entries(node.config).map(([key, field]) => `
                                        <div class="config-item">
                                            <strong>${field.label}:</strong>
                                            <span class="config-type">${field.type}</span>
                                            ${field.default ? `<span class="config-default">(по умолчанию: ${field.default})</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-primary" onclick="nodeLibraryPanel.addNodeFromModal('${nodeType}'); this.closest('.node-info-modal').remove();">
                        Добавить узел
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.node-info-modal').remove()">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    addNodeFromModal(nodeType) {
        if (this.onNodeDrop) {
            this.onNodeDrop(nodeType);
        }
    }

    updateContent() {
        const content = this.container.querySelector('#libraryContent');
        content.innerHTML = this.renderCategories();
        this.updateFavoriteButtons();
    }

    getTotalNodesCount() {
        return this.nodeLibrary ? this.nodeLibrary.getAllNodeTypes().length : 0;
    }

    // Установить callback для добавления узлов
    setNodeDropCallback(callback) {
        this.onNodeDrop = callback;
    }

    // Обновить статистику
    updateStats() {
        const statsElement = this.container.querySelector('.stats-text');
        if (statsElement) {
            statsElement.textContent = `${this.getTotalNodesCount()} узлов`;
        }
    }

    // Связать с VisualEditor
    connectToVisualEditor(visualEditor) {
        this.visualEditor = visualEditor;
        
        // Устанавливаем callback для добавления узлов
        this.setNodeDropCallback((nodeType) => {
            if (this.visualEditor) {
                // Добавляем узел в центр canvas
                const centerX = this.visualEditor.viewport.width / 2;
                const centerY = this.visualEditor.viewport.height / 2;
                this.visualEditor.addNodeFromLibrary(nodeType, centerX, centerY);
            }
        });
    }
}

// Глобальная переменная для доступа из HTML
let nodeLibraryPanel = null;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeLibraryPanel;
}