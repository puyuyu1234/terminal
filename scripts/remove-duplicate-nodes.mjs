#!/usr/bin/env node

/**
 * 重複ノード除去スクリプト
 * 同じファイル内で重複定義されているノードを削除
 */

import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const yamlOptions = {
  maxAliasCount: 1000,
  merge: true
};

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 重複ノード除去スクリプト ===\n');

function removeDuplicateNodes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.parse(content, yamlOptions);
    
    if (!data || !data.nodes) {
      return { removed: 0, total: 0 };
    }
    
    const uniqueNodes = new Map();
    const duplicates = [];
    
    // 重複を検出し、最初の定義のみを保持
    data.nodes.forEach((node, index) => {
      if (uniqueNodes.has(node.id)) {
        duplicates.push({ id: node.id, index });
      } else {
        uniqueNodes.set(node.id, node);
      }
    });
    
    if (duplicates.length === 0) {
      return { removed: 0, total: data.nodes.length };
    }
    
    // 重複を除去
    data.nodes = Array.from(uniqueNodes.values());
    
    // ファイルに書き戻し
    const newContent = yaml.stringify(data, { 
      indent: 2,
      lineWidth: 120,
      minContentWidth: 20
    });
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`  ✅ ${path.basename(filePath)}: ${duplicates.length}個の重複ノードを除去`);
    duplicates.forEach(dup => {
      console.log(`    - ${dup.id}`);
    });
    
    return { removed: duplicates.length, total: data.nodes.length };
    
  } catch (error) {
    console.log(`  ❌ ${path.basename(filePath)}: エラー - ${error.message}`);
    return { removed: 0, total: 0 };
  }
}

let totalRemoved = 0;
let totalProcessed = 0;

for (const character of characters) {
  console.log(`🔍 Processing ${character}:`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual', 'end'];
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(characterDir, subdir);
    
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.yaml'));
      
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const result = removeDuplicateNodes(filePath);
        
        totalRemoved += result.removed;
        totalProcessed++;
      }
    }
  }
}

console.log(`\n=== 処理結果 ===`);
console.log(`処理ファイル数: ${totalProcessed}`);
console.log(`削除した重複ノード数: ${totalRemoved}`);

if (totalRemoved > 0) {
  console.log(`\n✅ 重複ノードの除去が完了しました`);
  console.log(`🔧 テストを再実行して結果を確認してください`);
} else {
  console.log(`\n✅ 重複ノードは見つかりませんでした`);
}