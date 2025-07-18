export type CharacterId = 'shino' | 'minase' | 'ayane' | 'nazuna' | 'tomo';

export interface DialogueNode {
  id: string;
  speaker: CharacterId;
  text: string | TextTemplate;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  choices?: DialogueChoice[];
  next?: string | ConditionalNext[];
}

export interface TextTemplate {
  template: string;
  variables?: Record<string, string | number>;
}

export interface DialogueCondition {
  type: 'flag' | 'variable' | 'visitCount' | 'custom' | 'environment';
  negate?: boolean;
}

export interface FlagCondition extends DialogueCondition {
  type: 'flag';
  flag: string;
  expected?: boolean;
}

export interface VariableCondition extends DialogueCondition {
  type: 'variable';
  name: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal';
  value: number;
}

export interface VisitCountCondition extends DialogueCondition {
  type: 'visitCount';
  character?: CharacterId;
  operator: 'equals' | 'greater_than' | 'less_than';
  value: number;
}

export interface CustomCondition extends DialogueCondition {
  type: 'custom';
  handler: string;
  params?: any;
}

export interface EnvironmentCondition extends DialogueCondition {
  type: 'environment';
  name: 'timeOfDay' | 'weather' | 'moonPhase';
  value: string | number;
  operator?: 'equals' | 'greater_than' | 'less_than';
}

export type ConditionUnion = FlagCondition | VariableCondition | VisitCountCondition | CustomCondition | EnvironmentCondition;

export interface DialogueEffect {
  type: 'set_flag' | 'remove_flag' | 'increment' | 'decrement' | 'set_variable' | 'custom';
  delay?: number;
}

export interface SetFlagEffect extends DialogueEffect {
  type: 'set_flag';
  flag: string;
}

export interface RemoveFlagEffect extends DialogueEffect {
  type: 'remove_flag';
  flag: string;
}

export interface IncrementEffect extends DialogueEffect {
  type: 'increment';
  variable: string;
  amount?: number;
}

export interface DecrementEffect extends DialogueEffect {
  type: 'decrement';
  variable: string;
  amount?: number;
}

export interface SetVariableEffect extends DialogueEffect {
  type: 'set_variable';
  variable: string;
  value: number;
}

export interface CustomEffect extends DialogueEffect {
  type: 'custom';
  handler: string;
  params?: any;
}

export type EffectUnion = SetFlagEffect | RemoveFlagEffect | IncrementEffect | DecrementEffect | SetVariableEffect | CustomEffect;

export interface DialogueChoice {
  id?: string;
  text: string;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  next: string;
}

export interface ConditionalNext {
  conditions: DialogueCondition[];
  nodeId: string;
}

export interface GameState {
  player: PlayerState;
  characters: Map<CharacterId, CharacterState>;
  flags: Set<string>;
  variables: Map<string, number>;
  history: DialogueHistoryEntry[];
}

export interface PlayerState {
  totalVisits: number;
  silenceCount: number;
  lastVisitDate: string;
  currentSessionStart: string;
}

export interface CharacterState {
  meetCount: number;
  trustLevel: number;
  lastChoices: string[];
  specificFlags: Set<string>;
  lastSeenDate?: string;
}

export interface DialogueHistoryEntry {
  characterId: CharacterId;
  nodeId: string;
  choiceMade?: string;
  timestamp: string;
}

export interface Character {
  id: CharacterId;
  name: string;
  dialogueSet: string;
  appearanceConditions: AppearanceCondition[];
  personality: PersonalityTraits;
}

export interface AppearanceCondition {
  type: 'random' | 'sequential' | 'conditional';
  weight?: number;
  conditions?: DialogueCondition[];
}

export interface PersonalityTraits {
  mysterious?: boolean;
  quiet?: boolean;
  looping?: boolean;
  futureKnowing?: boolean;
  childlike?: boolean;
}

export interface GameContext {
  state: GameState;
  currentCharacter: Character;
  currentNode?: DialogueNode;
  environment: GameEnvironment;
}

export interface GameEnvironment {
  timeOfDay: 'evening' | 'night' | 'late_night';
  weather?: 'clear' | 'foggy' | 'rainy';
  moonPhase?: number;
}

export interface DialogueEvent {
  type: 'node_enter' | 'choice_made' | 'dialogue_start' | 'dialogue_end';
  timestamp: string;
  data: any;
}

export interface TextProcessor {
  priority: number;
  process(text: string, context: GameContext): string;
}

export interface ConditionEvaluator {
  evaluate(condition: ConditionUnion, context: GameContext): boolean;
}

export interface EffectProcessor {
  process(effect: EffectUnion, context: GameContext): void;
}

export interface MinimalGameState {
  visits: number;
  flags: string[];
  characterData: { [key: string]: MinimalCharacterState };
  variables: { [key: string]: number };
}

export interface MinimalCharacterState {
  meetCount: number;
  trustLevel: number;
  flags: string[];
}