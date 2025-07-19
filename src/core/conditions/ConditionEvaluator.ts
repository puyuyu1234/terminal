import type { 
  ConditionUnion,
  GameContext,
  FlagCondition,
  VariableCondition,
  VisitCountCondition,
  CustomCondition,
  EnvironmentCondition
} from '@/types';

export type CustomConditionHandler = (params: any, context: GameContext) => boolean;

export class ConditionEvaluator {
  private customHandlers: Map<string, CustomConditionHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // Time-based conditions
    this.registerCustomHandler('is_time', (params, context) => {
      return context.environment.timeOfDay === params.time;
    });

    // Weather conditions
    this.registerCustomHandler('is_weather', (params, context) => {
      return context.environment.weather === params.weather;
    });

    // Moon phase conditions
    this.registerCustomHandler('moon_phase', (params, context) => {
      const phase = context.environment.moonPhase || 0;
      switch (params.operator) {
        case 'equals':
          return phase === params.value;
        case 'greater_than':
          return phase > params.value;
        case 'less_than':
          return phase < params.value;
        default:
          return false;
      }
    });

    // Complex character relationship conditions
    this.registerCustomHandler('relationship_level', (params, context) => {
      const charState = context.state.characters.get(params.characterId);
      if (!charState) return false;
      
      const level = context.state.variables.get(`${params.characterId}.trust_level`) || 0;
      switch (params.operator) {
        case 'hostile':
          return level < -50;
        case 'cold':
          return level >= -50 && level < -20;
        case 'neutral':
          return level >= -20 && level <= 20;
        case 'warm':
          return level > 20 && level <= 50;
        case 'close':
          return level > 50;
        default:
          return false;
      }
    });

    // History-based conditions
    this.registerCustomHandler('has_visited_node', (params, context) => {
      return context.state.history.some(entry => 
        entry.nodeId === params.nodeId && 
        (!params.characterId || entry.characterId === params.characterId)
      );
    });

    // Choice history conditions
    this.registerCustomHandler('made_choice', (params, context) => {
      const charState = context.state.characters.get(context.currentCharacter.id);
      if (!charState) return false;
      
      return charState.lastChoices.includes(params.choiceId);
    });

    // Silence pattern detection
    this.registerCustomHandler('silence_pattern', (params, context) => {
      const silenceCount = context.state.player.silenceCount;
      const totalVisits = context.state.player.totalVisits;
      const ratio = totalVisits > 0 ? silenceCount / totalVisits : 0;
      
      switch (params.pattern) {
        case 'frequent':
          return ratio > 0.5;
        case 'occasional':
          return ratio > 0.2 && ratio <= 0.5;
        case 'rare':
          return ratio <= 0.2;
        default:
          return false;
      }
    });
  }

  registerCustomHandler(name: string, handler: CustomConditionHandler): void {
    this.customHandlers.set(name, handler);
  }

  evaluate(condition: ConditionUnion, context: GameContext): boolean {
    const result = this.evaluateCondition(condition, context);
    return condition.negate ? !result : result;
  }

  private evaluateCondition(condition: ConditionUnion, context: GameContext): boolean {
    switch (condition.type) {
      case 'flag':
        return this.evaluateFlagCondition(condition as FlagCondition, context);
      
      case 'variable':
        return this.evaluateVariableCondition(condition as VariableCondition, context);
      
      case 'visitCount':
        return this.evaluateVisitCountCondition(condition as VisitCountCondition, context);
      
      case 'custom':
        return this.evaluateCustomCondition(condition as CustomCondition, context);
      
      case 'environment':
        return this.evaluateEnvironmentCondition(condition as EnvironmentCondition, context);
      
      default:
        console.warn(`Unknown condition type: ${(condition as any).type}`);
        return false;
    }
  }

  private evaluateFlagCondition(condition: FlagCondition, context: GameContext): boolean {
    const hasFlag = context.state.flags.has(condition.flag);
    const expected = condition.expected !== false;
    return hasFlag === expected;
  }

  private evaluateVariableCondition(condition: VariableCondition, context: GameContext): boolean {
    let value: number | undefined;

    // Check for special variables
    switch (condition.name) {
      case 'player_visits':
        value = context.state.player.totalVisits;
        break;
      case 'silence_count':
        value = context.state.player.silenceCount;
        break;
      default:
        // Check character-specific variables
        if (condition.name.includes('_meet_count')) {
          const charId = condition.name.replace('_meet_count', '') as any;
          const charState = context.state.characters.get(charId);
          value = charState?.meetCount || 0;
        } else if (condition.name.includes('_trust_level')) {
          value = context.state.variables.get(condition.name) || 0;
        } else {
          value = context.state.variables.get(condition.name);
        }
    }

    if (value === undefined) value = 0;

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'greater_or_equal':
        return value >= condition.value;
      case 'less_or_equal':
        return value <= condition.value;
      default:
        return false;
    }
  }

  private evaluateVisitCountCondition(
    condition: VisitCountCondition, 
    context: GameContext
  ): boolean {
    let count: number;

    if (condition.character) {
      const charState = context.state.characters.get(condition.character);
      count = charState?.meetCount || 0;
    } else {
      count = context.state.player.totalVisits;
    }

    switch (condition.operator) {
      case 'equals':
        return count === condition.value;
      case 'greater_than':
        return count > condition.value;
      case 'less_than':
        return count < condition.value;
      default:
        return false;
    }
  }

  private evaluateCustomCondition(condition: CustomCondition, context: GameContext): boolean {
    const handler = this.customHandlers.get(condition.handler);
    if (!handler) {
      console.warn(`Custom condition handler not found: ${condition.handler}`);
      return false;
    }

    try {
      return handler(condition.params || {}, context);
    } catch (error) {
      console.error(`Error in custom condition handler ${condition.handler}:`, error);
      return false;
    }
  }

  private evaluateEnvironmentCondition(condition: EnvironmentCondition, context: GameContext): boolean {
    let environmentValue: string | number | undefined;

    switch (condition.name) {
      case 'timeOfDay':
        environmentValue = context.environment.timeOfDay;
        break;
      case 'weather':
        environmentValue = context.environment.weather;
        break;
      case 'moonPhase':
        environmentValue = context.environment.moonPhase;
        break;
      default:
        console.warn(`Unknown environment condition name: ${condition.name}`);
        return false;
    }

    if (environmentValue === undefined) {
      return false;
    }

    // For string values (timeOfDay, weather), default to equals comparison
    if (typeof environmentValue === 'string') {
      return environmentValue === condition.value;
    }

    // For numeric values (moonPhase), support operators
    if (typeof environmentValue === 'number' && typeof condition.value === 'number') {
      const operator = condition.operator || 'equals';
      switch (operator) {
        case 'equals':
          return environmentValue === condition.value;
        case 'greater_than':
          return environmentValue > condition.value;
        case 'less_than':
          return environmentValue < condition.value;
        default:
          console.warn(`Unknown environment condition operator: ${operator}`);
          return false;
      }
    }

    return false;
  }

  evaluateMultiple(
    conditions: ConditionUnion[], 
    context: GameContext, 
    mode: 'all' | 'any' = 'all'
  ): boolean {
    if (conditions.length === 0) return true;

    if (mode === 'all') {
      return conditions.every(condition => this.evaluate(condition, context));
    } else {
      return conditions.some(condition => this.evaluate(condition, context));
    }
  }
}