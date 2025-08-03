import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiNode from './MultiNode';
import { MultiNodeData } from './types';

// Mock useCanvasLogger
jest.mock('../CanvasLogger/useCanvasLogger', () => ({
  useCanvasLogger: () => ({
    log: jest.fn()
  })
}));

const mockNodeData: MultiNodeData = {
  id: 'test-multi-node',
  label: 'Тестовый мульти-узел',
  icon: '📦',
  color: '#3b82f6',
  isExpanded: false,
  children: [
    {
      id: 'child-1',
      type: 'button',
      config: { text: 'Тестовая кнопка' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'child-2',
      type: 'text',
      config: { content: 'Тестовый текст' },
      position: { x: 0, y: 1 }
    }
  ],
  buttonLayout: 'bottom'
};

const mockNodeProps = {
  id: 'test-node',
  data: mockNodeData,
  selected: false,
  type: 'multi-node',
  position: { x: 0, y: 0 },
  dragging: false,
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0
};

describe('MultiNode', () => {
  it('renders correctly in collapsed state', () => {
    render(<MultiNode {...mockNodeProps} />);
    
    expect(screen.getByText('МУЛЬТИ-УЗЕЛ')).toBeInTheDocument();
    expect(screen.getByText('Тестовый мульти-узел')).toBeInTheDocument();
    expect(screen.getByText('Нажмите ▶ для расширения')).toBeInTheDocument();
    expect(screen.queryByText('Тестовая кнопка')).not.toBeInTheDocument();
  });

  it('renders correctly in expanded state', () => {
    const expandedData = { ...mockNodeData, isExpanded: true };
    const expandedProps = { ...mockNodeProps, data: expandedData };
    
    render(<MultiNode {...expandedProps} />);
    
    expect(screen.getByText('МУЛЬТИ-УЗЕЛ')).toBeInTheDocument();
    expect(screen.getByText('2 компонентов')).toBeInTheDocument();
    expect(screen.getByText('🔘 Тестовая кнопка')).toBeInTheDocument();
    expect(screen.getByText('📝 Тестовый текст')).toBeInTheDocument();
  });

  it('shows empty state when no children', () => {
    const emptyData = { ...mockNodeData, isExpanded: true, children: [] };
    const emptyProps = { ...mockNodeProps, data: emptyData };
    
    render(<MultiNode {...emptyProps} />);
    
    expect(screen.getByText('Нет компонентов')).toBeInTheDocument();
    expect(screen.getByText('Перетащите элементы сюда')).toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(<MultiNode {...mockNodeProps} />);
    const multiNode = container.querySelector('.multiNode');
    
    expect(multiNode).toHaveClass('primary');
  });

  it('applies selected class when selected', () => {
    const selectedProps = { ...mockNodeProps, selected: true };
    const { container } = render(<MultiNode {...selectedProps} />);
    const multiNode = container.querySelector('.multiNode');
    
    expect(multiNode).toHaveClass('selected');
  });

  it('applies expanded class when expanded', () => {
    const expandedData = { ...mockNodeData, isExpanded: true };
    const expandedProps = { ...mockNodeProps, data: expandedData };
    const { container } = render(<MultiNode {...expandedProps} />);
    const multiNode = container.querySelector('.multiNode');
    
    expect(multiNode).toHaveClass('expanded');
  });

  it('renders expander button', () => {
    render(<MultiNode {...mockNodeProps} />);
    
    const expanderButton = screen.getByTitle('Развернуть узел');
    expect(expanderButton).toBeInTheDocument();
  });

  it('changes expander button title when expanded', () => {
    const expandedData = { ...mockNodeData, isExpanded: true };
    const expandedProps = { ...mockNodeProps, data: expandedData };
    
    render(<MultiNode {...expandedProps} />);
    
    const expanderButton = screen.getByTitle('Свернуть узел');
    expect(expanderButton).toBeInTheDocument();
  });
});