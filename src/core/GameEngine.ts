import type { 
  GameContext, 
  GameState, 
  Character, 
  CharacterId,
  GameEnvironment
} from '@/types';
import { StateManager } from './state/StateManager';
import { CharacterManager } from './character/CharacterManager';
import { DialogueManager } from './dialogue/DialogueManager';
import { YAMLDialogueLoader } from './dialogue/DialogueLoader';
import { ConditionEvaluator } from './conditions/ConditionEvaluator';
import { EffectProcessor } from './effects/EffectProcessor';
import { EventBus } from './events/EventBus';
import { 
  TextProcessorPipeline, 
  VariableReplacementProcessor,
  ConditionalTextProcessor,
  TimeBasedTextProcessor,
  CharacterStateTextProcessor
} from './dialogue/TextProcessorPipeline';
import { LocalStorageStateStorage } from './state/StateStorage';

export class GameEngine {
  private stateManager: StateManager;
  private characterManager: CharacterManager;
  private dialogueManager: DialogueManager;
  private dialogueLoader: YAMLDialogueLoader;
  private conditionEvaluator: ConditionEvaluator;
  private effectProcessor: EffectProcessor;
  private eventBus: EventBus;
  private textProcessor: TextProcessorPipeline;
  private currentContext: GameContext | null = null;
  private isInitialized = false;

  constructor() {
    this.eventBus = new EventBus();
    this.conditionEvaluator = new ConditionEvaluator();
    this.effectProcessor = new EffectProcessor();
    this.textProcessor = new TextProcessorPipeline();
    
    // Initialize text processors
    this.textProcessor.addProcessor(new VariableReplacementProcessor());
    this.textProcessor.addProcessor(new ConditionalTextProcessor());
    this.textProcessor.addProcessor(new TimeBasedTextProcessor());
    this.textProcessor.addProcessor(new CharacterStateTextProcessor());
    
    this.stateManager = new StateManager(new LocalStorageStateStorage());
    this.characterManager = new CharacterManager(this.conditionEvaluator);
    this.dialogueManager = new DialogueManager(
      this.conditionEvaluator,
      this.effectProcessor,
      this.eventBus,
      this.textProcessor
    );
    this.dialogueLoader = new YAMLDialogueLoader();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track dialogue events for analytics and debugging
    this.eventBus.on('dialogue_start', (event) => {
      console.log('Dialogue started:', event.data);
    });

    this.eventBus.on('choice_made', (event) => {
      this.stateManager.addToHistory({
        characterId: this.currentContext?.currentCharacter.id!,
        nodeId: event.data.nodeId,
        choiceMade: event.data.choiceId
      });
      // 選択時は履歴に追加するのみ、保存はセッション終了時に行う
    });

    this.eventBus.on('dialogue_end', (event) => {
      console.log('[GameEngine] Dialogue ended event received:', event.data);
      // 対話終了時の保存はendSession()で行う
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[GameEngine] Already initialized, skipping...');
      return;
    }

    try {
      console.log('[GameEngine] Initializing game engine...');
      await this.stateManager.initialize();
      
      const state = this.stateManager.getState();
      console.log('[GameEngine] Post-initialization state:', {
        totalVisits: state.player.totalVisits,
        characterCount: state.characters.size,
        flagCount: state.flags.size,
        variableCount: state.variables.size
      });
      
      this.isInitialized = true;
      console.log('Game engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game engine:', error);
      throw error;
    }
  }

  async startNewSession(): Promise<GameContext> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('[GameEngine] Starting new session...');
    const currentState = this.stateManager.getState();
    console.log('[GameEngine] Current state before session:', {
      totalVisits: currentState.player.totalVisits,
      characterCount: currentState.characters.size
    });

    // Create game context
    const environment = this.createEnvironment();
    
    // Update state for new session BEFORE character selection
    this.stateManager.incrementPlayerVisits();
    console.log('[GameEngine] Incremented player visits to:', this.stateManager.getState().player.totalVisits);
    
    // Get updated state for character selection
    const updatedState = this.stateManager.getState();
    const selectedCharacter = this.characterManager.selectTonightCharacter({
      state: updatedState,
      currentCharacter: null as any, // Will be set after character selection
      environment
    });

    this.currentContext = {
      state: updatedState,
      currentCharacter: selectedCharacter,
      environment
    };
    
    // Load dialogue data for the selected character
    await this.loadCharacterDialogue(selectedCharacter.id);

    // Start the dialogue
    await this.dialogueManager.startDialogue(selectedCharacter.id, this.currentContext);
    
    // NOTE: Meet count will be incremented when dialogue ends, not at start

    return this.currentContext;
  }

  private createEnvironment(): GameEnvironment {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay: GameEnvironment['timeOfDay'];
    if (hour >= 17 && hour < 21) {
      timeOfDay = 'evening';
    } else if (hour >= 21 && hour < 2) {
      timeOfDay = 'night';
    } else {
      timeOfDay = 'late_night';
    }

    // Simple weather simulation
    const weatherRandom = Math.random();
    let weather: GameEnvironment['weather'];
    if (weatherRandom < 0.6) {
      weather = 'clear';
    } else if (weatherRandom < 0.8) {
      weather = 'foggy';
    } else {
      weather = 'rainy';
    }

    return {
      timeOfDay,
      weather,
      moonPhase: Math.random() * 100 // 0-100 representing moon phase
    };
  }

  private async loadCharacterDialogue(characterId: CharacterId): Promise<void> {
    try {
      const dialogueData = await this.dialogueLoader.loadDialogue(characterId);
      await this.dialogueManager.loadDialogueData(characterId, dialogueData);
    } catch (error) {
      console.error(`Failed to load dialogue for ${characterId}:`, error);
      throw error;
    }
  }

