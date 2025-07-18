import fs from 'fs';
import yaml from 'yaml';
import path from 'path';

const dialogueDir = './public/data/dialogues';
const characters = ['shino', 'minase', 'ayane', 'nazuna', 'tomo'];

console.log('=== 参照エラー修正スクリプト ===\n');

// 各キャラクターの終了ノードマッピング
const endingMappings = {
  // 共通終了ノード
  'session_end': 'session_end',
  'contextual_end': 'contextual_end',
  'special_end': 'special_end',
  'trust_end': 'trust_end',
  'deep_end': 'deep_end',
  'silence_end': 'silence_end',
  'first_meet_end': 'first_meet_end',
  'emotional_end': 'emotional_end',
  'memory_end': 'memory_end',
  'hopeful_end': 'hopeful_end',
  
  // キャラクター特有の終了ノード
  'shino_session_end': 'shino_session_end',
  'shino_loneliness_end': 'shino_loneliness_end',
  'minase_session_end': 'minase_session_end',
  'ayane_session_end': 'ayane_session_end',
  'ayane_contextual_end': 'ayane_contextual_end',
  'ayane_neutral_end': 'ayane_neutral_end',
  'nazuna_session_end': 'nazuna_session_end',
  'tomo_session_end': 'tomo_session_end'
};

