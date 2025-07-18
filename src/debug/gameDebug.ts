// Debug utilities for game development
// ゲーム開発用のデバッグユーティリティ

import type { GameEngine } from '@/core/GameEngine';

export class GameDebugger {
  private gameEngine: GameEngine | null = null;

  setGameEngine(engine: GameEngine): void {
    this.gameEngine = engine;
    console.log('🔧 [DEBUG] GameEngine attached to debugger');
  }

  logState(): void {
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return;
    }
    this.gameEngine.logCurrentState();
  }

  logSilenceCount(): void {
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return;
    }
    this.gameEngine.logSilenceCount();
  }

  getSilenceCount(): number {
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return 0;
    }
    return this.gameEngine.getSilenceCount();
  }

  // Manual increment for testing
  incrementSilence(): void {
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return;
    }
    const current = this.gameEngine.getSilenceCount();
    this.gameEngine.setVariable('player_silence_count', current + 1);
    console.log(`🤐 [DEBUG] Manually incremented silence count to ${current + 1}`);
  }

  // Reset silence count
  resetSilence(): void {
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return;
    }
    this.gameEngine.setVariable('player_silence_count', 0);
    console.log('🤐 [DEBUG] Reset silence count to 0');
  }

  // Show available choices with their effects
  showChoiceEffects(): void {
    console.log('🎯 [DEBUG] Available choices and their effects:');
    if (!this.gameEngine) {
      console.warn('🔧 [DEBUG] GameEngine not attached');
      return;
    }
    
    const choices = this.gameEngine.getCurrentChoices();
    choices.forEach((choice, index) => {
      console.log(`${index}: "${choice.text}"`);
      // Note: We can't access effects directly from the public API
      // This would require extending the GameEngine to expose choice effects
    });
  }
}

// Create global debugger instance
export const gameDebugger = new GameDebugger();

// Make it available globally for console debugging
declare global {
  interface Window {
    gameDebugger: GameDebugger;
  }
}

if (typeof window !== 'undefined') {
  window.gameDebugger = gameDebugger;
  console.log('🔧 [DEBUG] Global gameDebugger available. Try:');
  console.log('  - gameDebugger.logState()');
  console.log('  - gameDebugger.logSilenceCount()');
  console.log('  - gameDebugger.incrementSilence()');
  console.log('  - gameDebugger.resetSilence()');
}