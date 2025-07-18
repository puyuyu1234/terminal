# 廃駅ホームの待ち人 - Claude用参照ドキュメント

## プロジェクト概要
夕暮れの廃駅で少女たちと会話する、エンドレスな体験型ゲーム。

## 重要な参照ファイル
- `/README.md` - ゲームの基本コンセプト、世界観、キャラクター設定
- `/docs/game-architecture.md` - ゲームシステムの詳細設計
- `/docs/testing-guide.md` - テストコマンドと手順の一覧

## 会話システムの基本ルール

### 1. 会話ファイル構造
- `start/`: 開始会話のバリエーション
- `neutral/`: 無難な会話（日常、天候、時間、一般話題別）
- `contextual/`: 文脈依存会話（信頼構築、深い会話、感情的瞬間）
- `end/`: 終了会話（セッション、文脈、中立、特殊別）

### 2. 終了ノードの重要なルール
**❌ 絶対禁止**: 終了ノード（`end/`ディレクトリ内）に `choices` を設定してはいけない
**✅ 正しい終了ノード形式**:
```yaml
- id: example_end
  text: "会話の終了メッセージ"
  effects:
    - type: custom
      handler: end_dialogue_session
  choices: []  # 必ず空配列、または省略
```

### 3. 品質保証
- 全会話パスが最低3ターン以上
- 参照エラーゼロを保証
- 自動継続ノード：選択肢のないノードは自動的に次のノードに進む

### 4. ファイル配置のルール
**❌ 絶対禁止**: 新しいテストファイル（`.mjs`）やドキュメント（`.md`）をルートディレクトリに作成してはいけない
**✅ 正しい配置**:
- テストファイル → `test/` ディレクトリ内
- ドキュメント → `docs/` ディレクトリ内
- 一時的なスクリプト → `scripts/` ディレクトリ内（必要に応じて作成）

## 開発コマンド
```bash
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド
npm run preview    # ビルド版のプレビュー
```

## テストコマンド
```bash
node test/reference-check.mjs                 # 参照エラーチェック
node test/minimum-conversation-length.mjs     # 最小会話ターン数チェック
node test/conversation-length-distribution.mjs # 会話ターン数分布統計
node test/dialogue-health-check.mjs           # 会話システム健全性チェック
```

## プロジェクト構造
```
public/data/dialogues/  # 会話データ（YAML）
├── common-endings.yaml # 共通終了会話
└── [character_name]/
    ├── start/          # 開始会話バリエーション
    ├── neutral/        # 無難な会話
    ├── contextual/     # 文脈依存会話
    └── end/            # 終了会話（choicesは禁止）

test/                   # テストツール
├── reference-check.mjs            # 参照エラーチェック
├── minimum-conversation-length.mjs # 最小会話ターン数チェック
├── conversation-length-distribution.mjs # 会話ターン数分布統計
└── dialogue-health-check.mjs      # 会話システム健全性チェック
```