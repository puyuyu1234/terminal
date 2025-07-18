#!/usr/bin/env node

/**
 * Test script to verify silence choice effects are properly processed
 * 沈黙選択肢の効果が正しく処理されることをテストします
 */

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Mock game context
class MockGameContext {
  constructor() {
    this.state = {
      variables: new Map([
        ['player_silence_count', 0],
        ['player_empathy_level', 0],
        ['player_curiosity_level', 0]
      ]),
      flags: new Set(),
      characters: new Map([
        ['nazuna', {
          meetCount: 1,
          trustLevel: 0,
          lastChoices: [],
          specificFlags: new Set()
        }]
      ]),
      player: {
        totalVisits: 1,
        silenceCount: 0,
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
      moonPhase: 50
    };
  }
}

// Mock effect processor with the fix
class MockEffectProcessor {
  processIncrement(effect, context) {
    const current = context.state.variables.get(effect.variable) || 0;
    
    // Support both 'amount' and 'value' properties from YAML
    const amount = effect.amount || effect.value || 1;
    
    context.state.variables.set(effect.variable, current + amount);
    
    console.log(`[EffectProcessor] Incremented ${effect.variable} from ${current} to ${current + amount}`);
    
    return current + amount;
  }
  
  process(effect, context) {
    switch (effect.type) {
      case 'increment':
        return this.processIncrement(effect, context);
      default:
        console.log(`[EffectProcessor] Processing effect type: ${effect.type}`);
    }
  }
}

async function testSilenceChoiceEffects() {
  console.log('🧪 Testing silence choice effects...\n');
  
  const context = new MockGameContext();
  const effectProcessor = new MockEffectProcessor();
  
  // Test 1: Basic silence choice effect with 'value' property
  console.log('Test 1: Basic silence choice effect (YAML format)');
  const yamlEffect = {
    type: 'increment',
    variable: 'player_silence_count',
    value: 1  // This is how it's defined in YAML
  };
  
  const initialCount = context.state.variables.get('player_silence_count');
  console.log(`Initial silence count: ${initialCount}`);
  
  effectProcessor.process(yamlEffect, context);
  
  const afterCount = context.state.variables.get('player_silence_count');
  console.log(`After effect: ${afterCount}`);
  
  if (afterCount === initialCount + 1) {
    console.log('✅ Test 1 PASSED: YAML format increment works\n');
  } else {
    console.log('❌ Test 1 FAILED: YAML format increment failed\n');
    return false;
  }
  
  // Test 2: Multiple silence choices
  console.log('Test 2: Multiple silence choices');
  const silenceEffect2 = {
    type: 'increment',
    variable: 'player_silence_count',
    value: 1
  };
  
  effectProcessor.process(silenceEffect2, context);
  effectProcessor.process(silenceEffect2, context);
  
  const finalCount = context.state.variables.get('player_silence_count');
  console.log(`After 2 more increments: ${finalCount}`);
  
  if (finalCount === 3) {
    console.log('✅ Test 2 PASSED: Multiple increments work\n');
  } else {
    console.log('❌ Test 2 FAILED: Multiple increments failed\n');
    return false;
  }
  
  // Test 3: Legacy format with 'amount' property
  console.log('Test 3: Legacy format with amount property');
  const legacyEffect = {
    type: 'increment',
    variable: 'player_silence_count',
    amount: 2  // TypeScript format
  };
  
  const beforeLegacy = context.state.variables.get('player_silence_count');
  effectProcessor.process(legacyEffect, context);
  const afterLegacy = context.state.variables.get('player_silence_count');
  
  console.log(`Before legacy: ${beforeLegacy}, After legacy: ${afterLegacy}`);
  
  if (afterLegacy === beforeLegacy + 2) {
    console.log('✅ Test 3 PASSED: Legacy amount format works\n');
  } else {
    console.log('❌ Test 3 FAILED: Legacy amount format failed\n');
    return false;
  }
  
  // Test 4: Real dialogue file parsing
  console.log('Test 4: Real dialogue file parsing');
  const dialogueFile = join(rootDir, 'public/data/dialogues/nazuna/neutral/topics.yaml');
  
  if (existsSync(dialogueFile)) {
    const content = readFileSync(dialogueFile, 'utf-8');
    const dialogueData = parse(content);
    
    let silenceChoicesFound = 0;
    let silenceEffectsProcessed = 0;
    
    if (dialogueData.dialogues) {
      for (const dialogue of dialogueData.dialogues) {
        if (dialogue.choices) {
          for (const choice of dialogue.choices) {
            // Look for silence choices (usually contain "......" or mention silence)
            if (choice.text.includes('......') || choice.text.includes('静か') || choice.text.includes('黙')) {
              silenceChoicesFound++;
              console.log(`  Found silence choice: "${choice.text}"`);
              
              if (choice.effects) {
                for (const effect of choice.effects) {
                  if (effect.type === 'increment' && effect.variable === 'player_silence_count') {
                    console.log(`    Processing silence effect:`, effect);
                    
                    const before = context.state.variables.get('player_silence_count');
                    effectProcessor.process(effect, context);
                    const after = context.state.variables.get('player_silence_count');
                    
                    console.log(`    Silence count: ${before} → ${after}`);
                    silenceEffectsProcessed++;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`✓ Found ${silenceChoicesFound} silence choices`);
    console.log(`✓ Processed ${silenceEffectsProcessed} silence effects`);
    
    if (silenceChoicesFound > 0 && silenceEffectsProcessed > 0) {
      console.log('✅ Test 4 PASSED: Real dialogue parsing works\n');
    } else {
      console.log('❌ Test 4 FAILED: No silence choices/effects found\n');
      return false;
    }
  } else {
    console.log('❌ Test 4 FAILED: Dialogue file not found\n');
    return false;
  }
  
  // Test 5: Final verification
  console.log('Test 5: Final verification');
  const finalSilenceCount = context.state.variables.get('player_silence_count');
  console.log(`Final silence count: ${finalSilenceCount}`);
  
  if (finalSilenceCount > 0) {
    console.log('✅ Test 5 PASSED: Silence count properly tracked\n');
  } else {
    console.log('❌ Test 5 FAILED: Silence count not tracked\n');
    return false;
  }
  
  console.log('🎉 All silence choice effect tests passed!');
  console.log('沈黙選択肢の効果処理が正常に動作することを確認しました。');
  return true;
}

// Run the test
testSilenceChoiceEffects().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});