  getCurrentText(): string {
    if (!this.currentContext) return '';
    return this.dialogueManager.getCurrentNodeText(this.currentContext);
  }

  getCurrentChoices(): Array<{ id: string; text: string; index: number }> {
    if (!this.currentContext) return [];
    
    const choices = this.dialogueManager.getAvailableChoices(this.currentContext);
    return choices.map((choice, index) => ({
      id: choice.id || `choice_${index}`,
      text: choice.text,
      index
    }));
  }

  async makeChoice(choiceIndex: number): Promise<boolean> {
    if (!this.currentContext) {
      console.log('[GameEngine] makeChoice: No current context');
      return false;
    }

    try {
      console.log('[GameEngine] 🎮 Making choice', choiceIndex);
      
      // Log current variable state before choice
      const currentSilenceCount = this.currentContext.state.variables.get('player_silence_count') || 0;
      console.log(`[GameEngine] 📊 Current silence count BEFORE choice: ${currentSilenceCount}`);
      
      const nextNode = await this.dialogueManager.makeChoice(choiceIndex, this.currentContext);
      
      // Log variable state after choice
      const newSilenceCount = this.currentContext.state.variables.get('player_silence_count') || 0;
      console.log(`[GameEngine] 📊 Current silence count AFTER choice: ${newSilenceCount}`);
      
      if (newSilenceCount !== currentSilenceCount) {
        console.log(`🤐 [SILENCE COUNT CHANGE] ${currentSilenceCount} → ${newSilenceCount}`);
      }
      
      // Check if dialogue has ended
      if (!nextNode) {
        console.log('[GameEngine] makeChoice: No next node - dialogue ended');
        console.log('[GameEngine] makeChoice: About to call endSession()');
        this.endSession();
        console.log('[GameEngine] makeChoice: endSession() called');
        return false;
      }

      console.log('[GameEngine] makeChoice: Continuing dialogue');
      return true;
    } catch (error) {
      console.error('Error making choice:', error);
      return false;
    }
  }

  private endSession(): void {
    console.log('[GameEngine] endSession called');
    console.log('[GameEngine] Current context exists:', !!this.currentContext);
    
    if (this.currentContext) {
      const characterId = this.currentContext.currentCharacter.id;
      console.log('[GameEngine] Ending session for character:', characterId);
      
      // Increment meet count when dialogue session ends
      this.stateManager.incrementCharacterMeetCount(characterId);
      const charState = this.stateManager.getCharacterState(characterId);
      console.log('[GameEngine] Session ended - incremented meet count for', characterId, 'to:', charState.meetCount);
      
      this.dialogueManager.endDialogue(this.currentContext);
      
      // セッション終了時に確実に保存
      console.log('[GameEngine] Saving state on session end...');
      this.stateManager.save().then(() => {
        console.log('[GameEngine] Session ended - state saved successfully');
      }).catch(error => {
        console.error('[GameEngine] Failed to save state on session end:', error);
      });
      
      this.currentContext = null;
      console.log('[GameEngine] Current context cleared');
    } else {
      console.log('[GameEngine] No current context to end');
    }
  }

  // 公開メソッド: 手動でセッション終了
  endCurrentSession(): void {
    console.log('[GameEngine] Manually ending current session');
    console.log('[GameEngine] Current context before manual end:', !!this.currentContext);
    this.endSession();
  }

  getCurrentCharacter(): Character | null {
    return this.currentContext?.currentCharacter || null;
  }

  getGameState(): GameState {
    return this.stateManager.getState();
  }

  resetGame(): void {
    this.stateManager.resetState();
    this.currentContext = null;
    this.characterManager = new CharacterManager(this.conditionEvaluator);
  }

  // Analytics and debugging methods
  getEventHistory(): any[] {
    return this.eventBus.getEventHistory();
  }

  getNodeHistory(): string[] {
    return this.dialogueManager.getNodeHistory();
  }

  // Development helpers
  setFlag(flag: string): void {
    this.stateManager.setFlag(flag);
  }

  removeFlag(flag: string): void {
    this.stateManager.removeFlag(flag);
  }

  setVariable(name: string, value: number): void {
    this.stateManager.setVariable(name, value);
  }

  // Debug helpers
  logCurrentState(): void {
    console.log('🔍 [DEBUG] Current Game State:');
    console.log('📊 Variables:', Object.fromEntries(this.stateManager.getState().variables));
    console.log('🏳️ Flags:', Array.from(this.stateManager.getState().flags));
    console.log('👥 Characters:', Object.fromEntries(this.stateManager.getState().characters));
    console.log('📈 Player:', this.stateManager.getState().player);
  }

  getSilenceCount(): number {
    return this.stateManager.getState().variables.get('player_silence_count') || 0;
  }

  logSilenceCount(): void {
    const count = this.getSilenceCount();
    console.log(`🤐 [SILENCE COUNT DEBUG] Current count: ${count}`);
  }

  forceCharacterAppearance(characterId: CharacterId): void {
    const character = this.characterManager.getCharacter(characterId);
    if (character && this.currentContext) {
      this.currentContext.currentCharacter = character;
    }
  }

  // Debug: Set all character trust levels to MAX
  debugMaxTrustAll(): void {
    this.stateManager.debugMaxTrustAll();
  }

  // Save/Load methods
  async saveGame(): Promise<void> {
    await this.stateManager.save();
  }

  // Cleanup
  destroy(): void {
    this.stateManager.destroy();
    this.eventBus.clearHistory();
  }
}