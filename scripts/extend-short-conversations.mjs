import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 2ターン会話延長スクリプト ===\n');

// 2ターンで終了する会話を3ターンに延長する
// 戦略：直接終了ノードに向かう選択肢に中間ノードを追加

const endingNodes = [
  'session_end', 'contextual_end', 'special_end', 'trust_end', 'deep_end',
  'silence_end', 'first_meet_end', 'emotional_end', 'memory_end', 'hopeful_end'
];

// 各キャラクターの特有終了ノードも追加
const characterEndingNodes = {
  'shino': ['shino_session_end', 'shino_loneliness_end'],
  'minase': ['minase_session_end'],
  'ayane': ['ayane_session_end', 'ayane_contextual_end', 'ayane_neutral_end'],
  'nazuna': ['nazuna_session_end'],
  'tomo': ['tomo_session_end']
};

// 中間ノードテンプレート
const intermediateNodeTemplates = {
  'contextual_end': {
    suffix: '_bridge',
    text: 'そうですね...。',
    choices: [
      { text: 'そう思います', next: 'contextual_end' },
      { text: 'なるほど', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'silence_end': {
    suffix: '_quiet_bridge',
    text: '...',
    choices: [
      { text: 'そうですね', next: 'contextual_end' },
      { text: 'はい', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'first_meet_end': {
    suffix: '_first_bridge',
    text: '初めて会った時のことは覚えています。',
    choices: [
      { text: '僕もです', next: 'first_meet_end' },
      { text: '印象的でした', next: 'memory_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'memory_end': {
    suffix: '_memory_bridge',
    text: '思い出すと、心が温かくなります。',
    choices: [
      { text: '良い思い出ですね', next: 'memory_end' },
      { text: '大切な記憶です', next: 'emotional_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'emotional_end': {
    suffix: '_emotion_bridge',
    text: '感情を共有できるのは嬉しいです。',
    choices: [
      { text: '僕も嬉しいです', next: 'emotional_end' },
      { text: '心が通じますね', next: 'trust_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'trust_end': {
    suffix: '_trust_bridge',
    text: '信頼関係を築けて良かったです。',
    choices: [
      { text: '僕も信頼しています', next: 'trust_end' },
      { text: 'お互い様ですね', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'hopeful_end': {
    suffix: '_hope_bridge',
    text: '希望を感じられるのは素晴らしいことです。',
    choices: [
      { text: '前向きになれます', next: 'hopeful_end' },
      { text: '未来が楽しみです', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'deep_end': {
    suffix: '_deep_bridge',
    text: '深い話ができて意味がありました。',
    choices: [
      { text: '有意義でした', next: 'deep_end' },
      { text: '理解が深まりました', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  },
  'special_end': {
    suffix: '_special_bridge',
    text: '特別な時間を過ごせました。',
    choices: [
      { text: '特別でした', next: 'special_end' },
      { text: '貴重な体験です', next: 'contextual_end' },
      { text: '...', next: 'silence_end' }
    ]
  }
};

// キャラクター固有の中間ノードテンプレート
const characterIntermediateTemplates = {
  'shino': {
    'shino_session_end': {
      suffix: '_shino_bridge',
      text: 'また...話せて良かった。',
      choices: [
        { text: '僕も嬉しいです', next: 'shino_session_end' },
        { text: 'いつでも話しましょう', next: 'trust_end' },
        { text: '...', next: 'silence_end' }
      ]
    }
  },
  'minase': {
    'minase_session_end': {
      suffix: '_minase_bridge',
      text: '今日の会話も興味深かった。',
      choices: [
        { text: '僕も学びました', next: 'minase_session_end' },
        { text: '刺激的でした', next: 'contextual_end' },
        { text: '...', next: 'silence_end' }
      ]
    }
  },
  'ayane': {
    'ayane_session_end': {
      suffix: '_ayane_bridge',
      text: '今日も楽しかった！',
      choices: [
        { text: '僕も楽しかったです', next: 'ayane_session_end' },
        { text: 'いつも元気をもらえます', next: 'emotional_end' },
        { text: '...', next: 'silence_end' }
      ]
    }
  },
  'nazuna': {
    'nazuna_session_end': {
      suffix: '_nazuna_bridge',
      text: '......今日も、ありがとう。',
      choices: [
        { text: 'こちらこそ', next: 'nazuna_session_end' },
        { text: '話してくれてありがとう', next: 'trust_end' },
        { text: '...', next: 'silence_end' }
      ]
    }
  },
  'tomo': {
    'tomo_session_end': {
      suffix: '_tomo_bridge',
      text: 'インスピレーションをもらえた。',
      choices: [
        { text: '僕も刺激を受けました', next: 'tomo_session_end' },
        { text: '創作の参考になりそうです', next: 'contextual_end' },
        { text: '...', next: 'silence_end' }
      ]
    }
  }
};

let totalExtended = 0;

for (const character of characters) {
  console.log(`🔍 処理中: ${character}`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual'];
  
  let characterExtended = 0;
  const createdNodes = new Set();
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(characterDir, subdir);
    
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.yaml'));
      
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const relativePath = `${subdir}/${file}`;
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = yaml.parse(content);
          
          if (data && data.nodes) {
            let fileModified = false;
            const nodesToAdd = [];
            
            for (const node of data.nodes) {
              if (node.choices) {
                for (const choice of node.choices) {
                  if (choice.next && (
                    endingNodes.includes(choice.next) || 
                    (characterEndingNodes[character] && characterEndingNodes[character].includes(choice.next))
                  )) {
                    // 直接終了ノードに向かう選択肢を発見
                    const originalEnd = choice.next;
                    const bridgeNodeId = `${node.id}_to_${originalEnd}${intermediateNodeTemplates[originalEnd]?.suffix || '_bridge'}`;
                    
                    if (!createdNodes.has(bridgeNodeId)) {
                      // 中間ノードを作成
                      let template = intermediateNodeTemplates[originalEnd];
                      if (!template && characterIntermediateTemplates[character] && characterIntermediateTemplates[character][originalEnd]) {
                        template = characterIntermediateTemplates[character][originalEnd];
                      }
                      
                      if (template) {
                        const bridgeNode = {
                          id: bridgeNodeId,
                          text: template.text,
                          choices: template.choices
                        };
                        
                        nodesToAdd.push(bridgeNode);
                        createdNodes.add(bridgeNodeId);
                        
                        // 選択肢の参照先を中間ノードに変更
                        choice.next = bridgeNodeId;
                        fileModified = true;
                        characterExtended++;
                        
                        console.log(`  🔧 ${relativePath} > ${node.id} > choice: ${originalEnd} → ${bridgeNodeId} → ${originalEnd}`);
                      }
                    } else {
                      // 既に作成済みの中間ノードを使用
                      choice.next = bridgeNodeId;
                      fileModified = true;
                      characterExtended++;
                      
                      console.log(`  🔧 ${relativePath} > ${node.id} > choice: ${originalEnd} → ${bridgeNodeId} (existing)`);
                    }
                  }
                }
              }
            }
            
            if (fileModified) {
              // 新しいノードを追加
              data.nodes = data.nodes.concat(nodesToAdd);
              
              const newContent = yaml.stringify(data);
              fs.writeFileSync(filePath, newContent);
              console.log(`  ✅ 更新: ${relativePath} (+${nodesToAdd.length} nodes)`);
            }
          }
        } catch (error) {
          console.log(`  ❌ エラー: ${relativePath} - ${error.message}`);
        }
      }
    }
  }
  
  totalExtended += characterExtended;
  console.log(`  📊 ${character}: ${characterExtended} 個の2ターンパスを延長\n`);
}

console.log(`=== 延長完了: ${totalExtended} 個の2ターンパスを3ターンに延長 ===`);