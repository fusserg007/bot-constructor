import React, { useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,

  Background,
  BackgroundVariant,

} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';

import NodeLibrary from './NodeLibrary/NodeLibrary';
import PropertyPanel from './PropertyPanel/PropertyPanel';
import ValidationPanel from './ValidationPanel/ValidationPanel';
import { EditorProvider } from './context/EditorContext';
import { nodeTypes } from './CustomNodes';
import { validateConnection } from '../../utils/nodeValidation';

import { SchemaValidator } from '../../utils/SchemaValidator';
import { isLegacyFormat } from '../../utils/dataConverter';
import { useApp } from '../../context/AppContext';
import { useSaveStatus } from '../../hooks/useSaveStatus';
import { useNotifications } from '../Notifications/NotificationSystem';
import { useSaveOperation } from '../../hooks/useAsyncOperation';
import { InlineSpinner } from '../LoadingSpinner/LoadingSpinner';
// import { getErrorMessage } from '../../utils/errorMessages';
import { useCanvasLogger } from './CanvasLogger';
import { useNodeRegistry } from './NodeRegistry';
import styles from './Editor.module.css';

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

// Функции для получения иконок и цветов узлов
const getNodeIcon = (nodeType: string): string => {
  const icons: Record<string, string> = {
    'start': '🚀',
    'send_message': '💬',
    'send_message_with_keyboard': '⌨️',
    'callback_handler': '🔄',
    'command': '⚡',
    'webhook-telegram': '📡',
    'webhook-http': '🌐',
    'switch-command': '🔀',
    'switch-condition': '❓',
    'trigger-message': '📨',
    'trigger-command': '⚡',
    'trigger-callback': '🔄',
    'action-send-message': '💬',
    'condition-text-contains': '🔍',
    'data-save': '💾',
    'integration-http': '🔗',
    'scenario-welcome': '👋'
  };
  return icons[nodeType] || '⚙️';
};

const getNodeColor = (nodeType: string): string => {
  const colors: Record<string, string> = {
    'start': '#22c55e',
    'send_message': '#3b82f6',
    'send_message_with_keyboard': '#6366f1',
    'callback_handler': '#f59e0b',
    'command': '#ef4444',
    'webhook-telegram': '#8b5cf6',
    'webhook-http': '#06b6d4',
    'switch-command': '#84cc16',
    'switch-condition': '#f97316',
    'trigger-message': '#ef4444',
    'trigger-command': '#dc2626',
    'trigger-callback': '#f59e0b',
    'action-send-message': '#3b82f6',
    'condition-text-contains': '#f59e0b',
    'data-save': '#8b5cf6',
    'integration-http': '#06b6d4',
    'scenario-welcome': '#22c55e'
  };
  return colors[nodeType] || '#6b7280';
};

