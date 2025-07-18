import type { DialogueNode, CharacterId } from '@/types';
import type { VariableManager } from '../variables/VariableManager';
import type { VariableConditionEvaluator, VariableCondition } from '../conditions/VariableConditionEvaluator';

export interface VariableDialogueContext {
  characterId: CharacterId;
  sessionDuration: number;
  nightProgression: number;
  totalVisits: number;
  currentChoiceId?: string;
}

export interface VariableDialogueNode extends DialogueNode {
  conditions?: VariableCondition[];
  probability?: number;
  effects?: Array<{
    type: 'increment' | 'set_variable' | 'custom';
    variable?: string;
    value?: any;
    handler?: string;
    params?: any;
  }>;
}

export class VariableDialogueManager {
  private variableManager: VariableManager;
  private conditionEvaluator: VariableConditionEvaluator;

  constructor(variableManager: VariableManager, conditionEvaluator: VariableConditionEvaluator) {
    this.variableManager = variableManager;
    this.conditionEvaluator = conditionEvaluator;
  }

  // Select appropriate dialogue node based on conditions and variables
  selectDialogueNode(
    availableNodes: VariableDialogueNode[], 
    context: VariableDialogueContext
  ): VariableDialogueNode | null {
    const candidateNodes: VariableDialogueNode[] = [];

    for (const node of availableNodes) {
      // Check if node meets all conditions
      if (this.nodeMatchesConditions(node, context)) {
        candidateNodes.push(node);
      }
    }

    if (candidateNodes.length === 0) {
      return null;
    }

    // Select based on probability if specified
    const selectedNode = this.selectNodeByProbability(candidateNodes);
    
    if (selectedNode) {
      // Apply effects from selected node
      this.applyNodeEffects(selectedNode, context);
    }

    return selectedNode;
  }

  // Check if a node's conditions are met
  private nodeMatchesConditions(node: VariableDialogueNode, context: VariableDialogueContext): boolean {
    if (!node.conditions || node.conditions.length === 0) {
      return true;
    }

    // Create condition context
    const conditionContext = {
      characterId: context.characterId,
      sessionData: {
        session_duration: context.sessionDuration,
        night_progression: context.nightProgression,
        total_visits: context.totalVisits
      }
    };

    // Evaluate conditions
    const matchingCondition = this.conditionEvaluator.evaluateConditions(node.conditions, conditionContext);
    return matchingCondition !== null;
  }

  // Select node based on probability
  private selectNodeByProbability(nodes: VariableDialogueNode[]): VariableDialogueNode | null {
    if (nodes.length === 0) {
      return null;
    }

    // Separate nodes with and without probability
    const nodesWithProbability = nodes.filter(node => node.probability !== undefined);
    const nodesWithoutProbability = nodes.filter(node => node.probability === undefined);

    // First, try to select from nodes with probability
    if (nodesWithProbability.length > 0) {
      const selectedWithProbability = this.conditionEvaluator.evaluateProbabilitySelection(nodesWithProbability);
      if (selectedWithProbability) {
        return selectedWithProbability;
      }
    }

    // Fallback to nodes without probability
    if (nodesWithoutProbability.length > 0) {
      return nodesWithoutProbability[Math.floor(Math.random() * nodesWithoutProbability.length)];
    }

    return null;
  }

  // Apply effects from a selected node
  private applyNodeEffects(node: VariableDialogueNode, context: VariableDialogueContext): void {
    if (!node.effects) return;

    const conditionContext = {
      characterId: context.characterId,
      sessionData: {
        session_duration: context.sessionDuration,
        night_progression: context.nightProgression,
        total_visits: context.totalVisits
      }
    };

    this.conditionEvaluator.applyEffects(node.effects, conditionContext);
  }

  // Process variable-dependent text
  processVariableText(text: string, context: VariableDialogueContext): string {
    // Replace variable placeholders in text
    return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      const value = this.variableManager.getVariable(variableName, context.characterId);
      return value !== undefined ? String(value) : match;
    });
  }

  // Get variable-dependent choices
  getVariableChoices(
    choices: Array<{
      text: string;
      conditions?: VariableCondition[];
      effects?: Array<{
        type: 'increment' | 'set_variable' | 'custom';
        variable?: string;
        value?: any;
        handler?: string;
        params?: any;
      }>;
      next?: string;
    }>,
    context: VariableDialogueContext
  ): Array<{ text: string; next?: string; effects?: any[] }> {
    const validChoices: Array<{ text: string; next?: string; effects?: any[] }> = [];

    for (const choice of choices) {
      // Check if choice meets conditions
      if (choice.conditions) {
        const conditionContext = {
          characterId: context.characterId,
          sessionData: {
            session_duration: context.sessionDuration,
            night_progression: context.nightProgression,
            total_visits: context.totalVisits
          }
        };

        const matchingCondition = this.conditionEvaluator.evaluateConditions(choice.conditions, conditionContext);
        if (!matchingCondition) {
          continue; // Skip this choice if conditions not met
        }
      }

      // Process variable text in choice
      const processedText = this.processVariableText(choice.text, context);
      
      validChoices.push({
        text: processedText,
        next: choice.next,
        effects: choice.effects
      });
    }

    return validChoices;
  }

  // Apply effects from a choice
  applyChoiceEffects(
    effects: Array<{
      type: 'increment' | 'set_variable' | 'custom';
      variable?: string;
      value?: any;
      handler?: string;
      params?: any;
    }>,
    context: VariableDialogueContext
  ): void {
    const conditionContext = {
      characterId: context.characterId,
      sessionData: {
        session_duration: context.sessionDuration,
        night_progression: context.nightProgression,
        total_visits: context.totalVisits
      }
    };

    this.conditionEvaluator.applyEffects(effects, conditionContext);
  }

  // Update session variables
  updateSessionVariables(context: VariableDialogueContext): void {
    // Update session duration
    this.variableManager.setVariable('session_duration', context.sessionDuration);
    
    // Update night progression
    this.variableManager.setVariable('night_progression', context.nightProgression);
    
    // Update total visits
    this.variableManager.setVariable('total_visits', context.totalVisits);
    
    // Update character encounter count
    const currentCount = this.variableManager.getVariable(`character_encounter_count.${context.characterId}`) || 0;
    this.variableManager.setVariable(`character_encounter_count.${context.characterId}`, currentCount + 1);
  }

  // Get debug information
  getDebugInfo(context: VariableDialogueContext): Record<string, any> {
    return {
      variables: this.variableManager.getAllVariables(),
      context: context,
      characterVariables: this.variableManager.getVariable('*', context.characterId)
    };
  }
}