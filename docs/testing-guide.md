# テストガイド - 廃駅ホームの待ち人

## 概要
このドキュメントでは、ゲームの会話システムやその他の機能をテストするためのコマンドとツールについて説明します。

## 開発環境の起動

### 開発サーバーの起動
```bash
npm run dev
```
- ローカル開発サーバーを起動
- ブラウザで http://localhost:5173/ にアクセス
- ホットリロード機能でリアルタイム開発

### ビルドとプレビュー
```bash
# プロダクションビルド
npm run build

# ビルド版のプレビュー
npm run preview
```

## 会話システムのテスト

### 1. 会話構造テスト
```bash
node test-dialogue-structure.mjs
```
**注意**: このファイルはプロジェクトルートに作成されます（必要に応じて）。

**機能:**
- 全キャラクターの会話ファイル構造をチェック
- 選択肢の有無、デッドエンドノード、session_end への直接参照を検証
- YAMLファイルの構文エラーを検出

**出力例:**
```
Testing shino:
  start.yaml: 65 nodes, 20 with choices, 21 direct to session_end, 0 dead ends
  neutral.yaml: 106 nodes, 65 with choices, 4 direct to session_end, 1 dead ends
  contextual.yaml: 30 nodes, 11 with choices, 0 direct to session_end, 0 dead ends
```

### 2. 包括的会話テスト（高度）
```bash
npx tsx src/test/comprehensive-dialogue-test.ts
```

**機能:**
- 全会話ノードの詳細分析
- ランダム選択によるパス検証
- 到達不可能なノードの検出
- 会話の平均長、成功率などの統計

### 3. 4ターン以上会話継続テスト
```bash
node test-4turn-conversation.mjs
```

**機能:**
- 各キャラクターで4ターン以上続く会話パスを検証
- 最長会話ターン数の測定
- 会話パスの具体例表示
- 各キャラクターの会話ボリューム比較

### 4. 手動テスト手順

#### ブラウザでの基本テスト
1. 開発サーバーを起動: `npm run dev`
2. ブラウザで http://localhost:5173/ にアクセス
3. 各キャラクターとの会話を開始
4. 選択肢を選んで会話の流れを確認

#### 確認すべきポイント
- [ ] 会話が適切に開始される
- [ ] 選択肢が表示される
- [ ] 選択後の会話が続く
- [ ] 4ターン以上の会話ができる
- [ ] 会話が適切に終了する
- [ ] 信頼度の変化が反映される

## ファイル構造の検証

### 会話ファイルの存在確認
```bash
ls -la public/data/dialogues/*/
```

各キャラクターフォルダに以下のファイルが存在することを確認:
- `start.yaml` - 開始会話
- `neutral.yaml` - 文脈非依存会話
- `contextual.yaml` - 文脈依存会話

### 終了会話ファイルの確認
```bash
ls -la public/data/dialogues/end.yaml
```

## コード品質チェック

### TypeScript型チェック
```bash
npm run typecheck
# または
npx tsc --noEmit
```

### Linting（利用可能な場合）
```bash
npm run lint
# または
npx eslint src/
```

## デバッグ用ツール

### 開発者ツールでの確認
1. ブラウザの開発者ツールを開く（F12）
2. Console タブでエラーやログを確認
3. Network タブでファイルの読み込み状況を確認

### YAMLファイルの構文チェック
```bash
# 個別ファイルの構文チェック
node -e "
const yaml = require('yaml');
const fs = require('fs');
try {
  const content = fs.readFileSync('public/data/dialogues/shino/start.yaml', 'utf8');
  yaml.parse(content);
  console.log('✅ Valid YAML');
} catch (error) {
  console.log('❌ YAML Error:', error.message);
}
"
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 会話が開始されない
```bash
# ファイルの存在確認
ls public/data/dialogues/*/start.yaml

# ファイル内容の確認
cat public/data/dialogues/shino/start.yaml | head -20
```

#### 2. 選択肢が表示されない
- `choices` プロパティが正しく設定されているか確認
- YAML のインデントが正しいか確認

#### 3. 会話が途中で止まる
- `next` プロパティで参照されているノードIDが存在するか確認
- 循環参照がないか確認

#### 4. ビルドエラー
```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュのクリア
npm run dev -- --force
```

## パフォーマンステスト

### 会話読み込み速度の測定
ブラウザの開発者ツールで以下を確認:
1. Network タブで YAML ファイルの読み込み時間
2. Performance タブで会話開始時の処理時間

### メモリ使用量の確認
```bash
# Node.js でのメモリ使用量確認（開発時）
node --max-old-space-size=4096 --inspect src/test/comprehensive-dialogue-test.ts
```

## 継続的インテグレーション

### 自動テストスクリプト例
```bash
#!/bin/bash
echo "Running all tests..."

# 1. 型チェック
echo "Type checking..."
npm run typecheck

# 2. 会話構造テスト
echo "Testing dialogue structure..."
node test-dialogue-structure.mjs

# 3. ビルドテスト
echo "Testing build..."
npm run build

echo "All tests completed!"
```

## テストデータの管理

### テスト用会話データの作成
テスト用の簡単な会話データを作成する場合:

```yaml
character: test
nodes:
  - id: test_start
    text: "テスト会話です"
    choices:
      - text: "選択肢1"
        next: test_choice1
      - text: "選択肢2"
        next: test_choice2
  
  - id: test_choice1
    text: "選択肢1を選びました"
    next: test_end
    
  - id: test_choice2
    text: "選択肢2を選びました"
    next: test_end
    
  - id: test_end
    text: "テスト終了"
```

---

## 補足情報

- 会話システムの詳細な設計については `docs/game-architecture.md` を参照
- ゲームの基本コンセプトについては `README.md` を参照
- Claude用の参照情報については `CLAUDE.md` を参照