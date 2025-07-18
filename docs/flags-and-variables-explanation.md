# 記憶の断片と内なる変化の発生タイミング

## 📝 概要

「記録」画面で表示される「**記憶の断片**」（flags）と「**内なる変化**」（variables）がいつ発生するかの説明です。

## 🧠 記憶の断片（Flags）

### 現在の状況

現在のゲームでは、**記憶の断片は主に特別な効果やイベントで発生**します。

### 発生タイミング

#### 1. 特別な効果が発動した時

- `train_sound` - 電車の音効果

  - フラグ: `heard_train_sound`
  - 発生条件: カスタム効果が発動された時

- `deja_vu` - デジャヴ効果

  - フラグ: `experienced_deja_vu`
  - 発生条件: 記憶操作効果が発動された時

- `create_loop` - ループ効果
  - フラグ: `in_loop`
  - 発生条件: ループ作成効果が発動された時

#### 2. 信頼関係の発展（バックアップファイルに実装済み）

- `nazuna_feels_safe` - ナズナが安心感を感じる
  - 発生条件: 出会い回数 > 6 かつ 信頼度 > 50
- `nazuna_shares_equipment` - ナズナが録音機を見せる
  - 発生条件: 出会い回数 > 8 かつ 信頼度 > 60 かつ `nazuna_feels_safe`

### 実装されていない理由

現在の公開版では、**バックアップファイルにある高度な信頼関係システムが実装されていない**ため、記憶の断片が発生しにくくなっています。

## 🌱 内なる変化（Variables）

### 現在の状況

内なる変化は**すべての選択肢で発生**しており、プレイヤーの行動パターンを記録します。

### 発生タイミング

#### 1. 沈黙を選んだ時

```yaml
- text: "......（興味深そうに聞く）"
  effects:
    - type: increment
      variable: player_silence_count
      value: 1
```

#### 2. 共感的な選択をした時

```yaml
- text: "面白い趣味だね"
  effects:
    - type: increment
      variable: player_empathy_level
      value: 1
```

#### 3. 好奇心のある選択をした時

```yaml
- text: "どんな音が一番好き？"
  effects:
    - type: increment
      variable: player_curiosity_level
      value: 1
```

#### 4. キャラクター固有の変数

```yaml
- type: increment
  variable: nazuna.trust_level
  value: 1
- type: increment
  variable: nazuna.comfort_level
  value: 1
```

### 統計的な変数

- `player_silence_count` - 沈黙選択の回数
- `player_empathy_level` - 共感的選択の累積
- `player_curiosity_level` - 好奇心選択の累積
- `player_protective_instinct` - 保護的選択の累積
- `total_visits` - 総訪問回数
- `overall_tension` - 全体的な緊張度
- `mystery_level` - 神秘的要素の蓄積
- `emotional_depth` - 感情的深さ

## 💭 現在の問題と改善案

### 問題点

1. **記憶の断片の発生頻度が低い**

   - 現在は特別効果でのみ発生
   - プレイヤーが記憶の断片を体験しにくい

2. **信頼関係システムが未実装**
   - バックアップファイルの高度なフラグシステムが使用されていない

### 改善案

#### 1. 記憶の断片を増やす

```yaml
# 例：深い沈黙を選んだ時
- text: "......（長い沈黙）"
  effects:
    - type: increment
      variable: player_silence_count
      value: 1
    - type: set_flag
      flag: deep_silence_experienced
```

#### 2. 行動パターンによる記憶の断片

```yaml
# 例：共感レベルが高い時
conditions:
  - type: variable
    name: player_empathy_level
    operator: greater_than
    value: 5
effects:
  - type: set_flag
    flag: empathetic_nature_recognized
```

#### 3. キャラクター関係の記憶

```yaml
# 例：初回出会いの記憶
conditions:
  - type: variable
    name: character_encounter_count.nazuna
    operator: equals
    value: 1
effects:
  - type: set_flag
    flag: first_meeting_with_nazuna
```

## 🎯 記録画面での表示

### 現在の表示

- **記憶の断片**: カスタム効果で発生したフラグの数
- **内なる変化**: 各選択肢で増加する変数の総数

### 具体的な数値例

- 内なる変化: 約 20〜30 個（各選択肢で 1〜3 個ずつ増加）
- 記憶の断片: 0〜5 個（特別効果でのみ発生）

## 🚀 今後の実装予定

1. **バックアップファイルの信頼関係システムを復活**
2. **行動パターンによる自動フラグ発生**
3. **キャラクター固有の記憶システム**
4. **深い会話での特別な記憶生成**

この仕組みにより、プレイヤーの選択が「記憶の断片」と「内なる変化」として蓄積され、記録画面で自分の軌跡を振り返ることができるようになります。
