import { BrowserAdapter } from '../adapters/browser';
import { validateBrowserStorageResult } from '../lib/utils';
import { z } from 'zod';

export type StorageArea = 'local' | 'sync' | 'session';

export interface StorageGetOptions {
  area?: StorageArea;
  keys?: string | string[] | Record<string, unknown>;
}

export interface StorageSetOptions {
  area?: StorageArea;
}

export interface StorageRemoveOptions {
  area?: StorageArea;
}

export interface StorageClearOptions {
  area?: StorageArea;
}

/**
 * Centralized service for handling browser storage operations
 * Provides a unified interface for local, sync, and session storage
 */
export class StorageService {
  private static instance: StorageService;
  private browserAdapter: BrowserAdapter;

  private constructor() {
    this.browserAdapter = BrowserAdapter.getInstance();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Get items from storage
   */
  async get<T>(
    keys?: string | string[] | Record<string, unknown>,
    options: StorageGetOptions = {}
  ): Promise<Record<string, T>> {
    const { area = 'sync' } = options;
    
    try {
      const storage = this.getStorageArea(area);
      const result = await storage.get(keys);
      return result as Record<string, T>;
    } catch (error) {
      console.error(`[StorageService.get] Failed to get from ${area} storage:`, error);
      return {};
    }
  }

  /**
   * Get items from storage with validation
   */
  async getValidated<T>(
    keys: string | string[] | Record<string, unknown>,
    schema: z.ZodSchema<T>,
    options: StorageGetOptions = {}
  ): Promise<T | null> {
    const result = await this.get(keys, options);
    return validateBrowserStorageResult(result, schema);
  }

  /**
   * Set items in storage
   */
  async set<T>(
    items: Record<string, T>,
    options: StorageSetOptions = {}
  ): Promise<void> {
    const { area = 'sync' } = options;
    
    try {
      const storage = this.getStorageArea(area);
      await storage.set(items);
    } catch (error) {
      console.error(`[StorageService.set] Failed to set in ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Remove items from storage
   */
  async remove(
    keys: string | string[],
    options: StorageRemoveOptions = {}
  ): Promise<void> {
    const { area = 'sync' } = options;
    
    try {
      const storage = this.getStorageArea(area);
      await storage.remove(keys);
    } catch (error) {
      console.error(`[StorageService.remove] Failed to remove from ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Clear all items from storage
   */
  async clear(options: StorageClearOptions = {}): Promise<void> {
    const { area = 'sync' } = options;
    
    try {
      const storage = this.getStorageArea(area);
      await storage.clear();
    } catch (error) {
      console.error(`[StorageService.clear] Failed to clear ${area} storage:`, error);
      throw error;
    }
  }

  /**
   * Get a single item from storage
   */
  async getItem<T>(
    key: string,
    options: StorageGetOptions = {}
  ): Promise<T | undefined> {
    const result = await this.get<T>([key], options);
    return result[key];
  }

  /**
   * Get a single item from storage with validation
   */
  async getItemValidated<T>(
    key: string,
    schema: z.ZodSchema<T>,
    options: StorageGetOptions = {}
  ): Promise<T | null> {
    const item = await this.getItem(key, options);
    return validateBrowserStorageResult(item, schema);
  }

  /**
   * Set a single item in storage
   */
  async setItem<T>(
    key: string,
    value: T,
    options: StorageSetOptions = {}
  ): Promise<void> {
    await this.set({ [key]: value }, options);
  }

  /**
   * Remove a single item from storage
   */
  async removeItem(
    key: string,
    options: StorageRemoveOptions = {}
  ): Promise<void> {
    await this.remove(key, options);
  }

  /**
   * Check if a key exists in storage
   */
  async hasItem(
    key: string,
    options: StorageGetOptions = {}
  ): Promise<boolean> {
    const result = await this.get([key], options);
    return key in result;
  }

  /**
   * Get all keys from storage
   */
  async getKeys(options: StorageGetOptions = {}): Promise<string[]> {
    const result = await this.get(undefined, options);
    return Object.keys(result);
  }

  /**
   * Get storage usage information
   */
  async getBytesInUse(
    keys?: string | string[],
    options: StorageGetOptions = {}
  ): Promise<number> {
    const { area = 'sync' } = options;
    
    try {
      const storage = this.getStorageArea(area);
      if ('getBytesInUse' in storage && typeof storage.getBytesInUse === 'function') {
        return await (storage.getBytesInUse as Function)(keys);
      }
      return 0;
    } catch (error) {
      console.error(`[StorageService.getBytesInUse] Failed to get bytes in use for ${area} storage:`, error);
      return 0;
    }
  }

  /**
   * Listen for storage changes
   */
  onChanged(
    callback: (changes: Record<string, any>, areaName: string) => void,
    area?: StorageArea
  ): void {
    const listener = (changes: Record<string, any>, areaName: string) => {
      if (!area || areaName === area) {
        callback(changes, areaName);
      }
    };
    
    this.browserAdapter.storage.onChanged.addListener(listener);
  }

  /**
   * Get the appropriate storage area
   */
  private getStorageArea(area: StorageArea) {
    switch (area) {
      case 'local':
        return this.browserAdapter.storage.local;
      case 'sync':
        return this.browserAdapter.storage.sync;
      case 'session':
        return this.browserAdapter.storage.session;
      default:
        throw new Error(`Unknown storage area: ${area}`);
    }
  }
}
