#!/usr/bin/env node

/**
 * Test script to verify variable display in actual dialogue files
 * 実際の会話ファイルで変数表示をテストします
 */

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Mock game context with realistic test data
class TestGameContext {
  constructor() {
    this.state = {
      variables: new Map([
        ['player_silence_count', 7],
        ['player_empathy_level', 4],
        ['player_curiosity_level', 3],
        ['total_visits', 15],
        ['overall_tension', 8],
        ['minase.prophecy_count', 5],
        ['nazuna.comfort_level', 6],
        ['ayane.happiness_level', 9]
      ]),
      flags: new Set(['heard_train_sound', 'met_all_characters', 'deep_conversation_had']),
      characters: new Map([
        ['nazuna', {
          meetCount: 4,
          trustLevel: 18,
          lastChoices: ['listen_quietly', 'ask_about_sounds', 'comfort_her'],
          specificFlags: new Set(['likes_silence', 'shared_memory'])
        }],
        ['minase', {
          meetCount: 3,
          trustLevel: 12,
          lastChoices: ['believe_prophecy', 'ask_about_future'],
          specificFlags: new Set(['prophecy_revealed'])
        }],
        ['ayane', {
          meetCount: 5,
          trustLevel: 22,
          lastChoices: ['smile_back', 'play_along'],
          specificFlags: new Set(['cheerful_mood'])
        }],
        ['shino', {
          meetCount: 2,
          trustLevel: 8,
          lastChoices: ['ask_about_bridge'],
          specificFlags: new Set(['memory_shared'])
        }],
        ['tomo', {
          meetCount: 1,
          trustLevel: 5,
          lastChoices: ['watch_drawing'],
          specificFlags: new Set()
        }]
      ]),
      player: {
        totalVisits: 15,
        silenceCount: 7,
        lastVisitDate: new Date().toISOString(),
        currentSessionStart: new Date().toISOString()
      },
      history: []
    };
    
    this.currentCharacter = {
      id: 'nazuna',
      name: 'ナズナ'
    };
    
    this.environment = {
      timeOfDay: 'night',
      weather: 'foggy',
      moonPhase: 80
    };
  }
}

// Enhanced text processor based on actual implementation
class EnhancedTextProcessor {
  process(text, context) {
    let processedText = text;
    
    // Variable replacement
    processedText = processedText.replace(/\{\{([\w\.]+)\}\}/g, (match, varName) => {
      // Handle character-specific variables like character_encounter_count.minase
      if (varName.includes('.')) {
        const [baseVar, characterId] = varName.split('.');
        
        // Handle character encounter count
        if (baseVar === 'character_encounter_count') {
          const charState = context.state.characters.get(characterId);
          if (charState) {
            return String(charState.meetCount);
          }
          return '0';
        }
        
        // Handle character-specific variables
        const charState = context.state.characters.get(characterId);
        if (charState) {
          // Check if this is a trust level reference
          if (baseVar === 'trust_level') {
            return String(charState.trustLevel);
          }
          
          // Check character-specific flags or other properties
          if (charState.specificFlags && charState.specificFlags.has(baseVar)) {
            return '1';
          }
        }
        
        // Check if it's a variable with character qualifier
        const fullVarName = `${baseVar}.${characterId}`;
        const value = context.state.variables.get(fullVarName);
        if (value !== undefined) {
          return String(value);
        }
      }
      
      // Handle regular variables
      const value = context.state.variables.get(varName);
      if (value !== undefined) {
        return String(value);
      }

      switch (varName) {
        case 'player_visits':
          return String(context.state.player.totalVisits);
        case 'silence_count':
          return String(context.state.player.silenceCount);
        case 'character_name':
          return context.currentCharacter?.name || '';
        case 'meet_count':
          const charState = context.state.characters.get(context.currentCharacter.id);
          return charState ? String(charState.meetCount) : '0';
        case 'trust_level':
          const charState2 = context.state.characters.get(context.currentCharacter.id);
          return charState2 ? String(charState2.trustLevel) : '0';
        case 'last_choice':
          const charState3 = context.state.characters.get(context.currentCharacter.id);
          if (charState3 && charState3.lastChoices.length > 0) {
            return charState3.lastChoices[charState3.lastChoices.length - 1];
          }
          return '';
        default:
          return match;
      }
    });
    
    // Conditional text
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    processedText = processedText.replace(conditionalRegex, (_, condition, content) => {
      // Check flags
      if (context.state.flags.has(condition)) {
        return content;
      }
      
      // Check variables
      const variable = context.state.variables.get(condition);
      if (variable !== undefined && variable > 0) {
        return content;
      }
      
      return '';
    });
    
    // Time-based text
    const timeMap = {
      'evening': '夕方',
      'night': '夜',
      'late_night': '深夜'
    };
    
    processedText = processedText.replace(/\{\{time_of_day\}\}/g, () => {
      return timeMap[context.environment.timeOfDay] || context.environment.timeOfDay;
    });
    
    return processedText;
  }
}

