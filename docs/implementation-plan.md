# 実装計画：暗黒設定と変数システム

## 📋 実装概要

暗黒設定を踏まえた会話データの追加と、変数依存・変数分岐のある会話システムの実装を行う。

---

## 🎯 実装目標

### 1. 暗黒設定を踏まえた会話データの追加
- 各キャラクターの不穏な設定を会話に反映
- 直接的でない暗示的な表現で不安感を演出
- 段階的な開示により心理的効果を最大化

### 2. 変数依存・変数分岐のある会話システムの実装
- プレイヤーの選択履歴による会話内容の変化
- キャラクター固有の状態変数
- 条件分岐による動的な会話生成

---

## 🔧 技術実装

### 変数システムの設計

#### グローバル変数
```yaml
# 例：プレイヤーの全体的な行動パターン
player_silence_count: 0      # 沈黙を選んだ回数
player_empathy_level: 0      # 共感的な選択の回数
total_visits: 0              # 総訪問回数
night_progression: 0         # 夜の進行度
```

#### キャラクター固有変数
```yaml
# 例：詩乃の状態
shino_trust_level: 0         # 信頼度
shino_memory_fragments: 0    # 記憶の断片開示度
shino_anxiety_level: 0       # 不安度
shino_medication_hints: 0    # 薬物依存の暗示レベル

# 例：ミナセの状態
minase_prophecy_count: 0     # 予言した回数
minase_time_distortion: 0    # 時間歪曲の言及度
minase_death_hints: 0        # 死に関する暗示レベル
```

### 会話データの構造拡張

#### 基本的な条件分岐
```yaml
- id: shino_trust_check
  text: "{{player_name}}さん..."
  conditions:
    - if: "shino_trust_level >= 3"
      text: "実は、私... 薬を飲んでるの。記憶が、曖昧になるの。"
    - if: "shino_trust_level >= 1"
      text: "最近、同じ夢ばかり見るの。"
    - else:
      text: "今日は、いい天気ですね。"
  effects:
    - type: increment
      variable: shino_trust_level
      value: 1
```

#### 複合条件分岐
```yaml
- id: minase_time_warning
  text: "{{player_name}}、"
  conditions:
    - if: "minase_time_distortion >= 2 && total_visits >= 10"
      text: "あなたの時間、本当に止まってるよ？もう何回も同じことを繰り返してる。"
    - if: "minase_time_distortion >= 1"
      text: "時間って、不思議よね。戻ったり、飛んだり..."
    - else:
      text: "今、何時か分かる？"
```

---

## 📝 実装手順

### Phase 1: 変数システムの基盤構築
1. **変数定義ファイルの作成**
   - `public/data/variables/global-variables.yaml`
   - `public/data/variables/character-variables.yaml`

2. **DialogueLoader.tsの拡張**
   - 変数の読み込み機能
   - 条件分岐の評価エンジン
   - 変数の更新機能

3. **条件評価システムの実装**
   - if/else条件の解析
   - 複合条件（&&, ||）の対応
   - 比較演算子（>=, <=, ==, !=）の実装

### Phase 2: 暗黒設定を反映した会話データの作成

#### 詩乃（しの）の会話例
```yaml
# 薬物依存の暗示
- id: shino_medication_level1
  text: "頭痛がするの... いつものお薬、飲み忘れちゃった。"
  conditions:
    - if: "shino_trust_level >= 2"
  effects:
    - type: increment
      variable: shino_medication_hints
      value: 1

- id: shino_medication_level2
  text: "お薬... 最近、効かなくなってきたの。もう少し多めに飲んでも大丈夫かな？"
  conditions:
    - if: "shino_medication_hints >= 2 && shino_trust_level >= 4"
  effects:
    - type: increment
      variable: shino_medication_hints
      value: 1
```

#### ミナセの会話例
```yaml
# 時間ループの暗示
- id: minase_loop_hint1
  text: "また同じことを言うけど... 明日、雨が降るわよ。"
  conditions:
    - if: "minase_prophecy_count >= 3"
  effects:
    - type: increment
      variable: minase_time_distortion
      value: 1

- id: minase_death_hint1
  text: "死ぬ瞬間って、一瞬じゃないのよね。とても長く感じるの。"
  conditions:
    - if: "minase_time_distortion >= 2"
  effects:
    - type: increment
      variable: minase_death_hints
      value: 1
```

