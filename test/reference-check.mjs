import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

// YAMLパーサーの設定：アンカー数制限を緩和
const yamlOptions = {
  maxAliasCount: 1000,
  merge: true
};

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 会話参照エラーチェック ===\n');

let totalErrors = 0;
let totalNodes = 0;
let totalReferences = 0;

// 各キャラクターの参照エラーをチェック
for (const character of characters) {
  console.log(`🔍 Checking ${character}:`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual', 'end'];
  
  // 全ノードを読み込み
  const allNodes = new Map();
  const allReferences = new Set();
  const fileNodes = new Map(); // どのファイルにノードが定義されているかを記録
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(characterDir, subdir);
    
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.yaml'));
      
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = yaml.parse(content, yamlOptions);
          
          if (data && data.dialogues) {
            console.log(`  📄 ${subdir}/${file}: ${data.dialogues.length} nodes`);
            
            data.dialogues.forEach(node => {
              if (allNodes.has(node.id)) {
                console.log(`  ⚠️  重複定義: ${node.id} (${subdir}/${file})`);
              }
              allNodes.set(node.id, node);
              fileNodes.set(node.id, `${subdir}/${file}`);
              totalNodes++;
            });
          }
        } catch (error) {
          console.log(`  ❌ ${subdir}/${file}: Parse error - ${error.message}`);
        }
      }
    }
  }
  
  // common-endings.yamlも確認
  const commonEndPath = path.join(dialogueDir, 'common-endings.yaml');
  if (fs.existsSync(commonEndPath)) {
    try {
      const content = fs.readFileSync(commonEndPath, 'utf8');
      const data = yaml.parse(content, yamlOptions);
      
      if (data && data.dialogues) {
        data.dialogues.forEach(node => {
          allNodes.set(node.id, node);
          fileNodes.set(node.id, 'common-endings.yaml');
        });
      }
    } catch (error) {
      console.log(`  ❌ common-endings.yaml: Parse error - ${error.message}`);
    }
  }
  
  // 参照の収集と検証
  const missingReferences = [];
  const characterReferences = [];
  
  for (const [nodeId, node] of allNodes) {
    // 選択肢の next 参照をチェック
    if (node.choices) {
      node.choices.forEach((choice, index) => {
        if (choice.next) {
          allReferences.add(choice.next);
          characterReferences.push({
            from: nodeId,
            to: choice.next,
            type: 'choice',
            index: index,
            file: fileNodes.get(nodeId)
          });
          totalReferences++;
          
          if (!allNodes.has(choice.next)) {
            missingReferences.push({
              from: nodeId,
              to: choice.next,
              type: 'choice',
              index: index,
              file: fileNodes.get(nodeId)
            });
          }
        }
      });
    }
    
    // 直接の next 参照をチェック
    if (node.next) {
      allReferences.add(node.next);
      characterReferences.push({
        from: nodeId,
        to: node.next,
        type: 'direct',
        file: fileNodes.get(nodeId)
      });
      totalReferences++;
      
      if (!allNodes.has(node.next)) {
        missingReferences.push({
          from: nodeId,
          to: node.next,
          type: 'direct',
          file: fileNodes.get(nodeId)
        });
      }
    }
  }
  
  // 結果表示
  if (missingReferences.length === 0) {
    console.log(`  ✅ 参照エラーなし (${characterReferences.length} 個の参照をチェック)`);
  } else {
    console.log(`  ❌ 参照エラー: ${missingReferences.length} 個`);
    
    missingReferences.forEach(ref => {
      if (ref.type === 'choice') {
        console.log(`    ${ref.file} > ${ref.from} > choice[${ref.index}] → ${ref.to} (missing)`);
      } else {
        console.log(`    ${ref.file} > ${ref.from} → ${ref.to} (missing)`);
      }
    });
    
    totalErrors += missingReferences.length;
  }
  
  console.log(`  📊 統計: ${allNodes.size} nodes, ${characterReferences.length} references`);
  console.log('');
}

// 全体サマリー
console.log('=== 全体サマリー ===');
console.log(`総ノード数: ${totalNodes}`);
console.log(`総参照数: ${totalReferences}`);

if (totalErrors === 0) {
  console.log('✅ 参照エラーなし！すべての参照が正常です。');
} else {
  console.log(`❌ 参照エラー: ${totalErrors} 個`);
  console.log('');
  console.log('🔧 推奨アクション:');
  console.log('1. 不足しているノードを追加する');
  console.log('2. 参照先のノードIDを修正する');
  console.log('3. 不要な参照を削除する');
}

// 追加統計
const errorRate = totalReferences > 0 ? (totalErrors / totalReferences * 100).toFixed(2) : 0;
console.log(`📈 エラー率: ${errorRate}%`);

// 終了コード
process.exit(totalErrors > 0 ? 1 : 0);