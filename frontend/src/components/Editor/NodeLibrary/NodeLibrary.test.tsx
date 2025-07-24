import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NodeLibrary from './NodeLibrary';

describe('NodeLibrary', () => {
  it('renders all node categories', () => {
    render(<NodeLibrary />);
    
    expect(screen.getByText('Триггеры')).toBeInTheDocument();
    expect(screen.getByText('Действия')).toBeInTheDocument();
    expect(screen.getByText('Условия')).toBeInTheDocument();
    expect(screen.getByText('Данные')).toBeInTheDocument();
    expect(screen.getByText('Интеграции')).toBeInTheDocument();
    expect(screen.getByText('Сценарии')).toBeInTheDocument();
  });

  it('shows trigger nodes by default', () => {
    render(<NodeLibrary />);
    
    expect(screen.getByText('Сообщение')).toBeInTheDocument();
    expect(screen.getByText('Триггер на входящее сообщение')).toBeInTheDocument();
  });

  it('switches categories when clicked', () => {
    render(<NodeLibrary />);
    
    // Click on Actions category
    fireEvent.click(screen.getByText('Действия'));
    
    expect(screen.getByText('Отправить сообщение')).toBeInTheDocument();
    expect(screen.getByText('Отправка сообщения пользователю')).toBeInTheDocument();
  });

  it('filters nodes by search query', () => {
    render(<NodeLibrary />);
    
    const searchInput = screen.getByPlaceholderText('Поиск...');
    fireEvent.change(searchInput, { target: { value: 'сообщение' } });
    
    expect(screen.getByText('Сообщение')).toBeInTheDocument();
  });

  it('calls onNodeAdd when node is clicked', () => {
    const mockOnNodeAdd = vi.fn();
    render(<NodeLibrary onNodeAdd={mockOnNodeAdd} />);
    
    const nodeItem = screen.getByText('Сообщение').closest('.nodeItem');
    fireEvent.click(nodeItem!);
    
    expect(mockOnNodeAdd).toHaveBeenCalledWith('trigger-message');
  });

  it('supports drag and drop', () => {
    render(<NodeLibrary />);
    
    const nodeItem = screen.getByText('Сообщение').closest('.nodeItem');
    const dragStartEvent = new Event('dragstart', { bubbles: true });
    
    // Mock dataTransfer
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: {
        setData: vi.fn(),
        effectAllowed: '',
      },
    });
    
    fireEvent(nodeItem!, dragStartEvent);
    
    expect((dragStartEvent as any).dataTransfer.setData).toHaveBeenCalledWith(
      'application/reactflow',
      'trigger-message'
    );
  });
});