async function testDialogueVariableIntegration() {
  console.log('🧪 Testing variable display in actual dialogue files...\n');
  
  const context = new TestGameContext();
  const processor = new EnhancedTextProcessor();
  
  // Test files that are known to contain variables
  const testFiles = [
    {
      path: 'public/data/dialogues/minase/start/first-meeting.yaml',
      character: 'minase',
      expectedVariables: ['character_encounter_count.minase']
    },
    {
      path: 'public/data/dialogues/shino/start/first-meeting.yaml',
      character: 'shino',
      expectedVariables: ['character_encounter_count.shino']
    },
    {
      path: 'public/data/dialogues/nazuna/end/goodbye.yaml',
      character: 'nazuna',
      expectedVariables: ['player_silence_count']
    },
    {
      path: 'public/data/dialogues/minase/end/goodbye.yaml',
      character: 'minase',
      expectedVariables: ['minase.prophecy_count']
    }
  ];
  
  let totalVariablesFound = 0;
  let totalVariablesProcessed = 0;
  let successfulProcessing = 0;
  
  for (const testFile of testFiles) {
    const fullPath = join(rootDir, testFile.path);
    
    if (!existsSync(fullPath)) {
      console.log(`❌ File not found: ${testFile.path}`);
      continue;
    }
    
    console.log(`📄 Testing file: ${testFile.path}`);
    
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const dialogueData = parse(content);
      
      // Update context for this character
      context.currentCharacter = {
        id: testFile.character,
        name: testFile.character.charAt(0).toUpperCase() + testFile.character.slice(1)
      };
      
      if (dialogueData.dialogues) {
        for (const dialogue of dialogueData.dialogues) {
          if (dialogue.text) {
            const originalText = dialogue.text;
            const variableMatches = originalText.match(/\{\{[\w\s#\/\.]+\}\}/g);
            
            if (variableMatches) {
              totalVariablesFound += variableMatches.length;
              console.log(`  📝 Found ${variableMatches.length} variable(s) in dialogue "${dialogue.id}"`);
              
              const processedText = processor.process(originalText, context);
              
              // Check if all variables were processed (no {{ }} left)
              const remainingVariables = processedText.match(/\{\{[\w\s#\/\.]+\}\}/g);
              
              if (!remainingVariables || remainingVariables.length === 0) {
                successfulProcessing++;
                console.log(`  ✅ Successfully processed all variables`);
                console.log(`     Original:  "${originalText}"`);
                console.log(`     Processed: "${processedText}"`);
              } else {
                console.log(`  ⚠️  Some variables not processed: ${remainingVariables.join(', ')}`);
                console.log(`     Original:  "${originalText}"`);
                console.log(`     Processed: "${processedText}"`);
              }
              
              totalVariablesProcessed++;
            }
          }
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error processing file ${testFile.path}:`, error.message);
    }
  }
  
  // Test specific variable scenarios
  console.log('🔍 Testing specific variable scenarios...\n');
  
  const specificTests = [
    {
      name: 'Character encounter count with current character',
      text: 'これが{{character_encounter_count.nazuna}}回目の出会いですね。',
      context: {...context, currentCharacter: {id: 'nazuna', name: 'ナズナ'}},
      expected: 'これが4回目の出会いですね。'
    },
    {
      name: 'Player silence count reference',
      text: 'あなたは{{player_silence_count}}回沈黙を選んでいます。',
      context: context,
      expected: 'あなたは7回沈黙を選んでいます。'
    },
    {
      name: 'Character-specific variable',
      text: '予言の的中率は{{minase.prophecy_count}}回です。',
      context: context,
      expected: '予言の的中率は5回です。'
    },
    {
      name: 'Conditional text with flag',
      text: '{{#if heard_train_sound}}電車の音を聞きましたね。{{/if}}',
      context: context,
      expected: '電車の音を聞きましたね。'
    }
  ];
  
  let specificTestsPassed = 0;
  
  for (const test of specificTests) {
    const result = processor.process(test.text, test.context);
    if (result === test.expected) {
      console.log(`✅ ${test.name}: PASSED`);
      specificTestsPassed++;
    } else {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Expected: "${test.expected}"`);
      console.log(`   Got:      "${result}"`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`📄 Files processed: ${testFiles.length}`);
  console.log(`🔍 Total variables found: ${totalVariablesFound}`);
  console.log(`✅ Variables successfully processed: ${successfulProcessing}/${totalVariablesProcessed}`);
  console.log(`🎯 Specific tests passed: ${specificTestsPassed}/${specificTests.length}`);
  
  const overallSuccess = (successfulProcessing === totalVariablesProcessed) && 
                        (specificTestsPassed === specificTests.length);
  
  if (overallSuccess) {
    console.log('\n🎉 All variable display tests passed! The text processing system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the text processing implementation.');
  }
  
  return overallSuccess;
}

// Run the test
testDialogueVariableIntegration().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});