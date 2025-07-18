import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== ブリッジノード置換スクリプト ===\n');

// 充実した会話内容を持つ代替ノードテンプレート
const fullConversationTemplates = {
  'contextual_end': {
    suffix: '_extended_talk',
    text: 'そうですね...。実は、最近よく考えるんです。',
    choices: [
      { text: '何を考えているんですか？', next: 'deep_reflection' },
      { text: 'お聞きしてもいいですか？', next: 'gentle_inquiry' },
      { text: '一緒に考えましょう', next: 'shared_thinking' }
    ]
  },
  'silence_end': {
    suffix: '_peaceful_moment',
    text: '...静かな時間って、大切ですよね。',
    choices: [
      { text: '心が落ち着きますね', next: 'calm_appreciation' },
      { text: '言葉じゃ表せないものがある', next: 'wordless_understanding' },
      { text: '一緒にいてくれてありがとう', next: 'grateful_presence' }
    ]
  },
  'emotional_end': {
    suffix: '_heart_connection',
    text: '感情を共有できるのは本当に嬉しいです。心が通じ合うって、こういうことかもしれませんね。',
    choices: [
      { text: '僕も同じ気持ちです', next: 'mutual_understanding' },
      { text: '特別な瞬間ですね', next: 'special_moment' },
      { text: 'もっと話を聞かせてください', next: 'deeper_conversation' }
    ]
  },
  'memory_end': {
    suffix: '_memory_sharing',
    text: '思い出を共有できるのは素晴らしいことですね。記憶って、人と分かち合うことでより鮮明になる気がします。',
    choices: [
      { text: '確かにそうですね', next: 'memory_reflection' },
      { text: '大切な記憶が増えました', next: 'new_memories' },
      { text: '忘れたくない瞬間です', next: 'treasured_moment' }
    ]
  },
  'trust_end': {
    suffix: '_trust_deepening',
    text: '信頼関係を築けて良かったです。こうして心を開いて話せるのは、とても意味のあることだと思います。',
    choices: [
      { text: '僕も信頼しています', next: 'mutual_trust' },
      { text: '安心して話せます', next: 'comfortable_sharing' },
      { text: 'これからもよろしくお願いします', next: 'ongoing_friendship' }
    ]
  },
  'deep_end': {
    suffix: '_profound_exchange',
    text: '深い話ができて意味がありました。こういう対話って、お互いの理解を深めてくれますね。',
    choices: [
      { text: '有意義な時間でした', next: 'meaningful_time' },
      { text: '新しい視点をもらえました', next: 'new_perspective' },
      { text: 'また深い話がしたいです', next: 'future_deep_talks' }
    ]
  }
};

// 各キャラクターの個性を反映した代替ノード
const characterSpecificTemplates = {
  'shino': {
    suffix: '_shino_thoughtful',
    text: 'また...話せて良かった。こんな風に、誰かと時間を過ごすのは久しぶりです。',
    choices: [
      { text: '僕も嬉しいです', next: 'shared_happiness' },
      { text: 'いつでも話しましょう', next: 'open_invitation' },
      { text: '特別な時間ですね', next: 'precious_time' }
    ]
  },
  'minase': {
    suffix: '_minase_analytical',
    text: '今日の会話も興味深かった。人との対話って、予測できない発見があって面白いですね。',
    choices: [
      { text: '僕も学びました', next: 'mutual_learning' },
      { text: '刺激的でした', next: 'stimulating_exchange' },
      { text: 'もっと話を聞きたいです', next: 'continued_curiosity' }
    ]
  },
  'ayane': {
    suffix: '_ayane_warm',
    text: '今日も楽しかった！こうして話していると、心が軽やかになります。',
    choices: [
      { text: '僕も楽しかったです', next: 'shared_joy' },
      { text: 'いつも元気をもらえます', next: 'energizing_presence' },
      { text: '一緒にいると安心します', next: 'comforting_presence' }
    ]
  },
  'nazuna': {
    suffix: '_nazuna_gentle',
    text: '......今日も、ありがとう。少しずつ、話すのが楽になってきている気がします。',
    choices: [
      { text: 'こちらこそありがとう', next: 'mutual_gratitude' },
      { text: '話してくれて嬉しいです', next: 'grateful_sharing' },
      { text: 'ゆっくりでいいんです', next: 'patient_support' }
    ]
  },
  'tomo': {
    suffix: '_tomo_creative',
    text: 'インスピレーションをもらえた。創作って、こういう対話から生まれることが多いんです。',
    choices: [
      { text: '僕も刺激を受けました', next: 'mutual_inspiration' },
      { text: '創作の参考になりそうです', next: 'creative_fuel' },
      { text: 'アートの話をもっと聞きたいです', next: 'art_discussion' }
    ]
  }
};

