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

console.log('=== 会話ターン数分布統計 ===\n');

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
          
          if (data && data.nodes) {
            data.nodes.forEach(node => {
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
      const data = yaml.parse(content);
      
      if (data && data.nodes) {
        data.nodes.forEach(node => {
          allNodes.set(node.id, { ...node, sourceFile: 'common-endings.yaml' });
        });
      }
    } catch (error) {
      console.log(`  ❌ common-endings.yaml: Parse error - ${error.message}`);
    }
  }
  
  return allNodes;
}

// 会話パスの長さを計算する関数
function calculateConversationLength(startNodeId, allNodes, visited = new Set()) {
  if (visited.has(startNodeId)) {
    return 0; // 循環参照を防ぐ
  }
  
  const node = allNodes.get(startNodeId);
  if (!node) {
    return 0; // ノードが見つからない
  }
  
  visited.add(startNodeId);
  
  // 終了ノードの判定
  // 1. endディレクトリのノード
  // 2. end_dialogue_sessionエフェクトを持つノード
  // 3. 名前に'_end'を含むノード（共通終了ノード）
  if ((node.sourceFile && node.sourceFile.includes('end/')) ||
      (node.effects && node.effects.some(e => e.handler === 'end_dialogue_session')) ||
      (node.id.endsWith('_end') && (!node.choices || node.choices.length === 0))) {
    return 1;
  }
  
  let maxLength = 1;
  
  // 選択肢がある場合
  if (node.choices && node.choices.length > 0) {
    for (const choice of node.choices) {
      if (choice.next) {
        const length = calculateConversationLength(choice.next, allNodes, new Set(visited));
        maxLength = Math.max(maxLength, 1 + length);
      }
    }
  }
  // 直接の次のノードがある場合
  else if (node.next) {
    const length = calculateConversationLength(node.next, allNodes, new Set(visited));
    maxLength = 1 + length;
  }
  
  return maxLength;
}

