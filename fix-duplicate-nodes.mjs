import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 重複ノード修正スクリプト ===\n');

for (const character of characters) {
  console.log(`🔍 処理中: ${character}`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual', 'end'];
  
  // 全ノードを収集
  const allNodes = new Map();
  const fileLocations = new Map();
  
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
            const uniqueNodes = [];
            
            for (const node of data.nodes) {
              if (allNodes.has(node.id)) {
                console.log(`  ❌ 重複削除: ${node.id} from ${relativePath}`);
                continue;
              }
              
              allNodes.set(node.id, node);
              fileLocations.set(node.id, relativePath);
              uniqueNodes.push(node);
            }
            
            // 重複を削除したファイルを保存
            if (uniqueNodes.length !== data.nodes.length) {
              data.nodes = uniqueNodes;
              const newContent = yaml.stringify(data);
              fs.writeFileSync(filePath, newContent);
              console.log(`  ✅ 更新: ${relativePath} (${uniqueNodes.length} nodes)`);
            }
          }
        } catch (error) {
          console.log(`  ❌ エラー: ${relativePath} - ${error.message}`);
        }
      }
    }
  }
  
  console.log(`  📊 ${character}: ${allNodes.size} 個のユニークノード\n`);
}

console.log('=== 重複ノード修正完了 ===');