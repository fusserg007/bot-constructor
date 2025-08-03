import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNodesState, useEdgesState } from 'reactflow';
import type { Node, Edge } from 'reactflow';

import { useApp } from '../../../context/AppContext';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const useEditorState = () => {
  const { botId } = useParams<{ botId?: string }>();
  const { state, fetchBot } = useApp();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isValidationPanelVisible, setIsValidationPanelVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Обработчик для сохранения позиций узлов
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Загружаем бота при монтировании компонента
  useEffect(() => {
    if (botId) {
      fetchBot(botId);
    }
  }, [botId, fetchBot]);

  // Обновляем узлы и ребра при загрузке бота
  useEffect(() => {
    if (state.currentBot?.configuration && isInitialLoad) {
      console.log('✨ Загружаем схему с поддержкой новых узлов');
      
      let convertedNodes: Node[] = [];
      let convertedEdges: Edge[] = [];
      
      if (state.currentBot.configuration.nodes) {
        console.log('📦 Узлы:', state.currentBot.configuration.nodes.length);
        
        convertedNodes = state.currentBot.configuration.nodes.map((node: any) => {
          // В схеме данные лежат в node.data, а не node.config
          const nodeData = node.data || node.config || {};
          return {
            id: node.id,
            type: node.type,
            position: node.position,
            data: nodeData
          };
        });
      }

      // СНАЧАЛА обрабатываем connections - поддержка старого и нового формата
      if (state.currentBot.configuration.connections) {
        // Новый формат - connections как отдельный массив
        convertedEdges = state.currentBot.configuration.connections.map((conn: any) => {
          // Определяем подпись для связи
          let label = '';
          if (conn.sourceOutput && conn.sourceOutput !== 'default') {
            // Ищем кнопку в InteractiveMenu узле
            const sourceNode = convertedNodes.find(n => n.id === conn.sourceNodeId);
            if (sourceNode?.type === 'interactiveMenu' && sourceNode.data?.buttons) {
              const button = sourceNode.data.buttons.find((btn: any) => btn.id === conn.sourceOutput);
              if (button) {
                label = button.text;
              }
            } else {
              label = conn.sourceOutput;
            }
          }
          
          return {
            id: conn.id,
            source: conn.sourceNodeId,
            target: conn.targetNodeId,
            sourceHandle: conn.sourceOutput,
            targetHandle: conn.targetInput,
            label: label,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#3b82f6', strokeWidth: 2 }
          };
        });
      } else if (state.currentBot.configuration.edges) {
        // Формат ReactFlow edges
        convertedEdges = state.currentBot.configuration.edges;
      } else {
        // Старый формат - connections внутри узлов
        console.log('🔗 Обрабатываем connections из узлов...');
        convertedNodes.forEach((node: any) => {
          const originalNode = state.currentBot?.configuration?.nodes.find((n: any) => n.id === node.id);
          if (originalNode?.connections) {
            console.log(`📎 Узел ${node.id} имеет connections:`, originalNode.connections);
            
            if (Array.isArray(originalNode.connections)) {
              // Простой массив target узлов
              originalNode.connections.forEach((targetId: string, index: number) => {
                const edge = {
                  id: `${node.id}-${targetId}-${index}`,
                  source: node.id,
                  target: targetId,
                  type: 'default'
                };
                console.log('➡️ Создаем edge:', edge);
                convertedEdges.push(edge);
              });
            } else if (typeof originalNode.connections === 'object') {
              // Объект с условиями (для condition узлов)
              Object.entries(originalNode.connections).forEach(([condition, targets]: [string, any]) => {
                if (Array.isArray(targets)) {
                  targets.forEach((targetId: string, index: number) => {
                    const edge = {
                      id: `${node.id}-${targetId}-${condition}-${index}`,
                      source: node.id,
                      target: targetId,
                      sourceHandle: condition,
                      type: 'default'
                    };
                    console.log(`➡️ Создаем conditional edge (${condition}):`, edge);
                    convertedEdges.push(edge);
                  });
                }
              });
            }
          }
        });
        console.log('🔗 Всего создано edges:', convertedEdges.length);
      }

      // ПОТОМ добавляем точку входа, если её нет
      const hasEntryPoint = convertedNodes.some((node: any) => node.type === 'entryPoint');
      if (!hasEntryPoint) {
        // Находим первый trigger узел для подключения
        const firstTrigger = convertedNodes.find((node: any) => node.type === 'trigger');
        
        const entryPoint = {
          id: 'entry-point',
          type: 'entryPoint',
          position: { x: -150, y: 50 },
          data: {
            label: 'Точка входа',
            description: 'Начало выполнения бота'
          }
        };
        
        convertedNodes.unshift(entryPoint);
        
        // Подключаем к первому trigger, если есть
        if (firstTrigger) {
          const entryEdge = {
            id: `entry-point-${firstTrigger.id}`,
            source: 'entry-point',
            target: firstTrigger.id,
            type: 'default'
          };
          console.log('🚀 Добавляем EntryPoint edge:', entryEdge);
          convertedEdges.push(entryEdge);
        }
      }
      
      setNodes(convertedNodes);
      setEdges(convertedEdges);
      setIsInitialLoad(false);
    }
  }, [state.currentBot, isInitialLoad]); // Убираем setNodes, setEdges из зависимостей

  return {
    nodes,
    edges,
    selectedNode,
    isValidationPanelVisible,
    reactFlowWrapper,
    reactFlowInstance,
    handleNodesChange,
    onEdgesChange,
    setSelectedNode,
    setIsValidationPanelVisible,
    setReactFlowInstance,
    setNodes,
    setEdges
  };
};