// 全ての会話パスの長さを計算する関数（制限付き）
function calculateAllConversationPaths(startNodeId, allNodes, visited = new Set(), currentPath = [], maxDepth = 15) {
  if (visited.has(startNodeId) || currentPath.length > maxDepth) {
    return []; // 循環参照を防ぐ・深すぎるパスを防ぐ
  }
  
  const node = allNodes.get(startNodeId);
  if (!node) {
    return []; // ノードが見つからない
  }
  
  visited.add(startNodeId);
  const newPath = [...currentPath, startNodeId];
  
  // 終了ノードの判定
  if (node.effects && node.effects.some(effect => effect.handler === 'end_session') ||
      node.id.includes('session_end') || node.id.includes('contextual_end') || 
      (!node.choices && !node.next)) {
    return [newPath];
  }
  
  let allPaths = [];
  
  // 選択肢がある場合
  if (node.choices && node.choices.length > 0) {
    for (const choice of node.choices) {
      if (choice.next) {
        const paths = calculateAllConversationPaths(choice.next, allNodes, new Set(visited), newPath, maxDepth);
        allPaths = allPaths.concat(paths);
      }
    }
  }
  // 直接の次のノードがある場合
  else if (node.next) {
    const paths = calculateAllConversationPaths(node.next, allNodes, new Set(visited), newPath, maxDepth);
    allPaths = allPaths.concat(paths);
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

let totalPaths = 0;
let totalDistribution = {};

// 各キャラクターの分析
for (const character of characters) {
  console.log(`🔍 ${character.toUpperCase()} の分析:`);
  
  const allNodes = loadAllNodes(character);
  const startNodes = findStartNodes(allNodes);
  
  console.log(`  📊 総ノード数: ${allNodes.size}`);
  console.log(`  🏁 開始ノード数: ${startNodes.length}`);
  
  if (startNodes.length === 0) {
    console.log(`  ⚠️  開始ノードが見つかりません\n`);
    continue;
  }
  
  // 全ての会話パスを計算
  let allPaths = [];
  let pathLengths = [];
  
  for (const startNode of startNodes) {
    const paths = calculateAllConversationPaths(startNode, allNodes);
    allPaths = allPaths.concat(paths);
  }
  
  // パスの長さを計算
  pathLengths = allPaths.map(path => path.length);
  
  console.log(`  🔗 総会話パス数: ${pathLengths.length}`);
  
  if (pathLengths.length === 0) {
    console.log(`  ⚠️  有効な会話パスが見つかりません\n`);
    continue;
  }
  
  // 長さ別の分布を計算
  const distribution = {};
  for (const length of pathLengths) {
    distribution[length] = (distribution[length] || 0) + 1;
  }
  
  // 分布の表示
  console.log(`  📈 会話ターン数分布:`);
  const sortedLengths = Object.keys(distribution).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const length of sortedLengths) {
    const count = distribution[length];
    const percentage = ((count / pathLengths.length) * 100).toFixed(1);
    console.log(`    ${length}ターン: ${count}パス (${percentage}%)`);
  }
  
  // 統計情報
  const minLength = pathLengths.length > 0 ? Math.min(...pathLengths.slice(0, 10000)) : 0;
  const maxLength = pathLengths.length > 0 ? Math.max(...pathLengths.slice(0, 10000)) : 0;
  const avgLength = pathLengths.length > 0 ? (pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length).toFixed(1) : 0;
  
  console.log(`  📊 統計:`);
  console.log(`    最短: ${minLength}ターン`);
  console.log(`    最長: ${maxLength}ターン`);
  console.log(`    平均: ${avgLength}ターン`);
  
  // 3ターン以下のパスの割合
  const shortPaths = pathLengths.filter(length => length <= 3).length;
  const shortPercentage = ((shortPaths / pathLengths.length) * 100).toFixed(1);
  console.log(`    3ターン以下: ${shortPaths}パス (${shortPercentage}%)`);
  
  // 全体統計に追加
  totalPaths += pathLengths.length;
  for (const length of pathLengths) {
    totalDistribution[length] = (totalDistribution[length] || 0) + 1;
  }
  
  console.log('');
}

// 全体サマリー
console.log('=== 全体サマリー ===');
console.log(`総会話パス数: ${totalPaths}`);

if (totalPaths > 0) {
  console.log(`\n📈 全体の会話ターン数分布:`);
  const sortedLengths = Object.keys(totalDistribution).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const length of sortedLengths) {
    const count = totalDistribution[length];
    const percentage = ((count / totalPaths) * 100).toFixed(1);
    console.log(`  ${length}ターン: ${count}パス (${percentage}%)`);
  }
  
  // 全体統計
  const allLengths = [];
  for (const length in totalDistribution) {
    for (let i = 0; i < totalDistribution[length]; i++) {
      allLengths.push(parseInt(length));
    }
  }
  
  const minLength = allLengths.length > 0 ? Math.min(...allLengths.slice(0, 10000)) : 0;
  const maxLength = allLengths.length > 0 ? Math.max(...allLengths.slice(0, 10000)) : 0;
  const avgLength = allLengths.length > 0 ? (allLengths.reduce((a, b) => a + b, 0) / allLengths.length).toFixed(1) : 0;
  
  console.log(`\n📊 全体統計:`);
  console.log(`  最短: ${minLength}ターン`);
  console.log(`  最長: ${maxLength}ターン`);
  console.log(`  平均: ${avgLength}ターン`);
  
  // 3ターン以下のパスの割合
  const shortPaths = allLengths.filter(length => length <= 3).length;
  const shortPercentage = ((shortPaths / totalPaths) * 100).toFixed(1);
  console.log(`  3ターン以下: ${shortPaths}パス (${shortPercentage}%)`);
  
  // 4ターン以上のパスの割合
  const longPaths = allLengths.filter(length => length >= 4).length;
  const longPercentage = ((longPaths / totalPaths) * 100).toFixed(1);
  console.log(`  4ターン以上: ${longPaths}パス (${longPercentage}%)`);
}

console.log('\n=== 分析完了 ===');