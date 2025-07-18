import { parse } from 'yaml';

export interface VariableDefinition {
  type: 'integer' | 'boolean' | 'string' | 'object';
  initial_value: any;
  description?: string;
}

export interface VariableScope {
  [key: string]: any;
}

export interface GlobalVariables {
  [key: string]: any;
}

export interface CharacterVariables {
  [characterId: string]: {
    [key: string]: any;
  };
}

export interface VariableConfig {
  variables: Record<string, VariableDefinition>;
  characters?: Record<string, Record<string, VariableDefinition>>;
  relationships?: Record<string, VariableDefinition>;
  special_states?: Record<string, VariableDefinition>;
}

export class VariableManager {
  private globalVariables: GlobalVariables = {};
  private characterVariables: CharacterVariables = {};
  private globalDefinitions: Record<string, VariableDefinition> = {};
  private characterDefinitions: Record<string, Record<string, VariableDefinition>> = {};
  private baseUrl: string;

  constructor(baseUrl: string = '/data/variables') {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    await this.loadVariableDefinitions();
    this.initializeVariables();
  }

  private async loadVariableDefinitions(): Promise<void> {
    try {
      // Load global variables
      const globalResponse = await fetch(`${this.baseUrl}/global-variables.yaml`);
      if (globalResponse.ok) {
        const globalYaml = await globalResponse.text();
        const globalConfig = parse(globalYaml) as { variables: Record<string, VariableDefinition> };
        this.globalDefinitions = globalConfig.variables;
      }

      // Load character variables
      const characterResponse = await fetch(`${this.baseUrl}/character-variables.yaml`);
      if (characterResponse.ok) {
        const characterYaml = await characterResponse.text();
        const characterConfig = parse(characterYaml) as VariableConfig;
        
        if (characterConfig.characters) {
          this.characterDefinitions = characterConfig.characters;
        }
      }
    } catch (error) {
      console.error('Error loading variable definitions:', error);
    }
  }

  private initializeVariables(): void {
    // Initialize global variables
    for (const [name, definition] of Object.entries(this.globalDefinitions)) {
      this.globalVariables[name] = definition.initial_value;
    }

    // Initialize character variables
    for (const [characterId, variables] of Object.entries(this.characterDefinitions)) {
      this.characterVariables[characterId] = {};
      for (const [name, definition] of Object.entries(variables)) {
        this.characterVariables[characterId][name] = definition.initial_value;
      }
    }
  }

  // Get variable value
  getVariable(name: string, characterId?: string): any {
    if (characterId) {
      // Check character-specific variable first
      if (this.characterVariables[characterId]?.[name] !== undefined) {
        return this.characterVariables[characterId][name];
      }
    }
    
    // Check global variable
    if (this.globalVariables[name] !== undefined) {
      return this.globalVariables[name];
    }

    // Return default value if not found
    return 0;
  }

  // Set variable value
  setVariable(name: string, value: any, characterId?: string): void {
    if (characterId) {
      // Set character-specific variable
      if (!this.characterVariables[characterId]) {
        this.characterVariables[characterId] = {};
      }
      this.characterVariables[characterId][name] = value;
    } else {
      // Set global variable
      this.globalVariables[name] = value;
    }
  }

  // Increment variable value
  incrementVariable(name: string, amount: number = 1, characterId?: string): void {
    const currentValue = this.getVariable(name, characterId);
    this.setVariable(name, currentValue + amount, characterId);
  }

  // Get all variables for debugging
  getAllVariables(): { global: GlobalVariables; characters: CharacterVariables } {
    return {
      global: { ...this.globalVariables },
      characters: { ...this.characterVariables }
    };
  }

  // Save state to localStorage
  saveState(): void {
    const state = {
      global: this.globalVariables,
      characters: this.characterVariables
    };
    localStorage.setItem('dialogue_variables', JSON.stringify(state));
  }

  // Load state from localStorage
  loadState(): void {
    try {
      const savedState = localStorage.getItem('dialogue_variables');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.globalVariables = state.global || {};
        this.characterVariables = state.characters || {};
      }
    } catch (error) {
      console.error('Error loading variable state:', error);
    }
  }

  // Reset all variables to initial values
  reset(): void {
    this.initializeVariables();
  }

  // Check if variable exists
  hasVariable(name: string, characterId?: string): boolean {
    if (characterId) {
      return this.characterVariables[characterId]?.[name] !== undefined ||
             this.globalVariables[name] !== undefined;
    }
    return this.globalVariables[name] !== undefined;
  }
}