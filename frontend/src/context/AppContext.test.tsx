import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppProvider, useApp } from './AppContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test component that uses the context
const TestComponent = () => {
  const { state, fetchBots, saveBot, deleteBot } = useApp();
  
  return (
    <div>
      <div data-testid="loading">{state.loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{state.error || 'No Error'}</div>
      <div data-testid="bots-count">{state.bots.length}</div>
      <button onClick={fetchBots}>Fetch Bots</button>
      <button onClick={() => saveBot({ name: 'Test Bot' })}>Save Bot</button>
      <button onClick={() => deleteBot('test-id')}>Delete Bot</button>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('provides initial state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    expect(screen.getByTestId('bots-count')).toHaveTextContent('0');
  });

  it('fetches bots successfully', async () => {
    const mockBots = [
      { id: '1', name: 'Bot 1', status: 'active', stats: { messagesProcessed: 10, activeUsers: 5 } },
      { id: '2', name: 'Bot 2', status: 'draft', stats: { messagesProcessed: 0, activeUsers: 0 } }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBots
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const fetchButton = screen.getByText('Fetch Bots');
    fetchButton.click();

    // Should show loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('bots-count')).toHaveTextContent('2');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/bots');
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const fetchButton = screen.getByText('Fetch Bots');
    fetchButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
  });

  it('saves bot successfully', async () => {
    const mockBot = { id: '1', name: 'Test Bot', status: 'draft' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBot
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const saveButton = screen.getByText('Save Bot');
    saveButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('bots-count')).toHaveTextContent('1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/bots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Bot' })
    });
  });

  it('updates existing bot', async () => {
    const existingBot = { id: '1', name: 'Existing Bot', status: 'active' };
    const updatedBot = { id: '1', name: 'Updated Bot', status: 'active' };

    // First add a bot
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => existingBot
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const saveButton = screen.getByText('Save Bot');
    saveButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('bots-count')).toHaveTextContent('1');
    });

    // Then update it
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedBot
    });

    const { rerender } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Simulate updating existing bot
    const TestComponentUpdate = () => {
      const { saveBot } = useApp();
      return (
        <button onClick={() => saveBot({ id: '1', name: 'Updated Bot' })}>
          Update Bot
        </button>
      );
    };

    rerender(
      <AppProvider>
        <TestComponentUpdate />
      </AppProvider>
    );

    const updateButton = screen.getByText('Update Bot');
    updateButton.click();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith('/api/bots/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', name: 'Updated Bot' })
      });
    });
  });

  it('deletes bot successfully', async () => {
    // First add a bot
    const mockBot = { id: 'test-id', name: 'Test Bot', status: 'draft' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBot
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const saveButton = screen.getByText('Save Bot');
    saveButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('bots-count')).toHaveTextContent('1');
    });

    // Then delete it
    mockFetch.mockResolvedValueOnce({
      ok: true
    });

    const deleteButton = screen.getByText('Delete Bot');
    deleteButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('bots-count')).toHaveTextContent('0');
    });

    expect(mockFetch).toHaveBeenLastCalledWith('/api/bots/test-id', {
      method: 'DELETE'
    });
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useApp must be used within an AppProvider');

    consoleSpy.mockRestore();
  });
});