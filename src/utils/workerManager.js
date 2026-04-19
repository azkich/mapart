// Web Worker Manager with careful caching that doesn't affect calculation accuracy

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.workerCache = new Map();
    this.maxCacheSize = 100; // Limit cache size to prevent memory issues
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  // Create or get existing worker
  getWorker(workerType) {
    if (!this.workers.has(workerType)) {
      const worker = this.createWorker(workerType);
      this.workers.set(workerType, worker);
    }
    return this.workers.get(workerType);
  }

  // Create worker based on type
  createWorker(workerType) {
    switch (workerType) {
      case 'mapCanvas':
        return this.createMapCanvasWorker();
      case 'nbt':
        return this.createNBTWorker();
      default:
        throw new Error(`Unknown worker type: ${workerType}`);
    }
  }

  // Create map canvas worker
  createMapCanvasWorker() {
    // Import the worker code dynamically
    const workerCode = `
      importScripts('/static/js/mapCanvas.js');
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  // Create NBT worker
  createNBTWorker() {
    const workerCode = `
      importScripts('/static/js/nbt.js');
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  // Generate cache key for input parameters
  generateCacheKey(workerType, params) {
    // Create a deterministic key based on input parameters
    // Only cache parameters that don't affect calculation accuracy
    const cacheableParams = {
      ...params,
      // Remove any parameters that could affect precision
      timestamp: undefined, // Don't cache timestamps
      randomSeed: undefined, // Don't cache random seeds
    };
    
    return `${workerType}:${JSON.stringify(cacheableParams)}`;
  }

  // Check if result can be safely cached
  canCacheResult(workerType, params, result) {
    // Only cache results that are deterministic and don't affect precision
    if (workerType === 'mapCanvas') {
      // For map canvas, only cache if all parameters are cacheable
      return !params.timestamp && !params.randomSeed;
    }
    
    if (workerType === 'nbt') {
      // For NBT, be more conservative - only cache simple operations
      return params.operation === 'validate' || params.operation === 'parse';
    }
    
    return false;
  }

  // Get cached result if available
  getCachedResult(cacheKey) {
    const cached = this.workerCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.workerCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  // Cache result safely
  cacheResult(cacheKey, result) {
    // Limit cache size
    if (this.workerCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const oldestKey = this.workerCache.keys().next().value;
      this.workerCache.delete(oldestKey);
    }

    this.workerCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  // Execute worker task with careful caching
  async executeTask(workerType, params) {
    const cacheKey = this.generateCacheKey(workerType, params);
    
    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Execute worker task
    const worker = this.getWorker(workerType);
    const result = await this.executeWorkerTask(worker, params);

    // Cache result only if safe
    if (this.canCacheResult(workerType, params, result)) {
      this.cacheResult(cacheKey, result);
    }

    return result;
  }

  // Execute worker task
  executeWorkerTask(worker, params) {
    return new Promise((resolve, reject) => {
      const messageHandler = (event) => {
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      const errorHandler = (error) => {
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        reject(error);
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);

      // Add timestamp to prevent caching of time-sensitive operations
      const taskParams = {
        ...params,
        timestamp: Date.now()
      };

      worker.postMessage(taskParams);
    });
  }

  // Clear cache
  clearCache() {
    this.workerCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.workerCache.size,
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout
    };
  }

  // Terminate all workers
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.clearCache();
  }
}

// Singleton instance
const workerManager = new WorkerManager();

export default workerManager;
