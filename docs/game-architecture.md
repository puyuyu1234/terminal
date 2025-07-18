# 廃駅ホームの待ち人 - ゲームアーキテクチャ設計

## 全体アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                 │
│  (UI Components / User Interaction)          │
├─────────────────────────────────────────────┤
│           Application Layer                  │
│  (Game Flow / Scene Management)              │
├─────────────────────────────────────────────┤
│           Domain Layer                       │
│  (Game Logic / Business Rules)               │
├─────────────────────────────────────────────┤
│           Infrastructure Layer               │
│  (State Persistence / External Services)     │
└─────────────────────────────────────────────┘
```

## コアシステム設計

### 1. 会話システム（Dialogue System）

#### 設計方針
- **拡張性最優先**: 新しい会話文を簡単に追加できる
- **条件分岐の柔軟性**: 複雑な条件でも読みやすく保守しやすい
- **データ駆動型**: コードとコンテンツの分離

#### 構成要素

```typescript
// 会話ノード定義
interface DialogueNode {
  id: string;
  speaker: CharacterId;
  text: string | TextTemplate;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  choices?: DialogueChoice[];
  next?: string | ConditionalNext[];
}

// テキストテンプレート（動的テキスト生成）
interface TextTemplate {
  template: string;
  variables?: Record<string, string | number>;
}

// 会話条件
interface DialogueCondition {
  type: 'flag' | 'variable' | 'visitCount' | 'custom';
  check: ConditionCheck;
}

// 選択肢
interface DialogueChoice {
  text: string;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  nextNodeId: string;
}
```

#### 会話フロー管理

```typescript
class DialogueManager {
  private currentNode: DialogueNode | null;
  private dialogueData: Map<string, DialogueNode>;
  private conditionEvaluator: ConditionEvaluator;
  private effectProcessor: EffectProcessor;
  
  async startDialogue(characterId: CharacterId, context: GameContext): Promise<void> {
    const startNode = this.selectStartNode(characterId, context);
    await this.processNode(startNode);
  }
  
  private selectStartNode(characterId: CharacterId, context: GameContext): DialogueNode {
    // キャラクターと現在の状態に基づいて開始ノードを選択
    const candidates = this.dialogueData.get(`${characterId}_start_nodes`);
    return this.conditionEvaluator.selectBestMatch(candidates, context);
  }
}
```

### 2. 状態管理システム（State Management）

#### グローバル状態

```typescript
interface GameState {
  // プレイヤー関連
  player: {
    totalVisits: number;
    silenceCount: number;
    lastVisitDate: string;
  };
  
  // キャラクター別状態
  characters: Map<CharacterId, CharacterState>;
  
  // フラグ管理
  flags: Set<string>;
  
  // 変数管理
  variables: Map<string, number>;
  
  // 会話履歴（軽量化のため最小限）
  history: DialogueHistory[];
}

interface CharacterState {
  meetCount: number;
  trustLevel: number;
  lastChoices: string[];
  specificFlags: Set<string>;
}
```

#### 永続化戦略

```typescript
class StateManager {
  private state: GameState;
  private storage: StateStorage;
  
  async save(): Promise<void> {
    // 最小限のデータのみ保存
    const minimalState = this.createMinimalState();
    await this.storage.save(minimalState);
  }
  
  private createMinimalState(): MinimalGameState {
    // 重要な状態のみを抽出
    return {
      visits: this.state.player.totalVisits,
      flags: Array.from(this.state.flags),
      characterData: this.compressCharacterData()
    };
  }
}
```

### 3. キャラクターシステム

```typescript
interface Character {
  id: CharacterId;
  name: string;
  dialogueSet: string; // 会話データセットのID
  appearanceConditions: AppearanceCondition[];
  personality: PersonalityTraits;
}

interface AppearanceCondition {
  type: 'random' | 'sequential' | 'conditional';
  weight?: number;
  conditions?: DialogueCondition[];
}

