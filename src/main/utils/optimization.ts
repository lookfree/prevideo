/**
 * Main process optimization utilities
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra';

/**
 * Memory optimization for main process
 */
export class MemoryOptimizer {
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 500 * 1024 * 1024; // 500MB

  start(): void {
    // Run garbage collection periodically
    this.gcInterval = setInterval(() => {
      this.checkMemory();
    }, 60000); // Every minute

    // Monitor memory usage
    this.monitorMemory();
  }

  stop(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  private checkMemory(): void {
    const usage = process.memoryUsage();
    if (usage.heapUsed > this.memoryThreshold) {
      this.optimize();
    }
  }

  private optimize(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear module cache for non-essential modules
    this.clearModuleCache();

    // Clear any temporary data
    this.clearTempData();
  }

  private clearModuleCache(): void {
    const essentialModules = ['electron', 'path', 'fs', 'url'];
    Object.keys(require.cache).forEach((key) => {
      const isEssential = essentialModules.some(mod => key.includes(mod));
      if (!isEssential && key.includes('node_modules')) {
        delete require.cache[key];
      }
    });
  }

  private async clearTempData(): Promise<void> {
    const tempDir = app.getPath('temp');
    const appTempDir = path.join(tempDir, 'prevideo-temp');

    try {
      const files = await fs.readdir(appTempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(appTempDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      // Temp directory might not exist
    }
  }

  private monitorMemory(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);

      if (usedMB > 400) {
        console.warn(`High memory usage: ${usedMB}MB / ${totalMB}MB`);
      }
    }, 30000); // Every 30 seconds
  }

  getMemoryInfo(): {
    used: number;
    total: number;
    percentage: number;
  } {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      percentage: (usage.heapUsed / usage.heapTotal) * 100
    };
  }
}

/**
 * File system optimization
 */
export class FileSystemOptimizer {
  private writeQueue: Map<string, { data: any; resolve: () => void; reject: (error: any) => void }> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private flushDelay: number = 1000) {}

  start(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushDelay);
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Flush remaining writes
  }

  /**
   * Batch write operations
   */
  async batchWrite(filePath: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeQueue.set(filePath, { data, resolve, reject });

      if (this.writeQueue.size >= 10) {
        this.flush();
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.size === 0) return;

    const writes = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();

    const results = await Promise.allSettled(
      writes.map(([filePath, { data }]) => fs.outputJson(filePath, data))
    );

    results.forEach((result, index) => {
      const [, { resolve, reject }] = writes[index];
      if (result.status === 'fulfilled') {
        resolve();
      } else {
        reject(result.reason);
      }
    });
  }

  /**
   * Stream large files
   */
  async streamCopy(source: string, destination: string, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const stats = fs.statSync(source);
      const totalSize = stats.size;
      let copiedSize = 0;

      const readStream = fs.createReadStream(source);
      const writeStream = fs.createWriteStream(destination);

      readStream.on('data', (chunk) => {
        copiedSize += chunk.length;
        if (onProgress) {
          onProgress((copiedSize / totalSize) * 100);
        }
      });

      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      readStream.pipe(writeStream);
    });
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(directory: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;

    try {
      const files = await fs.readdir(directory);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }

    return deletedCount;
  }
}

/**
 * Process optimization
 */
export class ProcessOptimizer {
  private childProcesses: Map<string, any> = new Map();
  private maxProcesses = 3;

  /**
   * Limit concurrent processes
   */
  async executeWithLimit<T>(
    id: string,
    fn: () => Promise<T>
  ): Promise<T> {
    while (this.childProcesses.size >= this.maxProcesses) {
      await this.waitForSlot();
    }

    this.childProcesses.set(id, true);

    try {
      const result = await fn();
      this.childProcesses.delete(id);
      return result;
    } catch (error) {
      this.childProcesses.delete(id);
      throw error;
    }
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.childProcesses.size < this.maxProcesses) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Kill zombie processes
   */
  cleanupZombieProcesses(): void {
    this.childProcesses.forEach((process, id) => {
      if (process && process.killed === false) {
        try {
          process.kill();
        } catch (error) {
          console.error(`Failed to kill process ${id}:`, error);
        }
      }
    });
    this.childProcesses.clear();
  }

  getActiveProcessCount(): number {
    return this.childProcesses.size;
  }
}

/**
 * Cache optimization
 */
export class CacheOptimizer {
  private cache: Map<string, { data: any; timestamp: number; hits: number }> = new Map();
  private maxSize = 100;
  private ttl = 60 * 60 * 1000; // 1 hour

  set(key: string, data: any): void {
    // Remove least recently used if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    this.cache.forEach((entry) => {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1;
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    };
  }
}

/**
 * Resource pool for reusable objects
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (resource: T) => void;
  private maxSize: number;

  constructor(options: {
    factory: () => T;
    reset: (resource: T) => void;
    initialSize?: number;
    maxSize?: number;
  }) {
    this.factory = options.factory;
    this.reset = options.reset;
    this.maxSize = options.maxSize || 10;

    // Pre-populate pool
    const initialSize = options.initialSize || 2;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  acquire(): T {
    let resource = this.available.pop();

    if (!resource) {
      if (this.inUse.size < this.maxSize) {
        resource = this.factory();
      } else {
        throw new Error('Resource pool exhausted');
      }
    }

    this.inUse.add(resource);
    return resource;
  }

  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      throw new Error('Resource not from this pool');
    }

    this.inUse.delete(resource);
    this.reset(resource);
    this.available.push(resource);
  }

  drain(): void {
    this.available = [];
    this.inUse.clear();
  }

  getStats(): {
    available: number;
    inUse: number;
    total: number;
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

// Export singleton instances
export const memoryOptimizer = new MemoryOptimizer();
export const fileSystemOptimizer = new FileSystemOptimizer();
export const processOptimizer = new ProcessOptimizer();
export const cacheOptimizer = new CacheOptimizer();