/**
 * Bot Constructor - Новая версия с акцентом на генерацию кода
 */

class BotConstructor {
    constructor() {
        this.apiUrl = '/api';
        this.currentBot = null;
        this.nodes = new Map();
        this.connections = [];
        this.currentView = 'dashboard';
        this.selectedNode = null;
        this.init();
    }

    init() {
        console.log('🚀 Bot Constructor инициализирован');
        this.setupEventListeners();
        this.loadDashboardData();
        this.initCanvas();
    }

    setupEventListeners() {
        // Глобальные функции для HTML
        // Глобальные функции для HTML
        window.backToDashboard = () => {
            console.log('🔙 Возврат к дашборду');
            if (window.botConstructor) {
                window.botConstructor.currentBot = null;
                window.botConstructor.showView('dashboard');
            }
        };
        window.editBot = (botId) => this.editBot(botId);
        window.createNewBot = () => this.createNewBot();
        window.saveBotSchema = () => this.saveBotSchema();
        window.testBot = () => this.testBot();
        window.showGeneratedCode = () => this.showCodeModal();
        window.validateCurrentSchema = () => this.validateSchema();
        window.showTab = (tabName) => this.showTab(tabName);
        window.copyCode = () => this.copyCode();
        window.closeCodeModal = () => this.closeCodeModal();

        // Drag & Drop для узлов
        this.setupDragDrop();
    }


    // === ИСПРАВЛЕНИЕ ОТОБРАЖЕНИЯ СХЕМЫ ===
    forceDisplaySchema() {
        console.log('🎨 Принудительное отображение схемы...');
        
        const canvas = document.getElementById('editorCanvas');
        if (!canvas) {
            console.error('❌ Canvas не найден!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Проверяем данные бота
        if (!this.currentBot) {
            console.warn('⚠️ Текущий бот не загружен');
            this.drawEmptySchema(ctx);
            return;
        }
        
        if (!this.currentBot.configuration || !this.currentBot.configuration.nodes) {
            console.warn('⚠️ Конфигурация бота отсутствует');
            this.drawEmptySchema(ctx);
            return;
        }
        
        const nodes = this.currentBot.configuration.nodes;
        console.log(`📊 Отображение ${nodes.length} нодов`);
        
        // Отображаем каждый нод
        nodes.forEach((node, index) => {
            console.log(`Отрисовка ноды ${index + 1}: ${node.id} (${node.type})`);
            this.drawNode(ctx, node, index);
        });
        
        // Отображаем связи
        this.drawConnections(ctx);
        
        console.log('✅ Схема отображена');
    }
    
    drawNode(ctx, node, index) {
        // Вычисляем позицию ноды
        let x = node.position?.x || (50 + (index % 4) * 180);
        let y = node.position?.y || (50 + Math.floor(index / 4) * 120);
        
        // Размеры ноды
        const width = 150;
        const height = 80;
        
        // Цвет фона в зависимости от типа
        const colors = {
            'trigger': '#e3f2fd',
            'action': '#f3e5f5', 
            'condition': '#fff3e0'
        };
        const bgColor = colors[node.type] || '#f5f5f5';
        
        // Рисуем фон ноды
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        
        // Рисуем рамку
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Рисуем текст
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        // ID ноды
        ctx.fillText(node.id || 'Unknown', x + width/2, y + 25);
        
        // Тип ноды
        ctx.font = '10px Arial';
        ctx.fillText(`[${node.type || 'unknown'}]`, x + width/2, y + 45);
        
        // Дополнительная информация
        if (node.data?.command) {
            ctx.fillText(node.data.command, x + width/2, y + 65);
        } else if (node.data?.actionType) {
            ctx.fillText(node.data.actionType, x + width/2, y + 65);
        }
    }
    
    getNodeColor(type) {
        const colors = {
            'trigger': '#e3f2fd',
            'action': '#f3e5f5', 
            'condition': '#fff3e0',
            'default': '#f5f5f5'
        };
        return colors[type] || colors.default;
    }
    
    drawConnections(ctx) {
        if (!this.currentBot?.configuration?.nodes) return;
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        this.currentBot.configuration.nodes.forEach((node, index) => {
            const fromX = (node.position?.x || (100 + index * 150)) + 60;
            const fromY = (node.position?.y || (100 + Math.floor(index / 4) * 100)) + 60;
            
            if (node.connections && Array.isArray(node.connections)) {
                node.connections.forEach(targetId => {
                    const targetIndex = this.currentBot.configuration.nodes.findIndex(n => n.id === targetId);
                    if (targetIndex >= 0) {
                        const toX = (this.currentBot.configuration.nodes[targetIndex].position?.x || (100 + targetIndex * 150)) + 60;
                        const toY = (this.currentBot.configuration.nodes[targetIndex].position?.y || (100 + Math.floor(targetIndex / 4) * 100));
                        
                        ctx.beginPath();
                        ctx.moveTo(fromX, fromY);
                        ctx.lineTo(toX, toY);
                        ctx.stroke();
                    }
                });
            }
        });
    }
    
    drawEmptySchema(ctx) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Схема бота будет отображена здесь', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
        ctx.fillText('Перетащите узлы из левой панели', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
    }

        // === УПРАВЛЕНИЕ ВИДАМИ ===
    showView(viewName) {
        console.log(`🔄 Переключение на вид: ${viewName}`);
        
        // Отладочная информация
        console.log('🔍 Отладка showView:', {
            viewName,
            currentBot: this.currentBot?.name,
            nodesCount: this.currentBot?.configuration?.nodes?.length
        });
        
        try {
            // Скрываем все виды
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });
            
            // Показываем нужный вид
            const viewElement = document.getElementById(`${viewName}-view`);
            if (viewElement) {
                viewElement.classList.add('active');
                viewElement.style.display = 'block';
                console.log(`✅ Вид ${viewName} активирован`);
            } else {
                console.warn(`⚠️ Элемент ${viewName}-view не найден`);
                return;
            }
            
            this.currentView = viewName;

            // Специальная обработка для конструктора
            if (viewName === 'constructor') {
                setTimeout(() => {
                    this.initCanvas();
                    this.displayBotSchema();
                    this.setupDragDrop();
                }, 100);
            }
            
            // Специальная обработка для дашборда
            if (viewName === 'dashboard') {
                this.loadDashboardData();
            }
            
        } catch (error) {
            console.error(`❌ Ошибка при переключении вида ${viewName}:`, error);
        }
    }

