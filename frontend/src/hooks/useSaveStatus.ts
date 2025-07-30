import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  message: string | null;
  lastSaved: Date | null;
}

export const useSaveStatus = () => {
  const { saveBot: appSaveBot } = useApp();
  const [saveState, setSaveState] = useState<SaveState>({
    status: 'idle',
    message: null,
    lastSaved: null
  });

  const saveBot = useCallback(async (_botId: string, data: any) => {
    setSaveState({ status: 'saving', message: 'Сохранение...', lastSaved: null });
    
    try {
      await appSaveBot(data);
      const now = new Date();
      setSaveState({ 
        status: 'saved', 
        message: 'Сохранено успешно', 
        lastSaved: now 
      });
      
      // Автоматически сбрасываем статус через 2 секунды
      setTimeout(() => {
        setSaveState(prev => ({ ...prev, status: 'idle', message: null }));
      }, 2000);
    } catch (error: any) {
      setSaveState({ 
        status: 'error', 
        message: `Ошибка сохранения: ${error.message}`, 
        lastSaved: null 
      });
      
      // Сбрасываем ошибку через 5 секунд
      setTimeout(() => {
        setSaveState(prev => ({ ...prev, status: 'idle', message: null }));
      }, 5000);
    }
  }, [appSaveBot]);

  return {
    saveStatus: saveState.status,
    saveMessage: saveState.message,
    lastSaved: saveState.lastSaved,
    saveBot
  };
};