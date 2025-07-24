import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ValidationPanel from './ValidationPanel';
import type { ValidationError } from '../../../utils/SchemaValidator';

describe('ValidationPanel', () => {
  const mockErrors: ValidationError[] = [
    {
      type: 'MISSING_NODE_ID',
      message: 'Отсутствует ID узла',
      severity: 'error',
      nodeId: 'node-1'
    },
    {
      type: 'INVALID_CATEGORY',
      message: 'Недопустимая категория узла',
      severity: 'error',
      nodeId: 'node-2'
    }
  ];

  const mockWarnings: ValidationError[] = [
    {
      type: 'ISOLATED_NODE',
      message: 'Узел изолирован и не участвует в логике бота',
      severity: 'warning',
      nodeId: 'node-3'
    },
    {
      type: 'NO_TRIGGERS',
      message: 'Схема не содержит триггеров',
      severity: 'warning'
    }
  ];

  it('should not render when no errors or warnings', () => {
    const { container } = render(<ValidationPanel errors={[]} warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render errors correctly', () => {
    render(<ValidationPanel errors={mockErrors} warnings={[]} />);
    
    expect(screen.getByText('Валидация схемы')).toBeInTheDocument();
    expect(screen.getByText('❌ Ошибки (2)')).toBeInTheDocument();
    expect(screen.getByText('Отсутствует ID узла')).toBeInTheDocument();
    expect(screen.getByText('Недопустимая категория узла')).toBeInTheDocument();
  });

  it('should render warnings correctly', () => {
    render(<ValidationPanel errors={[]} warnings={mockWarnings} />);
    
    expect(screen.getByText('Валидация схемы')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Предупреждения (2)')).toBeInTheDocument();
    expect(screen.getByText('Узел изолирован и не участвует в логике бота')).toBeInTheDocument();
    expect(screen.getByText('Схема не содержит триггеров')).toBeInTheDocument();
  });

  it('should render both errors and warnings', () => {
    render(<ValidationPanel errors={mockErrors} warnings={mockWarnings} />);
    
    expect(screen.getByText('❌ Ошибки (2)')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Предупреждения (2)')).toBeInTheDocument();
    expect(screen.getByText(/Всего проблем: 4/)).toBeInTheDocument();
    expect(screen.getByText(/Есть критические ошибки/)).toBeInTheDocument();
  });

  it('should display node IDs when available', () => {
    render(<ValidationPanel errors={mockErrors} warnings={[]} />);
    
    expect(screen.getByText('(узел: node-1)')).toBeInTheDocument();
    expect(screen.getByText('(узел: node-2)')).toBeInTheDocument();
  });

  it('should display connection IDs when available', () => {
    const errorsWithConnection: ValidationError[] = [
      {
        type: 'INVALID_CONNECTION',
        message: 'Недопустимое соединение',
        severity: 'error',
        connectionId: 'edge-1'
      }
    ];

    render(<ValidationPanel errors={errorsWithConnection} warnings={[]} />);
    
    expect(screen.getByText('(соединение: edge-1)')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<ValidationPanel errors={mockErrors} warnings={[]} onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not render close button when onClose is not provided', () => {
    render(<ValidationPanel errors={mockErrors} warnings={[]} />);
    
    expect(screen.queryByText('✕')).not.toBeInTheDocument();
  });

  it('should show correct summary for warnings only', () => {
    render(<ValidationPanel errors={[]} warnings={mockWarnings} />);
    
    expect(screen.getByText(/Всего проблем: 2/)).toBeInTheDocument();
    expect(screen.queryByText(/Есть критические ошибки/)).not.toBeInTheDocument();
  });

  it('should display error types in title attribute', () => {
    render(<ValidationPanel errors={mockErrors} warnings={[]} />);
    
    const errorItems = screen.getAllByTitle(/Тип:/);
    expect(errorItems).toHaveLength(2);
    expect(errorItems[0]).toHaveAttribute('title', 'Тип: MISSING_NODE_ID');
    expect(errorItems[1]).toHaveAttribute('title', 'Тип: INVALID_CATEGORY');
  });
});