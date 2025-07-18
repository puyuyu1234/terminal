import { parse } from 'yaml';
import type { DialogueNode, CharacterId } from '@/types';

export interface DialogueDataSource {
  loadDialogue(characterId: CharacterId): Promise<DialogueNode[]>;
}

export class YAMLDialogueLoader implements DialogueDataSource {
  private baseUrl: string;
  private cache: Map<CharacterId, DialogueNode[]> = new Map();

  constructor(baseUrl?: string) {
    // 本番環境とdev環境で適切なベースURLを設定
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else {
      // Viteのベースパスを考慮
      const viteBase = import.meta.env.BASE_URL || '/';
      this.baseUrl = viteBase === '/' ? '/data/dialogues' : `${viteBase}data/dialogues`;
    }
    console.log('[DialogueLoader] Base URL:', this.baseUrl);
  }

  async loadDialogue(characterId: CharacterId): Promise<DialogueNode[]> {
    // Check cache first
    const cached = this.cache.get(characterId);
    if (cached) {
      return cached;
    }

    try {
      const genreDirectories = ['start', 'neutral', 'contextual'];
      const allNodes: DialogueNode[] = [];

      for (const genreDir of genreDirectories) {
        try {
          const genreNodes = await this.loadGenreDirectory(characterId, genreDir);
          allNodes.push(...genreNodes);
        } catch (error) {
          console.warn(`Failed to load ${genreDir} dialogue directory for ${characterId}:`, error);
        }
      }

      try {
        const endNodes = await this.loadEndDirectory(characterId);
        allNodes.push(...endNodes);
      } catch (error) {
        console.warn(`Failed to load end directory for ${characterId}:`, error);
      }

      try {
        const response = await fetch(`${this.baseUrl}/common-endings.yaml`);
        if (response.ok) {
          const yamlText = await response.text();
          const data = parse(yamlText);
          const endNodes = this.validateAndTransformNodes(data.dialogues || [], characterId);
          allNodes.push(...endNodes);
        }
      } catch (error) {
        console.warn(`Failed to load common-endings.yaml for ${characterId}:`, error);
      }

      this.cache.set(characterId, allNodes);
      return allNodes;
    } catch (error) {
      console.error(`Error loading dialogue for ${characterId}:`, error);
      return [];
    }
  }

  private async loadGenreDirectory(characterId: CharacterId, genreDir: string): Promise<DialogueNode[]> {
    const allNodes: DialogueNode[] = [];
    
    const genreFiles: Record<string, string[]> = {
      'start': ['first-meeting.yaml'],
      'neutral': ['topics.yaml'], 
      'contextual': ['conversations.yaml', 'dialogues.yaml', 'personality-quirks.yaml', 'prophetic-visions.yaml', 'sound-memories.yaml', 'forgotten-memories.yaml', 'reality-manipulation.yaml'],
      'end': ['goodbye.yaml']
    };
    
    const filesToTry = genreFiles[genreDir];
    if (!filesToTry) {
      throw new Error(`Unknown genre directory: ${genreDir}`);
    }
    
    for (const fileName of filesToTry) {
      try {
        await this.loadSingleFile(characterId, genreDir, fileName, allNodes);
      } catch (error) {
        console.warn(`Failed to load ${characterId}/${genreDir}/${fileName}:`, error);
      }
    }
    
    return allNodes;
  }

