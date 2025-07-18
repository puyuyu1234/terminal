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

console.log('=== 最小会話ターン数チェック ===');
console.log('❌ 1-2ターンで終わる会話パスは許可されません\n');

// 全ファイルからノードを読み込む関数
function loadAllNodes(character) {
  const allNodes = new Map();
  const characterDir = path.join(dialogueDir, character);
  
  const subdirs = ['start', 'neutral', 'contextual', 'end'];
  
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
            data.dialogues.forEach(node => {
              allNodes.set(node.id, { ...node, sourceFile: `${subdir}/${file}` });
            });
          }
        } catch (error) {
          console.log(`  ❌ ${subdir}/${file}: Parse error - ${error.message}`);
        }
      }
    }
  }
  
  // common-endings.yamlも読み込み
  const commonEndPath = path.join(dialogueDir, 'common-endings.yaml');
  if (fs.existsSync(commonEndPath)) {
    try {
      const content = fs.readFileSync(commonEndPath, 'utf8');
      const data = yaml.parse(content, yamlOptions);
      
      if (data && data.dialogues) {
        data.dialogues.forEach(node => {
          allNodes.set(node.id, { ...node, sourceFile: 'common-endings.yaml' });
        });
      }
    } catch (error) {
      console.log(`  ❌ common-endings.yaml: Parse error - ${error.message}`);
    }
  }
  
  return allNodes;
}

// 全ての会話パスを詳細に追跡する関数
function traceAllConversationPaths(startNodeId, allNodes, visited = new Set(), currentPath = []) {
  if (visited.has(startNodeId)) {
    return []; // 循環参照を防ぐ
  }
  
  const node = allNodes.get(startNodeId);
  if (!node) {
    return [{
      path: [...currentPath, `${startNodeId} (MISSING)`],
      length: currentPath.length + 1,
      endType: 'missing_node'
    }];
  }
  
  visited.add(startNodeId);
  const newPath = [...currentPath, `${node.id} (${node.sourceFile})`];
  
  // 終了ノードの判定
  // 1. endディレクトリのノード
  // 2. end_dialogue_sessionエフェクトを持つノード
  // 3. 名前に'_end'を含むノード（共通終了ノード）
  if ((node.sourceFile && node.sourceFile.includes('end/')) ||
      (node.effects && node.effects.some(e => e.handler === 'end_dialogue_session')) ||
      (node.id.endsWith('_end') && (!node.choices || node.choices.length === 0))) {
    return [{
      path: newPath,
      length: newPath.length,
      endType: 'normal_end'
    }];
  }
  
  let allPaths = [];
  
  // 選択肢がある場合
  if (node.choices && node.choices.length > 0) {
    for (let i = 0; i < node.choices.length; i++) {
      const choice = node.choices[i];
      if (choice.next) {
        const paths = traceAllConversationPaths(choice.next, allNodes, new Set(visited), newPath);
        // 選択肢の情報を追加
        allPaths = allPaths.concat(paths.map(p => ({
          ...p,
          choiceInfo: `choice[${i}]: "${choice.text}" → ${choice.next}`
        })));
      }
    }
  }
  // 直接の次のノードがある場合
  else if (node.next) {
    const paths = traceAllConversationPaths(node.next, allNodes, new Set(visited), newPath);
    allPaths = allPaths.concat(paths.map(p => ({
      ...p,
      autoNext: `auto → ${node.next}`
    })));
  }
  
  return allPaths;
}

// 開始ノードを特定する関数
function findStartNodes(allNodes) {
  const startNodes = [];
  
  for (const [nodeId, node] of allNodes) {
    if (node.id.includes('start') || node.id === 'first_meet_bridge' || 
        (node.conditions && node.conditions.some(c => 
          c.name === 'meet_count' && c.operator === 'equals' && c.value === 0
        ))) {
      startNodes.push(nodeId);
    }
  }
  
  return startNodes;
}

let totalViolations = 0;
let totalPaths = 0;

// 各キャラクターの分析
for (const character of characters) {
  console.log(`🔍 ${character.toUpperCase()} の検証:`);
  
  const allNodes = loadAllNodes(character);
  const startNodes = findStartNodes(allNodes);
  
  console.log(`  📊 総ノード数: ${allNodes.size}`);
  console.log(`  🏁 開始ノード数: ${startNodes.length}`);
  
  if (startNodes.length === 0) {
    console.log(`  ⚠️  開始ノードが見つかりません\n`);
    continue;
  }
  
  // 全ての会話パスを詳細に追跡
  let allPaths = [];
  
  for (const startNode of startNodes) {
    const paths = traceAllConversationPaths(startNode, allNodes);
    allPaths = allPaths.concat(paths);
  }
  
  console.log(`  🔗 総会話パス数: ${allPaths.length}`);
  totalPaths += allPaths.length;
  
  // 1-2ターンの会話パスを検出
  const shortPaths = allPaths.filter(p => p.length <= 2);
  
  if (shortPaths.length > 0) {
    console.log(`  ❌ 違反: ${shortPaths.length}個の短すぎる会話パス`);
    totalViolations += shortPaths.length;
    
    shortPaths.forEach((pathInfo, index) => {
      console.log(`    ${index + 1}. ${pathInfo.length}ターン:`);
      console.log(`       パス: ${pathInfo.path.join(' → ')}`);
      if (pathInfo.choiceInfo) {
        console.log(`       選択: ${pathInfo.choiceInfo}`);
      }
      if (pathInfo.autoNext) {
        console.log(`       自動: ${pathInfo.autoNext}`);
      }
      console.log(`       終了: ${pathInfo.endType}`);
    });
  } else {
    console.log(`  ✅ 問題なし: 全ての会話パスが3ターン以上`);
  }
  
  // 3ターン以下の統計
  const threeTurnPaths = allPaths.filter(p => p.length <= 3);
  if (threeTurnPaths.length > 0) {
    const percentage = ((threeTurnPaths.length / allPaths.length) * 100).toFixed(1);
    console.log(`  📊 3ターン以下: ${threeTurnPaths.length}パス (${percentage}%)`);
  }
  
  console.log('');
}

// 全体サマリー
console.log('=== 検証結果 ===');
console.log(`総会話パス数: ${totalPaths}`);
console.log(`1-2ターン違反: ${totalViolations}個`);

if (totalViolations === 0) {
  console.log('✅ 全ての会話パスが3ターン以上で正常です！');
} else {
  console.log(`❌ ${totalViolations}個の会話パスが短すぎます`);
  console.log('');
  console.log('🔧 修正が必要なアクション:');
  console.log('1. 1-2ターンで終わるパスを特定');
  console.log('2. 該当ノードに選択肢を追加');
  console.log('3. 終了ノードを別のノードに変更');
  console.log('4. 自動継続ノードを追加');
}

// 終了コード
process.exit(totalViolations > 0 ? 1 : 0);