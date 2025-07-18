import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const charactersDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 会話ループ検出テスト ===');
console.log('🔍 無限ループや意図しない循環参照を検出します\n');

let totalLoops = 0;
let totalPaths = 0;
let allCharacterResults = [];

for (const character of characters) {
  console.log(`🔍 ${character.toUpperCase()} の検証:`);
  
  const characterDir = path.join(charactersDir, character);
  const allNodes = new Map();
  
  // 全ノードを読み込み
  const subDirs = ['start', 'neutral', 'end'];
  for (const subDir of subDirs) {
    const subDirPath = path.join(characterDir, subDir);
    if (fs.existsSync(subDirPath)) {
      const files = fs.readdirSync(subDirPath).filter(f => f.endsWith('.yaml'));
      for (const file of files) {
        const filePath = path.join(subDirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        
        if (data.dialogues) {
          for (const node of data.dialogues) {
            allNodes.set(node.id, node);
          }
        }
      }
    }
  }
  
  // 開始ノード（start/以下）を特定
  const startNodes = [];
  for (const [id, node] of allNodes) {
    if (id.includes('_start_')) {
      startNodes.push(node);
    }
  }
  
  console.log(`  📊 総ノード数: ${allNodes.size}`);
  console.log(`  🏁 開始ノード数: ${startNodes.length}`);
  
  let characterLoops = 0;
  let characterPaths = 0;
  const loopDetails = [];
  
  // 各開始ノードからループ検出
  for (const startNode of startNodes) {
    const result = detectLoopsFromNode(startNode, allNodes, new Set(), []);
    characterLoops += result.loops;
    characterPaths += result.paths;
    loopDetails.push(...result.details);
  }
  
  if (characterLoops > 0) {
    console.log(`  ❌ ループ検出: ${characterLoops}個のループが見つかりました`);
    for (const detail of loopDetails) {
      console.log(`    🔄 ${detail.type}: ${detail.path.join(' → ')}`);
    }
  } else {
    console.log(`  ✅ ループなし: 正常な会話フローです`);
  }
  
  console.log(`  📊 検証パス数: ${characterPaths}`);
  console.log('');
  
  totalLoops += characterLoops;
  totalPaths += characterPaths;
  
  allCharacterResults.push({
    character: character,
    loops: characterLoops,
    paths: characterPaths,
    details: loopDetails
  });
}

// 全体サマリー
console.log('=== 全体サマリー ===');
console.log(`総検証パス数: ${totalPaths}`);
console.log(`総ループ数: ${totalLoops}`);

if (totalLoops > 0) {
  console.log('❌ ループが検出されました！');
  console.log('\n=== 詳細な問題分析 ===');
  
  for (const result of allCharacterResults) {
    if (result.loops > 0) {
      console.log(`\n🔍 ${result.character.toUpperCase()} のループ詳細:`);
      for (const detail of result.details) {
        console.log(`  🔄 ${detail.type}:`);
        console.log(`     パス: ${detail.path.join(' → ')}`);
        console.log(`     ループ部分: ${detail.loopSection.join(' → ')}`);
      }
    }
  }
} else {
  console.log('✅ ループなし！全ての会話フローが正常です。');
}

function detectLoopsFromNode(startNode, allNodes, visited, path) {
  let loops = 0;
  let paths = 0;
  const details = [];
  
  function traverse(node, currentVisited, currentPath) {
    if (!node) return;
    
    // 現在のパスでノードを既に訪問していればループ
    if (currentVisited.has(node.id)) {
      loops++;
      const loopStartIndex = currentPath.indexOf(node.id);
      const loopSection = currentPath.slice(loopStartIndex);
      
      details.push({
        type: 'ループ検出',
        path: [...currentPath, node.id],
        loopSection: loopSection
      });
      return;
    }
    
    // 終了ノードに到達
    if (!node.choices || node.choices.length === 0) {
      paths++;
      return;
    }
    
    // 現在のノードを訪問済みに追加
    const newVisited = new Set(currentVisited);
    newVisited.add(node.id);
    const newPath = [...currentPath, node.id];
    
    // 各選択肢を辿る
    for (const choice of node.choices) {
      if (choice.next) {
        const nextNode = allNodes.get(choice.next);
        if (nextNode) {
          traverse(nextNode, newVisited, newPath);
        }
      }
    }
  }
  
  traverse(startNode, visited, path);
  
  return { loops, paths, details };
}

console.log('\n=== 検出完了 ===');