const Editor: React.FC = () => {
  const { botId } = useParams<{ botId?: string }>();
  const { state, fetchBot } = useApp();
  const { saveStatus, saveMessage, saveBot } = useSaveStatus();
  const { showError, showWarning } = useNotifications();
  const { isLoading: isSaving, save } = useSaveOperation();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Node Registry
  const { createNodeData } = useNodeRegistry();
  
  // Canvas Logger
  const {
    logDropSuccess,
    logDropFailed,
    logConnectionCreate,
    logNodeAdd,
    logNodeDelete,
    logValidationError,
    logSaveStart,
    logSaveSuccess,
    logSaveError
  } = useCanvasLogger();
  
  // Простой обработчик для изменения узлов
  const handleNodesChange = useCallback((changes: any[]) => {
    // Логируем изменения узлов
    changes.forEach(change => {
      if (change.type === 'remove') {
        logNodeDelete(change.id, 'unknown');
      }
    });
    onNodesChange(changes);
  }, [onNodesChange, logNodeDelete]);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isValidationPanelVisible, setIsValidationPanelVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // const [validationResult, setValidationResult] = useState<{ errors: any[], warnings: any[] }>({ errors: [], warnings: [] });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Загружаем бота при монтировании компонента
  React.useEffect(() => {
    if (botId) {
      fetchBot(botId);
    }
  }, [botId, fetchBot]);

  // Обновляем узлы и ребра только при первой загрузке бота
  React.useEffect(() => {
    if (state.currentBot?.configuration && isInitialLoad) {
      // Проверяем, является ли конфигурация старым форматом
      const isLegacy = isLegacyFormat(state.currentBot.configuration);
      const useNewFormat = true; // Принудительно новый формат
      
      // Логирование для отладки
      const debugInfo = {
        botName: state.currentBot.name,
        botIdFromUrl: botId,
        botIdFromData: state.currentBot.id,
        configNodes: state.currentBot.configuration.nodes?.length || 0,
        configConnections: state.currentBot.configuration.connections?.length || 0,
        configEdges: state.currentBot.configuration.edges?.length || 0,
        hasConnections: !!state.currentBot.configuration.connections,
        connectionsData: state.currentBot.configuration.connections || null,
        isLegacy: isLegacy,
        useNewFormat: useNewFormat,
        timestamp: new Date().toISOString()
      };
      
      // Записываем отладочную информацию в файл
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debugInfo)
      }).catch(() => {}); // Игнорируем ошибки логирования
      
      // Используем новый формат для всех ботов с сохранением связей
      // Загружаем схему в новом формате с сохранением связей
      
      let convertedNodes: Node[] = [];
      let convertedEdges: Edge[] = [];
      
      if (state.currentBot.configuration.nodes) {
        // Конвертируем config в data для ReactFlow
        convertedNodes = state.currentBot.configuration.nodes.map((node: any) => {
          const nodeData = node.config || node.data || {};
          return {
            ...node,
            data: {
              ...nodeData,
              label: nodeData.name || nodeData.label || `${node.type} узел`,
              icon: getNodeIcon(node.type),
              color: getNodeColor(node.type)
            }
          };
        });
      }
      
      if (state.currentBot.configuration.connections) {
        // Конвертируем connections в edges для ReactFlow
        convertedEdges = state.currentBot.configuration.connections.map((conn: any) => ({
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle: conn.sourceOutput,
          targetHandle: conn.targetInput
        }));
      } else if (state.currentBot.configuration.edges) {
        // Поддержка edges формата (если есть)
        convertedEdges = state.currentBot.configuration.edges;
      }
      
      // Устанавливаем узлы и связи одновременно для избежания потери связей
      setNodes(convertedNodes);
      setEdges(convertedEdges);
      setIsInitialLoad(false);
    }
  }, [state.currentBot, setNodes, setEdges, isInitialLoad]);

  // Автоматически показываем панель валидации при наличии ошибок
  React.useEffect(() => {
    const validator = new SchemaValidator(nodes, edges);
    const result = validator.validate();
    // setValidationResult(result);
    
    if (result.errors.length > 0 && !isValidationPanelVisible) {
      setIsValidationPanelVisible(true);
    }
  }, [nodes, edges, isValidationPanelVisible]);

  const onConnect = useCallback(
    (params: Connection) => {
      const validation = validateConnection(params, nodes);
      if (validation.valid && params.source && params.target) {
        const newEdge = {
          ...params,
          id: `${params.source}-${params.target}-${Date.now()}`,
          type: 'default'
        };
        // Создаем новое соединение
        setEdges((eds) => addEdge(newEdge, eds));
        // Логируем успешное создание соединения
        logConnectionCreate(params.source, params.target);
      } else {
        const reason = validation.reason || 'Unknown error';
        alert(`Невозможно создать соединение: ${reason}`);
        // Логируем ошибку соединения
        if (params.source && params.target) {
          logValidationError(params.source, `Connection failed: ${reason}`);
        }
      }
    },
    [nodes, logConnectionCreate, logValidationError] // Добавляем логгеры в зависимости
  );

  // Обработчик обновления схемы из ValidationPanel
  const handleSchemaUpdate = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, []); // Убираем setNodes, setEdges из зависимостей

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);



  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        logDropFailed('unknown', 'Invalid drag data or bounds');
        return;
      }

      const position = reactFlowInstance?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Логируем успешное добавление узла
      logDropSuccess(type);
      logNodeAdd(newNode.id, type);
    },
    [reactFlowInstance, logDropFailed, logDropSuccess, logNodeAdd]
  );

  const getDefaultNodeData = (type: string) => {
    // Используем NodeRegistry для получения данных по умолчанию
    return createNodeData(type);
  };

  // Функция для обновления данных узла
  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      )
    );
  }, []); // Убираем setNodes из зависимостей

  const handleSave = async () => {
    logSaveStart();
    
    if (!botId) {
      const errorMsg = 'Не указан идентификатор бота';
      showError('Ошибка сохранения', errorMsg);
      logSaveError(errorMsg);
      return;
    }
    
    // Валидируем схему перед сохранением с помощью новой системы валидации
    const validator = new SchemaValidator(nodes, edges);
    const validation = validator.validate();
    
    // Логируем ошибки валидации
    validation.errors.forEach((error: any) => {
      logValidationError(error.nodeId || 'unknown', error.message);
    });
    
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e: any) => `• ${e.message}`).join('\n');
      showError('Ошибки в схеме бота', errorMessages);
      setIsValidationPanelVisible(true);
      logSaveError('Validation failed');
      return;
    }

    // Показываем предупреждения, но позволяем сохранить
    if (validation.warnings.length > 0) {
      const warningMessages = validation.warnings.map((w: any) => `• ${w.message}`).join('\n');
      showWarning('Предупреждения в схеме', warningMessages);
      setIsValidationPanelVisible(true);
    }

    const botData = {
      id: botId,
      name: state.currentBot?.name || 'Обновленный бот',
      description: state.currentBot?.description || 'Создан в визуальном редакторе',
      status: state.currentBot?.status || 'draft' as const,
      configuration: {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          config: node.data // Используем config вместо data
        })),
        connections: edges.map(edge => ({
          id: edge.id || `${edge.source}-${edge.target}`,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceOutput: edge.sourceHandle || 'output',
          targetInput: edge.targetHandle || 'input'
        })),
        variables: state.currentBot?.configuration?.variables || {},
        settings: state.currentBot?.configuration?.settings || {}
      }
    };

    // Сохраняем бота

    // Используем систему сохранения с уведомлениями
    await save(
      () => saveBot(botId, botData),
      {
        onSuccess: () => {
          // Бот успешно сохранен
          logSaveSuccess(`Bot ${botId} saved successfully`);
        },
        onError: (error: any) => {
          // Ошибка сохранения бота
          logSaveError(error?.message || 'Unknown save error');
        }
      }
    );
  };

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backButton}>
            ← Назад
          </Link>
          <h1>{botId ? 'Редактор бота' : 'Новый бот'}</h1>
          <div style={{ 
            marginLeft: '16px', 
            padding: '4px 8px', 
            background: '#22c55e', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            🚀 Модульный редактор v2.0
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={handleSave}
            className={`${styles.saveButton} ${isSaving ? styles.saving : styles[saveStatus]}`}
            disabled={isSaving || saveStatus === 'saving'}
          >
            {isSaving && (
              <>
                <InlineSpinner size="small" />
                <span style={{ marginLeft: '8px' }}>Сохранение...</span>
              </>
            )}
            {!isSaving && saveStatus === 'saved' && '✅ Сохранено'}
            {!isSaving && saveStatus === 'error' && '❌ Ошибка'}
            {!isSaving && saveStatus === 'idle' && '💾 Сохранить'}
          </button>
          {saveMessage && !isSaving && (
            <span className={`${styles.saveMessage} ${styles[saveStatus]}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </header>

      <div className={styles.editorContent}>
        <NodeLibrary
          onNodeAdd={(nodeType) => {
            const newNode: Node = {
              id: `${nodeType}-${Date.now()}`,
              type: nodeType,
              position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
              data: getDefaultNodeData(nodeType),
            };
            setNodes((nds) => nds.concat(newNode));
          }}
        />

        <div className={styles.flowContainer} ref={reactFlowWrapper}>
          <EditorProvider onNodeUpdate={handleNodeUpdate}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              panOnDrag={[1, 2]}
              zoomOnScroll={true}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                labelStyle: { fontSize: 12, fontWeight: 600 },
                labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 }
              }}
            >
              <Controls />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </EditorProvider>
        </div>

        <PropertyPanel
          selectedNode={selectedNode}
          onNodeUpdate={handleNodeUpdate}
        />

        {/* Панель валидации */}
        {isValidationPanelVisible && (
          <ValidationPanel
            nodes={nodes}
            edges={edges}
            onClose={() => setIsValidationPanelVisible(false)}
            onSchemaUpdate={handleSchemaUpdate}
          />
        )}



      </div>
    </div>
  );
};

export default Editor;