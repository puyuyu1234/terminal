import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const charactersDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 重複テキスト検出テスト ===');
console.log('🔍 同じテキスト内容の会話ノードを検出します\n');

let totalDuplicates = 0;
let totalNodes = 0;
const allTexts = new Map(); // text -> [character, nodeId, filePath]
const duplicateGroups = new Map(); // text -> array of locations

for (const character of characters) {
  console.log(`🔍 ${character.toUpperCase()} の検証:`);
  
  const characterDir = path.join(charactersDir, character);
  let characterNodes = 0;
  let characterDuplicates = 0;
  
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
            characterNodes++;
            totalNodes++;
            
            const text = node.text.trim();
            const location = {
              character: character,
              nodeId: node.id,
              filePath: filePath.replace('./public/data/dialogues/', ''),
              text: text
            };
            
            // 沈黙を表す「......」とその変種は重複許容
            const isSilenceText = /^\.{3,}(\（.*\）)?$/.test(text);
            
            if (allTexts.has(text) && !isSilenceText) {
              // 重複発見
              if (!duplicateGroups.has(text)) {
                duplicateGroups.set(text, [allTexts.get(text)]);
              }
              duplicateGroups.get(text).push(location);
              characterDuplicates++;
            } else {
              allTexts.set(text, location);
            }
          }
        }
      }
    }
  }
  
  console.log(`  📊 ノード数: ${characterNodes}`);
  
  // キャラクター内重複チェック
  const characterTexts = new Map();
  let internalDuplicates = 0;
  
  for (const [text, locations] of duplicateGroups) {
    const characterLocations = locations.filter(loc => loc.character === character);
    if (characterLocations.length > 1) {
      internalDuplicates++;
      if (internalDuplicates === 1) {
        console.log(`  ❌ キャラクター内重複:`);
      }
      console.log(`    📄 "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      for (const loc of characterLocations) {
        console.log(`       - ${loc.nodeId} (${loc.filePath})`);
      }
    }
  }
  
  if (internalDuplicates === 0) {
    console.log(`  ✅ キャラクター内重複なし`);
  }
  
  console.log('');
}

// 全体重複分析
console.log('=== 全体重複分析 ===');
console.log(`総ノード数: ${totalNodes}`);
console.log(`重複グループ数: ${duplicateGroups.size}`);

if (duplicateGroups.size > 0) {
  console.log('❌ 重複テキストが検出されました！\n');
  
  // 重複の詳細分析
  const crossCharacterDuplicates = [];
  const withinCharacterDuplicates = [];
  
  for (const [text, locations] of duplicateGroups) {
    if (locations.length > 1) {
      const characters = new Set(locations.map(loc => loc.character));
      
      if (characters.size > 1) {
        // キャラクター間重複
        crossCharacterDuplicates.push({ text, locations });
      } else {
        // キャラクター内重複
        withinCharacterDuplicates.push({ text, locations });
      }
    }
  }
  
  if (crossCharacterDuplicates.length > 0) {
    console.log('🔄 キャラクター間重複:');
    for (const { text, locations } of crossCharacterDuplicates) {
      console.log(`\n  📄 "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      for (const loc of locations) {
        console.log(`     - ${loc.character}: ${loc.nodeId} (${loc.filePath})`);
      }
    }
  }
  
  if (withinCharacterDuplicates.length > 0) {
    console.log('\n🔄 キャラクター内重複:');
    for (const { text, locations } of withinCharacterDuplicates) {
      console.log(`\n  📄 "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      for (const loc of locations) {
        console.log(`     - ${loc.character}: ${loc.nodeId} (${loc.filePath})`);
      }
    }
  }
  
  // 統計情報
  console.log('\n=== 重複統計 ===');
  console.log(`キャラクター間重複: ${crossCharacterDuplicates.length}グループ`);
  console.log(`キャラクター内重複: ${withinCharacterDuplicates.length}グループ`);
  
  // 重複率
  const duplicateNodeCount = Array.from(duplicateGroups.values()).reduce((sum, locations) => sum + locations.length - 1, 0);
  const duplicateRate = ((duplicateNodeCount / totalNodes) * 100).toFixed(2);
  console.log(`重複率: ${duplicateRate}% (${duplicateNodeCount}/${totalNodes})`);
  
} else {
  console.log('✅ 重複テキストなし！全ての会話テキストが一意です。');
}

// 類似テキスト検出（オプション）
console.log('\n=== 類似テキスト検出 ===');
console.log('🔍 非常に似ているテキストを検出します（編集距離ベース）\n');

const similarTexts = [];
const textArray = Array.from(allTexts.entries());

for (let i = 0; i < textArray.length; i++) {
  for (let j = i + 1; j < textArray.length; j++) {
    const [text1, loc1] = textArray[i];
    const [text2, loc2] = textArray[j];
    
    // 短いテキストはスキップ
    if (text1.length < 20 || text2.length < 20) continue;
    
    const similarity = calculateSimilarity(text1, text2);
    
    // 類似度が80%以上の場合は類似テキストとして報告
    if (similarity > 0.8 && similarity < 1.0) {
      similarTexts.push({
        similarity: similarity,
        text1: text1,
        text2: text2,
        loc1: loc1,
        loc2: loc2
      });
    }
  }
}

if (similarTexts.length > 0) {
  console.log(`⚠️  類似テキスト検出: ${similarTexts.length}ペア`);
  
  // 類似度の高い順にソート
  similarTexts.sort((a, b) => b.similarity - a.similarity);
  
  for (const similar of similarTexts.slice(0, 5)) { // 上位5件のみ表示
    console.log(`\n  📊 類似度: ${(similar.similarity * 100).toFixed(1)}%`);
    console.log(`     1: "${similar.text1.substring(0, 60)}${similar.text1.length > 60 ? '...' : ''}"`);
    console.log(`        ${similar.loc1.character}: ${similar.loc1.nodeId} (${similar.loc1.filePath})`);
    console.log(`     2: "${similar.text2.substring(0, 60)}${similar.text2.length > 60 ? '...' : ''}"`);
    console.log(`        ${similar.loc2.character}: ${similar.loc2.nodeId} (${similar.loc2.filePath})`);
  }
  
  if (similarTexts.length > 5) {
    console.log(`\n  ... 他 ${similarTexts.length - 5} ペア`);
  }
} else {
  console.log('✅ 類似テキストなし');
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

console.log('\n=== 検出完了 ===');