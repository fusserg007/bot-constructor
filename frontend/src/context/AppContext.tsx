import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Типы для состояния приложения
interface Bot {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'paused';
  stats: {
    messagesProcessed: number;
    activeUsers: number;
    lastActivity: string;
  };
  configuration?: {
    nodes: any[];
    edges: any[];
    variables: Record<string, any>;
    settings: Record<string, any>;
  };
}

interface AppState {
  bots: Bot[];
  currentBot: Bot | null;
  loading: boolean;
  error: string | null;
}

// Типы действий
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOTS'; payload: Bot[] }
  | { type: 'SET_CURRENT_BOT'; payload: Bot | null }
  | { type: 'ADD_BOT'; payload: Bot }
  | { type: 'UPDATE_BOT'; payload: Bot }
  | { type: 'DELETE_BOT'; payload: string };

// Начальное состояние
const initialState: AppState = {
  bots: [],
  currentBot: null,
  loading: false,
  error: null,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_BOTS':
      return { ...state, bots: action.payload };
    
    case 'SET_CURRENT_BOT':
      return { ...state, currentBot: action.payload };
    
    case 'ADD_BOT':
      return { ...state, bots: [...state.bots, action.payload] };
    
    case 'UPDATE_BOT':
      return {
        ...state,
        bots: state.bots.map(bot => 
          bot.id === action.payload.id ? action.payload : bot
        ),
        currentBot: state.currentBot?.id === action.payload.id ? action.payload : state.currentBot
      };
    
    case 'DELETE_BOT':
      return {
        ...state,
        bots: state.bots.filter(bot => bot.id !== action.payload),
        currentBot: state.currentBot?.id === action.payload ? null : state.currentBot
      };
    
    default:
      return state;
  }
};

// Контекст
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // API методы
  fetchBots: () => Promise<void>;
  fetchBot: (id: string) => Promise<void>;
  saveBot: (bot: Partial<Bot>) => Promise<Bot>;
  deleteBot: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider компонент
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // API методы
  const fetchBots = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch('/api/bots');
      if (!response.ok) {
        throw new Error('Failed to fetch bots');
      }
      const result = await response.json();
      const bots = result.success && result.data && Array.isArray(result.data.bots) ? result.data.bots : [];
      dispatch({ type: 'SET_BOTS', payload: bots });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchBot = async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(`/api/bots/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bot');
      }
      const bot = await response.json();
      dispatch({ type: 'SET_CURRENT_BOT', payload: bot });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveBot = async (botData: Partial<Bot>): Promise<Bot> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const url = botData.id ? `/api/bots/${botData.id}` : '/api/bots';
      const method = botData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(botData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save bot');
      }
      
      const savedBot = await response.json();
      
      if (botData.id) {
        dispatch({ type: 'UPDATE_BOT', payload: savedBot });
      } else {
        dispatch({ type: 'ADD_BOT', payload: savedBot });
      }
      
      return savedBot;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteBot = async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete bot');
      }
      
      dispatch({ type: 'DELETE_BOT', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    fetchBots,
    fetchBot,
    saveBot,
    deleteBot,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook для использования контекста
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export type { Bot, AppState };