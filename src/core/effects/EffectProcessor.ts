import type { 
  EffectUnion,
  GameContext,
  SetFlagEffect,
  RemoveFlagEffect,
  IncrementEffect,
  DecrementEffect,
  SetVariableEffect,
  CustomEffect
} from '@/types';

export type CustomEffectHandler = (params: any, context: GameContext) => void;

export class EffectProcessor {
  private customHandlers: Map<string, CustomEffectHandler> = new Map();
  private pendingEffects: Array<{ effect: EffectUnion; executeAt: number }> = [];

  constructor() {
    this.registerDefaultHandlers();
    this.startEffectTimer();
  }

  private registerDefaultHandlers(): void {
    // Character trust modification
    this.registerCustomHandler('modify_trust', (params, context) => {
      const characterId = params.characterId || context.currentCharacter.id;
      const charState = context.state.characters.get(characterId);
      if (charState) {
        charState.trustLevel = Math.max(-100, Math.min(100, 
          charState.trustLevel + (params.amount || 0)
        ));
      }
    });

    // Add character-specific flag
    this.registerCustomHandler('add_character_flag', (params, context) => {
      const characterId = params.characterId || context.currentCharacter.id;
      const charState = context.state.characters.get(characterId);
      if (charState && params.flag) {
        charState.specificFlags.add(params.flag);
      }
    });

    // Time manipulation
    this.registerCustomHandler('change_time', (params, context) => {
      if (params.time && ['evening', 'night', 'late_night'].includes(params.time)) {
        context.environment.timeOfDay = params.time;
      }
    });

    // Weather change
    this.registerCustomHandler('change_weather', (params, context) => {
      if (params.weather && ['clear', 'foggy', 'rainy'].includes(params.weather)) {
        context.environment.weather = params.weather;
      }
    });

    // Trigger train sound
    this.registerCustomHandler('train_sound', (_params, context) => {
      context.state.flags.add('heard_train_sound');
      // In a real implementation, this would trigger an audio effect
      console.log('Train sound effect triggered');
    });

    // Memory manipulation (creates déjà vu effect)
    this.registerCustomHandler('deja_vu', (_params, context) => {
      // Randomly modify a past history entry
      if (context.state.history.length > 5) {
        const randomIndex = Math.floor(Math.random() * (context.state.history.length - 5));
        const entry = context.state.history[randomIndex];
        if (entry) {
          // Subtle modification to create memory uncertainty
          entry.timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString();
        }
      }
      context.state.flags.add('experienced_deja_vu');
    });

    // Reset character memory
    this.registerCustomHandler('reset_character_memory', (params, context) => {
      const characterId = params.characterId || context.currentCharacter.id;
      const charState = context.state.characters.get(characterId);
      if (charState) {
        charState.lastChoices = [];
        charState.specificFlags.clear();
        if (params.partial) {
          // Partial reset - keep some data
          charState.meetCount = Math.max(1, Math.floor(charState.meetCount / 2));
        } else {
          charState.meetCount = 0;
          charState.trustLevel = 0;
        }
      }
    });

    // Create loop effect
    this.registerCustomHandler('create_loop', (params, context) => {
      context.state.flags.add('in_loop');
      if (params.loopCount !== undefined) {
        context.state.variables.set('loop_count', params.loopCount);
      }
    });
  }

  registerCustomHandler(name: string, handler: CustomEffectHandler): void {
    this.customHandlers.set(name, handler);
  }

  process(effect: EffectUnion, context: GameContext): void {
    console.log(`[EffectProcessor] Processing effect:`, effect);
    
    if (effect.delay && effect.delay > 0) {
      console.log(`[EffectProcessor] Delaying effect for ${effect.delay}ms`);
      this.pendingEffects.push({
        effect,
        executeAt: Date.now() + effect.delay
      });
      return;
    }

    this.processImmediate(effect, context);
  }

  private processImmediate(effect: EffectUnion, context: GameContext): void {
    switch (effect.type) {
      case 'set_flag':
        this.processSetFlag(effect as SetFlagEffect, context);
        break;
      
      case 'remove_flag':
        this.processRemoveFlag(effect as RemoveFlagEffect, context);
        break;
      
      case 'increment':
        this.processIncrement(effect as IncrementEffect, context);
        break;
      
      case 'decrement':
        this.processDecrement(effect as DecrementEffect, context);
        break;
      
      case 'set_variable':
        this.processSetVariable(effect as SetVariableEffect, context);
        break;
      
      case 'custom':
        this.processCustomEffect(effect as CustomEffect, context);
        break;
      
      default:
        console.warn(`Unknown effect type: ${(effect as any).type}`);
    }
  }

  private processSetFlag(effect: SetFlagEffect, context: GameContext): void {
    context.state.flags.add(effect.flag);
  }

  private processRemoveFlag(effect: RemoveFlagEffect, context: GameContext): void {
    context.state.flags.delete(effect.flag);
  }

  private processIncrement(effect: IncrementEffect, context: GameContext): void {
    console.log(`[EffectProcessor] Processing increment effect:`, effect);
    
    const current = context.state.variables.get(effect.variable) || 0;
    
    // Support both 'amount' and 'value' properties from YAML
    const amount = effect.amount || (effect as any).value || 1;
    
    console.log(`[EffectProcessor] Variable ${effect.variable}: current=${current}, amount=${amount}`);
    
    context.state.variables.set(effect.variable, current + amount);
    
    // Verify the variable was set correctly
    const newValue = context.state.variables.get(effect.variable);
    console.log(`[EffectProcessor] Variable ${effect.variable} set to ${newValue}`);
    
    // Special handling for player_silence_count
    if (effect.variable === 'player_silence_count') {
      console.log(`🤐 [SILENCE COUNT] Incremented from ${current} to ${current + amount}`);
      console.log(`🤐 [SILENCE COUNT] Current silence count in state:`, newValue);
    }
  }

  private processDecrement(effect: DecrementEffect, context: GameContext): void {
    const current = context.state.variables.get(effect.variable) || 0;
    
    // Support both 'amount' and 'value' properties from YAML
    const amount = effect.amount || (effect as any).value || 1;
    
    context.state.variables.set(effect.variable, Math.max(0, current - amount));
  }

  private processSetVariable(effect: SetVariableEffect, context: GameContext): void {
    context.state.variables.set(effect.variable, effect.value);
  }

  private processCustomEffect(effect: CustomEffect, context: GameContext): void {
    const handler = this.customHandlers.get(effect.handler);
    if (!handler) {
      console.warn(`Custom effect handler not found: ${effect.handler}`);
      return;
    }

    try {
      handler(effect.params || {}, context);
    } catch (error) {
      console.error(`Error in custom effect handler ${effect.handler}:`, error);
    }
  }

  private startEffectTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const readyEffects = this.pendingEffects.filter(e => e.executeAt <= now);
      
      if (readyEffects.length > 0) {
        // Remove ready effects from pending
        this.pendingEffects = this.pendingEffects.filter(e => e.executeAt > now);
        
        // Execute ready effects
        readyEffects.forEach(({ effect }) => {
          // Note: This requires access to the current context
          // In a real implementation, you'd need to store context references
          console.log('Delayed effect ready:', effect);
        });
      }
    }, 100);
  }

  processMultiple(effects: EffectUnion[], context: GameContext): void {
    effects.forEach(effect => this.process(effect, context));
  }

  clearPendingEffects(): void {
    this.pendingEffects = [];
  }
}