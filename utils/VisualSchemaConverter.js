/**
 * Конвертер визуальных схем в исполняемую логику и обратно
 */
class VisualSchemaConverter {
    constructor() {
        this.nodeTypeMap = {
            // Триггеры
            'command': 'trigger',
            'text': 'trigger',
            'callback': 'trigger',
            'inline_query': 'trigger',
            'join_group': 'trigger',
            'leave_group': 'trigger',
            
            // Условия
            'text_check': 'condition',
            'user_check': 'condition',
            'time_check': 'condition',
            'data_check': 'condition',
            'and': 'condition',
            'or': 'condition',
            'not': 'condition',
            
            // Действия
            'send_message': 'action',
            'send_photo': 'action',
            'create_keyboard': 'action',
            'delete_message': 'action',
            'admin_action': 'action',
            'delay_action': 'action',
            'forward_message': 'action',
            'edit_message': 'action',
            
            // Данные
            'save_variable': 'action',
            'load_variable': 'action',
            'counter': 'action',
            'database_query': 'action',
            'random_generator': 'action',
            'data_transformer': 'action',
            'data_validator': 'action',
            
            // Интеграции
            'http_request': 'action',
            'weather_api': 'action',
            'news_api': 'action',
            'currency_api': 'action',
            'translate_api': 'action',
            'qr_generator': 'action',
            'joke_api': 'action',
            'cat_api': 'action',
            'webhook_sender': 'action',
            'scheduler': 'action',
            'notification_sender': 'action'
        };
    }

    /**
     * Конвертирует визуальную схему в исполняемую логику
     * @param {Object} visualSchema - Визуальная схема
     * @returns {Object} - Исполняемая логика
     */
    convertToExecutable(visualSchema) {
        const { nodes, connections } = visualSchema;
        
        if (!nodes || !connections) {
            throw new Error('Invalid visual schema: missing nodes or connections');
        }
        
        // Создаем узлы для исполняемой логики
        const executableNodes = nodes.map(node => {
            // Определяем базовый тип узла (trigger, action, condition)
            const baseType = this.nodeTypeMap[node.type] || 'action';
            
            return {
                id: node.id,
                type: baseType,
                data: {
                    ...node.config,
                    // Для триггеров добавляем тип триггера
                    ...(baseType === 'trigger' && { triggerType: node.type }),
                    // Для действий добавляем тип действия
                    ...(baseType === 'action' && { actionType: node.type }),
                    // Для условий добавляем тип условия
                    ...(baseType === 'condition' && { conditionType: node.type })
                },
                connections: this.buildConnections(node.id, connections)
            };
        });
        
        return {
            nodes: executableNodes,
            metadata: {
                convertedFrom: 'visual',
                convertedAt: new Date().toISOString(),
                nodeCount: executableNodes.length
            }
        };
    }

    /**
     * Конвертирует исполняемую логику в визуальную схему
     * @param {Object} executableSchema - Исполняемая логика
     * @returns {Object} - Визуальная схема
     */
    convertToVisual(executableSchema) {
        if (!executableSchema || !executableSchema.nodes) {
            throw new Error('Invalid executable schema: missing nodes');
        }
        
        const executableNodes = executableSchema.nodes;
        const visualNodes = [];
        const visualConnections = [];
        
        // Автоматическое размещение узлов
        const layout = this.calculateLayout(executableNodes);
        
        // Создаем визуальные узлы
        executableNodes.forEach((node, index) => {
            const position = layout[node.id] || { x: 100 + (index % 5) * 200, y: 100 + Math.floor(index / 5) * 150 };
            
            // Определяем тип узла для визуальной схемы
            let visualType = '';
            
            if (node.type === 'trigger') {
                visualType = node.data.triggerType || 'command';
            } else if (node.type === 'condition') {
                visualType = node.data.conditionType || 'text_check';
            } else if (node.type === 'action') {
                visualType = node.data.actionType || 'send_message';
            }
            
            visualNodes.push({
                id: node.id,
                type: visualType,
                category: this.getCategoryFromType(visualType),
                position,
                config: { ...node.data }
            });
            
            // Создаем соединения
            if (node.connections) {
                if (Array.isArray(node.connections)) {
                    // Простые соединения
                    node.connections.forEach(targetId => {
                        visualConnections.push({
                            id: `conn_${node.id}_${targetId}`,
                            sourceNodeId: node.id,
                            targetNodeId: targetId,
                            sourceOutput: 'output',
                            targetInput: 'input'
                        });
                    });
                } else if (typeof node.connections === 'object') {
                    // Условные соединения (true/false) или output/error
                    Object.entries(node.connections).forEach(([outputType, targets]) => {
                        if (Array.isArray(targets)) {
                            targets.forEach(targetId => {
                                visualConnections.push({
                                    id: `conn_${node.id}_${outputType}_${targetId}`,
                                    sourceNodeId: node.id,
                                    targetNodeId: targetId,
                                    sourceOutput: outputType,
                                    targetInput: 'input',
                                    outputType
                                });
                            });
                        }
                    });
                }
            }
        });
        
        return {
            nodes: visualNodes,
            connections: visualConnections,
            metadata: {
                convertedFrom: 'executable',
                convertedAt: new Date().toISOString(),
                nodeCount: visualNodes.length,
                connectionCount: visualConnections.length
            }
        };
    }

