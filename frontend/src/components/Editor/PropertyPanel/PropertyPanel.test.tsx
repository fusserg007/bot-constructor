import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Node } from 'reactflow';
import PropertyPanel from './PropertyPanel';

const mockNode: Node = {
  id: 'test-node-1',
  type: 'trigger-message',
  position: { x: 100, y: 200 },
  data: {
    label: 'Test Node',
    message: 'Hello World',
    enabled: true,
    tags: ['tag1', 'tag2']
  }
};

describe('PropertyPanel', () => {
  it('shows empty state when no node is selected', () => {
    render(<PropertyPanel selectedNode={null} />);
    
    expect(screen.getByText('Выберите узел')).toBeInTheDocument();
    expect(screen.getByText('Кликните на узел в редакторе, чтобы настроить его свойства')).toBeInTheDocument();
  });

  it('displays node properties when node is selected', () => {
    render(<PropertyPanel selectedNode={mockNode} />);
    
    expect(screen.getByText('Свойства узла')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-node-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('trigger-message')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Node')).toBeInTheDocument();
  });

  it('shows node position', () => {
    render(<PropertyPanel selectedNode={mockNode} />);
    
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });

  it('renders different input types for different data types', () => {
    render(<PropertyPanel selectedNode={mockNode} />);
    
    // String input
    expect(screen.getByDisplayValue('Hello World')).toBeInTheDocument();
    
    // Boolean checkbox
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    
    // Array as textarea
    const textarea = screen.getByDisplayValue('tag1\ntag2');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onNodeUpdate when input values change', () => {
    const mockOnNodeUpdate = vi.fn();
    render(<PropertyPanel selectedNode={mockNode} onNodeUpdate={mockOnNodeUpdate} />);
    
    const labelInput = screen.getByDisplayValue('Test Node');
    fireEvent.change(labelInput, { target: { value: 'Updated Node' } });
    
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('test-node-1', {
      ...mockNode.data,
      label: 'Updated Node'
    });
  });

  it('handles checkbox changes', () => {
    const mockOnNodeUpdate = vi.fn();
    render(<PropertyPanel selectedNode={mockNode} onNodeUpdate={mockOnNodeUpdate} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('test-node-1', {
      ...mockNode.data,
      enabled: false
    });
  });

  it('handles array input changes', () => {
    const mockOnNodeUpdate = vi.fn();
    render(<PropertyPanel selectedNode={mockNode} onNodeUpdate={mockOnNodeUpdate} />);
    
    const textarea = screen.getByDisplayValue('tag1\ntag2');
    fireEvent.change(textarea, { target: { value: 'tag1\ntag2\ntag3' } });
    
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('test-node-1', {
      ...mockNode.data,
      tags: ['tag1', 'tag2', 'tag3']
    });
  });
});