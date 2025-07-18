import type { TextProcessor, GameContext } from '@/types';

export class TextProcessorPipeline {
  private processors: TextProcessor[] = [];

  addProcessor(processor: TextProcessor): void {
    this.processors.push(processor);
    this.processors.sort((a, b) => b.priority - a.priority);
  }

  removeProcessor(processor: TextProcessor): void {
    const index = this.processors.indexOf(processor);
    if (index !== -1) {
      this.processors.splice(index, 1);
    }
  }

  process(text: string, context: GameContext): string {
    return this.processors.reduce((processedText, processor) => {
      return processor.process(processedText, context);
    }, text);
  }
}

export class VariableReplacementProcessor implements TextProcessor {
  priority = 100;

  process(text: string, context: GameContext): string {
    return text.replace(/\{\{([\w\.]+)\}\}/g, (match, varName) => {
      // Handle character-specific variables like character_encounter_count.minase
      if (varName.includes('.')) {
        const [baseVar, characterId] = varName.split('.');
        
        // Handle character encounter count
        if (baseVar === 'character_encounter_count') {
          const charState = context.state.characters.get(characterId);
          if (charState) {
            return String(charState.meetCount);
          }
          return '0';
        }
        
        // Handle character-specific variables
        const charState = context.state.characters.get(characterId);
        if (charState) {
          // Check if this is a trust level reference
          if (baseVar === 'trust_level') {
            return String(charState.trustLevel);
          }
          
          // Check character-specific flags or other properties
          if (charState.specificFlags && charState.specificFlags.has(baseVar)) {
            return '1';
          }
        }
        
        // Check if it's a variable with character qualifier
        const fullVarName = `${baseVar}.${characterId}`;
        const value = context.state.variables.get(fullVarName);
        if (value !== undefined) {
          return String(value);
        }
      }
      
      // Handle regular variables
      const value = context.state.variables.get(varName);
      if (value !== undefined) {
        return String(value);
      }

      switch (varName) {
        case 'player_visits':
          return String(context.state.player.totalVisits);
        case 'silence_count':
          return String(context.state.player.silenceCount);
        case 'character_name':
          return context.currentCharacter?.name || '';
        default:
          return match;
      }
    });
  }
}

export class ConditionalTextProcessor implements TextProcessor {
  priority = 90;

  process(text: string, context: GameContext): string {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    
    return text.replace(conditionalRegex, (_, condition, content) => {
      const conditionMet = this.evaluateSimpleCondition(condition, context);
      return conditionMet ? content : '';
    });
  }

  private evaluateSimpleCondition(condition: string, context: GameContext): boolean {
    if (context.state.flags.has(condition)) {
      return true;
    }

    const variable = context.state.variables.get(condition);
    if (variable !== undefined && variable > 0) {
      return true;
    }

    return false;
  }
}

export class TimeBasedTextProcessor implements TextProcessor {
  priority = 80;

  process(text: string, context: GameContext): string {
    const timeMap: Record<string, string> = {
      'evening': '夕方',
      'night': '夜',
      'late_night': '深夜'
    };

    return text.replace(/\{\{time_of_day\}\}/g, () => {
      return timeMap[context.environment.timeOfDay] || context.environment.timeOfDay;
    });
  }
}

export class CharacterStateTextProcessor implements TextProcessor {
  priority = 70;

  process(text: string, context: GameContext): string {
    if (!context.currentCharacter) return text;
    const characterState = context.state.characters.get(context.currentCharacter.id);
    if (!characterState) return text;

    return text
      .replace(/\{\{meet_count\}\}/g, String(characterState.meetCount))
      .replace(/\{\{trust_level\}\}/g, String(characterState.trustLevel))
      .replace(/\{\{last_choice\}\}/g, () => {
        const lastChoice = characterState.lastChoices[characterState.lastChoices.length - 1];
        return lastChoice || '';
      });
  }
}