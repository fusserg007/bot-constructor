import { useState, useCallback } from 'react';
import { useNotifications } from '../components/Notifications/NotificationSystem';

export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface AsyncOperationState {
  isLoading: boolean;
  error: Error | null;
  data: any;
}

export const useAsyncOperation = () => {
  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
    data: null
  });

  const { showSuccess, showError } = useNotifications();

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | null> => {
    const {
      successMessage = 'Операция выполнена успешно',
      errorMessage = 'Произошла ошибка при выполнении операции',
      showSuccessNotification = true,
      showErrorNotification = true,
      onSuccess,
      onError
    } = options;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await operation();
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        data: result,
        error: null 
      }));

      if (showSuccessNotification) {
        showSuccess(successMessage);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorObj 
      }));

      if (showErrorNotification) {
        showError(errorMessage, errorObj.message);
      }

      if (onError) {
        onError(errorObj);
      }

      return null;
    }
  }, [showSuccess, showError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
};

// Специализированные хуки для частых операций
export const useSaveOperation = () => {
  const asyncOp = useAsyncOperation();

  const save = useCallback(async <T>(
    saveFunction: () => Promise<T>,
    options: Omit<AsyncOperationOptions, 'successMessage' | 'errorMessage'> = {}
  ) => {
    return asyncOp.execute(saveFunction, {
      successMessage: 'Данные сохранены',
      errorMessage: 'Ошибка при сохранении',
      ...options
    });
  }, [asyncOp]);

  return {
    ...asyncOp,
    save
  };
};

export const useLoadOperation = () => {
  const asyncOp = useAsyncOperation();

  const load = useCallback(async <T>(
    loadFunction: () => Promise<T>,
    options: Omit<AsyncOperationOptions, 'successMessage' | 'showSuccessNotification'> = {}
  ) => {
    return asyncOp.execute(loadFunction, {
      showSuccessNotification: false, // обычно не показываем уведомление при загрузке
      errorMessage: 'Ошибка при загрузке данных',
      ...options
    });
  }, [asyncOp]);

  return {
    ...asyncOp,
    load
  };
};

export const useDeleteOperation = () => {
  const asyncOp = useAsyncOperation();

  const deleteItem = useCallback(async <T>(
    deleteFunction: () => Promise<T>,
    options: Omit<AsyncOperationOptions, 'successMessage' | 'errorMessage'> = {}
  ) => {
    return asyncOp.execute(deleteFunction, {
      successMessage: 'Элемент удален',
      errorMessage: 'Ошибка при удалении',
      ...options
    });
  }, [asyncOp]);

  return {
    ...asyncOp,
    delete: deleteItem
  };
};