#### あやねの会話例
```yaml
# 多重人格の暗示
- id: ayane_personality_shift1
  text: "あ... ごめんなさい。今、何て言ったんだっけ？"
  conditions:
    - if: "ayane_trust_level >= 3"
  effects:
    - type: increment
      variable: ayane_personality_hints
      value: 1

- id: ayane_red_scarf_meaning
  text: "このマフラー... 赤いでしょ？汚れが目立たないから便利なの。"
  conditions:
    - if: "ayane_personality_hints >= 2"
  effects:
    - type: increment
      variable: ayane_dark_hints
      value: 1
```

### Phase 3: 高度な条件分岐の実装

#### 時間経過による変化
```yaml
- id: late_night_behavior
  text: "もう、こんな時間..."
  conditions:
    - if: "night_progression >= 5"
      text: "夜が深くなると、本当のことが言えるようになるの。"
    - else:
      text: "まだ早い時間ね。"
```

#### 選択履歴による変化
```yaml
- id: player_pattern_recognition
  text: "{{player_name}}って、"
  conditions:
    - if: "player_silence_count >= 5"
      text: "いつも黙ってるのね。何か、隠してるの？"
    - if: "player_empathy_level >= 3"
      text: "優しい人なのね。でも、優しすぎる人は危険よ。"
    - else:
      text: "不思議な人ね。"
```

### Phase 4: 心理的効果の最大化

#### 段階的な不安の演出
```yaml
# レベル1：違和感
- id: unease_level1
  text: "今日は、なんだか変な気分。"

# レベル2：具体的な異常
- id: unease_level2
  text: "昨日の記憶が、ぼやけてるの。"
  conditions:
    - if: "character_unease_level >= 2"

# レベル3：暗黒面の暗示
- id: unease_level3
  text: "私、本当は... 怖いことをしたことがあるの。"
  conditions:
    - if: "character_unease_level >= 4"
```

---

## 🎨 会話データの配置戦略

### 段階的開示システム
1. **初回（信頼度0-1）**: 表面的な違和感
2. **親密化（信頼度2-3）**: 具体的な異常の暗示
3. **深層（信頼度4-5）**: 暗黒設定の直接的暗示
4. **最深層（信頼度6+）**: 真実に近い告白（ただし曖昧さは保持）

### ファイル構成の更新
```
public/data/dialogues/[character]/
├── start/
├── neutral/
├── contextual/
│   ├── trust-building.yaml
│   ├── dark-hints.yaml          # 新規：暗黒設定の暗示
│   └── variable-dependent.yaml  # 新規：変数依存会話
└── end/
```

---

## 🧪 テスト計画

### 変数システムのテスト
1. **条件分岐テスト**: 各条件が正しく評価されるか
2. **変数更新テスト**: effectsが正しく変数を更新するか
3. **複合条件テスト**: 複雑な条件式が正しく動作するか

### 会話品質のテスト
1. **暗示の効果テスト**: 不安感が適切に演出されるか
2. **段階的開示テスト**: 信頼度に応じて適切な情報が開示されるか
3. **矛盾チェック**: 会話内容に論理的矛盾がないか

---

## 📊 実装完了の指標

### 技術的指標
- [ ] 全キャラクターで10個以上の変数依存会話
- [ ] 各キャラクターで5段階以上の段階的開示
- [ ] 最低50個の条件分岐会話ノード

### 体験的指標
- [ ] プレイヤーが「何か違う」と感じる演出の実現
- [ ] 複数回プレイでの異なる体験の提供
- [ ] 暗黒設定の自然な暗示の実現

---

## 🚀 今後の拡張予定

### 高度な変数システム
- 時間経過による自動変数変化
- キャラクター間の変数相互作用
- ランダム要素と変数の組み合わせ

### 心理的効果の向上
- 音響効果との連動
- 視覚的演出（テキスト表示の変化）
- メタ的な演出（プレイヤーの過去の選択への言及）

---

## 📝 注意事項

- 暗黒設定は直接的に描写せず、常に暗示に留める
- プレイヤーの想像力に委ねる部分を多く残す
- 変数システムはプレイヤーに意識されないよう自然に動作させる
- 会話の品質を保ちながら、技術的な複雑さを隠蔽する