// 終了ノードの推測ロジック
function inferEndingNode(missingNodeId, character) {
  // 文脈依存の終了ノードを最初に確認
  const contextualEndings = {
    'shino': [
      'shino_found_gratitude', 'shino_understanding_hope', 'shino_communication_difficulty',
      'shino_presence_acknowledgment', 'shino_profound_silence', 'shino_eternal_evening',
      'shino_change_blindness', 'shino_seasonal_indifference', 'shino_reality_hope',
      'shino_temporal_loop', 'shino_loop_acknowledgment', 'shino_loop_denial',
      'shino_repetition_value', 'shino_loop_silence', 'shino_awareness_validation',
      'shino_shared_perception', 'shino_commitment_despite_loop', 'shino_temporal_silence',
      'shino_change_explanation', 'shino_transformation_awareness', 'shino_mutual_transformation',
      'shino_name_comfort', 'shino_name_special', 'shino_habit_acceptance',
      'shino_predictability_comfort', 'shino_temporal_healing', 'shino_existence_relief',
      'shino_visibility_comfort', 'shino_intellectual_intimacy', 'shino_shame_vulnerability',
      'shino_mutual_safety', 'shino_protection_offer', 'shino_togetherness_promise',
      'shino_safety_silence', 'shino_miracle_recognition'
    ],
    'minase': [
      'minase_acceptance_silence', 'minase_observation_depth', 'minase_pattern_recognition',
      'minase_analytical_satisfaction', 'minase_complexity_appreciation', 'minase_temporal_understanding',
      'minase_memory_analysis', 'minase_permanence_reflection', 'minase_change_inevitability',
      'minase_knowledge_pursuit', 'minase_intellectual_curiosity', 'minase_wisdom_sharing',
      'minase_understanding_deepening', 'minase_emotional_complexity', 'minase_empathy_mechanism',
      'minase_vulnerability_strength', 'minase_trust_mechanics', 'minase_existence_contemplation',
      'minase_reality_perception', 'minase_consciousness_mystery', 'minase_identity_formation',
      'minase_communication_effectiveness', 'minase_dialogue_value', 'minase_mutual_understanding',
      'minase_perspective_exchange', 'minase_contemplative_silence', 'minase_analytical_pause',
      'minase_reflective_conclusion', 'minase_intellectual_satisfaction', 'minase_uncertainty_acceptance',
      'minase_ambiguity_tolerance', 'minase_mystery_preservation', 'minase_unknown_respect',
      'minase_growth_observation', 'minase_development_tracking', 'minase_evolution_witness',
      'minase_potential_recognition'
    ],
    'ayane': [
      'ayane_emotional_contagion', 'ayane_atmosphere_reading', 'ayane_sharing_power',
      'ayane_connection_feeling', 'ayane_security_feeling', 'ayane_mutual_comfort',
      'ayane_deep_comfort_silence', 'ayane_importance_recognition', 'ayane_memorable_conversation',
      'ayane_cherished_silence', 'ayane_cozy_feeling', 'ayane_nature_music',
      'ayane_relaxation_effect', 'ayane_mysterious_place', 'ayane_dream_reality_border',
      'ayane_metaphysical_silence', 'ayane_empathy_relief', 'ayane_collaborative_thinking',
      'ayane_warmth_feelings', 'ayane_heart_connection', 'ayane_pure_feelings',
      'ayane_emotional_closeness', 'ayane_big_dreams', 'ayane_mutual_encouragement',
      'ayane_strong_partnership', 'ayane_silent_hope', 'ayane_mental_preparation',
      'ayane_special_moments', 'ayane_peaceful_mind', 'ayane_rain_rhythm',
      'ayane_time_magic', 'ayane_memory_depth'
    ],
    'nazuna': [
      'nazuna_fear_understanding', 'nazuna_anxiety_relief', 'nazuna_comfort_acceptance',
      'nazuna_safety_feeling', 'nazuna_protection_gratitude', 'nazuna_memory_preservation',
      'nazuna_recording_value', 'nazuna_documentation_purpose', 'nazuna_preservation_hope',
      'nazuna_connection_surprise', 'nazuna_companionship_warmth', 'nazuna_understanding_bridge',
      'nazuna_empathy_recognition', 'nazuna_night_comfort', 'nazuna_darkness_acceptance',
      'nazuna_temporal_peace', 'nazuna_evening_kinship', 'nazuna_change_acceptance',
      'nazuna_growth_recognition', 'nazuna_progress_acknowledgment', 'nazuna_transformation_hope',
      'nazuna_contemplative_silence', 'nazuna_peaceful_quiet', 'nazuna_introspective_moment',
      'nazuna_meditative_state', 'nazuna_hope_flickering', 'nazuna_future_possibility',
      'nazuna_optimism_seeds', 'nazuna_light_glimpse', 'nazuna_acceptance_learning',
      'nazuna_understanding_gratitude', 'nazuna_patience_appreciation', 'nazuna_tolerance_recognition',
      'nazuna_vulnerability_sharing', 'nazuna_trust_building', 'nazuna_openness_courage',
      'nazuna_emotional_safety', 'nazuna_precious_moment', 'nazuna_meaningful_encounter',
      'nazuna_gentle_conclusion', 'nazuna_quiet_gratitude'
    ],
    'tomo': [
      'tomo_creative_inspiration', 'tomo_artistic_revelation', 'tomo_visualization_magic',
      'tomo_creative_breathing', 'tomo_visual_necessity', 'tomo_emotional_chemistry',
      'tomo_chromatic_conversation', 'tomo_infinite_transparency', 'tomo_color_emotion_bridge',
      'tomo_tool_personality', 'tomo_emotional_instrument', 'tomo_mental_freedom',
      'tomo_technique_evolution', 'tomo_movement_life', 'tomo_fearful_growth',
      'tomo_subtle_transformation', 'tomo_multiple_realities', 'tomo_quiet_power',
      'tomo_shared_canvas', 'tomo_collaborative_art', 'tomo_creative_partnership',
      'tomo_night_depth', 'tomo_night_introspection', 'tomo_spiral_time',
      'tomo_creative_time', 'tomo_temporal_faces', 'tomo_shared_exploration',
      'tomo_question_encouragement', 'tomo_silent_curiosity', 'tomo_listener_value',
      'tomo_heart_eloquence', 'tomo_wordless_bond', 'tomo_silent_agreement',
      'tomo_contemplative_creation', 'tomo_character_insight', 'tomo_authentic_self',
      'tomo_pattern_recognition', 'tomo_heart_art', 'tomo_reality_art',
      'tomo_ineffable_special', 'tomo_amazement_joy', 'tomo_intuitive_power',
      'tomo_felt_power', 'tomo_word_preservation', 'tomo_universal_creativity',
      'tomo_ability_encouragement', 'tomo_reality_softening', 'tomo_vivid_influence',
      'tomo_subtle_influence', 'tomo_hopeful_art', 'tomo_lightened_heart',
      'tomo_beautiful_change', 'tomo_environmental_creation', 'tomo_secret_acceptance',
      'tomo_shared_reality', 'tomo_heart_art_praise', 'tomo_pure_creation',
      'tomo_miracle_creation', 'tomo_healing_quiet', 'tomo_vulnerability_strength',
      'tomo_faith_based_creation', 'tomo_trust_inspiration'
    ]
  };

  // 文脈依存の終了ノードが存在する場合はそれを使用
  if (contextualEndings[character] && contextualEndings[character].includes(missingNodeId)) {
    return missingNodeId;
  }

  // パターンマッチングで適切な終了ノードを推測
  const nodeId = missingNodeId.toLowerCase();
  
  // 感情関連
  if (nodeId.includes('gratitude') || nodeId.includes('thanks')) return 'emotional_end';
  if (nodeId.includes('hope') || nodeId.includes('optimism')) return 'hopeful_end';
  if (nodeId.includes('trust') || nodeId.includes('faith')) return 'trust_end';
  if (nodeId.includes('silence') || nodeId.includes('quiet')) return 'silence_end';
  if (nodeId.includes('memory') || nodeId.includes('remember')) return 'memory_end';
  if (nodeId.includes('deep') || nodeId.includes('profound')) return 'deep_end';
  if (nodeId.includes('first') || nodeId.includes('meet')) return 'first_meet_end';
  if (nodeId.includes('special') || nodeId.includes('unique')) return 'special_end';
  
  // キャラクター特有の終了ノード
  if (nodeId.includes('session_end') || nodeId.includes('contextual_end')) {
    return `${character}_session_end`;
  }
  
  // デフォルト：文脈依存の終了ノード
  return 'contextual_end';
}

