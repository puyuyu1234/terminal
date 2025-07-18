import type { VariableManager } from '../variables/VariableManager';

export interface VariableCondition {
  type: 'variable';
  if?: string;
  else?: boolean;
  text?: string;
  next?: string;
  probability?: number;
  effects?: Array<{
    type: 'increment' | 'set_variable' | 'custom';
    variable?: string;
    value?: any;
    handler?: string;
    params?: any;
  }>;
}

export interface VariableConditionContext {
  characterId?: string;
  sessionData?: Record<string, any>;
  [key: string]: any;
}

export class VariableConditionEvaluator {
  private variableManager: VariableManager;

  constructor(variableManager: VariableManager) {
    this.variableManager = variableManager;
  }

  evaluateConditions(conditions: VariableCondition[], context: VariableConditionContext): VariableCondition | null {
    if (!conditions || conditions.length === 0) {
      return null;
    }

    for (const condition of conditions) {
      // Handle probability-based selection first
      if (condition.probability !== undefined) {
        if (Math.random() >= condition.probability) {
          continue; // Skip this condition due to probability
        }
      }

      // Handle else condition (fallback)
      if (condition.else === true) {
        return condition;
      }

      // Handle if condition
      if (condition.if) {
        if (this.evaluateExpression(condition.if, context)) {
          return condition;
        }
      }

      // Handle condition without explicit if (assume it's always true)
      if (!condition.if && condition.else === undefined) {
        return condition;
      }
    }

    return null;
  }

  private evaluateExpression(expression: string, context: VariableConditionContext): boolean {
    try {
      // Parse complex expressions with logical operators
      if (expression.includes('&&')) {
        const parts = expression.split('&&').map(part => part.trim());
        return parts.every(part => this.evaluateSimpleExpression(part, context));
      }

      if (expression.includes('||')) {
        const parts = expression.split('||').map(part => part.trim());
        return parts.some(part => this.evaluateSimpleExpression(part, context));
      }

      return this.evaluateSimpleExpression(expression, context);
    } catch (error) {
      console.error('Error evaluating expression:', expression, error);
      return false;
    }
  }

  private evaluateSimpleExpression(expression: string, context: VariableConditionContext): boolean {
    // Remove quotes if present
    expression = expression.replace(/['"]/g, '');

    // Parse comparison operators
    const operators = ['>=', '<=', '==', '!=', '>', '<'];
    
    for (const operator of operators) {
      if (expression.includes(operator)) {
        const [left, right] = expression.split(operator).map(part => part.trim());
        
        const leftValue = this.resolveValue(left, context);
        const rightValue = this.resolveValue(right, context);
        
        return this.compareValues(leftValue, rightValue, operator);
      }
    }

    // Simple boolean expression (just variable name)
    const value = this.resolveValue(expression, context);
    return this.toBooleanValue(value);
  }

  private resolveValue(value: string, context: VariableConditionContext): any {
    // Handle literal values
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Handle variable references
    return this.variableManager.getVariable(value, context.characterId);
  }

  private compareValues(left: any, right: any, operator: string): boolean {
    switch (operator) {
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      default:
        return false;
    }
  }

  private toBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    if (typeof value === 'string') {
      return value.length > 0 && value.toLowerCase() !== 'false';
    }
    return !!value;
  }

  // Apply effects from a condition
  applyEffects(effects: Array<{
    type: 'increment' | 'set_variable' | 'custom';
    variable?: string;
    value?: any;
    handler?: string;
    params?: any;
  }>, context: VariableConditionContext): void {
    if (!effects) return;

    for (const effect of effects) {
      switch (effect.type) {
        case 'increment':
          if (effect.variable) {
            this.variableManager.incrementVariable(
              effect.variable,
              effect.value || 1,
              context.characterId
            );
          }
          break;
        
        case 'set_variable':
          if (effect.variable) {
            this.variableManager.setVariable(
              effect.variable,
              effect.value,
              context.characterId
            );
          }
          break;
        
        case 'custom':
          // Handle custom effects if needed
          console.log('Custom effect not implemented:', effect.handler);
          break;
      }
    }
  }

  // Evaluate probability-based selection
  evaluateProbabilitySelection(items: Array<{ probability?: number; [key: string]: any }>): any | null {
    if (!items || items.length === 0) {
      return null;
    }

    // Filter items that should be considered based on probability
    const candidateItems = items.filter(item => {
      if (item.probability === undefined) {
        return true; // Include items without probability
      }
      return Math.random() < item.probability;
    });

    if (candidateItems.length === 0) {
      return null;
    }

    // Return random item from candidates
    return candidateItems[Math.floor(Math.random() * candidateItems.length)];
  }

  // Check if all conditions in a group are met
  checkAllConditions(conditions: VariableCondition[], context: VariableConditionContext): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      if (condition.if && !this.evaluateExpression(condition.if, context)) {
        return false;
      }
    }

    return true;
  }
}