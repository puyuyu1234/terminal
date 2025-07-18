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
    });

    this.eventBus.on('dialogue_end', (event) => {
      console.log('Dialogue ended:', event.data);
      this.stateManager.save();
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.stateManager.initialize();
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

    // Create game context
    const environment = this.createEnvironment();
    const selectedCharacter = this.characterManager.selectTonightCharacter({
      state: this.stateManager.getState(),
      currentCharacter: null as any, // Will be set after character selection
      environment
    });

    this.currentContext = {
      state: this.stateManager.getState(),
      currentCharacter: selectedCharacter,
      environment
    };

    // Update state for new session
    this.stateManager.incrementPlayerVisits();
    
    // Load dialogue data for the selected character
    await this.loadCharacterDialogue(selectedCharacter.id);

    // Start the dialogue
    await this.dialogueManager.startDialogue(selectedCharacter.id, this.currentContext);
    
    // Increment meet count after dialogue starts
    this.stateManager.incrementCharacterMeetCount(selectedCharacter.id);

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
    if (!this.currentContext) return false;

    try {
      const nextNode = await this.dialogueManager.makeChoice(choiceIndex, this.currentContext);
      
      // Check if dialogue has ended
      if (!nextNode) {
        this.endSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error making choice:', error);
      return false;
    }
  }

  private endSession(): void {
    if (this.currentContext) {
      this.dialogueManager.endDialogue(this.currentContext);
      this.currentContext = null;
    }
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

  forceCharacterAppearance(characterId: CharacterId): void {
    const character = this.characterManager.getCharacter(characterId);
    if (character && this.currentContext) {
      this.currentContext.currentCharacter = character;
    }
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