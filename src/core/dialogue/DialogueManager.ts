import type { 
  DialogueNode, 
  DialogueChoice, 
  CharacterId, 
  GameContext,
  ConditionalNext,
  TextTemplate
} from '@/types';
import { ConditionEvaluator } from '@/core/conditions/ConditionEvaluator';
import { EffectProcessor } from '@/core/effects/EffectProcessor';
import { EventBus } from '@/core/events/EventBus';
import { TextProcessorPipeline } from './TextProcessorPipeline';

export class DialogueManager {
  private currentNode: DialogueNode | null = null;
  private dialogueData: Map<string, DialogueNode> = new Map();
  private conditionEvaluator: ConditionEvaluator;
  private effectProcessor: EffectProcessor;
  private eventBus: EventBus;
  private textProcessor: TextProcessorPipeline;
  private nodeHistory: string[] = [];

  constructor(
    conditionEvaluator: ConditionEvaluator,
    effectProcessor: EffectProcessor,
    eventBus: EventBus,
    textProcessor: TextProcessorPipeline
  ) {
    this.conditionEvaluator = conditionEvaluator;
    this.effectProcessor = effectProcessor;
    this.eventBus = eventBus;
    this.textProcessor = textProcessor;
  }

  async loadDialogueData(characterId: CharacterId, data: DialogueNode[]): Promise<void> {
    data.forEach(node => {
      this.dialogueData.set(`${characterId}_${node.id}`, node);
    });
  }

  async startDialogue(characterId: CharacterId, context: GameContext): Promise<void> {
    this.nodeHistory = [];
    
    const startNode = this.selectStartNode(characterId, context);
    if (!startNode) {
      throw new Error(`No valid start node found for character ${characterId}`);
    }

    this.eventBus.emit({
      type: 'dialogue_start',
      timestamp: new Date().toISOString(),
      data: { characterId, startNodeId: startNode.id }
    });

    await this.processNode(startNode, context);
  }

  private selectStartNode(characterId: CharacterId, context: GameContext): DialogueNode | null {
    const possibleNodes = Array.from(this.dialogueData.values())
      .filter(node => node.speaker === characterId && node.id.includes('start'));

    const validNodes = possibleNodes.filter(node => {
      if (!node.conditions || node.conditions.length === 0) return true;
      return node.conditions.every(condition => 
        this.conditionEvaluator.evaluate(condition as any, context)
      );
    });

    if (validNodes.length === 0) return null;

    validNodes.sort((a, b) => (b.conditions?.length || 0) - (a.conditions?.length || 0));
    
    return validNodes[0];
  }

  async processNode(node: DialogueNode, context: GameContext): Promise<void> {
    this.currentNode = node;
    this.nodeHistory.push(node.id);

    this.eventBus.emit({
      type: 'node_enter',
      timestamp: new Date().toISOString(),
      data: { nodeId: node.id, speaker: node.speaker }
    });

    if (node.effects) {
      node.effects.forEach(effect => {
        this.effectProcessor.process(effect as any, context);
      });
    }

    // If this node has no choices but has a next property, auto-continue
    if ((!node.choices || node.choices.length === 0) && node.next) {
      const nextNode = await this.getNextNode(node.next, context);
      if (nextNode) {
        await this.processNode(nextNode, context);
      }
    }
  }

  getCurrentNodeText(context: GameContext): string {
    if (!this.currentNode) return '';

    let text: string;
    if (typeof this.currentNode.text === 'string') {
      text = this.currentNode.text;
    } else {
      text = this.processTemplate(this.currentNode.text, context);
    }

    return this.textProcessor.process(text, context);
  }

  private processTemplate(template: TextTemplate, context: GameContext): string {
    let result = template.template;
    
    if (template.variables) {
      Object.entries(template.variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }

    result = result.replace(/{{(\w+)}}/g, (match, varName) => {
      const value = context.state.variables.get(varName);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  getAvailableChoices(context: GameContext): DialogueChoice[] {
    if (!this.currentNode || !this.currentNode.choices) return [];

    return this.currentNode.choices.filter(choice => {
      if (!choice.conditions || choice.conditions.length === 0) return true;
      return choice.conditions.every(condition => 
        this.conditionEvaluator.evaluate(condition as any, context)
      );
    });
  }

  async makeChoice(choiceIndex: number, context: GameContext): Promise<DialogueNode | null> {
    const choices = this.getAvailableChoices(context);
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      throw new Error('Invalid choice index');
    }

    const choice = choices[choiceIndex];

    this.eventBus.emit({
      type: 'choice_made',
      timestamp: new Date().toISOString(),
      data: { 
        choiceId: choice.id || `choice_${choiceIndex}`,
        choiceText: choice.text,
        nodeId: this.currentNode?.id
      }
    });

    if (choice.effects) {
      choice.effects.forEach(effect => {
        this.effectProcessor.process(effect as any, context);
      });
    }

    const characterState = context.state.characters.get(context.currentCharacter.id);
    if (characterState) {
      characterState.lastChoices.push(choice.id || choice.text);
      if (characterState.lastChoices.length > 10) {
        characterState.lastChoices.shift();
      }
    }

    return this.getNextNode(choice.next, context);
  }

  private async getNextNode(
    next: string | ConditionalNext[] | undefined, 
    context: GameContext
  ): Promise<DialogueNode | null> {
    console.log('[DialogueManager] getNextNode called with:', { next, currentNodeId: this.currentNode?.id });
    
    if (!next) {
      console.log('[DialogueManager] No next parameter, checking current node next');
      if (!this.currentNode?.next) {
        console.log('[DialogueManager] No next node - dialogue should end');
        return null;
      }
      next = this.currentNode.next;
    }

    let nextNodeId: string | null = null;

    if (typeof next === 'string') {
      nextNodeId = next;
      console.log('[DialogueManager] Next node ID (string):', nextNodeId);
    } else if (Array.isArray(next)) {
      console.log('[DialogueManager] Processing conditional next:', next);
      for (const conditional of next) {
        const allConditionsMet = conditional.conditions.every(condition =>
          this.conditionEvaluator.evaluate(condition as any, context)
        );
        if (allConditionsMet) {
          nextNodeId = conditional.nodeId;
          console.log('[DialogueManager] Found matching conditional next:', nextNodeId);
          break;
        }
      }
    }

    if (!nextNodeId) {
      console.log('[DialogueManager] No valid next node ID found - returning null');
      return null;
    }

    const nodeKey = `${context.currentCharacter.id}_${nextNodeId}`;
    console.log('[DialogueManager] Looking for node:', nodeKey);
    const nextNode = this.dialogueData.get(nodeKey);
    if (nextNode) {
      console.log('[DialogueManager] Found next node:', nextNode.id);
      await this.processNode(nextNode, context);
      return nextNode;
    }

    console.log('[DialogueManager] Node not found in dialogue data - returning null');
    return null;
  }

  endDialogue(context: GameContext): void {
    this.eventBus.emit({
      type: 'dialogue_end',
      timestamp: new Date().toISOString(),
      data: { 
        characterId: context.currentCharacter.id,
        nodesVisited: this.nodeHistory.length,
        nodeHistory: [...this.nodeHistory]
      }
    });

    this.currentNode = null;
    this.nodeHistory = [];
  }

  getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  getNodeHistory(): string[] {
    return [...this.nodeHistory];
  }
}