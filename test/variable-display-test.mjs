#!/usr/bin/env node

/**
 * Test script to verify variable display in dialogue text
 */

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Mock implementations for testing
class MockGameContext {
  constructor() {
    this.state = {
      variables: new Map([
        ['player_silence_count', 5],
        ['player_empathy_level', 3],
        ['player_curiosity_level', 2],
        ['total_visits', 10],
        ['overall_tension', 7]
      ]),
      flags: new Set(['heard_train_sound', 'met_all_characters']),
      characters: new Map([
        ['nazuna', {
          meetCount: 3,
          trustLevel: 15,
          lastChoices: ['listen_quietly', 'ask_about_sounds'],
          specificFlags: new Set(['likes_silence'])
        }],
        ['ayane', {
          meetCount: 2,
          trustLevel: 8,
          lastChoices: ['smile_back'],
          specificFlags: new Set()
        }]
      ]),
      player: {
        totalVisits: 10,
        silenceCount: 5,
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
      timeOfDay: 'evening',
      weather: 'clear',
      moonPhase: 75
    };
  }
}

class MockVariableReplacementProcessor {
  priority = 100;

  process(text, context) {
    return text.replace(/\{\{([\w\.]+)\}\}/g, (match, varName) => {
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
        default:
          return match;
      }
    });
  }
}

class MockConditionalTextProcessor {
  priority = 90;

  process(text, context) {
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    
    return text.replace(conditionalRegex, (_, condition, content) => {
      const conditionMet = this.evaluateSimpleCondition(condition, context);
      return conditionMet ? content : '';
    });
  }

  evaluateSimpleCondition(condition, context) {
    if (context.state.flags.has(condition)) {
      return true;
    }

    const variable = context.state.variables.get(condition);
    if (variable !== undefined && variable > 0) {
      return true;
    }

    return false;
  }
}

class MockTimeBasedTextProcessor {
  priority = 80;

  process(text, context) {
    const timeMap = {
      'evening': '夕方',
      'night': '夜',
      'late_night': '深夜'
    };

    return text.replace(/\{\{time_of_day\}\}/g, () => {
      return timeMap[context.environment.timeOfDay] || context.environment.timeOfDay;
    });
  }
}

class MockCharacterStateTextProcessor {
  priority = 70;

  process(text, context) {
    if (!context.currentCharacter) return text;
    const characterState = context.state.characters.get(context.currentCharacter.id);
    if (!characterState) return text;

    return text
      .replace(/\{\{meet_count\}\}/g, String(characterState.meetCount))
      .replace(/\{\{trust_level\}\}/g, String(characterState.trustLevel))
      .replace(/\{\{last_choice\}\}/g, () => {
        const lastChoice = characterState.lastChoices[characterState.lastChoices.length - 1];
        return lastChoice || '';
      });
  }
}

class MockTextProcessorPipeline {
  constructor() {
    this.processors = [];
  }

  addProcessor(processor) {
    this.processors.push(processor);
    this.processors.sort((a, b) => b.priority - a.priority);
  }

  process(text, context) {
    return this.processors.reduce((processedText, processor) => {
      return processor.process(processedText, context);
    }, text);
  }
}