// 新しい継続ノード群
const continuationNodes = {
  'deep_reflection': {
    text: '人生のこと、この場所のこと、時間のこと...色々なことを考えます。',
    choices: [
      { text: '深い思索ですね', next: 'philosophical_moment' },
      { text: '一緒に考えましょう', next: 'shared_contemplation' },
      { text: 'どんなことが一番気になりますか？', next: 'focused_inquiry' }
    ]
  },
  'gentle_inquiry': {
    text: '話してくれるなら、喜んで聞かせてもらいます。',
    choices: [
      { text: 'ありがとうございます', next: 'grateful_openness' },
      { text: '少し考えをまとめてみます', next: 'thoughtful_preparation' },
      { text: '一緒に考えてもらえませんか？', next: 'collaborative_thinking' }
    ]
  },
  'shared_thinking': {
    text: 'そうですね。一人で考えるより、二人で考える方が新しい発見があるかもしれません。',
    choices: [
      { text: '協力して考えましょう', next: 'cooperative_exploration' },
      { text: '新しい視点が得られそうです', next: 'fresh_perspective' },
      { text: 'どこから始めましょうか？', next: 'starting_point' }
    ]
  },
  'calm_appreciation': {
    text: '心が落ち着いて、自分自身と向き合えるような気がします。',
    choices: [
      { text: '内省的な時間は大切ですね', next: 'introspective_value' },
      { text: '静けさの中に豊かさがある', next: 'rich_silence' },
      { text: '一緒に静かな時間を過ごしましょう', next: 'shared_quietude' }
    ]
  },
  'wordless_understanding': {
    text: '言葉を超えた何かが伝わる瞬間って、確かにありますね。',
    choices: [
      { text: '心で通じ合えますね', next: 'heart_connection' },
      { text: '言葉以上のものを感じます', next: 'beyond_words' },
      { text: 'このまま静かに過ごしましょう', next: 'peaceful_togetherness' }
    ]
  },
  'grateful_presence': {
    text: 'こちらこそ、ありがとうございます。一緒にいてくれる人がいるって、心強いです。',
    choices: [
      { text: '僕も同じ気持ちです', next: 'mutual_appreciation' },
      { text: '支え合えますね', next: 'mutual_support' },
      { text: 'いつでも話しかけてください', next: 'open_availability' }
    ]
  }
};

// 最終的な終了ノード群
const finalEndingNodes = {
  'philosophical_moment': { text: '深い哲学的な瞬間を共有できました。', next: 'contextual_end' },
  'shared_contemplation': { text: '一緒に考える時間は有意義でした。', next: 'contextual_end' },
  'focused_inquiry': { text: '興味深い話題を深められました。', next: 'contextual_end' },
  'grateful_openness': { text: '素直に話せる関係性を築けました。', next: 'emotional_end' },
  'thoughtful_preparation': { text: '考えをまとめる時間も大切ですね。', next: 'contextual_end' },
  'collaborative_thinking': { text: '協力して考える楽しさを発見しました。', next: 'trust_end' },
  'cooperative_exploration': { text: '協力的な探求ができました。', next: 'trust_end' },
  'fresh_perspective': { text: '新しい視点を得られました。', next: 'deep_end' },
  'starting_point': { text: '良い出発点を見つけました。', next: 'hopeful_end' },
  'introspective_value': { text: '内省の価値を再発見しました。', next: 'deep_end' },
  'rich_silence': { text: '静寂の豊かさを体感しました。', next: 'special_end' },
  'shared_quietude': { text: '静かな時間を共有しました。', next: 'silence_end' },
  'heart_connection': { text: '心のつながりを感じました。', next: 'emotional_end' },
  'beyond_words': { text: '言葉を超えた理解を得ました。', next: 'deep_end' },
  'peaceful_togetherness': { text: '平和な共存を体験しました。', next: 'silence_end' },
  'mutual_appreciation': { text: '相互の感謝を確認しました。', next: 'emotional_end' },
  'mutual_support': { text: '支え合える関係を築けました。', next: 'trust_end' },
  'open_availability': { text: 'いつでも話せる関係になりました。', next: 'trust_end' }
};

let totalReplaced = 0;

for (const character of characters) {
  console.log(`🔍 処理中: ${character}`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual'];
  
  let characterReplaced = 0;
  
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
            
            // ブリッジノードを探して置換
            for (const node of data.nodes) {
              if (node.id.includes('_bridge')) {
                // ブリッジノードを拡張された会話に置換
                const template = fullConversationTemplates['contextual_end'] || 
                                characterSpecificTemplates[character];
                
                if (template) {
                  node.text = template.text;
                  node.choices = template.choices;
                  
                  // 継続ノードを追加
                  for (const [nodeId, nodeData] of Object.entries(continuationNodes)) {
                    if (!data.nodes.find(n => n.id === nodeId)) {
                      nodesToAdd.push({
                        id: nodeId,
                        text: nodeData.text,
                        choices: nodeData.choices
                      });
                    }
                  }
                  
                  // 最終終了ノードを追加
                  for (const [nodeId, nodeData] of Object.entries(finalEndingNodes)) {
                    if (!data.nodes.find(n => n.id === nodeId)) {
                      nodesToAdd.push({
                        id: nodeId,
                        text: nodeData.text,
                        next: nodeData.next
                      });
                    }
                  }
                  
                  fileModified = true;
                  characterReplaced++;
                  
                  console.log(`  🔧 ${relativePath} > ${node.id} を拡張会話に置換`);
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
  
  totalReplaced += characterReplaced;
  console.log(`  📊 ${character}: ${characterReplaced} 個のブリッジノードを置換\n`);
}

console.log(`=== 置換完了: ${totalReplaced} 個のブリッジノードを充実した会話に置換 ===`);