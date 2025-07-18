import type { 
  Character, 
  CharacterId, 
  GameContext, 
  AppearanceCondition,
  DialogueCondition 
} from '@/types';
import { ConditionEvaluator } from '@/core/conditions/ConditionEvaluator';

export class CharacterManager {
  private characters: Map<CharacterId, Character> = new Map();
  private conditionEvaluator: ConditionEvaluator;
  private lastSelectedCharacter: CharacterId | null = null;

  constructor(conditionEvaluator: ConditionEvaluator) {
    this.conditionEvaluator = conditionEvaluator;
    this.initializeCharacters();
  }

  private initializeCharacters(): void {
    const characters: Character[] = [
      {
        id: 'shino',
        name: '坂口 詩乃',
        dialogueSet: 'shino',
        appearanceConditions: [
          {
            type: 'random',
            weight: 30
          },
          {
            type: 'conditional',
            conditions: [
              {
                type: 'variable',
                name: 'shino_meet_count',
                operator: 'greater_than',
                value: 3
              } as DialogueCondition
            ],
            weight: 50
          }
        ],
        personality: {
          mysterious: true,
          looping: true
        }
      },
      {
        id: 'minase',
        name: 'ミナセさん',
        dialogueSet: 'minase',
        appearanceConditions: [
          {
            type: 'random',
            weight: 20
          },
          {
            type: 'conditional',
            conditions: [
              {
                type: 'variable',
                name: 'player_visits',
                operator: 'greater_than',
                value: 5
              } as DialogueCondition
            ],
            weight: 40
          }
        ],
        personality: {
          mysterious: true,
          futureKnowing: true
        }
      },
      {
        id: 'ayane',
        name: '市ノ瀬 あやね',
        dialogueSet: 'ayane',
        appearanceConditions: [
          {
            type: 'random',
            weight: 25
          }
        ],
        personality: {
          childlike: true,
          looping: true
        }
      },
      {
        id: 'nazuna',
        name: 'なずな',
        dialogueSet: 'nazuna',
        appearanceConditions: [
          {
            type: 'random',
            weight: 15
          },
          {
            type: 'conditional',
            conditions: [
              {
                type: 'flag',
                flag: 'heard_train_sound'
              } as DialogueCondition
            ],
            weight: 60
          }
        ],
        personality: {
          quiet: true,
          mysterious: true
        }
      },
      {
        id: 'tomo',
        name: 'トモちゃん',
        dialogueSet: 'tomo',
        appearanceConditions: [
          {
            type: 'random',
            weight: 10
          },
          {
            type: 'conditional',
            conditions: [
              {
                type: 'variable',
                name: 'player_visits',
                operator: 'greater_than',
                value: 10
              } as DialogueCondition
            ],
            weight: 30
          }
        ],
        personality: {
          mysterious: true,
          childlike: true
        }
      }
    ];

    characters.forEach(char => {
      this.characters.set(char.id, char);
    });
  }

  getCharacter(id: CharacterId): Character | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  selectTonightCharacter(context: GameContext): Character {
    const candidates = this.getAllCharacters();
    const weightedCandidates = this.calculateWeights(candidates, context);
    
    // Prevent same character appearing consecutively (unless conditions force it)
    if (this.lastSelectedCharacter) {
      const lastCharWeight = weightedCandidates.find(
        c => c.character.id === this.lastSelectedCharacter
      );
      if (lastCharWeight && lastCharWeight.weight > 0) {
        lastCharWeight.weight *= 0.3; // Reduce weight by 70%
      }
    }

    const selected = this.weightedRandom(weightedCandidates);
    this.lastSelectedCharacter = selected.id;
    
    return selected;
  }

  private calculateWeights(
    characters: Character[], 
    context: GameContext
  ): Array<{ character: Character; weight: number }> {
    return characters.map(character => {
      let totalWeight = 0;

      character.appearanceConditions.forEach(condition => {
        if (this.evaluateAppearanceCondition(condition, context)) {
          totalWeight += condition.weight || 1;
        }
      });

      return { character, weight: totalWeight };
    });
  }

  private evaluateAppearanceCondition(
    condition: AppearanceCondition, 
    context: GameContext
  ): boolean {
    switch (condition.type) {
      case 'random':
        return true;
      
      case 'sequential':
        // Could implement sequential logic based on last appearances
        return true;
      
      case 'conditional':
        if (!condition.conditions || condition.conditions.length === 0) {
          return true;
        }
        return condition.conditions.every(cond => 
          this.conditionEvaluator.evaluate(cond as any, context)
        );
      
      default:
        return false;
    }
  }

  private weightedRandom(
    candidates: Array<{ character: Character; weight: number }>
  ): Character {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    
    if (totalWeight === 0) {
      // Fallback to equal probability if all weights are 0
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex].character;
    }

    let random = Math.random() * totalWeight;
    
    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) {
        return candidate.character;
      }
    }

    // Fallback (should not reach here)
    return candidates[0].character;
  }

  getCharactersByPersonality(trait: keyof Character['personality']): Character[] {
    return this.getAllCharacters().filter(char => char.personality[trait]);
  }

  addCustomCharacter(character: Character): void {
    this.characters.set(character.id, character);
  }

  removeCharacter(id: CharacterId): void {
    this.characters.delete(id);
  }
}