async function testVariableDisplay() {
  console.log('🧪 Testing variable display in dialogue text...\n');

  // Setup test environment
  const context = new MockGameContext();
  const pipeline = new MockTextProcessorPipeline();
  
  // Add processors
  pipeline.addProcessor(new MockVariableReplacementProcessor());
  pipeline.addProcessor(new MockConditionalTextProcessor());
  pipeline.addProcessor(new MockTimeBasedTextProcessor());
  pipeline.addProcessor(new MockCharacterStateTextProcessor());

  // Test cases
  const testCases = [
    // Test 1: Basic variable replacement
    {
      name: 'Basic variable replacement',
      input: 'あなたは{{player_silence_count}}回も沈黙を選んでいますね。',
      expected: 'あなたは5回も沈黙を選んでいますね。'
    },
    
    // Test 2: Multiple variables
    {
      name: 'Multiple variables',
      input: '{{player_visits}}回目の訪問で、{{player_empathy_level}}の共感レベルですね。',
      expected: '10回目の訪問で、3の共感レベルですね。'
    },
    
    // Test 3: Character state variables
    {
      name: 'Character state variables',
      input: '私たちは{{meet_count}}回会いました。信頼レベルは{{trust_level}}です。',
      expected: '私たちは3回会いました。信頼レベルは15です。'
    },
    
    // Test 4: Conditional text (true condition)
    {
      name: 'Conditional text (true condition)',
      input: '{{#if heard_train_sound}}電車の音を聞いたことがありますね。{{/if}}',
      expected: '電車の音を聞いたことがありますね。'
    },
    
    // Test 5: Conditional text (false condition)
    {
      name: 'Conditional text (false condition)',
      input: '{{#if not_set_flag}}この文章は表示されません。{{/if}}',
      expected: ''
    },
    
    // Test 6: Time-based text
    {
      name: 'Time-based text',
      input: '今は{{time_of_day}}ですね。',
      expected: '今は夕方ですね。'
    },
    
    // Test 7: Character name
    {
      name: 'Character name',
      input: '私の名前は{{character_name}}です。',
      expected: '私の名前はナズナです。'
    },
    
    // Test 8: Complex combination
    {
      name: 'Complex combination',
      input: '{{character_name}}です。{{meet_count}}回目の会話で、{{#if player_silence_count}}沈黙を{{player_silence_count}}回選んでいます{{/if}}。{{time_of_day}}の時間帯です。',
      expected: 'ナズナです。3回目の会話で、沈黙を5回選んでいます。夕方の時間帯です。'
    },
    
    // Test 9: Last choice
    {
      name: 'Last choice tracking',
      input: '前回の選択は「{{last_choice}}」でしたね。',
      expected: '前回の選択は「ask_about_sounds」でしたね。'
    },
    
    // Test 10: Variable-based conditional
    {
      name: 'Variable-based conditional',
      input: '{{#if player_empathy_level}}共感的な選択をしていますね。{{/if}}',
      expected: '共感的な選択をしていますね。'
    },
    
    // Test 11: Character encounter count
    {
      name: 'Character encounter count',
      input: '{{character_encounter_count.nazuna}}回目の出会いね。',
      expected: '3回目の出会いね。'
    },
    
    // Test 12: Character encounter count (different character)
    {
      name: 'Character encounter count (different character)',
      input: '{{character_encounter_count.ayane}}回目の出会いですね。',
      expected: '2回目の出会いですね。'
    },
    
    // Test 13: Character trust level with dot notation
    {
      name: 'Character trust level with dot notation',
      input: '信頼度は{{trust_level.nazuna}}です。',
      expected: '信頼度は15です。'
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Input:    "${testCase.input}"`);
    
    const result = pipeline.process(testCase.input, context);
    console.log(`Output:   "${result}"`);
    console.log(`Expected: "${testCase.expected}"`);
    
    if (result === testCase.expected) {
      console.log('✅ PASSED\n');
      passedTests++;
    } else {
      console.log('❌ FAILED\n');
      failedTests++;
    }
  }

  // Test real dialogue files for variable usage
  console.log('📁 Testing actual dialogue files...');
  
  const dialogueFiles = [
    'public/data/dialogues/nazuna/neutral/topics.yaml',
    'public/data/dialogues/minase/start/first-meeting.yaml',
    'public/data/dialogues/ayane/neutral/topics.yaml'
  ];

  let filesWithVariables = 0;
  for (const file of dialogueFiles) {
    const fullPath = join(rootDir, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const variableMatches = content.match(/\{\{[\w\s#\/\.]+\}\}/g);
      if (variableMatches) {
        filesWithVariables++;
        console.log(`✓ Found ${variableMatches.length} variable references in ${file}`);
        
        // Test a few examples from the file
        for (const match of variableMatches.slice(0, 3)) {
          const processed = pipeline.process(match, context);
          console.log(`  "${match}" → "${processed}"`);
        }
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📁 Files with variables: ${filesWithVariables}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All variable display tests passed!');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Run tests
testVariableDisplay().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});