class CharacterManager {
  selectTonightCharacter(context: GameContext): Character {
    const candidates = this.getAllCharacters();
    const eligible = candidates.filter(char => 
      this.evaluateAppearanceConditions(char, context)
    );
    return this.weightedRandom(eligible);
  }
}
```

### 4. 会話データ形式（YAML例）

```yaml
# dialogues/shino.yaml
character: shino
nodes:
  - id: shino_first_meet
    text: "……誰？"
    conditions:
      - type: variable
        name: shino_meet_count
        operator: equals
        value: 0
    choices:
      - text: "ただの通りすがり"
        effects:
          - type: set_flag
            flag: shino_neutral_first
        next: shino_first_neutral
      - text: "..."
        effects:
          - type: increment
            variable: silence_count
          - type: set_flag
            flag: shino_silent_first
        next: shino_first_silent
    
  - id: shino_recurring_visit
    text: 
      template: "また来たんだ。{{count}}回目だよね。"
      variables:
        count: "{{shino_meet_count}}"
    conditions:
      - type: variable
        name: shino_meet_count
        operator: greater_than
        value: 0
```

### 5. エフェクトシステム

```typescript
interface DialogueEffect {
  type: 'set_flag' | 'increment' | 'decrement' | 'set_variable' | 'custom';
  target: string;
  value?: any;
}

class EffectProcessor {
  process(effects: DialogueEffect[], context: GameContext): void {
    effects.forEach(effect => {
      switch(effect.type) {
        case 'set_flag':
          context.state.flags.add(effect.target);
          break;
        case 'increment':
          const current = context.state.variables.get(effect.target) || 0;
          context.state.variables.set(effect.target, current + 1);
          break;
        // ... 他のエフェクト処理
      }
    });
  }
}
```

### 6. 条件評価システム

```typescript
class ConditionEvaluator {
  evaluate(condition: DialogueCondition, context: GameContext): boolean {
    switch(condition.type) {
      case 'flag':
        return this.evaluateFlagCondition(condition, context);
      case 'variable':
        return this.evaluateVariableCondition(condition, context);
      case 'visitCount':
        return this.evaluateVisitCondition(condition, context);
      case 'custom':
        return this.evaluateCustomCondition(condition, context);
    }
  }
  
  private evaluateFlagCondition(condition: FlagCondition, context: GameContext): boolean {
    return condition.expected === context.state.flags.has(condition.flag);
  }
}
```

## 拡張性のための設計パターン

### 1. プラグインシステム

```typescript
interface DialoguePlugin {
  name: string;
  conditions?: CustomConditionHandler[];
  effects?: CustomEffectHandler[];
  textProcessors?: TextProcessor[];
}

// カスタム条件の例
const weatherCondition: CustomConditionHandler = {
  type: 'weather',
  evaluate: (params, context) => {
    // 天候に基づく条件評価
    return context.environment.weather === params.expectedWeather;
  }
};
```

### 2. 会話イベントシステム

```typescript
interface DialogueEvent {
  type: 'node_enter' | 'choice_made' | 'dialogue_end';
  data: any;
}

class EventBus {
  private listeners: Map<string, EventListener[]>;
  
  emit(event: DialogueEvent): void {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach(handler => handler(event));
  }
}
```

### 3. テキスト処理パイプライン

```typescript
interface TextProcessor {
  priority: number;
  process(text: string, context: GameContext): string;
}

// 変数置換プロセッサ
class VariableReplacementProcessor implements TextProcessor {
  priority = 100;
  
  process(text: string, context: GameContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return context.state.variables.get(varName)?.toString() || match;
    });
  }
}
```

## ディレクトリ構造

```
src/
├── core/
│   ├── dialogue/
│   │   ├── DialogueManager.ts
│   │   ├── DialogueNode.ts
│   │   └── DialogueLoader.ts
│   ├── state/
│   │   ├── StateManager.ts
│   │   ├── GameState.ts
│   │   └── StateStorage.ts
│   └── character/
│       ├── CharacterManager.ts
│       └── Character.ts
├── plugins/
│   └── dialogue/
│       └── CustomConditions.ts
├── data/
│   ├── dialogues/
│   │   ├── shino.yaml
│   │   ├── minase.yaml
│   │   └── ...
│   └── characters/
│       └── characters.yaml
└── ui/
    ├── components/
    └── scenes/
```

## パフォーマンス考慮事項

1. **遅延読み込み**: 会話データは必要時にのみ読み込む
2. **キャッシング**: 頻繁にアクセスされる条件評価結果をキャッシュ
3. **最小限の状態保存**: 必要最小限のデータのみ永続化

## セキュリティ考慮事項

1. **入力検証**: ユーザー入力は必ず検証
2. **状態の整合性**: 不正な状態遷移を防ぐ
3. **データの暗号化**: セーブデータは必要に応じて暗号化