import type { MinimalGameState } from '@/types';

export interface StateStorage {
  save(state: MinimalGameState): Promise<void>;
  load(): Promise<MinimalGameState | null>;
  clear(): Promise<void>;
}

export class LocalStorageStateStorage implements StateStorage {
  private readonly storageKey = 'abandoned_station_save';

  async save(state: MinimalGameState): Promise<void> {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw new Error('Failed to save game state');
    }
  }

  async load(): Promise<MinimalGameState | null> {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (!serialized) return null;
      
      return JSON.parse(serialized) as MinimalGameState;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }
}

export class IndexedDBStateStorage implements StateStorage {
  private readonly dbName = 'AbandonedStationDB';
  private readonly storeName = 'gameState';
  private readonly stateKey = 'currentState';
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async save(state: MinimalGameState): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(state, this.stateKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async load(): Promise<MinimalGameState | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(this.stateKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(this.stateKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export class MemoryStateStorage implements StateStorage {
  private state: MinimalGameState | null = null;

  async save(state: MinimalGameState): Promise<void> {
    this.state = JSON.parse(JSON.stringify(state));
  }

  async load(): Promise<MinimalGameState | null> {
    return this.state ? JSON.parse(JSON.stringify(this.state)) : null;
  }

  async clear(): Promise<void> {
    this.state = null;
  }
}