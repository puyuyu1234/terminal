import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

// YAMLパーサーの設定：アンカー数制限を緩和
const yamlOptions = {
  maxAliasCount: 1000,
  merge: true
};

const dialogueDir = './public/data/dialogues';

console.log('=== 終了ノード検証 ===');
console.log('❌ 終了ノードは選択肢を持ってはいけません\n');

const endingNodeIds = [
  'contextual_end', 'trust_end', 'emotional_end', 'memory_end', 'deep_end',
  'silence_end', 'first_meet_end', 'special_end', 'hopeful_end',
  'shino_session_end', 'minase_session_end', 'ayane_session_end', 
  'nazuna_session_end', 'tomo_session_end'
];

let totalViolations = 0;

// 共通終了ノードファイルをチェック
const commonEndPath = path.join(dialogueDir, 'common-endings.yaml');
if (fs.existsSync(commonEndPath)) {
  console.log('🔍 共通終了ノードファイルの検証:');
  
  try {
    const content = fs.readFileSync(commonEndPath, 'utf8');
    const data = yaml.parse(content, yamlOptions);
    
    if (data && data.nodes) {
      data.nodes.forEach(node => {
        if (endingNodeIds.includes(node.id)) {
          if (node.choices && node.choices.length > 0) {
            console.log(`  ❌ ${node.id}: 終了ノードが${node.choices.length}個の選択肢を持っています`);
            totalViolations++;
          } else {
            console.log(`  ✅ ${node.id}: 正常な終了ノード`);
          }
        }
      });
    }
  } catch (error) {
    console.log(`  ❌ common-endings.yaml: Parse error - ${error.message}`);
  }
} else {
  console.log('⚠️ common-endings.yaml が見つかりません');
}

// 各キャラクターのendディレクトリをチェック
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

for (const character of characters) {
  const characterEndDir = path.join(dialogueDir, character, 'end');
  
  if (fs.existsSync(characterEndDir)) {
    console.log(`\n🔍 ${character.toUpperCase()} の終了ノードファイルの検証:`);
    
    const files = fs.readdirSync(characterEndDir).filter(f => f.endsWith('.yaml'));
    
    for (const file of files) {
      const filePath = path.join(characterEndDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.parse(content, yamlOptions);
        
        if (data && data.nodes) {
          data.nodes.forEach(node => {
            if (endingNodeIds.includes(node.id)) {
              if (node.choices && node.choices.length > 0) {
                console.log(`  ❌ ${file} > ${node.id}: 終了ノードが${node.choices.length}個の選択肢を持っています`);
                totalViolations++;
              } else {
                console.log(`  ✅ ${file} > ${node.id}: 正常な終了ノード`);
              }
            }
          });
        }
      } catch (error) {
        console.log(`  ❌ ${file}: Parse error - ${error.message}`);
      }
    }
  } else {
    console.log(`\n⚠️ ${character} の終了ノードディレクトリが見つかりません`);
  }
}

console.log('\n=== 検証結果 ===');
console.log(`終了ノード違反: ${totalViolations}個`);

if (totalViolations === 0) {
  console.log('✅ 全ての終了ノードが正常です！');
} else {
  console.log(`❌ ${totalViolations}個の終了ノードが選択肢を持っています`);
  console.log('\n🔧 修正が必要なアクション:');
  console.log('1. 終了ノードから選択肢を削除');
  console.log('2. 必要に応じて会話ファイルに中間ノードを追加');
}

// 終了コード
process.exit(totalViolations > 0 ? 1 : 0);