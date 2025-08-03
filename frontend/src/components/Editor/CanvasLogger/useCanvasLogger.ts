import { useCallback } from 'react';
import { canvasLogger } from './CanvasLogger';
import { CanvasLogAction } from './types';

/**
 * Хук для удобного использования canvas logger в React компонентах
 */
export const useCanvasLogger = () => {
  const log = useCallback((
    action: CanvasLogAction,
    details: string,
    options?: {
      nodeId?: string;
      sourceNodeId?: string;
      targetNodeId?: string;
      error?: boolean;
      metadata?: Record<string, any>;
    }
  ) => {
    canvasLogger.log(action, details, options);
  }, []);

  // Удобные методы для часто используемых действий
  const logNodeExpand = useCallback((nodeId: string) => {
    canvasLogger.logNodeExpand(nodeId);
  }, []);

  const logNodeCollapse = useCallback((nodeId: string) => {
    canvasLogger.logNodeCollapse(nodeId);
  }, []);

  const logDragStart = useCallback((nodeType: string, source: string = 'library') => {
    canvasLogger.logDragStart(nodeType, source);
  }, []);

  const logDropSuccess = useCallback((nodeType: string, targetNodeId?: string) => {
    canvasLogger.logDropSuccess(nodeType, targetNodeId);
  }, []);

  const logDropFailed = useCallback((nodeType: string, reason: string) => {
    canvasLogger.log('DROP_FAILED', `${nodeType} drop failed: ${reason}`, { error: true });
  }, []);

  const logConnectionCreate = useCallback((sourceNodeId: string, targetNodeId: string) => {
    canvasLogger.logConnectionCreate(sourceNodeId, targetNodeId);
  }, []);

  const logConnectionDelete = useCallback((sourceNodeId: string, targetNodeId: string) => {
    canvasLogger.log('CONNECTION_DELETE', 'Connection deleted', { sourceNodeId, targetNodeId });
  }, []);

  const logNodeAdd = useCallback((nodeId: string, nodeType: string) => {
    canvasLogger.log('NODE_ADD', `${nodeType} node added`, { nodeId });
  }, []);

  const logNodeDelete = useCallback((nodeId: string, nodeType: string) => {
    canvasLogger.log('NODE_DELETE', `${nodeType} node deleted`, { nodeId });
  }, []);

  const logNodeUpdate = useCallback((nodeId: string, property: string, value: any) => {
    canvasLogger.log('NODE_UPDATE', `Node property updated: ${property}`, { 
      nodeId, 
      metadata: { property, value } 
    });
  }, []);

  const logValidationError = useCallback((nodeId: string, error: string) => {
    canvasLogger.logValidationError(nodeId, error);
  }, []);

  const logValidationWarning = useCallback((nodeId: string, warning: string) => {
    canvasLogger.log('VALIDATION_WARNING', warning, { nodeId });
  }, []);

  const logSaveStart = useCallback(() => {
    canvasLogger.log('SAVE_START', 'Schema save started');
  }, []);

  const logSaveSuccess = useCallback((details: string = 'Schema saved successfully') => {
    canvasLogger.logSaveOperation(true, details);
  }, []);

  const logSaveError = useCallback((error: string) => {
    canvasLogger.logSaveOperation(false, `Save failed: ${error}`);
  }, []);

  const logLibraryOpen = useCallback(() => {
    canvasLogger.log('LIBRARY_OPEN', 'Node library opened');
  }, []);

  const logLibraryClose = useCallback(() => {
    canvasLogger.log('LIBRARY_CLOSE', 'Node library closed');
  }, []);

  const logGroupCreate = useCallback((groupId: string, nodeIds: string[]) => {
    canvasLogger.log('GROUP_CREATE', `Group created with ${nodeIds.length} nodes`, {
      metadata: { groupId, nodeIds }
    });
  }, []);

  const logGroupDelete = useCallback((groupId: string) => {
    canvasLogger.log('GROUP_DELETE', 'Group deleted', {
      metadata: { groupId }
    });
  }, []);

  return {
    log,
    logNodeExpand,
    logNodeCollapse,
    logDragStart,
    logDropSuccess,
    logDropFailed,
    logConnectionCreate,
    logConnectionDelete,
    logNodeAdd,
    logNodeDelete,
    logNodeUpdate,
    logValidationError,
    logValidationWarning,
    logSaveStart,
    logSaveSuccess,
    logSaveError,
    logLibraryOpen,
    logLibraryClose,
    logGroupCreate,
    logGroupDelete
  };
};