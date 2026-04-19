import { useCallback, useRef, useEffect } from 'react';
import workerManager from '../utils/workerManager';

export const useWorker = (workerType) => {
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Execute worker task
  const executeTask = useCallback(async (params) => {
    // Cancel previous task if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await workerManager.executeTask(workerType, params);
      
      // Check if task was cancelled
      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Task cancelled');
      }
      
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'Task cancelled') {
        throw new Error('Task cancelled');
      }
      throw error;
    }
  }, [workerType]);

  // Cancel current task
  const cancelTask = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return workerManager.getCacheStats();
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    workerManager.clearCache();
  }, []);

  return {
    executeTask,
    cancelTask,
    getCacheStats,
    clearCache,
  };
};

// Specialized hook for map canvas operations
export const useMapCanvasWorker = () => {
  const { executeTask, cancelTask } = useWorker('mapCanvas');

  const processImage = useCallback(async (imageData, options) => {
    const params = {
      operation: 'processImage',
      imageData,
      options,
    };

    return executeTask(params);
  }, [executeTask]);

  const generateMap = useCallback(async (pixelData, settings) => {
    const params = {
      operation: 'generateMap',
      pixelData,
      settings,
    };

    return executeTask(params);
  }, [executeTask]);

  return {
    processImage,
    generateMap,
    cancelTask,
  };
};

// Specialized hook for NBT operations
export const useNBTWorker = () => {
  const { executeTask, cancelTask } = useWorker('nbt');

  const parseNBT = useCallback(async (nbtData) => {
    const params = {
      operation: 'parse',
      nbtData,
    };

    return executeTask(params);
  }, [executeTask]);

  const generateNBT = useCallback(async (data, options) => {
    const params = {
      operation: 'generate',
      data,
      options,
    };

    return executeTask(params);
  }, [executeTask]);

  const validateNBT = useCallback(async (nbtData) => {
    const params = {
      operation: 'validate',
      nbtData,
    };

    return executeTask(params);
  }, [executeTask]);

  return {
    parseNBT,
    generateNBT,
    validateNBT,
    cancelTask,
  };
};
