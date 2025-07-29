// Простой рабочий Bot Constructor
console.log('🚀 Загрузка Bot Constructor...');

class SimpleBotConstructor {
    constructor() {
        this.currentBot = null;
        this.currentView = 'dashboard';
        this.init();
    }

    init() {
        console.log('✅ Инициализация...');
        this.setupGlobalFunctions();
        this.loadDashboard();
    }

    setupGlobalFunctions() {
        // Кнопка "Назад"
        window.backToDashboard = () => {
            console.log('🔙 Возврат к дашборду');
            this.currentBot = null;
            this.showView('dashboard');
        };

        // Редактирование бота
        window.editBot = (botId) => {
            console.log('✏️ Редактирование бота:', botId);
            this.editBot(botId);
        };

        // Создание бота
        window.createNewBot = () => {
            console.log('➕ Создание нового бота');
            alert('Создание нового бота');
        };

        // Другие функции
        window.saveBotSchema = () => alert('💾 Схема сохранена');
        window.testBot = () => alert('🧪 Тестирование');
        window.showGeneratedCode = () => alert('📄 Показать код');
        window.validateCurrentSchema = () => alert('✅ Проверка');
    }

    showView(viewName) {
        console.log('🔄 Переключение на:', viewName);
        
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
            console.log('✅ Показан вид:', viewName);
        } else {
            console.error('❌ Вид не найден:', viewName);
        }

        this.currentView = viewName;

        if (viewName === 'constructor') {
            setTimeout(() => this.displayBotSchema(), 100);
        }
    }

    async loadDashboard() {
        console.log('📊 Загрузка дашборда...');
        
        try {
            // Загружаем статистику
            const statsResponse = await fetch('/api/stats/dashboard');
            const statsData = await statsResponse.json();
            
            if (statsData.success) {
                this.updateStats(statsData.data);
            }

            // Загружаем ботов
            const botsResponse = await fetch('/api/bots');
            const botsData = await botsResponse.json();
            
            if (botsData.success && botsData.data && botsData.data.bots) {
                this.renderBots(botsData.data.bots);
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки дашборда:', error);
        }
    }

    updateStats(stats) {
        const elements = {
            'totalBots': stats.totalBots || 0,
            'activeBots': stats.activeBots || 0,
            'totalMessages': stats.messagesProcessed || 0,
            'totalUsers': stats.totalUsers || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
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
            'error': 'Ошибка'
        };
        return statusMap[status] || 'Неизвестно';
    }

    async editBot(botId) {
        console.log('✏️ Загрузка бота:', botId);
        
        try {
            const response = await fetch(`/api/bots/${botId}`);
            const data = await response.json();
            
            this.currentBot = data.data || data;
            console.log('📊 Бот загружен:', this.currentBot);

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
            
        } catch (error) {
            console.error('❌ Ошибка загрузки бота:', error);
            alert(`Ошибка загрузки бота: ${error.message}`);
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
            this.drawNode(ctx, node, index);
        });

        console.log('✅ Схема отображена');
    }

    drawNode(ctx, node, index) {
        const x = node.position?.x || (50 + (index % 4) * 180);
        const y = node.position?.y || (50 + Math.floor(index / 4) * 120);
        const width = 150;
        const height = 80;

        // Цвет фона
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

        // Текст
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.id || 'Unknown', x + width/2, y + 25);
        
        ctx.font = '10px Arial';
        ctx.fillText(`[${node.type}]`, x + width/2, y + 45);
        
        if (node.data?.command) {
            ctx.fillText(node.data.command, x + width/2, y + 65);
        }
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация Simple Bot Constructor...');
    try {
        window.botConstructor = new SimpleBotConstructor();
        console.log('✅ Simple Bot Constructor успешно инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        document.body.innerHTML = `<div style="color:red;padding:20px;">Ошибка: ${error.message}</div>`;
    }
});