    /**
     * Строит объект соединений для исполняемой логики
     * @param {string} nodeId - ID узла
     * @param {Array} connections - Массив соединений
     * @returns {Object|Array} - Объект или массив соединений
     */
    buildConnections(nodeId, connections) {
        // Находим все соединения, где узел является источником
        const nodeConnections = connections.filter(conn => conn.sourceNodeId === nodeId);
        
        if (nodeConnections.length === 0) {
            return [];
        }
        
        // Проверяем, есть ли условные соединения (true/false) или output/error
        const hasConditionalOutputs = nodeConnections.some(conn => 
            conn.sourceOutput === 'true' || 
            conn.sourceOutput === 'false' || 
            conn.sourceOutput === 'success' || 
            conn.sourceOutput === 'error'
        );
        
        if (hasConditionalOutputs) {
            // Создаем объект с условными соединениями
            const result = {};
            
            nodeConnections.forEach(conn => {
                const outputType = conn.sourceOutput || 'output';
                
                if (!result[outputType]) {
                    result[outputType] = [];
                }
                
                result[outputType].push(conn.targetNodeId);
            });
            
            return result;
        } else {
            // Создаем простой массив соединений
            return nodeConnections.map(conn => conn.targetNodeId);
        }
    }

    /**
     * Определяет категорию узла по его типу
     * @param {string} type - Тип узла
     * @returns {string} - Категория узла
     */
    getCategoryFromType(type) {
        const triggerTypes = ['command', 'text', 'callback', 'inline_query', 'join_group', 'leave_group'];
        const conditionTypes = ['text_check', 'user_check', 'time_check', 'data_check', 'and', 'or', 'not'];
        const actionTypes = ['send_message', 'send_photo', 'create_keyboard', 'delete_message', 'admin_action', 'delay_action', 'forward_message', 'edit_message'];
        const dataTypes = ['save_variable', 'load_variable', 'counter', 'database_query', 'random_generator', 'data_transformer', 'data_validator'];
        const integrationTypes = ['http_request', 'weather_api', 'news_api', 'currency_api', 'translate_api', 'qr_generator', 'joke_api', 'cat_api', 'webhook_sender', 'scheduler', 'notification_sender'];
        
        if (triggerTypes.includes(type)) return 'triggers';
        if (conditionTypes.includes(type)) return 'conditions';
        if (actionTypes.includes(type)) return 'actions';
        if (dataTypes.includes(type)) return 'data';
        if (integrationTypes.includes(type)) return 'integrations';
        
        return 'other';
    }

    /**
     * Рассчитывает позиции узлов для визуальной схемы
     * @param {Array} nodes - Массив узлов
     * @returns {Object} - Объект с позициями узлов
     */
    calculateLayout(nodes) {
        const layout = {};
        const visited = new Set();
        const nodeMap = {};
        
        // Создаем карту узлов для быстрого доступа
        nodes.forEach(node => {
            nodeMap[node.id] = node;
        });
        
        // Находим корневые узлы (триггеры)
        const rootNodes = nodes.filter(node => node.type === 'trigger');
        
        // Если нет триггеров, используем первый узел
        if (rootNodes.length === 0 && nodes.length > 0) {
            rootNodes.push(nodes[0]);
        }
        
        // Рассчитываем позиции для каждого корневого узла и его потомков
        rootNodes.forEach((rootNode, rootIndex) => {
            this.layoutNode(rootNode, nodeMap, layout, visited, 100, 100 + rootIndex * 300);
        });
        
        return layout;
    }

