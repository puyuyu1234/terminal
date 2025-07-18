import React, { useState, useCallback } from 'react';
import { DialogueDisplay } from './DialogueDisplay';
import { ChoiceSelector } from './ChoiceSelector';
import type { GameState } from '@/hooks/useGameEngine';

interface GameSessionProps {
  gameState: GameState;
  makeChoice: (choiceIndex: number) => Promise<void>;
  onSessionEnd: () => void;
}

export const GameSession: React.FC<GameSessionProps> = ({ gameState, makeChoice, onSessionEnd }) => {
  const [, setTextComplete] = useState(false);
  const [showChoices, setShowChoices] = useState(false);

  const handleTextComplete = useCallback(() => {
    console.log('handleTextComplete - called, current choices:', gameState.choices);
    setTextComplete(true);
    setTimeout(() => {
      console.log('handleTextComplete - showing choices after delay');
      setShowChoices(true);
    }, 500);
  }, [gameState.choices]);

  const handleChoiceSelect = async (index: number) => {
    console.log('handleChoiceSelect - start:', { index, currentChoices: gameState.choices });
    setShowChoices(false);
    setTextComplete(false);
    
    await makeChoice(index);
    
    console.log('handleChoiceSelect - after makeChoice:', { 
      isInSession: gameState.isInSession, 
      currentText: gameState.currentText,
      newChoices: gameState.choices 
    });
    
    if (!gameState.isInSession) {
      onSessionEnd();
    }
  };

  if (gameState.error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-lg mb-4">
          エラーが発生しました
        </div>
        <div className="text-gray-400 text-sm mb-6">
          {gameState.error}
        </div>
        <button
          onClick={onSessionEnd}
          className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Atmosphere Header */}
      <div className="text-center py-6">
        <div className="text-3xl font-light text-gray-300 mb-2">
          廃駅ホーム
        </div>
        <div className="text-sm text-gray-500">
          夕暮れの静寂の中で...
        </div>
      </div>

      {/* Dialogue Display */}
      <DialogueDisplay
        text={gameState.currentText}
        character={gameState.currentCharacter}
        isVisible={gameState.isInSession}
        onTextComplete={handleTextComplete}
      />

      {/* Choice Selector */}
      <div className="min-h-[200px]">
        <ChoiceSelector
          choices={gameState.choices}
          onChoiceSelect={handleChoiceSelect}
          isVisible={showChoices && gameState.choices.length > 0}
          disabled={gameState.isLoading}
        />
      </div>

      {/* Session Status */}
      {gameState.isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          <div className="text-gray-400">読み込み中...</div>
        </div>
      )}

      {/* End Session Button */}
      {gameState.isInSession && !gameState.isLoading && (
        <div className="text-center pt-8">
          <button
            onClick={onSessionEnd}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            この夜を終える
          </button>
        </div>
      )}
    </div>
  );
};