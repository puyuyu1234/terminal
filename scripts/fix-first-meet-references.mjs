#!/usr/bin/env node

/**
 * first_meet_end参照の修正スクリプト
 * first_meet_endへの参照をfirst_meet_continuationに変更
 */

import fs from 'fs';
import path from 'path';

const filesToFix = [
  'tomo/start/terminal-nodes.yaml',
  'tomo/start/first-meetings.yaml',
  'nazuna/start/terminal-nodes.yaml',
  'ayane/start/terminal-nodes.yaml',
  'minase/start/terminal-nodes.yaml',
  'ayane/start/anticipation-conversations.yaml'
];

console.log('=== first_meet_end参照修正スクリプト ===\n');

let totalFixed = 0;

for (const file of filesToFix) {
  const filePath = path.join('./public/data/dialogues', file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // first_meet_endへの参照を検索
    const firstMeetEndMatches = content.match(/next:\s*first_meet_end/g);
    
    if (firstMeetEndMatches) {
      // first_meet_endをfirst_meet_continuationに置換
      const newContent = content.replace(/next:\s*first_meet_end/g, 'next: first_meet_continuation');
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ ${file}: ${firstMeetEndMatches.length}個の参照を修正`);
      totalFixed += firstMeetEndMatches.length;
    } else {
      console.log(`📄 ${file}: 修正不要`);
    }
    
  } catch (error) {
    console.log(`❌ ${file}: エラー - ${error.message}`);
  }
}

console.log(`\n=== 修正結果 ===`);
console.log(`総修正数: ${totalFixed}`);

if (totalFixed > 0) {
  console.log(`\n✅ 修正が完了しました`);
  console.log(`🔧 テストを再実行して結果を確認してください`);
} else {
  console.log(`\n⚠️  修正が必要な箇所が見つかりませんでした`);
}