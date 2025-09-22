/**
 * Performance optimization utilities
 */

import { debounce, throttle } from 'lodash';
import { LRUCache } from 'lru-cache';

/**
 * Create a memoized function with LRU cache
 */
export function memoizeWithLRU<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    max?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const {
    max = 100,
    ttl = 1000 * 60 * 5, // 5 minutes
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;

  const cache = new LRUCache<string, ReturnType<T>>({
    max,
    ttl
  });

  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback to setTimeout
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    } as IdleDeadline);
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(handle: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Virtual list controller for large lists
 */
export class VirtualListController<T> {
  private items: T[] = [];
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;
  private scrollTop: number = 0;

  constructor(options: {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }) {
    this.items = options.items;
    this.itemHeight = options.itemHeight;
    this.containerHeight = options.containerHeight;
    this.overscan = options.overscan || 3;
  }

  updateScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  updateContainerHeight(height: number): void {
    this.containerHeight = height;
  }

  updateItems(items: T[]): void {
    this.items = items;
  }

  getVisibleRange(): { start: number; end: number; items: T[] } {
    const visibleStart = Math.floor(this.scrollTop / this.itemHeight);
    const visibleEnd = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);

    const start = Math.max(0, visibleStart - this.overscan);
    const end = Math.min(this.items.length, visibleEnd + this.overscan);

    return {
      start,
      end,
      items: this.items.slice(start, end)
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  getOffsetTop(index: number): number {
    return index * this.itemHeight;
  }
}

/**
 * Batch DOM updates
 */
export class DOMBatcher {
  private reads: Array<() => void> = [];
  private writes: Array<() => void> = [];
  private scheduled = false;

  read(fn: () => void): void {
    this.reads.push(fn);
    this.schedule();
  }

  write(fn: () => void): void {
    this.writes.push(fn);
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;

    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  private flush(): void {
    const reads = this.reads.slice();
    const writes = this.writes.slice();

    this.reads.length = 0;
    this.writes.length = 0;
    this.scheduled = false;

    // Execute reads first
    reads.forEach(fn => fn());
    // Then writes
    writes.forEach(fn => fn());
  }
}

/**
 * Lazy load images with intersection observer
 */
export class LazyImageLoader {
  private observer: IntersectionObserver;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options: {
    rootMargin?: string;
    threshold?: number;
  } = {}) {
    const { rootMargin = '50px', threshold = 0.01 } = options;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
          }
        });
      },
      { rootMargin, threshold }
    );
  }

  observe(img: HTMLImageElement): void {
    if (img.dataset.src) {
      this.images.add(img);
      this.observer.observe(img);
    }
  }

  unobserve(img: HTMLImageElement): void {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      this.unobserve(img);
    }
  }

  disconnect(): void {
    this.observer.disconnect();
    this.images.clear();
  }
}

/**
 * Web Worker pool for CPU-intensive tasks
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private busy: Set<Worker> = new Set();

  constructor(
    workerScript: string,
    poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
  }

  execute<T = any>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.getIdleWorker();

      if (worker) {
        this.runTask(worker, data, resolve, reject);
      } else {
        this.queue.push({ data, resolve, reject });
      }
    });
  }

  private getIdleWorker(): Worker | null {
    for (const worker of this.workers) {
      if (!this.busy.has(worker)) {
        return worker;
      }
    }
    return null;
  }

  private runTask(
    worker: Worker,
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  ): void {
    this.busy.add(worker);

    const handleMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.busy.delete(worker);

      resolve(e.data);
      this.processQueue();
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.busy.delete(worker);

      reject(e);
      this.processQueue();
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(data);
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    const worker = this.getIdleWorker();
    if (worker) {
      const task = this.queue.shift()!;
      this.runTask(worker, task.data, task.resolve, task.reject);
    }
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.busy.clear();
  }
}

/**
 * Optimize React re-renders
 */
export const optimizeReRender = {
  // Debounced state setter
  createDebouncedSetter: <T>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    delay: number = 300
  ) => {
    return debounce(setter, delay);
  },

  // Throttled event handler
  createThrottledHandler: <T extends (...args: any[]) => any>(
    handler: T,
    delay: number = 100
  ): T => {
    return throttle(handler, delay) as T;
  },

  // Batch state updates
  batchUpdates: (updates: Array<() => void>) => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
};

/**
 * Memory management utilities
 */
export const memoryManager = {
  // Clear unused objects
  clearCache: (cache: Map<any, any>, maxSize: number = 100) => {
    if (cache.size > maxSize) {
      const entriesToDelete = cache.size - maxSize;
      const keys = Array.from(cache.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        cache.delete(keys[i]);
      }
    }
  },

  // Monitor memory usage
  getMemoryInfo: (): { usedJSHeapSize: number; totalJSHeapSize: number; limit: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Trigger garbage collection (if exposed)
  forceGC: () => {
    if (window.gc) {
      window.gc();
    }
  }
};

/**
 * Network optimization
 */
export const networkOptimizer = {
  // Batch API requests
  createBatchRequester: <T, R>(
    batchFn: (items: T[]) => Promise<R[]>,
    delay: number = 50,
    maxBatchSize: number = 10
  ) => {
    let queue: Array<{ item: T; resolve: (value: R) => void; reject: (error: any) => void }> = [];
    let timeout: NodeJS.Timeout | null = null;

    const flush = async () => {
      if (queue.length === 0) return;

      const batch = queue.splice(0, maxBatchSize);
      const items = batch.map(b => b.item);

      try {
        const results = await batchFn(items);
        batch.forEach((b, i) => b.resolve(results[i]));
      } catch (error) {
        batch.forEach(b => b.reject(error));
      }

      if (queue.length > 0) {
        flush();
      }
    };

    return (item: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        queue.push({ item, resolve, reject });

        if (timeout) clearTimeout(timeout);

        if (queue.length >= maxBatchSize) {
          flush();
        } else {
          timeout = setTimeout(flush, delay);
        }
      });
    };
  },

  // Connection pooling
  createConnectionPool: (maxConnections: number = 6) => {
    let activeConnections = 0;
    const queue: Array<() => void> = [];

    const acquire = (): Promise<void> => {
      return new Promise((resolve) => {
        if (activeConnections < maxConnections) {
          activeConnections++;
          resolve();
        } else {
          queue.push(resolve);
        }
      });
    };

    const release = () => {
      activeConnections--;
      const next = queue.shift();
      if (next) {
        activeConnections++;
        next();
      }
    };

    return { acquire, release };
  }
};