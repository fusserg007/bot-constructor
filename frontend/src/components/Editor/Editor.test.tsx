import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { AppProvider } from '../../context/AppContext';
import Editor from './Editor';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock alert
global.alert = vi.fn();

const renderEditor = (initialRoute = '/editor') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppProvider>
        <ReactFlowProvider>
          <Editor />
        </ReactFlowProvider>
      </AppProvider>
    </MemoryRouter>
  );
};

describe('Editor Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it('renders editor interface', () => {
    renderEditor();

    expect(screen.getByText('Создание нового бота')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
    expect(screen.getByText('Назад к дашборду')).toBeInTheDocument();
  });

  it('loads existing bot when botId is provided', async () => {
    const mockBot = {
      id: 'test-bot-1',
      name: 'Test Bot',
      configuration: {
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-message',
            position: { x: 100, y: 100 },
            data: { label: 'Test Trigger' }
          }
        ],
        edges: []
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBot
    });

    renderEditor('/editor/test-bot-1');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bots/test-bot-1');
    });

    expect(screen.getByText('Редактирование бота')).toBeInTheDocument();
  });

  it('saves bot with validation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-bot', name: 'New Bot' })
    });

    renderEditor();

    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bots', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }));
    });

    expect(global.alert).toHaveBeenCalledWith('Бот успешно сохранен!');
  });

  it('shows validation errors', async () => {
    renderEditor();

    // Try to save without any trigger nodes (should fail validation)
    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Схема должна содержать хотя бы один триггер')
      );
    });

    // Should not call API
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles save errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderEditor();

    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Ошибка при сохранении бота');
    });
  });

  it('shows loading state during save', async () => {
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'new-bot' })
        }), 100)
      )
    );

    renderEditor();

    const saveButton = screen.getByText('Сохранить');
    fireEvent.click(saveButton);

    // Should show loading state
    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('integrates with NodeLibrary for adding nodes', () => {
    renderEditor();

    // Should show NodeLibrary
    expect(screen.getByText('Библиотека узлов')).toBeInTheDocument();
    expect(screen.getByText('Триггеры')).toBeInTheDocument();
    
    // Should show PropertyPanel
    expect(screen.getByText('Выберите узел')).toBeInTheDocument();
  });
});