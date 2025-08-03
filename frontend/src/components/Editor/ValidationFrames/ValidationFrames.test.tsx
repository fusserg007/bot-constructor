import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ValidationFrames from './ValidationFrames';
import { Node } from 'reactflow';

// Мокаем хук логирования
vi.mock('../CanvasLogger', () => ({
  useCanvasLogger: () => ({
    log: vi.fn()
  })
}));

describe('ValidationFrames', () => {
  const mockNodes: Node[] = [
    {
      id: 'node1',
      type: 'send_message',
      position: { x: 100, y: 100 },
      data: { message: 'Test message' },
      width: 200,
      height: 100
    },
    {
      id: 'node2',
      type: 'send_message',
      position: { x: 300, y: 100 },
      data: {}, // Пустые данные - должна быть ошибка
      width: 200,
      height: 100
    },
    {
      id: 'node3',
      type: 'send_message_with_keyboard',
      position: { x: 500, y: 100 },
      data: {
        message: 'Test',
        buttons: [
          { text: 'Button 1', callback_data: 'btn1' },
          { text: '', callback_data: 'btn2' } // Пустой текст - предупреждение
        ]
      },
      width: 200,
      height: 100
    }
  ];

  const mockEdges = [
    { id: 'edge1', source: 'node1', target: 'node2' }
  ];

  it('renders validation frames for nodes with errors', () => {
    render(
      <ValidationFrames 
        nodes={mockNodes} 
        edges={mockEdges} 
        visible={true} 
      />
    );

    // Должны быть рамки для узлов с ошибками
    const frames = document.querySelectorAll('.validationFrame');
    expect(frames.length).toBeGreaterThan(0);
  });

  it('shows error frame for node without required message', () => {
    render(
      <ValidationFrames 
        nodes={[mockNodes[1]]} // Узел без сообщения
        edges={[]} 
        visible={true} 
      />
    );

    const errorFrame = document.querySelector('.validationFrame.error');
    expect(errorFrame).toBeInTheDocument();
  });

  it('shows warning frame for node with incomplete button data', () => {
    render(
      <ValidationFrames 
        nodes={[mockNodes[2]]} // Узел с неполными данными кнопки
        edges={[]} 
        visible={true} 
      />
    );

    const warningFrame = document.querySelector('.validationFrame.warning');
    expect(warningFrame).toBeInTheDocument();
  });

  it('does not render frames when visible is false', () => {
    render(
      <ValidationFrames 
        nodes={mockNodes} 
        edges={mockEdges} 
        visible={false} 
      />
    );

    const frames = document.querySelectorAll('.validationFrame');
    expect(frames).toHaveLength(0);
  });

  it('shows tooltip on hover', async () => {
    render(
      <ValidationFrames 
        nodes={[mockNodes[1]]} 
        edges={[]} 
        visible={true} 
      />
    );

    const frame = document.querySelector('.validationFrame');
    expect(frame).toBeInTheDocument();

    // Проверяем наличие тултипа
    const tooltip = frame?.querySelector('.validationTooltip');
    expect(tooltip).toBeInTheDocument();
  });

  it('validates start node connections correctly', () => {
    const startNode: Node = {
      id: 'start1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {},
      width: 200,
      height: 100
    };

    const edgesWithIncomingToStart = [
      { id: 'edge1', source: 'node1', target: 'start1' } // Неправильно - входящее в start
    ];

    render(
      <ValidationFrames 
        nodes={[startNode]} 
        edges={edgesWithIncomingToStart} 
        visible={true} 
      />
    );

    const warningFrame = document.querySelector('.validationFrame.warning');
    expect(warningFrame).toBeInTheDocument();
  });

  it('validates callback handler node correctly', () => {
    const callbackNode: Node = {
      id: 'callback1',
      type: 'callback_handler',
      position: { x: 0, y: 0 },
      data: {}, // Отсутствует callback_data
      width: 200,
      height: 100
    };

    render(
      <ValidationFrames 
        nodes={[callbackNode]} 
        edges={[]} 
        visible={true} 
      />
    );

    const errorFrame = document.querySelector('.validationFrame.error');
    expect(errorFrame).toBeInTheDocument();
  });

  it('validates webhook nodes correctly', () => {
    const telegramWebhook: Node = {
      id: 'webhook1',
      type: 'webhook-telegram',
      position: { x: 0, y: 0 },
      data: {}, // Отсутствует token
      width: 200,
      height: 100
    };

    const httpWebhook: Node = {
      id: 'webhook2',
      type: 'webhook-http',
      position: { x: 200, y: 0 },
      data: { url: 'invalid-url' }, // Некорректный URL
      width: 200,
      height: 100
    };

    render(
      <ValidationFrames 
        nodes={[telegramWebhook, httpWebhook]} 
        edges={[]} 
        visible={true} 
      />
    );

    const errorFrames = document.querySelectorAll('.validationFrame.error');
    expect(errorFrames.length).toBe(1); // Telegram webhook без токена

    const warningFrames = document.querySelectorAll('.validationFrame.warning');
    expect(warningFrames.length).toBe(1); // HTTP webhook с некорректным URL
  });

  it('validates condition nodes correctly', () => {
    const switchNode: Node = {
      id: 'switch1',
      type: 'switch-command',
      position: { x: 0, y: 0 },
      data: {},
      width: 200,
      height: 100
    };

    const edgesWithOneOutgoing = [
      { id: 'edge1', source: 'switch1', target: 'node1' } // Только одно исходящее - мало
    ];

    render(
      <ValidationFrames 
        nodes={[switchNode]} 
        edges={edgesWithOneOutgoing} 
        visible={true} 
      />
    );

    const frames = document.querySelectorAll('.validationFrame');
    expect(frames.length).toBeGreaterThan(0);
  });

  it('handles validation errors gracefully', () => {
    const invalidNode: Node = {
      id: 'invalid1',
      type: 'unknown_type' as any,
      position: { x: 0, y: 0 },
      data: null,
      width: 200,
      height: 100
    };

    // Не должно падать при неизвестном типе узла
    expect(() => {
      render(
        <ValidationFrames 
          nodes={[invalidNode]} 
          edges={[]} 
          visible={true} 
        />
      );
    }).not.toThrow();
  });
});