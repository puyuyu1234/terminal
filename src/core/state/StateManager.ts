import type { 
  GameState, 
  CharacterId, 
  CharacterState, 
  MinimalGameState,
  MinimalCharacterState,
  DialogueHistoryEntry 
} from '@/types';
import { StateStorage } from './StateStorage';

export class StateManager {
  private state: GameState;
  private storage: StateStorage;
  private autoSaveInterval: number = 60000; // 1 minute
  private autoSaveTimer?: ReturnType<typeof setInterval>;

  constructor(storage: StateStorage) {
    this.storage = storage;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player: {
        totalVisits: 0,
        silenceCount: 0,
        lastVisitDate: new Date().toISOString(),
        currentSessionStart: new Date().toISOString()
      },
      characters: new Map(),
      flags: new Set(),
      variables: new Map(),
      history: []
    };
  }

  async initialize(): Promise<void> {
    try {
      const savedState = await this.storage.load();
      if (savedState) {
        this.restoreFromMinimalState(savedState);
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }

    this.startAutoSave();
  }

  private restoreFromMinimalState(minimal: MinimalGameState): void {
    this.state.player.totalVisits = minimal.visits;
    
    this.state.flags = new Set(minimal.flags);
    
    this.state.variables = new Map(Object.entries(minimal.variables));
    
    this.state.characters = new Map();
    Object.entries(minimal.characterData).forEach(([charId, charData]) => {
      this.state.characters.set(charId as CharacterId, {
        meetCount: charData.meetCount,
        trustLevel: charData.trustLevel,
        lastChoices: [],
        specificFlags: new Set(charData.flags)
      });
    });
  }

  private createMinimalState(): MinimalGameState {
    const characterData: { [key: string]: MinimalCharacterState } = {};
    
    this.state.characters.forEach((charState, charId) => {
      characterData[charId] = {
        meetCount: charState.meetCount,
        trustLevel: charState.trustLevel,
        flags: Array.from(charState.specificFlags)
      };
    });

    return {
      visits: this.state.player.totalVisits,
      flags: Array.from(this.state.flags),
      variables: Object.fromEntries(this.state.variables),
      characterData
    };
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.save().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }, this.autoSaveInterval);
  }

  async save(): Promise<void> {
    const minimalState = this.createMinimalState();
    await this.storage.save(minimalState);
  }

  getState(): GameState {
    return this.state;
  }

  setFlag(flag: string): void {
    this.state.flags.add(flag);
  }

  removeFlag(flag: string): void {
    this.state.flags.delete(flag);
  }

  hasFlag(flag: string): boolean {
    return this.state.flags.has(flag);
  }

  setVariable(name: string, value: number): void {
    this.state.variables.set(name, value);
  }

  getVariable(name: string): number | undefined {
    return this.state.variables.get(name);
  }

  incrementVariable(name: string, amount: number = 1): void {
    const current = this.state.variables.get(name) || 0;
    this.state.variables.set(name, current + amount);
  }

  decrementVariable(name: string, amount: number = 1): void {
    const current = this.state.variables.get(name) || 0;
    this.state.variables.set(name, Math.max(0, current - amount));
  }

  getCharacterState(characterId: CharacterId): CharacterState {
    let state = this.state.characters.get(characterId);
    if (!state) {
      state = this.createInitialCharacterState();
      this.state.characters.set(characterId, state);
    }
    return state;
  }

  private createInitialCharacterState(): CharacterState {
    return {
      meetCount: 0,
      trustLevel: 0,
      lastChoices: [],
      specificFlags: new Set()
    };
  }

  incrementPlayerVisits(): void {
    this.state.player.totalVisits++;
    this.state.player.lastVisitDate = new Date().toISOString();
  }

  incrementSilenceCount(): void {
    this.state.player.silenceCount++;
  }

  incrementCharacterMeetCount(characterId: CharacterId): void {
    const charState = this.getCharacterState(characterId);
    charState.meetCount++;
    charState.lastSeenDate = new Date().toISOString();
  }

  modifyCharacterTrust(characterId: CharacterId, amount: number): void {
    const charState = this.getCharacterState(characterId);
    charState.trustLevel = Math.max(-100, Math.min(100, charState.trustLevel + amount));
  }

  addToHistory(entry: Omit<DialogueHistoryEntry, 'timestamp'>): void {
    this.state.history.push({
      ...entry,
      timestamp: new Date().toISOString()
    });

    if (this.state.history.length > 50) {
      this.state.history = this.state.history.slice(-50);
    }
  }

  getRecentHistory(count: number = 10): DialogueHistoryEntry[] {
    return this.state.history.slice(-count);
  }

  clearHistory(): void {
    this.state.history = [];
  }

  resetState(): void {
    this.state = this.createInitialState();
    this.save().catch(error => {
      console.error('Failed to save reset state:', error);
    });
  }

  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.save().catch(error => {
      console.error('Failed to save on destroy:', error);
    });
  }
}