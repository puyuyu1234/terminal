import { useState, useEffect, useCallback } from 'react';
import { GameEngine } from '@/core/GameEngine';
import type { GameContext, Character } from '@/types';

export interface GameState {
  isLoading: boolean;
  isInSession: boolean;
  currentText: string;
  currentCharacter: Character | null;
  choices: Array<{ id: string; text: string; index: number }>;
  context: GameContext | null;
  error: string | null;
}

export const useGameEngine = () => {
  const [gameEngine] = useState(() => new GameEngine());
  const [gameState, setGameState] = useState<GameState>({
    isLoading: true,
    isInSession: false,
    currentText: '',
    currentCharacter: null,
    choices: [],
    context: null,
    error: null
  });

  const updateGameState = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentText: gameEngine.getCurrentText(),
      currentCharacter: gameEngine.getCurrentCharacter(),
      choices: gameEngine.getCurrentChoices()
    }));
  }, [gameEngine]);

  const initialize = useCallback(async () => {
    try {
      await gameEngine.initialize();
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [gameEngine]);

  const startNewSession = useCallback(async () => {
    try {
      setGameState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const context = await gameEngine.startNewSession();
      
      const currentText = gameEngine.getCurrentText();
      const choices = gameEngine.getCurrentChoices();
      
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        isInSession: true,
        context,
        currentCharacter: context.currentCharacter,
        currentText,
        choices
      }));
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start session'
      }));
    }
  }, [gameEngine]);

  const makeChoice = useCallback(async (choiceIndex: number) => {
    try {
      console.log('makeChoice - before:', { 
        choiceIndex, 
        currentText: gameEngine.getCurrentText(),
        currentChoices: gameEngine.getCurrentChoices()
      });
      
      const hasNext = await gameEngine.makeChoice(choiceIndex);
      
      console.log('makeChoice - after makeChoice:', { 
        hasNext, 
        newText: gameEngine.getCurrentText(),
        newChoices: gameEngine.getCurrentChoices()
      });
      
      if (hasNext) {
        updateGameState();
      } else {
        // Session ended
        setGameState(prev => ({
          ...prev,
          isInSession: false,
          currentText: '',
          choices: [],
          context: null
        }));
      }
    } catch (error) {
      console.error('makeChoice error:', error);
      setGameState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to make choice'
      }));
    }
  }, [gameEngine, updateGameState]);

  const endSession = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isInSession: false,
      currentText: '',
      choices: [],
      context: null
    }));
  }, []);

  const resetGame = useCallback(() => {
    gameEngine.resetGame();
    setGameState(prev => ({
      ...prev,
      isInSession: false,
      currentText: '',
      choices: [],
      context: null,
      error: null
    }));
  }, [gameEngine]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    gameState,
    startNewSession,
    makeChoice,
    endSession,
    resetGame,
    gameEngine
  };
};