  private async loadSingleFile(characterId: CharacterId, genreDir: string, fileName: string, allNodes: DialogueNode[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${characterId}/${genreDir}/${fileName}`);
      if (response.ok) {
        const yamlText = await response.text();
        const data = parse(yamlText);
        const nodes = this.validateAndTransformNodes(data.dialogues || [], characterId);
        allNodes.push(...nodes);
      } else {
        throw new Error(`Failed to load ${characterId}/${genreDir}/${fileName}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`Error loading ${characterId}/${genreDir}/${fileName}:`, error);
      throw error;
    }
  }

  private async loadEndDirectory(characterId: CharacterId): Promise<DialogueNode[]> {
    const allNodes: DialogueNode[] = [];
    
    const endFiles = ['goodbye.yaml'];
    
    for (const fileName of endFiles) {
      await this.loadSingleFile(characterId, 'end', fileName, allNodes);
    }

    return allNodes;
  }

  private validateAndTransformNodes(rawNodes: any[], characterId: CharacterId): DialogueNode[] {
    return rawNodes.map((node, index) => {
      if (!node.id) {
        throw new Error(`Node at index ${index} is missing required 'id' field`);
      }

      if (!node.text && !node.textTemplate) {
        throw new Error(`Node ${node.id} is missing required 'text' field`);
      }

      // Transform the node to match our TypeScript interface
      const transformedNode: DialogueNode = {
        id: node.id,
        speaker: node.speaker || characterId,
        text: node.textTemplate ? {
          template: node.textTemplate.template || node.textTemplate,
          variables: node.textTemplate.variables || {}
        } : node.text,
        conditions: this.transformConditions(node.conditions),
        effects: this.transformEffects(node.effects),
        choices: this.transformChoices(node.choices),
        next: node.next
      };

      return transformedNode;
    });
  }

  private transformConditions(conditions: any): any[] | undefined {
    if (!conditions) return undefined;
    
    return conditions.map((condition: any) => {
      if (condition.type === 'variable') {
        return {
          type: 'variable',
          name: condition.name,
          operator: condition.operator,
          value: condition.value,
          negate: condition.negate
        } as any;
      } else if (condition.type === 'flag') {
        return {
          type: 'flag',
          flag: condition.flag,
          expected: condition.expected !== false,
          negate: condition.negate
        } as any;
      } else if (condition.type === 'visitCount') {
        return {
          type: 'visitCount',
          character: condition.character,
          operator: condition.operator,
          value: condition.value,
          negate: condition.negate
        } as any;
      } else if (condition.type === 'custom') {
        return {
          type: 'custom',
          handler: condition.handler,
          params: condition.params,
          negate: condition.negate
        } as any;
      }
      
      return condition;
    });
  }

  private transformEffects(effects: any): any[] | undefined {
    if (!effects) return undefined;
    
    return effects.map((effect: any) => {
      if (effect.type === 'set_flag') {
        return {
          type: 'set_flag',
          flag: effect.flag,
          delay: effect.delay
        } as any;
      } else if (effect.type === 'increment') {
        return {
          type: 'increment',
          variable: effect.variable,
          amount: effect.amount || 1,
          delay: effect.delay
        } as any;
      } else if (effect.type === 'set_variable') {
        return {
          type: 'set_variable',
          variable: effect.variable,
          value: effect.value,
          delay: effect.delay
        } as any;
      } else if (effect.type === 'custom') {
        return {
          type: 'custom',
          handler: effect.handler,
          params: effect.params,
          delay: effect.delay
        } as any;
      }
      
      return effect;
    });
  }

  private transformChoices(choices: any): any[] | undefined {
    if (!choices) return undefined;
    
    return choices.map((choice: any, index: number) => ({
      id: choice.id || `choice_${index}`,
      text: choice.text,
      conditions: this.transformConditions(choice.conditions),
      effects: this.transformEffects(choice.effects),
      next: choice.next
    }));
  }

  clearCache(): void {
    this.cache.clear();
  }

  preloadDialogues(characterIds: CharacterId[]): Promise<void[]> {
    return Promise.all(
      characterIds.map(id => this.loadDialogue(id).then(() => {}))
    );
  }
}

// Static dialogue loader for development/testing
export class StaticDialogueLoader implements DialogueDataSource {
  private dialogues: Map<CharacterId, DialogueNode[]> = new Map();

  constructor() {
    this.initializeStaticDialogues();
  }

  private initializeStaticDialogues(): void {
    // Sample dialogue for Shino
    this.dialogues.set('shino', [
      {
        id: 'shino_first_meet',
        speaker: 'shino',
        text: '……誰？',
        conditions: [{
          type: 'variable',
          name: 'shino_meet_count',
          operator: 'equals',
          value: 0
        } as any],  // TODO: Fix type compatibility
        choices: [
          {
            text: 'ただの通りすがり',
            effects: [{
              type: 'set_flag',
              flag: 'shino_neutral_first'
            } as any],  // TODO: Fix type compatibility
            next: 'shino_first_neutral'
          },
          {
            text: '...',
            effects: [
              {
                type: 'increment',
                variable: 'silence_count'
              } as any,  // TODO: Fix type compatibility
              {
                type: 'set_flag',
                flag: 'shino_silent_first'
              } as any   // TODO: Fix type compatibility
            ],
            next: 'shino_first_silent'
          }
        ]
      },
      {
        id: 'shino_first_neutral',
        speaker: 'shino',
        text: 'そう。……私も、誰かを待ってるの。',
        effects: [{
          type: 'custom',
          handler: 'modify_trust',
          params: { amount: 5 }
        } as any]  // TODO: Fix type compatibility
      },
      {
        id: 'shino_first_silent',
        speaker: 'shino',
        text: '……話したくないなら、いいよ。私も同じだから。',
        effects: [{
          type: 'custom',
          handler: 'modify_trust',
          params: { amount: 10 }
        } as any]  // TODO: Fix type compatibility
      },
      {
        id: 'shino_recurring_start',
        speaker: 'shino',
        text: {
          template: 'また来たんだ。{{meet_count}}回目だよね。',
          variables: {}
        },
        conditions: [{
          type: 'variable',
          name: 'shino_meet_count',
          operator: 'greater_than',
          value: 0
        } as any],  // TODO: Fix type compatibility
        choices: [
          {
            text: '覚えてるんだ',
            next: 'shino_remember_response'
          },
          {
            text: 'そうだったかな',
            effects: [{
              type: 'set_flag',
              flag: 'shino_doubt_memory'
            } as any],  // TODO: Fix type compatibility
            next: 'shino_doubt_response'
          }
        ]
      }
    ]);

    // Add more character dialogues as needed...
  }

  async loadDialogue(characterId: CharacterId): Promise<DialogueNode[]> {
    return this.dialogues.get(characterId) || [];
  }
}