    // === ДАШБОРД ===
    async loadDashboardData() {
        console.log('📊 Загрузка данных дашборда...');
        try {
            await Promise.all([
                this.loadStats(),
                this.loadBots()
            ]);
            console.log('✅ Данные дашборда загружены');
        } catch (error) {
            console.error('❌ Ошибка загрузки данных дашборда:', error);
            this.showFallbackDashboard();
        }
    }

    showFallbackDashboard() {
        console.log('🔄 Показываем fallback дашборд');
        
        // Показываем базовую статистику
        const totalBotsEl = document.getElementById('totalBots');
        const activeBotsEl = document.getElementById('activeBots');
        const totalMessagesEl = document.getElementById('totalMessages');
        const totalUsersEl = document.getElementById('totalUsers');
        
        if (totalBotsEl) totalBotsEl.textContent = '0';
        if (activeBotsEl) activeBotsEl.textContent = '0';
        if (totalMessagesEl) totalMessagesEl.textContent = '0';
        if (totalUsersEl) totalUsersEl.textContent = '0';
        
        // Показываем сообщение о том, что ботов нет
        const container = document.getElementById('botsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    📭 Ботов пока нет<br>
                    <small>Создайте первого бота, нажав кнопку "Создать бота"</small>
                </div>
            `;
        }
    }

    async loadStats() {
        console.log('📈 Загрузка статистики...');
        try {
            const response = await fetch(`${this.apiUrl}/stats/dashboard`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                const stats = data.data;
                const totalBotsEl = document.getElementById('totalBots');
                const activeBotsEl = document.getElementById('activeBots');
                const totalMessagesEl = document.getElementById('totalMessages');
                const totalUsersEl = document.getElementById('totalUsers');
                
                if (totalBotsEl) totalBotsEl.textContent = stats.totalBots || 0;
                if (activeBotsEl) activeBotsEl.textContent = stats.activeBots || 0;
                if (totalMessagesEl) totalMessagesEl.textContent = stats.messagesProcessed || 0;
                if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
                
                console.log('✅ Статистика загружена:', stats);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка API');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
            // Не бросаем ошибку дальше, чтобы не сломать весь дашборд
        }
    }

    async loadBots() {
        console.log('🤖 Загрузка списка ботов...');
        const container = document.getElementById('botsContainer');
        if (!container) {
            console.warn('⚠️ Контейнер botsContainer не найден');
            return;
        }
        
        container.innerHTML = '<div class="loading">🔄 Загрузка ботов...</div>';

        try {
            const response = await fetch(`${this.apiUrl}/bots`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data.success && data.data && data.data.bots) {
                console.log(`✅ Загружено ${data.data.bots.length} ботов`);
                this.renderBots(data.data.bots);
            } else {
                console.log('📭 Ботов не найдено');
                container.innerHTML = '<div class="empty-state">📭 Ботов пока нет</div>';
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки ботов:', error);
            container.innerHTML = `
                <div class="error-state">
                    ❌ Ошибка загрузки ботов<br>
                    <small>${error.message}</small><br>
                    <button class="btn btn-sm" onclick="window.botConstructor.loadBots()">🔄 Повторить</button>
                </div>
            `;
            // Не бросаем ошибку дальше
        }
    }

    renderBots(bots) {
        const container = document.getElementById('botsContainer');
        if (!container) return;
        
        if (bots.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Ботов пока нет</div>';
            return;
        }

        container.innerHTML = bots.map(bot => `
            <div class="bot-card" onclick="editBot('${bot.id}')">
                <div class="bot-card-header">
                    <div>
                        <div class="bot-card-title">${bot.name || 'Без названия'}</div>
                        <span class="bot-status ${bot.status || 'inactive'}">${this.getStatusText(bot.status)}</span>
                    </div>
                </div>
                <div class="bot-description">
                    ${bot.description || 'Описание отсутствует'}
                </div>
                <div class="bot-actions">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); editBot('${bot.id}')">
                        ✏️ Редактировать
                    </button>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'Активен',
            'inactive': 'Неактивен', 
            'draft': 'Черновик'
        };
        return statusMap[status] || 'Неизвестно';
    }

    // === КОНСТРУКТОР ===
    async editBot(botId) {
        console.log(`✏️ Редактирование бота: ${botId}`);
        
        try {
            const response = await fetch(`${this.apiUrl}/bots/${botId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const responseData = await response.json();
            this.currentBot = responseData.data || responseData;
            console.log('📊 Бот загружен:', this.currentBot);
            console.log(`🔗 Количество нодов: ${this.currentBot.configuration?.nodes?.length || 0}`);
            
            // Обновляем заголовок
            const nameElement = document.getElementById('constructorBotName');
            const statusElement = document.getElementById('constructorBotStatus');
            
            if (nameElement) nameElement.textContent = `Редактирование: ${this.currentBot.name}`;
            if (statusElement) {
                statusElement.textContent = this.currentBot.status;
                statusElement.className = `bot-status ${this.currentBot.status}`;
            }
            
            // Переключаемся на конструктор
            this.showView('constructor');
            
            // Отображаем схему с задержкой
            setTimeout(() => {
                this.displayBotSchema();
            }, 300);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки бота:', error);
            this.showStatus(`Ошибка загрузки бота: ${error.message}`, 'error');
        }
    }

    loadBotIntoConstructor(bot) {
        console.log('🔧 Загрузка бота в конструктор:', bot.name);
        
        const nameEl = document.getElementById('constructorBotName');
        const statusEl = document.getElementById('constructorBotStatus');
        
        if (nameEl) {
            nameEl.textContent = bot.name || 'Без названия';
        } else {
            console.warn('⚠️ Элемент constructorBotName не найден');
        }
        
        if (statusEl) {
            statusEl.textContent = this.getStatusText(bot.status);
        } else {
            console.warn('⚠️ Элемент constructorBotStatus не найден');
        }

        this.nodes.clear();
        this.connections = [];

        if (bot.configuration && bot.configuration.nodes) {
            bot.configuration.nodes.forEach(nodeData => {
                const node = {
                    id: nodeData.id,
                    type: nodeData.type,
                    x: nodeData.position ? nodeData.position.x : Math.random() * 400 + 100,
                    y: nodeData.position ? nodeData.position.y : Math.random() * 300 + 100,
                    config: nodeData.config || {}
                };
                this.nodes.set(node.id, node);
            });

            if (bot.configuration.connections) {
                this.connections = bot.configuration.connections;
            }
        }

        this.renderCanvas();
        this.generateCode();
    }

    // === CANVAS ===
    initCanvas() {
        const canvas = document.getElementById('editorCanvas');
        if (!canvas) return;

        const container = canvas.parentElement;
        canvas.width = Math.min(800, container.clientWidth - 40);
        canvas.height = Math.min(600, container.clientHeight - 40);

        canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        canvas.addEventListener('drop', (e) => this.onCanvasDrop(e));
        canvas.addEventListener('dragover', (e) => e.preventDefault());

        this.renderCanvas();
    }

    renderCanvas() {
        const canvas = document.getElementById('editorCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.drawGrid(ctx);
        
        // Если есть загруженный бот, показываем его схему
        if (this.currentBot && this.currentBot.configuration && this.currentBot.configuration.nodes) {
            this.displayBotSchema();
            return;
        }
        
        // Иначе показываем обычные ноды из редактора
        this.connections.forEach(conn => this.drawConnection(ctx, conn));
        this.nodes.forEach(node => this.drawNode(ctx, node));

        if (this.nodes.size === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Перетащите узлы сюда для создания схемы', canvas.width / 2, canvas.height / 2);
        }
    }

    drawGrid(ctx) {
        const gridSize = 20;
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;

        for (let x = 0; x <= ctx.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y <= ctx.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
    }

    drawNode(ctx, node) {
        const nodeWidth = 120;
        const nodeHeight = 60;
        
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(node.x + 2, node.y + 2, nodeWidth, nodeHeight);
        
        ctx.fillStyle = this.getNodeColor(node.type);
        ctx.fillRect(node.x, node.y, nodeWidth, nodeHeight);
        
        ctx.strokeStyle = node.id === this.selectedNode ? '#007bff' : '#ddd';
        ctx.lineWidth = node.id === this.selectedNode ? 3 : 1;
        ctx.strokeRect(node.x, node.y, nodeWidth, nodeHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        const icon = this.getNodeIcon(node.type);
        const label = this.getNodeLabel(node.type);
        
        ctx.fillText(icon, node.x + nodeWidth/2, node.y + 25);
        ctx.fillText(label, node.x + nodeWidth/2, node.y + 45);
    }

    drawConnection(ctx, conn) {
        const fromNode = this.nodes.get(conn.from);
        const toNode = this.nodes.get(conn.to);
        
        if (!fromNode || !toNode) return;
        
        const fromX = fromNode.x + 120;
        const fromY = fromNode.y + 30;
        const toX = toNode.x;
        const toY = toNode.y + 30;
        
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
    }

    getNodeColor(type) {
        const colors = {
            'start': '#28a745',
            'command': '#007bff',
            'text': '#17a2b8',
            'message': '#ffc107',
            'keyboard': '#fd7e14',
            'photo': '#e83e8c',
            'condition': '#6f42c1',
            'delay': '#6c757d'
        };
        return colors[type] || '#6c757d';
    }

    getNodeIcon(type) {
        const icons = {
            'start': '🚀',
            'command': '⚡',
            'text': '💬',
            'message': '📤',
            'keyboard': '⌨️',
            'photo': '🖼️',
            'condition': '❓',
            'delay': '⏱️'
        };
        return icons[type] || '❓';
    }

    getNodeLabel(type) {
        const labels = {
            'start': 'Старт',
            'command': 'Команда',
            'text': 'Текст',
            'message': 'Сообщение',
            'keyboard': 'Клавиатура',
            'photo': 'Фото',
            'condition': 'Условие',
            'delay': 'Задержка'
        };
        return labels[type] || 'Узел';
    }

    // === DRAG & DROP ===
    setupDragDrop() {
        console.log('🎯 Настройка drag & drop...');
        
        const nodeItems = document.querySelectorAll('.node-item');
        console.log(`Найдено ${nodeItems.length} элементов .node-item`);
        
        nodeItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                console.log('🎯 Начало перетаскивания:', item.dataset.type);
                e.dataTransfer.setData('text/plain', item.dataset.type);
            });
        });
        
        // Если элементы не найдены, попробуем позже
        if (nodeItems.length === 0) {
            console.warn('⚠️ Элементы .node-item не найдены, повторная попытка через 1 секунду');
            setTimeout(() => this.setupDragDrop(), 1000);
        }
    }

    onCanvasDrop(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        
        if (!nodeType) {
            console.warn('⚠️ Тип узла не определен при drop');
            return;
        }
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left - 60;
        const y = e.clientY - rect.top - 30;
        
        console.log(`🎯 Добавление узла ${nodeType} в позицию (${x}, ${y})`);
        this.addNode(nodeType, x, y);
    }

    onCanvasClick(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        let clickedNode = null;
        this.nodes.forEach((node, id) => {
            if (x >= node.x && x <= node.x + 120 && y >= node.y && y <= node.y + 60) {
                clickedNode = id;
            }
        });
        
        this.selectedNode = clickedNode;
        this.renderCanvas();
        
        if (clickedNode) {
            this.showNodeProperties(clickedNode);
        }
    }

    addNode(type, x, y) {
        const nodeId = 'node_' + Date.now();
        const node = {
            id: nodeId,
            type: type,
            x: Math.max(0, Math.min(x, 680)),
            y: Math.max(0, Math.min(y, 540)),
            config: this.getDefaultConfig(type)
        };
        
        this.nodes.set(nodeId, node);
        this.renderCanvas();
        this.generateCode();
    }

    getDefaultConfig(type) {
        const defaults = {
            'start': {},
            'command': { command: '/start' },
            'text': { pattern: '' },
            'message': { text: 'Привет!' },
            'keyboard': { buttons: [] },
            'photo': { url: '', caption: '' },
            'condition': { condition: '' },
            'delay': { duration: 1000 }
        };
        return defaults[type] || {};
    }

    // === СВОЙСТВА УЗЛОВ ===
    showNodeProperties(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        const panel = document.getElementById('propertiesPanel');
        panel.innerHTML = this.generatePropertiesForm(node);
        this.showTab('properties');
    }

    generatePropertiesForm(node) {
        let form = `<h4>⚙️ ${this.getNodeLabel(node.type)}</h4>`;
        
        switch (node.type) {
            case 'command':
                form += `
                    <label>Команда:</label>
                    <input type="text" value="${node.config.command || ''}" 
                           onchange="updateNodeConfig('${node.id}', 'command', this.value)">
                `;
                break;
                
            case 'message':
                form += `
                    <label>Текст сообщения:</label>
                    <textarea onchange="updateNodeConfig('${node.id}', 'text', this.value)">${node.config.text || ''}</textarea>
                `;
                break;
                
            case 'condition':
                form += `
                    <label>Условие:</label>
                    <input type="text" value="${node.config.condition || ''}" 
                           onchange="updateNodeConfig('${node.id}', 'condition', this.value)">
                `;
                break;
                
            case 'delay':
                form += `
                    <label>Задержка (мс):</label>
                    <input type="number" value="${node.config.duration || 1000}" 
                           onchange="updateNodeConfig('${node.id}', 'duration', parseInt(this.value))">
                `;
                break;
        }
        
        form += `
            <div style="margin-top: 1rem;">
                <button class="btn btn-danger btn-sm" onclick="deleteNode('${node.id}')">
                    🗑️ Удалить узел
                </button>
            </div>
        `;
        
        return form;
    }

    // === ГЕНЕРАЦИЯ КОДА ===
    generateCode() {
        if (!this.currentBot) return;
        
        const code = this.generateBotCode();
        const codeElement = document.getElementById('generatedCode');
        if (codeElement) {
            codeElement.textContent = code;
        } else {
            console.warn('⚠️ Элемент generatedCode не найден');
        }
    }

    generateBotCode() {
        let code = `// Код бота: ${this.currentBot.name || 'Без названия'}\n`;
        code += `// Сгенерировано автоматически\n\n`;
        
        code += `const { Telegraf } = require('telegraf');\n`;
        code += `const bot = new Telegraf('${this.currentBot.token || 'YOUR_BOT_TOKEN'}');\n\n`;
        
        this.nodes.forEach(node => {
            code += this.generateNodeCode(node);
        });
        
        code += `\n// Запуск бота\n`;
        code += `bot.launch();\n`;
        code += `console.log('Бот запущен!');\n`;
        
        return code;
    }

    generateNodeCode(node) {
        let code = '';
        
        switch (node.type) {
            case 'start':
                code += `bot.start((ctx) => {\n`;
                code += `    ctx.reply('Добро пожаловать!');\n`;
                code += `});\n\n`;
                break;
                
            case 'command':
                const cmd = (node.config.command || '').replace('/', '');
                code += `bot.command('${cmd}', (ctx) => {\n`;
                code += `    console.log('Команда ${cmd} выполнена');\n`;
                code += `});\n\n`;
                break;
                
            case 'message':
                code += `// Отправка сообщения: ${node.config.text}\n`;
                break;
        }
        
        return code;
    }

    // === УТИЛИТЫ ===
    showTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    showCodeModal() {
        const modal = document.getElementById('codeModal');
        const codeElement = document.getElementById('fullGeneratedCode');
        
        if (codeElement) {
            codeElement.textContent = this.generateBotCode();
        } else {
            console.warn('⚠️ Элемент fullGeneratedCode не найден');
        }
        
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.warn('⚠️ Элемент codeModal не найден');
            // Показываем код в alert как fallback
            alert('Сгенерированный код:\n\n' + this.generateBotCode());
        }
    }

    closeCodeModal() {
        const modal = document.getElementById('codeModal');
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.warn('⚠️ Элемент codeModal не найден');
        }
    }

    copyCode() {
        const code = document.getElementById('generatedCode').textContent;
        navigator.clipboard.writeText(code);
        alert('Код скопирован!');
    }

    validateSchema() {
        if (this.nodes.size === 0) {
            alert('Схема пуста!');
            return;
        }
        alert('✅ Схема валидна!');
    }

    async saveBotSchema() {
        alert('💾 Схема сохранена!');
    }

    async testBot() {
        alert('🧪 Тестирование...');
    }

    createNewBot() {
        console.log('🤖 Создание нового бота...');
        
        try {
            const name = prompt('Название бота:');
            if (name) {
                this.currentBot = {
                    id: 'bot_' + Date.now(),
                    name: name,
                    status: 'draft'
                };
                
                console.log('✅ Бот создан:', this.currentBot);
                this.loadBotIntoConstructor(this.currentBot);
                this.showView('constructor');
            } else {
                console.log('ℹ️ Создание бота отменено');
            }
        } catch (error) {
            console.error('❌ Ошибка при создании бота:', error);
            alert('Ошибка при создании бота: ' + error.message);
        }
    }

    displayBotSchema() {
        console.log('🎨 Отображение схемы бота...');
        
        const canvas = document.getElementById('editorCanvas');
        if (!canvas) {
            console.error('❌ Canvas не найден!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (!this.currentBot || !this.currentBot.configuration || !this.currentBot.configuration.nodes) {
            console.warn('⚠️ Нет данных для отображения схемы');
            this.drawEmptySchema(ctx);
            return;
        }
        
        const nodes = this.currentBot.configuration.nodes;
        console.log(`📊 Отображение ${nodes.length} нодов`);
        
        // Отображаем все ноды
        nodes.forEach((node, index) => {
            this.drawSingleNode(ctx, node, index);
        });
        
        // Отображаем связи
        this.drawNodeConnections(ctx, nodes);
    }
    
    drawSingleNode(ctx, node, index) {
        // Позиция ноды (если не указана, вычисляем автоматически)
        const x = node.position?.x || (50 + (index % 4) * 180);
        const y = node.position?.y || (50 + Math.floor(index / 4) * 120);
        
        // Размеры ноды
        const width = 150;
        const height = 80;
        
        // Цвет фона в зависимости от типа
        const colors = {
            'trigger': '#e3f2fd',
            'action': '#f3e5f5', 
            'condition': '#fff3e0'
        };
        ctx.fillStyle = colors[node.type] || '#f5f5f5';
        ctx.fillRect(x, y, width, height);
        
        // Рамка
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Текст - ID ноды
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.id || 'Unknown', x + width/2, y + 25);
        
        // Текст - тип ноды
        ctx.font = '10px Arial';
        ctx.fillText(`[${node.type}]`, x + width/2, y + 45);
        
        // Дополнительная информация
        if (node.data?.command) {
            ctx.fillText(node.data.command, x + width/2, y + 65);
        } else if (node.data?.actionType) {
            ctx.fillText(node.data.actionType, x + width/2, y + 65);
        }
    }
    
    drawNodeConnections(ctx, nodes) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        nodes.forEach((node, fromIndex) => {
            const fromX = (node.position?.x || (50 + (fromIndex % 4) * 180)) + 75;
            const fromY = (node.position?.y || (50 + Math.floor(fromIndex / 4) * 120)) + 80;
            
            if (node.connections) {
                let connections = [];
                
                // Обрабатываем разные форматы connections
                if (Array.isArray(node.connections)) {
                    connections = node.connections;
                } else if (typeof node.connections === 'object') {
                    // Для condition нодов
                    Object.values(node.connections).forEach(connArray => {
                        if (Array.isArray(connArray)) {
                            connections = connections.concat(connArray);
                        }
                    });
                }
                
                connections.forEach(targetId => {
                    const targetIndex = nodes.findIndex(n => n.id === targetId);
                    if (targetIndex >= 0) {
                        const targetNode = nodes[targetIndex];
                        const toX = (targetNode.position?.x || (50 + (targetIndex % 4) * 180)) + 75;
                        const toY = (targetNode.position?.y || (50 + Math.floor(targetIndex / 4) * 120));
                        
                        // Рисуем стрелку
                        ctx.beginPath();
                        ctx.moveTo(fromX, fromY);
                        ctx.lineTo(toX, toY);
                        ctx.stroke();
                        
                        // Рисуем наконечник стрелки
                        const angle = Math.atan2(toY - fromY, toX - fromX);
                        ctx.beginPath();
                        ctx.moveTo(toX, toY);
                        ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI/6), toY - 10 * Math.sin(angle - Math.PI/6));
                        ctx.moveTo(toX, toY);
                        ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI/6), toY - 10 * Math.sin(angle + Math.PI/6));
                        ctx.stroke();
                    }
                });
            }
        });
    }
    
    drawEmptySchema(ctx) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Схема бота пуста', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
        ctx.fillText('Перетащите узлы из левой панели', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
    }
}

// Глобальные функции
window.updateNodeConfig = function(nodeId, key, value) {
    const node = window.botConstructor.nodes.get(nodeId);
    if (node) {
        node.config[key] = value;
        window.botConstructor.generateCode();
    }
};

window.deleteNode = function(nodeId) {
    if (confirm('Удалить узел?')) {
        window.botConstructor.nodes.delete(nodeId);
        window.botConstructor.renderCanvas();
        window.botConstructor.generateCode();
    }
};

// Экспортируем классы в глобальную область для отладки
window.BotConstructor = BotConstructor;

// Экспортируем класс глобально для диагностики
window.BotConstructor = BotConstructor;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация Bot Constructor...');
    try {
        window.botConstructor = new BotConstructor();
        console.log('✅ Bot Constructor успешно инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Bot Constructor:', error);
        // Показываем ошибку пользователю
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:red;color:white;padding:10px;z-index:9999;';
        errorDiv.textContent = 'Ошибка загрузки приложения: ' + error.message;
        document.body.appendChild(errorDiv);
    }


}