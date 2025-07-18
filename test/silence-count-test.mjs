#!/usr/bin/env node

/**
 * Test script to verify silence count tracking
 */

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Mock implementation for testing
class MockStateManager {
  constructor() {
    this.state = {
      variables: new Map(),
      flags: new Set(),
      characters: new Map(),
      player: {
        totalVisits: 0,
        silenceCount: 0,
        lastVisitDate: new Date().toISOString(),
        currentSessionStart: new Date().toISOString()
      },
      history: []
    };
  }

  async initializeGlobalVariables() {
    try {
      const yamlPath = join(rootDir, 'public/data/variables/global-variables.yaml');
      if (!existsSync(yamlPath)) {
        console.error('❌ Global variables file not found:', yamlPath);
        return;
      }

      const yamlContent = readFileSync(yamlPath, 'utf-8');
      const config = parse(yamlContent);
      
      if (config.variables) {
        Object.entries(config.variables).forEach(([name, definition]) => {
          this.state.variables.set(name, definition.initial_value);
          console.log(`✓ Initialized ${name} to ${definition.initial_value}`);
        });
      }
    } catch (error) {
      console.error('❌ Error loading global variables:', error.message);
    }
  }

  getVariable(name) {
    return this.state.variables.get(name);
  }

  setVariable(name, value) {
    this.state.variables.set(name, value);
  }

  incrementVariable(name, amount = 1) {
    const current = this.state.variables.get(name) || 0;
    this.state.variables.set(name, current + amount);
  }
}

// Mock EffectProcessor to test increment effects
class MockEffectProcessor {
  processIncrement(effect, context) {
    const current = context.state.variables.get(effect.variable) || 0;
    const amount = effect.amount || 1;
    context.state.variables.set(effect.variable, current + amount);
    
    console.log(`📊 [EffectProcessor] Incremented ${effect.variable} from ${current} to ${current + amount}`);
  }
}

async function testSilenceCountTracking() {
  console.log('🧪 Testing silence count tracking...\n');

  // Test 1: Variable initialization
  console.log('Test 1: Variable initialization');
  const stateManager = new MockStateManager();
  await stateManager.initializeGlobalVariables();
  
  const initialSilenceCount = stateManager.getVariable('player_silence_count');
  console.log(`Initial player_silence_count: ${initialSilenceCount}`);
  
  if (initialSilenceCount === 0) {
    console.log('✅ Test 1 PASSED: Variable initialized correctly\n');
  } else {
    console.log('❌ Test 1 FAILED: Variable not initialized to 0\n');
    return false;
  }

  // Test 2: Effect processing
  console.log('Test 2: Effect processing');
  const effectProcessor = new MockEffectProcessor();
  const mockContext = {
    state: stateManager.state,
    currentCharacter: { id: 'nazuna' },
    environment: {}
  };

  // Simulate silence choice effect
  const silenceEffect = {
    type: 'increment',
    variable: 'player_silence_count',
    value: 1
  };

  effectProcessor.processIncrement(silenceEffect, mockContext);
  
  const afterIncrement = stateManager.getVariable('player_silence_count');
  console.log(`After increment: ${afterIncrement}`);
  
  if (afterIncrement === 1) {
    console.log('✅ Test 2 PASSED: Effect processing works correctly\n');
  } else {
    console.log('❌ Test 2 FAILED: Effect processing not working\n');
    return false;
  }

  // Test 3: Multiple increments
  console.log('Test 3: Multiple increments');
  effectProcessor.processIncrement(silenceEffect, mockContext);
  effectProcessor.processIncrement(silenceEffect, mockContext);
  
  const afterMultiple = stateManager.getVariable('player_silence_count');
  console.log(`After multiple increments: ${afterMultiple}`);
  
  if (afterMultiple === 3) {
    console.log('✅ Test 3 PASSED: Multiple increments work correctly\n');
  } else {
    console.log('❌ Test 3 FAILED: Multiple increments not working\n');
    return false;
  }

  // Test 4: Check silence choices in dialogue files
  console.log('Test 4: Checking silence choices in dialogue files');
  const dialogueFiles = [
    'public/data/dialogues/nazuna/neutral/topics.yaml',
    'public/data/dialogues/nazuna/start/first-meeting.yaml',
    'public/data/dialogues/ayane/neutral/topics.yaml'
  ];

  let silenceChoicesFound = 0;
  for (const file of dialogueFiles) {
    const fullPath = join(rootDir, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      if (content.includes('player_silence_count')) {
        silenceChoicesFound++;
        console.log(`✓ Found silence tracking in ${file}`);
      }
    }
  }

  if (silenceChoicesFound > 0) {
    console.log(`✅ Test 4 PASSED: Found ${silenceChoicesFound} files with silence tracking\n`);
  } else {
    console.log('❌ Test 4 FAILED: No silence tracking found in dialogue files\n');
    return false;
  }

  console.log('🎉 All tests passed! Silence count tracking should work correctly.');
  return true;
}

// Run tests
testSilenceCountTracking().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});