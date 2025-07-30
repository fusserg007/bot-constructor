import React, { useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,

} from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import 'reactflow/dist/style.css';

import NodeLibrary from './NodeLibrary/NodeLibrary';
import PropertyPanel from './PropertyPanel/PropertyPanel';
import ValidationPanel from './ValidationPanel/ValidationPanel';
import { nodeTypes } from './CustomNodes';
import { validateConnection } from '../../utils/nodeValidation';
import { SchemaValidator } from '../../utils/SchemaValidator';
import { convertLegacyToReactFlow, isLegacyFormat } from '../../utils/dataConverter';
import { useApp } from '../../context/AppContext';
import { useSaveStatus } from '../../hooks/useSaveStatus';
import styles from './Editor.module.css';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger-message',
    data: {
      label: 'Сообщение',
      triggerType: 'text',
      icon: '📨',
      color: '#3b82f6'
    },
    position: { x: 100, y: 100 },
  },
];

const initialEdges: Edge[] = [];

const Editor: React.FC = () => {
  const { botId } = useParams<{ botId?: string }>();
  const { state, fetchBot } = useApp();
  const { saveStatus, saveMessage, saveBot } = useSaveStatus();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isValidationPanelVisible, setIsValidationPanelVisible] = useState(false);

  // const [validationResult, setValidationResult] = useState<{ errors: any[], warnings: any[] }>({ errors: [], warnings: [] });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Загружаем бота при монтировании компонента
  React.useEffect(() => {
    if (botId) {
      fetchBot(botId);
    }
  }, [botId, fetchBot]);

  // Обновляем узлы и ребра когда загружается бот
  React.useEffect(() => {
    if (state.currentBot?.configuration) {
      // Проверяем, является ли конфигурация старым форматом
      if (isLegacyFormat(state.currentBot.configuration)) {
        // Конвертируем из старого формата
        const { nodes: convertedNodes, edges: convertedEdges } = convertLegacyToReactFlow(state.currentBot.configuration);
        setNodes(convertedNodes);
        setEdges(convertedEdges);
      } else {
        // Используем новый формат как есть
        if (state.currentBot.configuration.nodes) {
          setNodes(state.currentBot.configuration.nodes);
        }
        if (state.currentBot.configuration.edges) {
          setEdges(state.currentBot.configuration.edges);
        }
      }
    }
  }, [state.currentBot, setNodes, setEdges]);

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
      if (validation.valid) {
        setEdges((eds) => addEdge(params, eds));
      } else {
        alert(`Невозможно создать соединение: ${validation.reason}`);
      }
    },
    [setEdges, nodes]
  );

  // Обработчик обновления схемы из ValidationPanel
  const handleSchemaUpdate = useCallback((updatedNodes: Node[], updatedEdges: Edge[]) => {
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [setNodes, setEdges]);

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
    },
    [reactFlowInstance, setNodes]
  );

  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'trigger-message':
        return {
          label: 'Сообщение',
          triggerType: 'text',
          icon: '📨',
          color: '#3b82f6'
        };
      case 'action-send-message':
        return {
          label: 'Отправить сообщение',
          actionType: 'send',
          icon: '💬',
          color: '#10b981',
          message: 'Привет!'
        };
      case 'condition-text':
        return {
          label: 'Проверка текста',
          conditionType: 'contains',
          icon: '🔍',
          color: '#f59e0b',
          condition: 'содержит',
          value: ''
        };
      default:
        return { label: 'Узел' };
    }
  };

  const handleSave = async () => {
    console.log('handleSave called, botId:', botId);
    if (!botId) {
      console.log('No botId, returning');
      return;
    }
    
    // Валидируем схему перед сохранением с помощью новой системы валидации
    const validator = new SchemaValidator(nodes, edges);
    const validation = validator.validate();
    
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e: any) => `• ${e.message}`).join('\n');
      alert(`Ошибки в схеме:\n${errorMessages}`);
      setIsValidationPanelVisible(true);
      return;
    }

    // Показываем предупреждения, но позволяем сохранить
    if (validation.warnings.length > 0) {
      const warningMessages = validation.warnings.map((w: any) => `• ${w.message}`).join('\n');
      const proceed = confirm(`Предупреждения в схеме:\n${warningMessages}\n\nПродолжить сохранение?`);
      if (!proceed) {
        setIsValidationPanelVisible(true);
        return;
      }
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
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        })),
        variables: state.currentBot?.configuration?.variables || {},
        settings: state.currentBot?.configuration?.settings || {}
      }
    };

    console.log('Calling saveBot with:', botData);
    await saveBot(botId, botData);
  };

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backButton}>
            ← Назад
          </Link>
          <h1>{botId ? 'Редактор бота' : 'Новый бот'}</h1>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={handleSave}
            className={`${styles.saveButton} ${styles[saveStatus]}`}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' && '⏳ Сохранение...'}
            {saveStatus === 'saved' && '✅ Сохранено'}
            {saveStatus === 'error' && '❌ Ошибка'}
            {saveStatus === 'idle' && '💾 Сохранить'}
          </button>
          {saveMessage && (
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
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
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
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            preventScrolling={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        <PropertyPanel
          selectedNode={selectedNode}
          onNodeUpdate={(nodeId, data) => {
            setNodes((nds) =>
              nds.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
              )
            );
          }}
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