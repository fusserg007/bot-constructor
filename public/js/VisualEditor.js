class VisualEditor {
    constructor(canvasElement, nodeLibrary, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.nodeLibrary = nodeLibrary;
        
        // Состояние редактора
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.selectedConnection = null;
        this.dragState = null;
        this.connectionState = null;
        
        // Настройки viewport
        this.viewport = {
            x: 0,
            y: 0,
            scale: 1,
            width: canvasElement.width,
            height: canvasElement.height
        };
        
        // Настройки сетки
        this.grid = {
            size: 20,
            enabled: true
        };
        
        // Настройки уровня сложности
        this.complexityLevel = 'beginner';
        this.complexityConfig = null;
        
        // Настройки сохранения
        this.autoSaveEnabled = options.autoSave !== false;
        this.autoSaveInterval = null;
        this.autoSaveKey = options.autoSaveKey || 'visualEditorAutoSave';
        this.onSchemaChange = options.onSchemaChange || null;
        
        // Настройки синхронизации с сервером
        this.serverSync = options.serverSync !== false;
        this.serverSyncInterval = null;
        this.schema = options.schema || null; // Информация о схеме (id, name и т.д.)
        this.lastSyncTime = null;
        
        // Настройки валидации
        this.validationEnabled = options.validation !== false;
        this.validationResults = null;
        this.onValidationChange = options.onValidationChange || null;
        
        // Инициализация валидатора (если доступен)
        if (typeof SchemaValidator !== 'undefined') {
            this.validator = new SchemaValidator();
        } else {
            this.validator = null;
            console.warn('SchemaValidator не найден, валидация отключена');
        }
        
        // Инициализация
        this.setupEventListeners();
        
        // Загружаем автосохраненную схему если включено
        if (this.autoSaveEnabled && options.loadAutoSave !== false) {
            this.loadAutoSave(this.autoSaveKey);
        }
        
        // Включаем автосохранение
        if (this.autoSaveEnabled) {
            this.setAutoSave(true, options.autoSaveInterval || 30000);
        }
        
        // Включаем синхронизацию с сервером
        if (this.serverSync && options.serverSyncInterval) {
            this.setServerSync(true, options.serverSyncInterval);
        }
        
        this.render();
    }

    setupEventListeners() {
        // Обработчики мыши
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        
        // Обработчики клавиатуры
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Обработчики drag-and-drop
        this.canvas.addEventListener('dragover', this.onDragOver.bind(this));
        this.canvas.addEventListener('drop', this.onDrop.bind(this));
        
        // Предотвращение контекстного меню
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Преобразование координат экрана в координаты мира
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.viewport.x) / this.viewport.scale;
        const y = (screenY - rect.top - this.viewport.y) / this.viewport.scale;
        return { x, y };
    }

    // Преобразование координат мира в координаты экрана
    worldToScreen(worldX, worldY) {
        const x = worldX * this.viewport.scale + this.viewport.x;
        const y = worldY * this.viewport.scale + this.viewport.y;
        return { x, y };
    }

    // Привязка к сетке
    snapToGrid(x, y) {
        if (!this.grid.enabled) return { x, y };
        
        const gridSize = this.grid.size;
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }

    // Добавление узла
    addNode(nodeType, position) {
        const nodeId = this.generateId();
        const nodeConfig = this.nodeLibrary.getNodeConfig(nodeType);
        
        if (!nodeConfig) {
            throw new Error(`Unknown node type: ${nodeType}`);
        }

        const snappedPos = this.snapToGrid(position.x, position.y);
        
        const node = {
            id: nodeId,
            type: nodeType,
            category: nodeConfig.category,
            position: snappedPos,
            size: { width: 150, height: 80 },
            config: { ...nodeConfig.defaultConfig },
            inputs: nodeConfig.inputs || [],
            outputs: nodeConfig.outputs || [],
            title: nodeConfig.title || nodeType
        };

        this.nodes.set(nodeId, node);
        this.render();
        
        return nodeId;
    }

    // Удаление узла
    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) return false;

        // Удаляем все соединения, связанные с узлом
        const connectionsToRemove = [];
        for (const [connId, connection] of this.connections.entries()) {
            if (connection.sourceNodeId === nodeId || connection.targetNodeId === nodeId) {
                connectionsToRemove.push(connId);
            }
        }
        
        connectionsToRemove.forEach(connId => this.connections.delete(connId));
        this.nodes.delete(nodeId);
        
        if (this.selectedNode === nodeId) {
            this.selectedNode = null;
        }
        
        this.render();
        
        // Вызываем событие изменения
        this.triggerChange('remove_node');
        
        return true;
    }

    // Создание соединения между узлами
    connectNodes(sourceNodeId, sourceOutput, targetNodeId, targetInput) {
        if (!this.nodes.has(sourceNodeId) || !this.nodes.has(targetNodeId)) {
            return false;
        }

        // Проверяем валидность соединения
        if (!this.validateConnection(sourceNodeId, sourceOutput, targetNodeId, targetInput)) {
            return false;
        }

        const connectionId = this.generateId();
        const connection = {
            id: connectionId,
            sourceNodeId,
            sourceOutput,
            targetNodeId,
            targetInput
        };

        this.connections.set(connectionId, connection);
        this.render();
        
        // Вызываем событие изменения
        this.triggerChange('add_connection');
        
        return connectionId;
    }

    // Валидация соединения
    validateConnection(sourceNodeId, sourceOutput, targetNodeId, targetInput) {
        // Нельзя соединить узел с самим собой
        if (sourceNodeId === targetNodeId) {
            return false;
        }

        // Проверяем, что выходы и входы существуют
        const sourceNode = this.nodes.get(sourceNodeId);
        const targetNode = this.nodes.get(targetNodeId);
        
        if (!sourceNode.outputs.includes(sourceOutput) || 
            !targetNode.inputs.includes(targetInput)) {
            return false;
        }

        // Проверяем, что вход не занят
        for (const connection of this.connections.values()) {
            if (connection.targetNodeId === targetNodeId && 
                connection.targetInput === targetInput) {
                return false;
            }
        }

        return true;
    }

    // Поиск узла по координатам
    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            if (x >= node.position.x && 
                x <= node.position.x + node.size.width &&
                y >= node.position.y && 
                y <= node.position.y + node.size.height) {
                return node;
            }
        }
        return null;
    }

    // Обработчики событий мыши
    onMouseDown(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        const node = this.getNodeAt(worldPos.x, worldPos.y);

        if (event.button === 0) { // Левая кнопка мыши
            if (node) {
                this.selectedNode = node.id;
                this.dragState = {
                    nodeId: node.id,
                    startPos: worldPos,
                    nodeStartPos: { ...node.position }
                };
            } else {
                this.selectedNode = null;
            }
        } else if (event.button === 2) { // Правая кнопка мыши
            if (node) {
                // Начинаем создание соединения
                this.connectionState = {
                    sourceNodeId: node.id,
                    startPos: worldPos
                };
            }
        }

        this.render();
    }

    onMouseMove(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);

        if (this.dragState) {
            // Перетаскивание узла
            const node = this.nodes.get(this.dragState.nodeId);
            if (node) {
                const deltaX = worldPos.x - this.dragState.startPos.x;
                const deltaY = worldPos.y - this.dragState.startPos.y;
                
                const newPos = this.snapToGrid(
                    this.dragState.nodeStartPos.x + deltaX,
                    this.dragState.nodeStartPos.y + deltaY
                );
                
                node.position = newPos;
                this.render();
            }
        } else if (this.connectionState) {
            // Отображение временного соединения
            this.connectionState.currentPos = worldPos;
            this.render();
        }
    }

    onMouseUp(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);

        if (this.connectionState) {
            // Завершение создания соединения
            const targetNode = this.getNodeAt(worldPos.x, worldPos.y);
            if (targetNode && targetNode.id !== this.connectionState.sourceNodeId) {
                // Попытка создать соединение (упрощенная версия)
                this.connectNodes(
                    this.connectionState.sourceNodeId, 
                    'output', 
                    targetNode.id, 
                    'input'
                );
            }
            this.connectionState = null;
        }

        this.dragState = null;
        this.render();
    }

    onWheel(event) {
        event.preventDefault();
        
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, this.viewport.scale * scaleFactor));
        
        // Масштабирование относительно позиции мыши
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        this.viewport.x = mouseX - (mouseX - this.viewport.x) * (newScale / this.viewport.scale);
        this.viewport.y = mouseY - (mouseY - this.viewport.y) * (newScale / this.viewport.scale);
        this.viewport.scale = newScale;
        
        this.render();
    }

    onKeyDown(event) {
        if (event.key === 'Delete' && this.selectedNode) {
            this.removeNode(this.selectedNode);
        }
    }

    // Отрисовка
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(this.viewport.scale, this.viewport.scale);
        
        this.drawGrid();
        this.drawConnections();
        this.drawNodes();
        this.drawTemporaryConnection();
        
        this.ctx.restore();
    }

    drawGrid() {
        if (!this.grid.enabled) return;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1 / this.viewport.scale;
        
        const gridSize = this.grid.size;
        const startX = Math.floor(-this.viewport.x / this.viewport.scale / gridSize) * gridSize;
        const startY = Math.floor(-this.viewport.y / this.viewport.scale / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.viewport.scale) + gridSize;
        const endY = startY + (this.canvas.height / this.viewport.scale) + gridSize;
        
        this.ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
    }

    drawNodes() {
        for (const node of this.nodes.values()) {
            this.drawNode(node);
        }
    }

    drawNode(node) {
        const isSelected = this.selectedNode === node.id;
        const validationErrors = this.getNodeValidationErrors(node.id);
        const hasErrors = validationErrors.some(error => error.severity === 'error');
        const hasWarnings = validationErrors.some(error => error.severity === 'warning');
        
        // Тень
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Фон узла с учетом валидации
        let fillColor = '#ffffff';
        let strokeColor = '#cccccc';
        let lineWidth = 1;
        
        if (isSelected) {
            fillColor = '#e3f2fd';
            strokeColor = '#2196f3';
            lineWidth = 2;
        } else if (hasErrors) {
            fillColor = '#ffebee';
            strokeColor = '#f44336';
            lineWidth = 2;
        } else if (hasWarnings) {
            fillColor = '#fff3e0';
            strokeColor = '#ff9800';
            lineWidth = 1;
        }
        
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        
        this.ctx.fillRect(node.position.x, node.position.y, node.size.width, node.size.height);
        this.ctx.strokeRect(node.position.x, node.position.y, node.size.width, node.size.height);
        
        // Сброс тени
        this.ctx.shadowColor = 'transparent';
        
        // Индикатор ошибок/предупреждений
        if (hasErrors || hasWarnings) {
            const iconSize = 12;
            const iconX = node.position.x + node.size.width - iconSize - 5;
            const iconY = node.position.y + 5;
            
            this.ctx.fillStyle = hasErrors ? '#f44336' : '#ff9800';
            this.ctx.fillRect(iconX, iconY, iconSize, iconSize);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                hasErrors ? '!' : '?',
                iconX + iconSize / 2,
                iconY + iconSize / 2 + 3
            );
        }
        
        // Заголовок узла
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            node.title || node.type, 
            node.position.x + node.size.width / 2, 
            node.position.y + 20
        );
        
        // Тип узла
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(
            node.type, 
            node.position.x + node.size.width / 2, 
            node.position.y + 35
        );
    }

    drawConnections() {
        for (const connection of this.connections.values()) {
            this.drawConnection(connection);
        }
    }

    drawConnection(connection) {
        const sourceNode = this.nodes.get(connection.sourceNodeId);
        const targetNode = this.nodes.get(connection.targetNodeId);
        
        if (!sourceNode || !targetNode) return;
        
        const startX = sourceNode.position.x + sourceNode.size.width;
        const startY = sourceNode.position.y + sourceNode.size.height / 2;
        const endX = targetNode.position.x;
        const endY = targetNode.position.y + targetNode.size.height / 2;
        
        // Цвет соединения в зависимости от типа
        let connectionColor = '#666666';
        if (connection.outputType === 'true') {
            connectionColor = '#4caf50'; // Зеленый для true
        } else if (connection.outputType === 'false') {
            connectionColor = '#f44336'; // Красный для false
        }
        
        this.ctx.strokeStyle = connectionColor;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        
        // Кривая Безье для плавного соединения
        const controlX1 = startX + 50;
        const controlX2 = endX - 50;
        this.ctx.bezierCurveTo(controlX1, startY, controlX2, endY, endX, endY);
        
        this.ctx.stroke();
        
        // Стрелка
        this.drawArrow(endX, endY, Math.atan2(endY - startY, endX - startX), connectionColor);
        
        // Подпись для условных соединений
        if (connection.outputType === 'true' || connection.outputType === 'false') {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            this.ctx.fillStyle = connectionColor;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(connection.outputType, midX, midY - 5);
        }
    }

    drawTemporaryConnection() {
        if (!this.connectionState || !this.connectionState.currentPos) return;
        
        const sourceNode = this.nodes.get(this.connectionState.sourceNodeId);
        if (!sourceNode) return;
        
        const startX = sourceNode.position.x + sourceNode.size.width;
        const startY = sourceNode.position.y + sourceNode.size.height / 2;
        const endX = this.connectionState.currentPos.x;
        const endY = this.connectionState.currentPos.y;
        
        this.ctx.strokeStyle = '#ff9800';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }

    drawArrow(x, y, angle, color = '#666666') {
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-arrowLength, -arrowLength * Math.tan(arrowAngle));
        this.ctx.lineTo(-arrowLength, arrowLength * Math.tan(arrowAngle));
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        
        this.ctx.restore();
    }

    // Сериализация схемы
    exportSchema() {
        const schema = {
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values()),
            metadata: {
                version: '1.0',
                created: new Date().toISOString(),
                viewport: { ...this.viewport }
            }
        };
        
        return schema;
    }

    // Загрузка схемы
    importSchema(schema) {
        this.nodes.clear();
        this.connections.clear();
        
        if (schema.nodes) {
            schema.nodes.forEach(node => {
                this.nodes.set(node.id, node);
            });
        }
        
        if (schema.connections) {
            schema.connections.forEach(connection => {
                this.connections.set(connection.id, connection);
            });
        }
        
        if (schema.metadata && schema.metadata.viewport) {
            this.viewport = { ...this.viewport, ...schema.metadata.viewport };
        }
        
        this.selectedNode = null;
        this.render();
    }

    // Генерация уникального ID
    generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    // Очистка редактора
    clear() {
        this.nodes.clear();
        this.connections.clear();
        this.selectedNode = null;
        this.dragState = null;
        this.connectionState = null;
        this.render();
    }

    // Обработка drag-and-drop из библиотеки узлов
    onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    onDrop(event) {
        event.preventDefault();
        
        const nodeType = event.dataTransfer.getData('text/plain');
        if (!nodeType) return;
        
        // Получаем координаты drop
        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        
        // Создаем узел
        this.addNodeFromLibrary(nodeType, worldPos.x, worldPos.y);
    }

    // Добавление узла из библиотеки
    addNodeFromLibrary(nodeType, x, y) {
        if (!this.nodeLibrary) {
            console.error('NodeLibrary не инициализирована');
            return null;
        }

        const nodeConfig = this.nodeLibrary.getNodeType(nodeType);
        if (!nodeConfig) {
            console.error(`Неизвестный тип узла: ${nodeType}`);
            return null;
        }

        const nodeId = this.generateNodeId();
        const node = {
            id: nodeId,
            type: nodeType,
            category: nodeConfig.category,
            config: { ...nodeConfig.config },
            position: { x: x - 50, y: y - 25 }, // Центрируем узел
            size: { width: 100, height: 50 },
            inputs: [...(nodeConfig.inputs || [])],
            outputs: [...(nodeConfig.outputs || [])]
        };

        this.nodes.set(nodeId, node);
        this.render();
        
        // Вызываем событие изменения
        this.triggerChange('add_node');
        
        console.log(`➕ Добавлен узел ${nodeType} в позицию (${x}, ${y})`);
        return node;
    }

    // Генерация уникального ID для узла
    generateNodeId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    // Методы сохранения и загрузки схем

    /**
     * Сериализует текущую схему в JSON
     * @returns {Object} - Объект схемы
     */
    serializeSchema() {
        return {
            schemaVersion: '1.0.0',
            timestamp: new Date().toISOString(),
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values()),
            viewport: { ...this.viewport },
            metadata: {
                nodeCount: this.nodes.size,
                connectionCount: this.connections.size
            }
        };
    }

    /**
     * Сохраняет схему в JSON
     * @returns {string} - JSON строка схемы
     */
    saveSchema() {
        const schema = this.serializeSchema();
        return JSON.stringify(schema, null, 2);
    }

    /**
     * Загружает схему из JSON
     * @param {string|Object} schemaData - JSON строка или объект схемы
     * @returns {boolean} - Успешность загрузки
     */
    loadSchema(schemaData) {
        try {
            // Парсим JSON если передана строка
            const schema = typeof schemaData === 'string' ? JSON.parse(schemaData) : schemaData;
            
            // Проверяем наличие необходимых полей
            if (!schema.nodes || !Array.isArray(schema.nodes)) {
                throw new Error('Invalid schema: missing nodes array');
            }
            
            // Очищаем текущую схему
            this.clearSchema();
            
            // Загружаем узлы
            schema.nodes.forEach(node => {
                this.nodes.set(node.id, { ...node });
            });
            
            // Загружаем соединения
            if (schema.connections && Array.isArray(schema.connections)) {
                schema.connections.forEach(connection => {
                    this.connections.set(connection.id, { ...connection });
                });
            }
            
            // Загружаем настройки viewport
            if (schema.viewport) {
                this.viewport = { ...this.viewport, ...schema.viewport };
            }
            
            // Перерисовываем схему
            this.render();
            
            // Вызываем событие изменения
            this.triggerChange('load');
            
            return true;
        } catch (error) {
            console.error('Error loading schema:', error);
            return false;
        }
    }

    /**
     * Очищает текущую схему
     */
    clearSchema() {
        this.nodes.clear();
        this.connections.clear();
        this.selectedNode = null;
        this.selectedConnection = null;
        this.render();
        this.triggerChange('clear');
    }

    /**
     * Экспортирует схему в файл
     * @param {string} [filename='visual_schema.json'] - Имя файла
     */
    exportSchemaToFile(filename = 'visual_schema.json') {
        const schemaJson = this.saveSchema();
        const blob = new Blob([schemaJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Импортирует схему из файла
     * @param {File} file - Файл JSON
     * @returns {Promise<boolean>} - Успешность импорта
     */
    importSchemaFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const success = this.loadSchema(e.target.result);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Автосохранение схемы в localStorage
     * @param {string} [key='visualEditorAutoSave'] - Ключ для localStorage
     */
    autoSave(key = 'visualEditorAutoSave') {
        if (typeof localStorage !== 'undefined') {
            try {
                const schema = this.serializeSchema();
                schema.autoSaveTimestamp = new Date().toISOString();
                localStorage.setItem(key, JSON.stringify(schema));
                console.log('Schema auto-saved to localStorage');
            } catch (error) {
                console.warn('Failed to auto-save schema:', error);
            }
        }
    }

    /**
     * Загрузка автосохраненной схемы из localStorage
     * @param {string} [key='visualEditorAutoSave'] - Ключ для localStorage
     * @returns {boolean} - Успешность загрузки
     */
    loadAutoSave(key = 'visualEditorAutoSave') {
        if (typeof localStorage !== 'undefined') {
            try {
                const savedSchema = localStorage.getItem(key);
                if (savedSchema) {
                    return this.loadSchema(savedSchema);
                }
            } catch (error) {
                console.warn('Failed to load auto-saved schema:', error);
            }
        }
        return false;
    }

    /**
     * Вызывает событие изменения схемы
     * @param {string} action - Тип изменения
     */
    triggerChange(action) {
        // Автосохранение при изменении
        if (this.autoSaveEnabled) {
            this.autoSave();
        }
        
        // Валидация схемы при изменениях
        if (this.validationEnabled && this.validator) {
            // Используем debounce для валидации
            clearTimeout(this._validationTimeout);
            this._validationTimeout = setTimeout(() => {
                this.validateSchema();
            }, 500); // Задержка 0.5 секунды
        }
        
        // Синхронизация с сервером при значительных изменениях
        if (this.serverSync && this.schema && this.schema.id && 
            ['add_node', 'remove_node', 'add_connection', 'remove_connection'].includes(action)) {
            // Используем debounce для синхронизации
            clearTimeout(this._syncTimeout);
            this._syncTimeout = setTimeout(() => {
                this.syncWithServer();
            }, 2000); // Задержка 2 секунды
        }
        
        // Вызываем callback если он задан
        if (typeof this.onSchemaChange === 'function') {
            this.onSchemaChange({
                action,
                nodeCount: this.nodes.size,
                connectionCount: this.connections.size,
                timestamp: new Date().toISOString(),
                lastSyncTime: this.lastSyncTime,
                validationResults: this.validationResults
            });
        }
    }

    /**
     * Включает автосохранение
     * @param {boolean} enabled - Включено/выключено
     * @param {number} [interval=30000] - Интервал автосохранения в мс
     */
    setAutoSave(enabled, interval = 30000) {
        this.autoSaveEnabled = enabled;
        
        // Очищаем предыдущий интервал
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        // Устанавливаем новый интервал
        if (enabled) {
            this.autoSaveInterval = setInterval(() => {
                this.autoSave();
            }, interval);
        }
    }
    
    /**
     * Включает синхронизацию с сервером
     * @param {boolean} enabled - Включено/выключено
     * @param {number} [interval=60000] - Интервал синхронизации в мс
     */
    setServerSync(enabled, interval = 60000) {
        this.serverSync = enabled;
        
        // Очищаем предыдущий интервал
        if (this.serverSyncInterval) {
            clearInterval(this.serverSyncInterval);
            this.serverSyncInterval = null;
        }
        
        // Устанавливаем новый интервал
        if (enabled && this.schema && this.schema.id) {
            this.serverSyncInterval = setInterval(() => {
                this.syncWithServer();
            }, interval);
        }
    }
    
    /**
     * Синхронизирует схему с сервером
     * @returns {Promise<boolean>} - Успешность синхронизации
     */
    async syncWithServer() {
        if (!this.schema || !this.schema.id || !this.serverSync) {
            return false;
        }
        
        try {
            // Сохраняем текущую схему на сервер
            const schemaData = this.serializeSchema();
            
            const response = await fetch(`/api/visual-schemas/${this.schema.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nodes: schemaData.nodes,
                    connections: schemaData.connections,
                    viewport: schemaData.viewport
                })
            });
            
            if (response.ok) {
                console.log('Schema synced with server');
                this.lastSyncTime = new Date();
                
                // Вызываем событие синхронизации
                if (typeof this.onSync === 'function') {
                    this.onSync({
                        success: true,
                        timestamp: this.lastSyncTime,
                        message: 'Schema synced with server'
                    });
                }
                
                return true;
            } else {
                console.warn('Failed to sync schema with server:', await response.text());
                
                // Вызываем событие синхронизации
                if (typeof this.onSync === 'function') {
                    this.onSync({
                        success: false,
                        timestamp: new Date(),
                        message: 'Failed to sync schema with server'
                    });
                }
                
                return false;
            }
        } catch (error) {
            console.warn('Failed to sync schema with server:', error);
            
            // Вызываем событие синхронизации
            if (typeof this.onSync === 'function') {
                this.onSync({
                    success: false,
                    timestamp: new Date(),
                    message: `Error: ${error.message}`
                });
            }
            
            return false;
        }
    }
    
    /**
     * Загружает схему с сервера
     * @returns {Promise<boolean>} - Успешность загрузки
     */
    async loadFromServer() {
        if (!this.schema || !this.schema.id || !this.serverSync) {
            return false;
        }
        
        try {
            const response = await fetch(`/api/visual-schemas/${this.schema.id}`);
            
            if (response.ok) {
                const schema = await response.json();
                const success = this.loadSchema(schema);
                
                if (success) {
                    console.log('Schema loaded from server');
                    this.lastSyncTime = new Date();
                    
                    // Вызываем событие синхронизации
                    if (typeof this.onSync === 'function') {
                        this.onSync({
                            success: true,
                            timestamp: this.lastSyncTime,
                            message: 'Schema loaded from server'
                        });
                    }
                }
                
                return success;
            } else {
                console.warn('Failed to load schema from server:', await response.text());
                
                // Вызываем событие синхронизации
                if (typeof this.onSync === 'function') {
                    this.onSync({
                        success: false,
                        timestamp: new Date(),
                        message: 'Failed to load schema from server'
                    });
                }
                
                return false;
            }
        } catch (error) {
            console.warn('Failed to load schema from server:', error);
            
            // Вызываем событие синхронизации
            if (typeof this.onSync === 'function') {
                this.onSync({
                    success: false,
                    timestamp: new Date(),
                    message: `Error: ${error.message}`
                });
            }
            
            return false;
        }
    }

    /**
     * Создает версию схемы
     * @param {string} [versionName] - Название версии
     * @param {boolean} [saveToServer=false] - Сохранить версию на сервере
     * @returns {Object} - Объект версии
     */
    async createVersion(versionName, saveToServer = false) {
        const schema = this.serializeSchema();
        const version = {
            id: 'v_' + Date.now(),
            name: versionName || `Version ${new Date().toLocaleString()}`,
            timestamp: new Date().toISOString(),
            schema
        };
        
        // Сохраняем версию в localStorage
        if (typeof localStorage !== 'undefined') {
            try {
                // Получаем существующие версии
                const versionsJson = localStorage.getItem('visualEditorVersions') || '[]';
                const versions = JSON.parse(versionsJson);
                
                // Добавляем новую версию
                versions.push({
                    id: version.id,
                    name: version.name,
                    timestamp: version.timestamp,
                    nodeCount: schema.nodes.length,
                    connectionCount: schema.connections.length
                });
                
                // Ограничиваем количество версий
                if (versions.length > 10) {
                    versions.shift();
                }
                
                // Сохраняем список версий
                localStorage.setItem('visualEditorVersions', JSON.stringify(versions));
                
                // Сохраняем саму версию
                localStorage.setItem(`visualEditorVersion_${version.id}`, JSON.stringify(schema));
                
                console.log(`Version "${version.name}" created locally`);
            } catch (error) {
                console.warn('Failed to save version locally:', error);
            }
        }
        
        // Сохраняем версию на сервере если нужно
        if (saveToServer && schema.id && this.serverSync) {
            try {
                const response = await fetch(`/api/visual-schemas/${schema.id}/save-version`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: version.name
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`Version "${version.name}" saved to server:`, result);
                    
                    // Обновляем ID версии из ответа сервера
                    version.id = result.version.id;
                    version.serverSynced = true;
                } else {
                    console.warn('Failed to save version to server:', await response.text());
                }
            } catch (error) {
                console.warn('Failed to save version to server:', error);
            }
        }
        
        return version;
    }

    /**
     * Получает список версий
     * @param {boolean} [fromServer=false] - Загрузить версии с сервера
     * @returns {Array} - Список версий
     */
    async getVersions(fromServer = false) {
        // Локальные версии
        let localVersions = [];
        if (typeof localStorage !== 'undefined') {
            try {
                const versionsJson = localStorage.getItem('visualEditorVersions') || '[]';
                localVersions = JSON.parse(versionsJson);
            } catch (error) {
                console.warn('Failed to get local versions:', error);
            }
        }
        
        // Серверные версии
        if (fromServer && this.schema && this.schema.id && this.serverSync) {
            try {
                const response = await fetch(`/api/visual-schemas/${this.schema.id}/versions`);
                
                if (response.ok) {
                    const serverVersions = await response.json();
                    
                    // Помечаем серверные версии
                    serverVersions.forEach(v => {
                        v.serverVersion = true;
                    });
                    
                    // Объединяем версии
                    const allVersions = [...serverVersions, ...localVersions];
                    
                    // Удаляем дубликаты по ID
                    const uniqueVersions = [];
                    const ids = new Set();
                    
                    for (const version of allVersions) {
                        if (!ids.has(version.id)) {
                            ids.add(version.id);
                            uniqueVersions.push(version);
                        }
                    }
                    
                    // Сортируем по времени
                    uniqueVersions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    return uniqueVersions;
                } else {
                    console.warn('Failed to get server versions:', await response.text());
                }
            } catch (error) {
                console.warn('Failed to get server versions:', error);
            }
        }
        
        return localVersions;
    }

    /**
     * Загружает версию схемы
     * @param {string} versionId - ID версии
     * @param {boolean} [fromServer=false] - Загрузить версию с сервера
     * @returns {boolean} - Успешность загрузки
     */
    async loadVersion(versionId, fromServer = false) {
        // Пробуем загрузить из localStorage
        if (typeof localStorage !== 'undefined') {
            try {
                const versionJson = localStorage.getItem(`visualEditorVersion_${versionId}`);
                if (versionJson) {
                    return this.loadSchema(versionJson);
                }
            } catch (error) {
                console.warn('Failed to load local version:', error);
            }
        }
        
        // Пробуем загрузить с сервера
        if (fromServer && this.schema && this.schema.id && this.serverSync) {
            try {
                const response = await fetch(`/api/visual-schemas/${this.schema.id}/versions/${versionId}`);
                
                if (response.ok) {
                    const versionData = await response.json();
                    return this.loadSchema(versionData.schema);
                } else {
                    console.warn('Failed to load server version:', await response.text());
                }
            } catch (error) {
                console.warn('Failed to load server version:', error);
            }
        }
        
        return false;
    }
    
    /**
     * Восстанавливает схему из версии на сервере
     * @param {string} versionId - ID версии
     * @returns {boolean} - Успешность восстановления
     */
    async restoreFromVersion(versionId) {
        if (!this.schema || !this.schema.id || !this.serverSync) {
            return false;
        }
        
        try {
            const response = await fetch(`/api/visual-schemas/${this.schema.id}/restore/${versionId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                return this.loadSchema(result.schema);
            } else {
                console.warn('Failed to restore from version:', await response.text());
            }
        } catch (error) {
            console.warn('Failed to restore from version:', error);
        }
        
        return false;
    }
    
    /**
     * Валидирует текущую схему
     * @param {boolean} [fullValidation=true] - Полная или быстрая валидация
     * @returns {Object} - Результат валидации
     */
    validateSchema(fullValidation = true) {
        if (!this.validator) {
            console.warn('Валидатор недоступен');
            return null;
        }

        const schema = this.serializeSchema();
        
        // Выбираем тип валидации
        const validationResults = fullValidation 
            ? this.validator.validateSchema(schema)
            : this.validator.quickValidate(schema);
        
        this.validationResults = validationResults;
        
        // Вызываем callback валидации
        if (typeof this.onValidationChange === 'function') {
            this.onValidationChange(validationResults);
        }
        
        // Обновляем отображение ошибок
        this.updateValidationDisplay();
        
        return validationResults;
    }
    
    /**
     * Валидирует конкретный узел
     * @param {string} nodeId - ID узла
     * @returns {Object} - Результат валидации
     */
    validateNode(nodeId) {
        if (!this.validator) return null;
        
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        return this.validator.validateSingleNode(node);
    }
    
    /**
     * Валидирует конкретное соединение
     * @param {string} connectionId - ID соединения
     * @returns {Object} - Результат валидации
     */
    validateConnection(connectionId) {
        if (!this.validator) return null;
        
        const connection = this.connections.get(connectionId);
        if (!connection) return null;
        
        const nodes = Array.from(this.nodes.values());
        return this.validator.validateSingleConnection(connection, nodes);
    }
    
    /**
     * Получает ошибки валидации для узла
     * @param {string} nodeId - ID узла
     * @returns {Array} - Массив ошибок
     */
    getNodeValidationErrors(nodeId) {
        if (!this.validationResults) return [];
        
        const allIssues = [...this.validationResults.errors, ...this.validationResults.warnings];
        return allIssues.filter(issue => issue.nodeId === nodeId);
    }
    
    /**
     * Получает ошибки валидации для соединения
     * @param {string} connectionId - ID соединения
     * @returns {Array} - Массив ошибок
     */
    getConnectionValidationErrors(connectionId) {
        if (!this.validationResults) return [];
        
        const allIssues = [...this.validationResults.errors, ...this.validationResults.warnings];
        return allIssues.filter(issue => issue.connectionId === connectionId);
    }
    
    /**
     * Обновляет отображение ошибок валидации
     */
    updateValidationDisplay() {
        // Перерисовываем схему с учетом ошибок валидации
        this.render();
    }
    
    /**
     * Включает/выключает валидацию
     * @param {boolean} enabled - Включена ли валидация
     */
    setValidationEnabled(enabled) {
        this.validationEnabled = enabled;
        
        if (enabled && this.validator) {
            // Запускаем валидацию
            this.validateSchema();
        } else {
            // Очищаем результаты валидации
            this.validationResults = null;
            this.updateValidationDisplay();
        }
    }
    
    /**
     * Получает сводку по валидации
     * @returns {Object} - Сводка валидации
     */
    getValidationSummary() {
        if (!this.validationResults) {
            return {
                isValid: true,
                hasWarnings: false,
                errorCount: 0,
                warningCount: 0,
                totalIssues: 0
            };
        }
        
        return this.validationResults.summary;
    }
    
    /**
     * Проверяет, можно ли создать соединение (с учетом валидации)
     * @param {string} sourceNodeId - ID исходного узла
     * @param {string} sourceOutput - Выход исходного узла
     * @param {string} targetNodeId - ID целевого узла
     * @param {string} targetInput - Вход целевого узла
     * @returns {Object} - Результат проверки
     */
    canCreateConnection(sourceNodeId, sourceOutput, targetNodeId, targetInput) {
        // Базовая проверка
        const basicValidation = this.validateConnection(sourceNodeId, sourceOutput, targetNodeId, targetInput);
        
        if (!basicValidation) {
            return {
                canCreate: false,
                reason: 'Базовая валидация не пройдена'
            };
        }
        
        // Проверка через валидатор
        if (this.validator) {
            const tempConnection = {
                id: 'temp_connection',
                sourceNodeId,
                sourceOutput,
                targetNodeId,
                targetInput
            };
            
            const nodes = Array.from(this.nodes.values());
            const validationResult = this.validator.validateSingleConnection(tempConnection, nodes);
            
            if (!validationResult.isValid) {
                return {
                    canCreate: false,
                    reason: validationResult.errors[0]?.message || 'Ошибка валидации соединения',
                    errors: validationResult.errors
                };
            }
            
            if (validationResult.hasWarnings) {
                return {
                    canCreate: true,
                    hasWarnings: true,
                    warnings: validationResult.warnings
                };
            }
        }
        
        return {
            canCreate: true
        };
    }
    
    /**
     * Обработка изменения уровня сложности
     */
    onComplexityLevelChange(level, config) {
        console.log(`🎯 VisualEditor: переключение на уровень ${level}`);
        
        this.complexityLevel = level;
        this.complexityConfig = config;
        
        // Проверяем лимит узлов
        this.checkNodeLimit();
        
        // Обновляем подсказки
        this.updateHints();
        
        // Перерисовываем с учетом нового уровня
        this.render();
    }
    
    /**
     * Установка уровня сложности (вызывается из ComplexityLevelSwitcher)
     */
    setComplexityLevel(level, config) {
        this.onComplexityLevelChange(level, config);
    }
    
    /**
     * Проверка лимита узлов для текущего уровня
     */
    checkNodeLimit() {
        if (!this.complexityConfig || !this.complexityConfig.maxNodesPerFlow) {
            return true;
        }
        
        const currentNodeCount = this.nodes.size;
        const maxNodes = this.complexityConfig.maxNodesPerFlow;
        
        if (currentNodeCount >= maxNodes) {
            this.showLimitWarning(`Достигнут лимит узлов для уровня "${this.complexityConfig.name}": ${maxNodes}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Показ предупреждения о лимитах
     */
    showLimitWarning(message) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = 'complexity-limit-warning';
        notification.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">${message}</span>
                <button class="warning-close">×</button>
            </div>
        `;
        
        // Добавляем стили если их еще нет
        if (!document.getElementById('complexity-warning-styles')) {
            const styles = document.createElement('style');
            styles.id = 'complexity-warning-styles';
            styles.textContent = `
                .complexity-limit-warning {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 6px;
                    padding: 12px 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 1000;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                }
                
                .warning-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .warning-icon {
                    font-size: 16px;
                }
                
                .warning-text {
                    flex: 1;
                    font-size: 14px;
                    color: #856404;
                }
                
                .warning-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #856404;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Закрытие по клику
        notification.querySelector('.warning-close').addEventListener('click', () => {
            notification.remove();
        });
    }
    
    /**
     * Обновление подсказок в зависимости от уровня
     */
    updateHints() {
        if (!this.complexityConfig) return;
        
        const shouldShowHints = this.complexityConfig.showHints;
        const hintsContainer = document.querySelector('.editor-hints');
        
        if (shouldShowHints && !hintsContainer) {
            this.createHintsPanel();
        } else if (!shouldShowHints && hintsContainer) {
            hintsContainer.remove();
        }
    }
    
    /**
     * Создание панели подсказок
     */
    createHintsPanel() {
        const hints = this.getHintsForLevel();
        if (!hints.length) return;
        
        const hintsHTML = `
            <div class="editor-hints">
                <div class="hints-header">
                    <span class="hints-title">💡 Подсказки</span>
                    <button class="hints-toggle">−</button>
                </div>
                <div class="hints-content">
                    ${hints.map(hint => `
                        <div class="hint-item">
                            <span class="hint-icon">${hint.icon}</span>
                            <span class="hint-text">${hint.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Добавляем в правую панель или создаем отдельную
        const rightPanel = document.querySelector('.right-panel') || document.querySelector('.property-panel');
        if (rightPanel) {
            rightPanel.insertAdjacentHTML('beforeend', hintsHTML);
        }
        
        // Добавляем стили для подсказок
        this.addHintsStyles();
        
        // Обработчик сворачивания
        document.querySelector('.hints-toggle').addEventListener('click', (e) => {
            const content = document.querySelector('.hints-content');
            const toggle = e.target;
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '−';
            } else {
                content.style.display = 'none';
                toggle.textContent = '+';
            }
        });
    }
    
    /**
     * Получение подсказок для текущего уровня
     */
    getHintsForLevel() {
        const levelHints = {
            beginner: [
                { icon: '🎯', text: 'Перетащите блок из панели на схему' },
                { icon: '🔗', text: 'Соедините блоки правой кнопкой мыши' },
                { icon: '⚙️', text: 'Кликните на блок для настройки' },
                { icon: '🗑️', text: 'Нажмите Delete для удаления блока' }
            ],
            advanced: [
                { icon: '📊', text: 'Используйте переменные для хранения данных' },
                { icon: '🔄', text: 'Добавьте условия для ветвления логики' },
                { icon: '🌐', text: 'Подключите внешние API для расширения функций' },
                { icon: '📈', text: 'Следите за метриками в режиме отладки' }
            ],
            expert: [
                { icon: '🧩', text: 'Создавайте модули для переиспользования' },
                { icon: '🔧', text: 'Используйте кастомные функции' },
                { icon: '🚀', text: 'Оптимизируйте производительность схемы' },
                { icon: '📋', text: 'Экспортируйте готовый код проекта' }
            ]
        };
        
        return levelHints[this.complexityLevel] || [];
    }
    
    /**
     * Добавление стилей для подсказок
     */
    addHintsStyles() {
        if (document.getElementById('hints-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'hints-styles';
        styles.textContent = `
            .editor-hints {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-top: 16px;
                overflow: hidden;
            }
            
            .hints-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #e9ecef;
                border-bottom: 1px solid #dee2e6;
            }
            
            .hints-title {
                font-size: 12px;
                font-weight: 600;
                color: #495057;
            }
            
            .hints-toggle {
                background: none;
                border: none;
                font-size: 14px;
                cursor: pointer;
                color: #6c757d;
                padding: 0;
                width: 20px;
                height: 20px;
            }
            
            .hints-content {
                padding: 8px;
            }
            
            .hint-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
                font-size: 12px;
                color: #6c757d;
            }
            
            .hint-icon {
                font-size: 14px;
                width: 16px;
                text-align: center;
            }
            
            .hint-text {
                flex: 1;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Переопределяем addNode для проверки лимитов
     */
    addNodeWithComplexityCheck(nodeType, position) {
        // Проверяем лимит узлов
        if (!this.checkNodeLimit()) {
            return null;
        }
        
        // Проверяем доступность типа узла
        if (this.nodeLibrary && !this.nodeLibrary.isNodeAllowed(nodeType)) {
            this.showLimitWarning(`Тип узла "${nodeType}" недоступен на уровне "${this.complexityConfig?.name || 'текущем'}"`);
            return null;
        }
        
        // Вызываем оригинальный метод
        return this.addNode(nodeType, position);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEditor;
}

// Экспорт в глобальную область для браузера
if (typeof window !== 'undefined') {
    window.VisualEditor = VisualEditor;
    console.log('✅ VisualEditor экспортирован в глобальную область');
}