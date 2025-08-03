import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionPorts from './ConnectionPorts';
import { ConnectionPortData } from './types';

// Mock useCanvasLogger
jest.mock('../CanvasLogger/useCanvasLogger', () => ({
  useCanvasLogger: () => ({
    log: jest.fn()
  })
}));

const mockPorts: ConnectionPortData[] = [
  {
    id: 'input-1',
    type: 'input',
    dataType: 'control',
    label: 'Вход',
    isConnected: false,
    isAvailable: true,
    position: 'left',
    tooltip: 'Входящее подключение'
  },
  {
    id: 'output-1',
    type: 'output',
    dataType: 'control',
    label: 'Выход',
    isConnected: true,
    isAvailable: false,
    position: 'right',
    tooltip: 'Исходящее подключение'
  },
  {
    id: 'error-1',
    type: 'output',
    dataType: 'error',
    label: 'Ошибка',
    isConnected: false,
    isAvailable: false,
    position: 'bottom',
    tooltip: 'Выход ошибки'
  }
];

describe('ConnectionPorts', () => {
  const mockOnPortHover = jest.fn();
  const mockOnPortClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all ports correctly', () => {
    render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    // Проверяем, что все порты отрендерились
    expect(screen.getByTitle('Входящее подключение')).toBeInTheDocument();
    expect(screen.getByTitle('Исходящее подключение')).toBeInTheDocument();
    expect(screen.getByTitle('Выход ошибки')).toBeInTheDocument();
  });

  it('applies correct classes based on port status', () => {
    const { container } = render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const availablePort = container.querySelector('[data-port-id="input-1"]');
    const connectedPort = container.querySelector('[data-port-id="output-1"]');
    const unavailablePort = container.querySelector('[data-port-id="error-1"]');

    expect(availablePort).toHaveClass('available');
    expect(connectedPort).toHaveClass('connected');
    expect(unavailablePort).toHaveClass('unavailable');
  });

  it('calls onPortHover when hovering over port', () => {
    render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const port = screen.getByTitle('Входящее подключение');
    
    fireEvent.mouseEnter(port);
    expect(mockOnPortHover).toHaveBeenCalledWith('input-1', true);

    fireEvent.mouseLeave(port);
    expect(mockOnPortHover).toHaveBeenCalledWith('input-1', false);
  });

  it('calls onPortClick when clicking available port', () => {
    render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const availablePort = screen.getByTitle('Входящее подключение');
    fireEvent.click(availablePort);
    
    expect(mockOnPortClick).toHaveBeenCalledWith('input-1');
  });

  it('does not call onPortClick when clicking unavailable port', () => {
    render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const unavailablePort = screen.getByTitle('Выход ошибки');
    fireEvent.click(unavailablePort);
    
    expect(mockOnPortClick).not.toHaveBeenCalled();
  });

  it('shows connection indicator for connected ports', () => {
    const { container } = render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const connectedPort = container.querySelector('[data-port-id="output-1"]');
    const connectionIndicator = connectedPort?.querySelector('.connectionIndicator');
    
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('shows port label on hover', () => {
    render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const port = screen.getByTitle('Входящее подключение');
    fireEvent.mouseEnter(port);
    
    expect(screen.getByText('Вход')).toBeInTheDocument();
  });

  it('renders correct icons for different data types', () => {
    const { container } = render(
      <ConnectionPorts
        nodeId="test-node"
        ports={mockPorts}
        onPortHover={mockOnPortHover}
        onPortClick={mockOnPortClick}
      />
    );

    const controlPorts = container.querySelectorAll('[data-port-type="control"]');
    const errorPorts = container.querySelectorAll('[data-port-type="error"]');

    expect(controlPorts).toHaveLength(2);
    expect(errorPorts).toHaveLength(1);
  });
});