let totalFixed = 0;

for (const character of characters) {
  console.log(`🔍 処理中: ${character}`);
  
  const characterDir = path.join(dialogueDir, character);
  const subdirs = ['start', 'neutral', 'contextual'];
  
  // 利用可能な終了ノードを収集
  const availableNodes = new Set();
  
  // 共通終了ノード
  const commonEndPath = path.join(dialogueDir, 'common-endings.yaml');
  if (fs.existsSync(commonEndPath)) {
    const content = fs.readFileSync(commonEndPath, 'utf8');
    const data = yaml.parse(content);
    if (data && data.nodes) {
      data.nodes.forEach(node => availableNodes.add(node.id));
    }
  }
  
  // キャラクター特有の終了ノード
  const characterEndDir = path.join(characterDir, 'end');
  if (fs.existsSync(characterEndDir)) {
    const files = fs.readdirSync(characterEndDir).filter(f => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = path.join(characterEndDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.parse(content);
      if (data && data.nodes) {
        data.nodes.forEach(node => availableNodes.add(node.id));
      }
    }
  }
  
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
            
            for (const node of data.nodes) {
              // 選択肢の next 参照をチェック
              if (node.choices) {
                for (const choice of node.choices) {
                  if (choice.next && !availableNodes.has(choice.next)) {
                    const newEnding = inferEndingNode(choice.next, character);
                    if (availableNodes.has(newEnding)) {
                      console.log(`  🔧 ${relativePath} > ${node.id} > choice: ${choice.next} → ${newEnding}`);
                      choice.next = newEnding;
                      fileModified = true;
                      characterFixed++;
                    }
                  }
                }
              }
              
              // 直接の next 参照をチェック
              if (node.next && !availableNodes.has(node.next)) {
                const newEnding = inferEndingNode(node.next, character);
                if (availableNodes.has(newEnding)) {
                  console.log(`  🔧 ${relativePath} > ${node.id} > next: ${node.next} → ${newEnding}`);
                  node.next = newEnding;
                  fileModified = true;
                  characterFixed++;
                }
              }
            }
            
            if (fileModified) {
              const newContent = yaml.stringify(data);
              fs.writeFileSync(filePath, newContent);
              console.log(`  ✅ 更新: ${relativePath}`);
            }
          }
        } catch (error) {
          console.log(`  ❌ エラー: ${relativePath} - ${error.message}`);
        }
      }
    }
  }
  
  totalFixed += characterFixed;
  console.log(`  📊 ${character}: ${characterFixed} 個の参照を修正\n`);
}

console.log(`=== 修正完了: ${totalFixed} 個の参照エラーを修正 ===`);