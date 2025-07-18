#!/usr/bin/env node

/**
 * 短すぎる会話パスの修正スクリプト
 * 1-2ターンで終わる会話パスを3ターン以上に延長
 */

import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const yamlOptions = {
  maxAliasCount: 1000,
  merge: true
};

console.log('=== 短すぎる会話パス修正スクリプト ===\n');

// 1. first_meet_endを直接参照している箇所を中間ノードに変更
function fixFirstMeetEnd() {
  const commonEndPath = './public/data/dialogues/common-endings.yaml';
  
  try {
    const content = fs.readFileSync(commonEndPath, 'utf8');
    const data = yaml.parse(content, yamlOptions);
    
    // first_meet_endを中間ノードに変更
    const firstMeetNode = data.nodes.find(node => node.id === 'first_meet_end');
    if (firstMeetNode) {
      // 選択肢を追加して会話を延長
      firstMeetNode.choices = [
        {
          text: "また話したいです",
          next: "first_meet_continuation"
        },
        {
          text: "この時間が心地よい",
          next: "first_meet_continuation"
        },
        {
          text: "...",
          next: "first_meet_continuation"
        }
      ];
      
      // 継続ノードを追加
      data.nodes.push({
        id: "first_meet_continuation",
        text: "そう言ってもらえると嬉しい。こうして話せて良かった。",
        choices: [
          {
            text: "僕も楽しかったです",
            next: "first_meet_positive_end"
          },
          {
            text: "新鮮な気持ちです",
            next: "first_meet_positive_end"
          },
          {
            text: "...",
            next: "first_meet_quiet_end"
          }
        ]
      });
      
      // 最終ノードを追加
      data.nodes.push({
        id: "first_meet_positive_end",
        text: "また会えるといいね。今日はありがとう。",
        effects: [
          {
            type: "custom",
            handler: "end_dialogue_session"
          }
        ],
        choices: []
      });
      
      data.nodes.push({
        id: "first_meet_quiet_end",
        text: "静かな時間も、とても大切だね。また会えるといいね。",
        effects: [
          {
            type: "custom",
            handler: "end_dialogue_session"
          }
        ],
        choices: []
      });
      
      // ファイルに書き戻し
      const newContent = yaml.stringify(data, { 
        indent: 2,
        lineWidth: 120,
        minContentWidth: 20
      });
      
      fs.writeFileSync(commonEndPath, newContent, 'utf8');
      console.log('✅ first_meet_end を3ターン会話に延長しました');
      return true;
    }
    
  } catch (error) {
    console.log(`❌ common-endings.yaml: エラー - ${error.message}`);
    return false;
  }
}

// 2. AYANEの2ターン会話パスを修正
function fixAyaneShortPaths() {
  const ayaneCharacterPath = './public/data/dialogues/ayane/contextual/character-specific.yaml';
  
  try {
    const content = fs.readFileSync(ayaneCharacterPath, 'utf8');
    const data = yaml.parse(content, yamlOptions);
    
    // 問題のあるノードを特定
    const problematicNodes = [
      'ayane_fresh_start_extended_conversation',
      'ayane_start_planning_extended_conversation',
      'ayane_deep_relationship_start_extended_conversation'
    ];
    
    let modified = false;
    
    for (const nodeId of problematicNodes) {
      const node = data.nodes.find(n => n.id === nodeId);
      if (node && node.choices) {
        // 直接終了ノードに行く選択肢を中間ノードに変更
        node.choices.forEach(choice => {
          if (['trust_end', 'deep_end', 'emotional_end'].includes(choice.next)) {
            choice.next = `${nodeId}_intermediate`;
            modified = true;
          }
        });
      }
    }
    
    if (modified) {
      // 中間ノードを追加
      for (const nodeId of problematicNodes) {
        data.nodes.push({
          id: `${nodeId}_intermediate`,
          text: "一緒に考える時間は素晴らしいですね。お互いの視点を交換することで、より深い理解が生まれます。",
          choices: [
            {
              text: "協力的な探求ですね",
              next: `${nodeId}_final_trust`
            },
            {
              text: "新しい発見がありました",
              next: `${nodeId}_final_deep`
            },
            {
              text: "心が通じ合います",
              next: `${nodeId}_final_emotional`
            }
          ]
        });
        
        // 最終ノードを追加
        data.nodes.push({
          id: `${nodeId}_final_trust`,
          text: "信頼関係が築けたようで嬉しいです。この絆を大切にしたいですね。",
          effects: [
            {
              type: "custom",
              handler: "end_dialogue_session"
            }
          ],
          choices: []
        });
        
        data.nodes.push({
          id: `${nodeId}_final_deep`,
          text: "深い洞察を共有できました。こうした対話が人生を豊かにしますね。",
          effects: [
            {
              type: "custom",
              handler: "end_dialogue_session"
            }
          ],
          choices: []
        });
        
        data.nodes.push({
          id: `${nodeId}_final_emotional`,
          text: "心のつながりを感じます。このような理解し合える関係に感謝しています。",
          effects: [
            {
              type: "custom",
              handler: "end_dialogue_session"
            }
          ],
          choices: []
        });
      }
      
      // ファイルに書き戻し
      const newContent = yaml.stringify(data, { 
        indent: 2,
        lineWidth: 120,
        minContentWidth: 20
      });
      
      fs.writeFileSync(ayaneCharacterPath, newContent, 'utf8');
      console.log('✅ AYANEの2ターン会話パスを3ターン以上に延長しました');
      return true;
    }
    
  } catch (error) {
    console.log(`❌ ayane/contextual/character-specific.yaml: エラー - ${error.message}`);
    return false;
  }
  
  return false;
}

// メイン処理
async function main() {
  console.log('🔧 短すぎる会話パスの修正を開始します...\n');
  
  const result1 = fixFirstMeetEnd();
  const result2 = fixAyaneShortPaths();
  
  if (result1 || result2) {
    console.log('\n✅ 修正が完了しました');
    console.log('🔧 テストを再実行して結果を確認してください');
  } else {
    console.log('\n⚠️  修正が必要な箇所が見つかりませんでした');
  }
}

main().catch(console.error);