/**
 * Валидатор схем визуального редактора
 * Проверяет логическую целостность, циклические зависимости и корректность соединений
 */

class SchemaValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.validationRules = this.initializeValidationRules();
    }

    /**
     * Инициализация правил валидации
     */
    initializeValidationRules() {
        return {
            // Обязательные поля для узлов
            requiredNodeFields: ['id', 'type', 'category', 'position'],
            
            // Обязательные поля для соединений
            requiredConnectionFields: ['id', 'sourceNodeId', 'targetNodeId'],
            
            // Допустимые категории узлов
            validCategories: ['triggers', 'conditions', 'actions', 'data', 'integrations'],
            
            // Правила соединений между категориями
            connectionRules: {
                'triggers': ['conditions', 'actions', 'data'],
                'conditions': ['actions', 'data', 'conditions'],
                'actions': ['conditions', 'actions', 'data'],
                'data': ['conditions', 'actions', 'data'],
                'integrations': ['conditions', 'actions', 'data']
            },
            
            // Максимальное количество входов/выходов
            maxConnections: {
                inputs: 10,
                outputs: 10
            },
            
            // Максимальная глубина вложенности
            maxDepth: 50
        };
    }

    /**
     * Основной метод валидации схемы
     * @param {Object} schema - Схема для валидации
     * @returns {Object} - Результат валидации
     */
    validateSchema(schema) {
        this.errors = [];
        this.warnings = [];

        if (!schema) {
            this.errors.push({
                type: 'SCHEMA_MISSING',
                message: 'Схема не предоставлена для валидации',
                severity: 'error'
            });
            return this.getValidationResult();
        }

        // Базовая валидация структуры схемы
        this.validateSchemaStructure(schema);

        if (this.errors.length > 0) {
            return this.getValidationResult();
        }

        // Валидация узлов
        this.validateNodes(schema.nodes || []);

        // Валидация соединений
        this.validateConnections(schema.connections || [], schema.nodes || []);

        // Проверка циклических зависимостей
        this.validateCyclicDependencies(schema.nodes || [], schema.connections || []);

        // Проверка логической целостности
        this.validateLogicalIntegrity(schema.nodes || [], schema.connections || []);

        // Проверка достижимости узлов
        this.validateNodeReachability(schema.nodes || [], schema.connections || []);

        return this.getValidationResult();
    }

    /**
     * Валидация базовой структуры схемы
     */
    validateSchemaStructure(schema) {
        if (!Array.isArray(schema.nodes)) {
            this.errors.push({
                type: 'INVALID_NODES_ARRAY',
                message: 'Поле nodes должно быть массивом',
                severity: 'error'
            });
        }

        if (!Array.isArray(schema.connections)) {
            this.errors.push({
                type: 'INVALID_CONNECTIONS_ARRAY',
                message: 'Поле connections должно быть массивом',
                severity: 'error'
            });
        }

        if (schema.nodes && schema.nodes.length === 0) {
            this.warnings.push({
                type: 'EMPTY_SCHEMA',
                message: 'Схема не содержит узлов',
                severity: 'warning'
            });
        }
    }

    /**
     * Валидация узлов
     */
    validateNodes(nodes) {
        const nodeIds = new Set();

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeContext = `узел #${i + 1}`;

            // Проверка обязательных полей
            for (const field of this.validationRules.requiredNodeFields) {
                if (!node[field]) {
                    this.errors.push({
                        type: 'MISSING_REQUIRED_FIELD',
                        message: `${nodeContext}: отсутствует обязательное поле "${field}"`,
                        nodeId: node.id,
                        severity: 'error'
                    });
                }
            }

            // Проверка уникальности ID
            if (node.id) {
                if (nodeIds.has(node.id)) {
                    this.errors.push({
                        type: 'DUPLICATE_NODE_ID',
                        message: `${nodeContext}: дублирующийся ID узла "${node.id}"`,
                        nodeId: node.id,
                        severity: 'error'
                    });
                } else {
                    nodeIds.add(node.id);
                }
            }

            // Проверка категории
            if (node.category && !this.validationRules.validCategories.includes(node.category)) {
                this.errors.push({
                    type: 'INVALID_CATEGORY',
                    message: `${nodeContext}: недопустимая категория "${node.category}"`,
                    nodeId: node.id,
                    severity: 'error'
                });
            }

            // Проверка позиции
            if (node.position) {
                if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
                    this.errors.push({
                        type: 'INVALID_POSITION',
                        message: `${nodeContext}: некорректная позиция узла`,
                        nodeId: node.id,
                        severity: 'error'
                    });
                }
            }

            // Валидация конфигурации узла
            this.validateNodeConfig(node, nodeContext);
        }
    }

    /**
     * Валидация конфигурации узла
     */
    validateNodeConfig(node, nodeContext) {
        if (!node.config) {
            this.warnings.push({
                type: 'MISSING_NODE_CONFIG',
                message: `${nodeContext}: отсутствует конфигурация узла`,
                nodeId: node.id,
                severity: 'warning'
            });
            return;
        }

        // Специфичная валидация по типам узлов
        switch (node.category) {
            case 'triggers':
                this.validateTriggerNode(node, nodeContext);
                break;
            case 'conditions':
                this.validateConditionNode(node, nodeContext);
                break;
            case 'actions':
                this.validateActionNode(node, nodeContext);
                break;
            case 'data':
                this.validateDataNode(node, nodeContext);
                break;
            case 'integrations':
                this.validateIntegrationNode(node, nodeContext);
                break;
        }
    }

    /**
     * Валидация триггерного узла
     */
    validateTriggerNode(node, nodeContext) {
        const config = node.config;
        
        if (!config.triggerType) {
            this.errors.push({
                type: 'MISSING_TRIGGER_TYPE',
                message: `${nodeContext}: отсутствует тип триггера`,
                nodeId: node.id,
                severity: 'error'
            });
        }

        if (config.triggerType === 'command' && !config.command) {
            this.errors.push({
                type: 'MISSING_COMMAND',
                message: `${nodeContext}: отсутствует команда для триггера команды`,
                nodeId: node.id,
                severity: 'error'
            });
        }
    }

    /**
     * Валидация узла условия
     */
    validateConditionNode(node, nodeContext) {
        const config = node.config;
        
        if (!config.conditionType) {
            this.errors.push({
                type: 'MISSING_CONDITION_TYPE',
                message: `${nodeContext}: отсутствует тип условия`,
                nodeId: node.id,
                severity: 'error'
            });
        }
    }

    /**
     * Валидация узла действия
     */
    validateActionNode(node, nodeContext) {
        const config = node.config;
        
        if (!config.actionType) {
            this.errors.push({
                type: 'MISSING_ACTION_TYPE',
                message: `${nodeContext}: отсутствует тип действия`,
                nodeId: node.id,
                severity: 'error'
            });
        }

        if (config.actionType === 'send_message' && !config.message) {
            this.warnings.push({
                type: 'EMPTY_MESSAGE',
                message: `${nodeContext}: пустое сообщение для отправки`,
                nodeId: node.id,
                severity: 'warning'
            });
        }
    }

    /**
     * Валидация узла данных
     */
    validateDataNode(node, nodeContext) {
        const config = node.config;
        
        if (!config.dataType) {
            this.errors.push({
                type: 'MISSING_DATA_TYPE',
                message: `${nodeContext}: отсутствует тип данных`,
                nodeId: node.id,
                severity: 'error'
            });
        }
    }

    /**
     * Валидация узла интеграции
     */
    validateIntegrationNode(node, nodeContext) {
        const config = node.config;
        
        if (!config.integrationType) {
            this.errors.push({
                type: 'MISSING_INTEGRATION_TYPE',
                message: `${nodeContext}: отсутствует тип интеграции`,
                nodeId: node.id,
                severity: 'error'
            });
        }

        if (config.integrationType === 'http' && !config.url) {
            this.errors.push({
                type: 'MISSING_HTTP_URL',
                message: `${nodeContext}: отсутствует URL для HTTP интеграции`,
                nodeId: node.id,
                severity: 'error'
            });
        }
    }

    /**
     * Валидация соединений
     */
    validateConnections(connections, nodes) {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const connectionIds = new Set();

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            const connectionContext = `соединение #${i + 1}`;

            // Проверка обязательных полей
            for (const field of this.validationRules.requiredConnectionFields) {
                if (!connection[field]) {
                    this.errors.push({
                        type: 'MISSING_REQUIRED_CONNECTION_FIELD',
                        message: `${connectionContext}: отсутствует обязательное поле "${field}"`,
                        connectionId: connection.id,
                        severity: 'error'
                    });
                }
            }

            // Проверка уникальности ID соединения
            if (connection.id) {
                if (connectionIds.has(connection.id)) {
                    this.errors.push({
                        type: 'DUPLICATE_CONNECTION_ID',
                        message: `${connectionContext}: дублирующийся ID соединения "${connection.id}"`,
                        connectionId: connection.id,
                        severity: 'error'
                    });
                } else {
                    connectionIds.add(connection.id);
                }
            }

            // Проверка существования узлов
            const sourceNode = nodeMap.get(connection.sourceNodeId);
            const targetNode = nodeMap.get(connection.targetNodeId);

            if (!sourceNode) {
                this.errors.push({
                    type: 'SOURCE_NODE_NOT_FOUND',
                    message: `${connectionContext}: исходный узел "${connection.sourceNodeId}" не найден`,
                    connectionId: connection.id,
                    severity: 'error'
                });
            }

            if (!targetNode) {
                this.errors.push({
                    type: 'TARGET_NODE_NOT_FOUND',
                    message: `${connectionContext}: целевой узел "${connection.targetNodeId}" не найден`,
                    connectionId: connection.id,
                    severity: 'error'
                });
            }

            // Проверка правил соединения категорий
            if (sourceNode && targetNode) {
                this.validateConnectionRules(sourceNode, targetNode, connectionContext, connection.id);
            }

            // Проверка самосоединения
            if (connection.sourceNodeId === connection.targetNodeId) {
                this.warnings.push({
                    type: 'SELF_CONNECTION',
                    message: `${connectionContext}: узел соединен сам с собой`,
                    connectionId: connection.id,
                    severity: 'warning'
                });
            }
        }
    }

    /**
     * Валидация правил соединения между категориями
     */
    validateConnectionRules(sourceNode, targetNode, connectionContext, connectionId) {
        const sourceCategory = sourceNode.category;
        const targetCategory = targetNode.category;
        
        const allowedTargets = this.validationRules.connectionRules[sourceCategory];
        
        if (allowedTargets && !allowedTargets.includes(targetCategory)) {
            this.warnings.push({
                type: 'UNUSUAL_CONNECTION',
                message: `${connectionContext}: необычное соединение от "${sourceCategory}" к "${targetCategory}"`,
                connectionId: connectionId,
                severity: 'warning'
            });
        }
    }

    /**
     * Проверка циклических зависимостей
     */
    validateCyclicDependencies(nodes, connections) {
        const graph = this.buildGraph(nodes, connections);
        const visited = new Set();
        const recursionStack = new Set();

        for (const nodeId of graph.keys()) {
            if (!visited.has(nodeId)) {
                if (this.detectCycle(graph, nodeId, visited, recursionStack)) {
                    this.errors.push({
                        type: 'CYCLIC_DEPENDENCY',
                        message: `Обнаружена циклическая зависимость, включающая узел "${nodeId}"`,
                        nodeId: nodeId,
                        severity: 'error'
                    });
                }
            }
        }
    }

    /**
     * Построение графа из узлов и соединений
     */
    buildGraph(nodes, connections) {
        const graph = new Map();
        
        // Инициализируем граф
        for (const node of nodes) {
            graph.set(node.id, []);
        }
        
        // Добавляем соединения
        for (const connection of connections) {
            if (graph.has(connection.sourceNodeId)) {
                graph.get(connection.sourceNodeId).push(connection.targetNodeId);
            }
        }
        
        return graph;
    }

    /**
     * Обнаружение циклов в графе (DFS)
     */
    detectCycle(graph, nodeId, visited, recursionStack) {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = graph.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (this.detectCycle(graph, neighbor, visited, recursionStack)) {
                    return true;
                }
            } else if (recursionStack.has(neighbor)) {
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    /**
     * Валидация логической целостности
     */
    validateLogicalIntegrity(nodes, connections) {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        
        // Проверяем наличие триггеров
        const triggerNodes = nodes.filter(node => node.category === 'triggers');
        if (triggerNodes.length === 0) {
            this.warnings.push({
                type: 'NO_TRIGGERS',
                message: 'Схема не содержит триггеров - бот не будет реагировать на события',
                severity: 'warning'
            });
        }

        // Проверяем наличие действий
        const actionNodes = nodes.filter(node => node.category === 'actions');
        if (actionNodes.length === 0) {
            this.warnings.push({
                type: 'NO_ACTIONS',
                message: 'Схема не содержит действий - бот не будет выполнять никаких операций',
                severity: 'warning'
            });
        }

        // Проверяем изолированные узлы
        this.validateIsolatedNodes(nodes, connections);
    }

    /**
     * Проверка изолированных узлов
     */
    validateIsolatedNodes(nodes, connections) {
        const connectedNodes = new Set();
        
        for (const connection of connections) {
            connectedNodes.add(connection.sourceNodeId);
            connectedNodes.add(connection.targetNodeId);
        }

        for (const node of nodes) {
            if (!connectedNodes.has(node.id)) {
                this.warnings.push({
                    type: 'ISOLATED_NODE',
                    message: `Узел "${node.id}" изолирован и не участвует в логике бота`,
                    nodeId: node.id,
                    severity: 'warning'
                });
            }
        }
    }

    /**
     * Проверка достижимости узлов
     */
    validateNodeReachability(nodes, connections) {
        const triggerNodes = nodes.filter(node => node.category === 'triggers');
        if (triggerNodes.length === 0) return;

        const graph = this.buildGraph(nodes, connections);
        const reachableNodes = new Set();

        // Обход в глубину от каждого триггера
        for (const trigger of triggerNodes) {
            this.dfsReachability(graph, trigger.id, reachableNodes);
        }

        // Проверяем недостижимые узлы
        for (const node of nodes) {
            if (node.category !== 'triggers' && !reachableNodes.has(node.id)) {
                this.warnings.push({
                    type: 'UNREACHABLE_NODE',
                    message: `Узел "${node.id}" недостижим от триггеров`,
                    nodeId: node.id,
                    severity: 'warning'
                });
            }
        }
    }

    /**
     * DFS для поиска достижимых узлов
     */
    dfsReachability(graph, nodeId, reachableNodes) {
        if (reachableNodes.has(nodeId)) return;
        
        reachableNodes.add(nodeId);
        const neighbors = graph.get(nodeId) || [];
        
        for (const neighbor of neighbors) {
            this.dfsReachability(graph, neighbor, reachableNodes);
        }
    }

    /**
     * Получение результата валидации
     */
    getValidationResult() {
        return {
            isValid: this.errors.length === 0,
            hasWarnings: this.warnings.length > 0,
            errors: this.errors,
            warnings: this.warnings,
            summary: {
                errorCount: this.errors.length,
                warningCount: this.warnings.length,
                totalIssues: this.errors.length + this.warnings.length
            }
        };
    }

    /**
     * Быстрая валидация (только критические ошибки)
     */
    quickValidate(schema) {
        this.errors = [];
        this.warnings = [];

        if (!schema || !schema.nodes || !schema.connections) {
            this.errors.push({
                type: 'INVALID_SCHEMA_STRUCTURE',
                message: 'Некорректная структура схемы',
                severity: 'error'
            });
            return this.getValidationResult();
        }

        // Только базовые проверки
        this.validateNodes(schema.nodes);
        this.validateConnections(schema.connections, schema.nodes);

        return this.getValidationResult();
    }

    /**
     * Валидация конкретного узла
     */
    validateSingleNode(node) {
        this.errors = [];
        this.warnings = [];

        if (!node) {
            this.errors.push({
                type: 'NODE_MISSING',
                message: 'Узел не предоставлен для валидации',
                severity: 'error'
            });
            return this.getValidationResult();
        }

        this.validateNodes([node]);
        return this.getValidationResult();
    }

    /**
     * Валидация конкретного соединения
     */
    validateSingleConnection(connection, nodes) {
        this.errors = [];
        this.warnings = [];

        if (!connection) {
            this.errors.push({
                type: 'CONNECTION_MISSING',
                message: 'Соединение не предоставлено для валидации',
                severity: 'error'
            });
            return this.getValidationResult();
        }

        this.validateConnections([connection], nodes || []);
        return this.getValidationResult();
    }
}

module.exports = SchemaValidator;