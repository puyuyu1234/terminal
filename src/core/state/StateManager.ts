import type { 
  GameState, 
  CharacterId, 
  CharacterState, 
  MinimalGameState,
  MinimalCharacterState,
  DialogueHistoryEntry 
} from '@/types';
import { StateStorage } from './StateStorage';
import { parse } from 'yaml';

export class StateManager {
  private state: GameState;
  private storage: StateStorage;
  private autoSaveInterval: number = 300000; // 5 minutes
  private autoSaveTimer?: ReturnType<typeof setInterval>;
  private isInitialized = false;

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
    if (this.isInitialized) {
      console.log('[StateManager] Already initialized, skipping...');
      return;
    }

    try {
      console.log('[StateManager] Initializing state manager...');
      
      // Initialize global variables from YAML definitions
      await this.initializeGlobalVariables();
      
      const savedState = await this.storage.load();
      if (savedState) {
        console.log('[StateManager] Found saved state:', savedState);
        this.restoreFromMinimalState(savedState);
        console.log('[StateManager] State restored successfully');
      } else {
        console.log('[StateManager] No saved state found, using initial state');
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }

    this.startAutoSave();
    this.isInitialized = true;
  }

  private restoreFromMinimalState(minimal: MinimalGameState): void {
    console.log('[StateManager] Restoring state from minimal state...');
    console.log('[StateManager] Previous visits:', this.state.player.totalVisits);
    
    this.state.player.totalVisits = minimal.visits;
    this.state.player.lastVisitDate = minimal.lastVisitDate || new Date().toISOString();
    this.state.player.silenceCount = minimal.silenceCount || 0;
    console.log('[StateManager] Restored player state:', {
      visits: this.state.player.totalVisits,
      lastVisitDate: this.state.player.lastVisitDate,
      silenceCount: this.state.player.silenceCount
    });
    
    this.state.flags = new Set(minimal.flags);
    console.log('[StateManager] Restored flags:', minimal.flags);
    
    this.state.variables = new Map(Object.entries(minimal.variables));
    console.log('[StateManager] Restored variables:', minimal.variables);
    
    this.state.characters = new Map();
    Object.entries(minimal.characterData).forEach(([charId, charData]) => {
      console.log(`[StateManager] Restoring character ${charId}:`, charData);
      this.state.characters.set(charId as CharacterId, {
        meetCount: charData.meetCount,
        trustLevel: charData.trustLevel,
        lastChoices: [],
        specificFlags: new Set(charData.flags),
        lastSeenDate: charData.lastSeenDate
      });
      
      // Sync with variable trust_level
      this.setVariable(`${charId}.trust_level`, charData.trustLevel);
    });
    
    // 会話履歴を復元
    this.state.history = minimal.history || [];
    console.log('[StateManager] Restored history:', this.state.history.length, 'entries');
    
    console.log('[StateManager] Final restored state:');
    console.log('[StateManager]   Total visits:', this.state.player.totalVisits);
    console.log('[StateManager]   Character count:', this.state.characters.size);
    console.log('[StateManager]   History count:', this.state.history.length);
  }

  private createMinimalState(): MinimalGameState {
    const characterData: { [key: string]: MinimalCharacterState } = {};
    
    this.state.characters.forEach((charState, charId) => {
      characterData[charId] = {
        meetCount: charState.meetCount,
        trustLevel: charState.trustLevel,
        flags: Array.from(charState.specificFlags),
        lastSeenDate: charState.lastSeenDate
      };
    });

    return {
      visits: this.state.player.totalVisits,
      flags: Array.from(this.state.flags),
      variables: Object.fromEntries(this.state.variables),
      characterData,
      lastVisitDate: this.state.player.lastVisitDate,
      silenceCount: this.state.player.silenceCount,
      history: this.state.history
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
    try {
      console.log('[StateManager] Starting save operation...');
      const minimalState = this.createMinimalState();
      console.log('[StateManager] Minimal state created:', {
        visits: minimalState.visits,
        charactersCount: Object.keys(minimalState.characterData).length,
        historyLength: minimalState.history?.length || 0,
        silenceCount: minimalState.silenceCount
      });
      
      await this.storage.save(minimalState);
      console.log('[StateManager] Game state saved successfully');
    } catch (error) {
      console.error('[StateManager] Failed to save game state:', error);
      throw error;
    }
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
    console.log(`[StateManager] 📝 Setting variable ${name} = ${value}`);
    this.state.variables.set(name, value);
  }

  getVariable(name: string): number | undefined {
    return this.state.variables.get(name);
  }

  incrementVariable(name: string, amount: number = 1): void {
    const current = this.state.variables.get(name) || 0;
    console.log(`[StateManager] 📈 Incrementing variable ${name} from ${current} to ${current + amount}`);
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
      
      // Sync with variable trust_level
      this.setVariable(`${characterId}.trust_level`, state.trustLevel);
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
    console.log('[StateManager] Player visits incremented to:', this.state.player.totalVisits);
    console.log('[StateManager] Last visit date set to:', this.state.player.lastVisitDate);
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
    
    // Sync with variable trust_level
    this.setVariable(`${characterId}.trust_level`, charState.trustLevel);
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

  private async initializeGlobalVariables(): Promise<void> {
    try {
      // Determine the correct base URL for variables
      const viteBase = import.meta.env.BASE_URL || '/';
      const baseUrl = viteBase === '/' ? '/data/variables' : `${viteBase}data/variables`;
      
      console.log('[StateManager] Loading global variables from:', `${baseUrl}/global-variables.yaml`);
      
      const response = await fetch(`${baseUrl}/global-variables.yaml`);
      if (response.ok) {
        const yamlText = await response.text();
        const config = parse(yamlText) as { variables: Record<string, { initial_value: any }> };
        
        // Initialize variables if they don't exist
        if (config.variables) {
          Object.entries(config.variables).forEach(([name, definition]) => {
            if (!this.state.variables.has(name)) {
              this.state.variables.set(name, definition.initial_value);
              console.log(`[StateManager] Initialized ${name} to ${definition.initial_value}`);
            }
          });
        }
      } else {
        console.warn('[StateManager] Could not load global variables file');
      }
    } catch (error) {
      console.error('[StateManager] Error loading global variables:', error);
    }
  }

  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.save().catch(error => {
      console.error('Failed to save on destroy:', error);
    });
  }

  // Debug method: Set all character trust levels to MAX
  debugMaxTrustAll(): void {
    const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];
    
    characters.forEach(charId => {
      // Set variable trust_level to 100
      this.setVariable(`${charId}.trust_level`, 100);
      
      // Also update characterData for consistency
      const charState = this.getCharacterState(charId as any);
      charState.trustLevel = 100;
    });
    
    console.log('[StateManager] 🚀 DEBUG: Set all character trust levels to MAX (100)');
    this.save();
  }
}