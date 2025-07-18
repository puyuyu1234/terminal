import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 即座終了修正スクリプト ===\n');

// 充実した会話に置き換えるノード
const replacementNodes = {
  'deep_reflection': {
    text: '人生のこと、この場所のこと、時間のこと...色々なことを考えますね。',
    choices: [
      { text: '深い思索ですね', next: 'philosophical_moment' },
      { text: '一緒に考えましょう', next: 'shared_contemplation' },
      { text: 'お話し聞かせてください', next: 'gentle_listening' }
    ]
  },
  'philosophical_moment': {
    text: '哲学的な瞬間を共有できるのは貴重です。こういう対話が心を豊かにしてくれます。',
    choices: [
      { text: '有意義な時間です', next: 'contextual_end' },
      { text: '新しい視点を得ました', next: 'deep_end' },
      { text: '続きを聞かせてください', next: 'trust_end' }
    ]
  },
  'shared_contemplation': {
    text: '一緒に考える時間は素晴らしいですね。お互いの視点を交換することで、より深い理解が生まれます。',
    choices: [
      { text: '協力的な探求ですね', next: 'trust_end' },
      { text: '新しい発見がありました', next: 'deep_end' },
      { text: '心が通じ合います', next: 'emotional_end' }
    ]
  },
  'gentle_listening': {
    text: '話を聞いてくれる人がいるというのは、とても心強いものです。',
    choices: [
      { text: '僕も同じ気持ちです', next: 'emotional_end' },
      { text: 'いつでも話してください', next: 'trust_end' },
      { text: '支え合えますね', next: 'contextual_end' }
    ]
  }
};

let totalFixed = 0;

for (const character of characters) {
  console.log(`🔍 処理中: ${character}`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual'];
  
  let characterFixed = 0;
  
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
            
            // 1ターンで終わるノードを探して修正
            for (const node of data.nodes) {
              if (node.id.includes('_bridge') && 
                  (!node.choices || node.choices.length === 0) &&
                  (!node.next || node.next.includes('_end'))) {
                
                // 即座終了ノードを充実した会話に変換
                node.text = replacementNodes['deep_reflection'].text;
                node.choices = replacementNodes['deep_reflection'].choices;
                delete node.next; // next を削除
                
                fileModified = true;
                characterFixed++;
                
                console.log(`  🔧 ${relativePath} > ${node.id} を充実した会話に変換`);
              }
              
              // 選択肢が即座終了に向かう場合の修正
              if (node.choices) {
                for (const choice of node.choices) {
                  if (choice.next && choice.next.includes('_bridge') && 
                      choice.next.includes('_to_') && choice.next.includes('_end')) {
                    
                    // 中間ノードを作成
                    const bridgeNodeId = `${node.id}_extended_conversation`;
                    if (!data.nodes.find(n => n.id === bridgeNodeId)) {
                      nodesToAdd.push({
                        id: bridgeNodeId,
                        text: replacementNodes['shared_contemplation'].text,
                        choices: replacementNodes['shared_contemplation'].choices
                      });
                    }
                    
                    choice.next = bridgeNodeId;
                    fileModified = true;
                    characterFixed++;
                    
                    console.log(`  🔧 ${relativePath} > ${node.id} > choice を延長会話に変更`);
                  }
                }
              }
            }
            
            // 置換用ノードを追加
            if (fileModified) {
              for (const [nodeId, nodeData] of Object.entries(replacementNodes)) {
                if (!data.nodes.find(n => n.id === nodeId)) {
                  nodesToAdd.push({
                    id: nodeId,
                    text: nodeData.text,
                    choices: nodeData.choices
                  });
                }
              }
              
              data.nodes = data.nodes.concat(nodesToAdd);
              
              const newContent = yaml.stringify(data);
              fs.writeFileSync(filePath, newContent);
              console.log(`  ✅ 更新: ${relativePath} (+${nodesToAdd.length} nodes)`);
            }
          }
        } catch (error) {
          console.log(`  ❌ エラー: ${relativePath} - ${error.message}`);
          // エラーが発生した場合、ファイルを簡単に修正
          try {
            let content = fs.readFileSync(filePath, 'utf8');
            // 重複するYAMLエイリアスを削除
            content = content.replace(/&[a-zA-Z0-9_]+/g, '');
            content = content.replace(/\*[a-zA-Z0-9_]+/g, '');
            fs.writeFileSync(filePath, content);
            console.log(`  🔧 ${relativePath} - YAMLエイリアスを削除`);
          } catch (fixError) {
            console.log(`  ❌ 修正不可: ${relativePath} - ${fixError.message}`);
          }
        }
      }
    }
  }
  
  totalFixed += characterFixed;
  console.log(`  📊 ${character}: ${characterFixed} 個の即座終了を修正\n`);
}

console.log(`=== 修正完了: ${totalFixed} 個の即座終了を修正 ===`);