    /**
     * Рекурсивно рассчитывает позиции узлов
     * @param {Object} node - Узел
     * @param {Object} nodeMap - Карта узлов
     * @param {Object} layout - Объект с позициями
     * @param {Set} visited - Множество посещенных узлов
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     */
    layoutNode(node, nodeMap, layout, visited, x, y) {
        if (visited.has(node.id)) return;
        
        visited.add(node.id);
        layout[node.id] = { x, y };
        
        // Получаем ID узлов-потомков
        const childIds = this.getChildNodeIds(node);
        
        // Рассчитываем позиции для потомков
        childIds.forEach((childId, index) => {
            const childNode = nodeMap[childId];
            if (childNode) {
                this.layoutNode(
                    childNode,
                    nodeMap,
                    layout,
                    visited,
                    x + 200,
                    y + (index - (childIds.length - 1) / 2) * 150
                );
            }
        });
    }

    /**
     * Получает ID узлов-потомков
     * @param {Object} node - Узел
     * @returns {Array} - Массив ID узлов-потомков
     */
    getChildNodeIds(node) {
        if (!node.connections) return [];
        
        if (Array.isArray(node.connections)) {
            return node.connections;
        }
        
        if (typeof node.connections === 'object') {
            return Object.values(node.connections)
                .flat()
                .filter(id => id); // Фильтруем пустые значения
        }
        
        return [];
    }

    /**
     * Валидирует визуальную схему
     * @param {Object} schema - Визуальная схема
     * @returns {Object} - Результат валидации
     */
    validateVisualSchema(schema) {
        const errors = [];
        const warnings = [];
        
        if (!schema.nodes || !Array.isArray(schema.nodes)) {
            errors.push('Missing or invalid nodes array');
            return { isValid: false, errors, warnings };
        }
        
        if (!schema.connections || !Array.isArray(schema.connections)) {
            errors.push('Missing or invalid connections array');
            return { isValid: false, errors, warnings };
        }
        
        // Проверяем наличие триггеров
        const triggerNodes = schema.nodes.filter(node => 
            this.getCategoryFromType(node.type) === 'triggers'
        );
        
        if (triggerNodes.length === 0) {
            warnings.push('Schema has no trigger nodes');
        }
        
        // Проверяем наличие действий
        const actionNodes = schema.nodes.filter(node => 
            this.getCategoryFromType(node.type) === 'actions'
        );
        
        if (actionNodes.length === 0) {
            warnings.push('Schema has no action nodes');
        }
        
        // Проверяем наличие изолированных узлов
        const connectedNodeIds = new Set();
        
        schema.connections.forEach(conn => {
            connectedNodeIds.add(conn.sourceNodeId);
            connectedNodeIds.add(conn.targetNodeId);
        });
        
        const isolatedNodes = schema.nodes.filter(node => !connectedNodeIds.has(node.id));
        
        if (isolatedNodes.length > 0) {
            warnings.push(`Schema has ${isolatedNodes.length} isolated nodes`);
        }
        
        // Проверяем наличие циклов
        const hasCycles = this.detectCycles(schema.nodes, schema.connections);
        
        if (hasCycles) {
            warnings.push('Schema contains cycles');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Обнаруживает циклы в схеме
     * @param {Array} nodes - Массив узлов
     * @param {Array} connections - Массив соединений
     * @returns {boolean} - Наличие циклов
     */
    detectCycles(nodes, connections) {
        // Создаем карту смежности
        const adjacencyMap = {};
        
        nodes.forEach(node => {
            adjacencyMap[node.id] = [];
        });
        
        connections.forEach(conn => {
            if (adjacencyMap[conn.sourceNodeId]) {
                adjacencyMap[conn.sourceNodeId].push(conn.targetNodeId);
            }
        });
        
        // Проверяем наличие циклов с помощью DFS
        const visited = new Set();
        const recursionStack = new Set();
        
        for (const nodeId of Object.keys(adjacencyMap)) {
            if (this.hasCycleDFS(nodeId, adjacencyMap, visited, recursionStack)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Рекурсивно проверяет наличие циклов с помощью DFS
     * @param {string} nodeId - ID узла
     * @param {Object} adjacencyMap - Карта смежности
     * @param {Set} visited - Множество посещенных узлов
     * @param {Set} recursionStack - Стек рекурсии
     * @returns {boolean} - Наличие циклов
     */
    hasCycleDFS(nodeId, adjacencyMap, visited, recursionStack) {
        if (recursionStack.has(nodeId)) {
            return true;
        }
        
        if (visited.has(nodeId)) {
            return false;
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        for (const neighbor of adjacencyMap[nodeId] || []) {
            if (this.hasCycleDFS(neighbor, adjacencyMap, visited, recursionStack)) {
                return true;
            }
        }
        
        recursionStack.delete(nodeId);
        return false;
    }
}

module.exports = VisualSchemaConverter;