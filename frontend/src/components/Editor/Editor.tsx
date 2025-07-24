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
import { schemaValidator } from '../../utils/schemaValidator';
import type { BotSchema } from '../../types/flow';
import { useApp } from '../../context/AppContext';
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
  const { state, fetchBot, saveBot } = useApp();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [validationResult, setValidationResult] = useState<{ errors: any[], warnings: any[] }>({ errors: [], warnings: [] });
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
      if (state.currentBot.configuration.nodes) {
        setNodes(state.currentBot.configuration.nodes);
      }
      if (state.currentBot.configuration.edges) {
        setEdges(state.currentBot.configuration.edges);
      }
    }
  }, [state.currentBot, setNodes, setEdges]);

  // Функция валидации текущей схемы
  const validateCurrentSchema = useCallback(() => {
    const schema: BotSchema = {
      id: botId || 'temp',
      name: state.currentBot?.name || 'Временная схема',
      description: state.currentBot?.description || '',
      nodes,
      edges,
      variables: {},
      settings: {}
    };

    const result = schemaValidator.validateSchema(schema);
    setValidationResult({
      errors: result.errors,
      warnings: result.warnings
    });
  }, [nodes, edges, botId, state.currentBot]);

  // Валидируем схему при изменении узлов или соединений
  React.useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      validateCurrentSchema();
    }
  }, [nodes, edges, validateCurrentSchema]);

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
    // Валидируем схему перед сохранением с помощью новой системы валидации
    const schema: BotSchema = {
      id: botId || 'temp',
      name: state.currentBot?.name || (botId ? 'Обновленный бот' : 'Новый бот'),
      description: state.currentBot?.description || 'Создан в визуальном редакторе',
      nodes,
      edges,
      variables: state.currentBot?.configuration?.variables || {},
      settings: state.currentBot?.configuration?.settings || {}
    };

    const validation = schemaValidator.validateSchema(schema);
    
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `• ${e.message}`).join('\n');
      alert(`Ошибки в схеме:\n${errorMessages}`);
      return;
    }

    // Показываем предупреждения, но позволяем сохранить
    if (validation.hasWarnings) {
      const warningMessages = validation.warnings.map(w => `• ${w.message}`).join('\n');
      const proceed = confirm(`Предупреждения в схеме:\n${warningMessages}\n\nПродолжить сохранение?`);
      if (!proceed) {
        return;
      }
    }

    const botData = {
      id: botId,
      name: schema.name,
      description: schema.description,
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
        variables: schema.variables,
        settings: schema.settings
      }
    };

    try {
      await saveBot(botData);
      alert('Бот успешно сохранен!');
    } catch (error) {
      console.error('Error saving bot:', error);
      alert('Ошибка при сохранении бота');
    }
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
          <button onClick={handleSave} className={styles.saveButton} disabled={state.loading}>
            {state.loading ? 'Сохранение...' : 'Сохранить'}
          </button>
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
            fitView
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
        <ValidationPanel
          errors={validationResult.errors}
          warnings={validationResult.warnings}
        />
      </div>
    </div>
  );
};

export default Editor;