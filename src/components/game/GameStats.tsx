import React from 'react';
import type { GameState } from '@/types';

interface GameStatsProps {
  gameState: GameState;
  onBack: () => void;
}

export const GameStats: React.FC<GameStatsProps> = ({ gameState, onBack }) => {
  console.log('[GameStats] Received gameState:', gameState);
  console.log('[GameStats] Player visits:', gameState.player.totalVisits);
  console.log('[GameStats] Character count:', gameState.characters.size);
  console.log('[GameStats] History length:', gameState.history.length);
  
  const characterStats = Array.from(gameState.characters.entries()).map(([id, state]) => ({
    id,
    ...state
  }));

  const totalFlags = gameState.flags.size;
  const totalVariables = gameState.variables.size;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-300 transition-colors mb-4"
          >
            ← 戻る
          </button>
          <h1 className="text-3xl font-light mb-2">記録</h1>
          <p className="text-gray-400">あなたの軌跡</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-2xl font-light text-blue-300">
              {gameState.player.totalVisits}
            </div>
            <div className="text-sm text-gray-400">総訪問回数</div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-2xl font-light text-yellow-300">
              {gameState.player.silenceCount}
            </div>
            <div className="text-sm text-gray-400">沈黙の回数</div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-2xl font-light text-green-300">
              {gameState.history.length}
            </div>
            <div className="text-sm text-gray-400">会話の記録</div>
          </div>
        </div>

        {/* Character Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-light mb-4">出会った人々</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characterStats.map(character => (
              <div key={character.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{getCharacterName(character.id)}</div>
                  <div className="text-sm text-gray-400">
                    {character.meetCount}回の出会い
                  </div>
                </div>
                
                <div className="text-sm text-gray-400 mb-3">
                  信頼度: {getTrustDescription(character.trustLevel)}
                </div>
                
                {character.lastChoices.length > 0 && (
                  <div className="text-xs text-gray-500">
                    最近の選択: {character.lastChoices.slice(-3).join(', ')}
                  </div>
                )}
              </div>
            ))}
            
            {characterStats.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-8">
                まだ誰とも出会っていません
              </div>
            )}
          </div>
        </div>

        {/* Flags and Variables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-light mb-4">記憶の断片</h3>
            <div className="text-sm text-gray-400 mb-2">
              {totalFlags}個の記憶
            </div>
            {totalFlags > 0 && (
              <div className="text-xs text-gray-500">
                あなたの選択が、少しずつ積み重なっています
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-light mb-4">内なる変化</h3>
            <div className="text-sm text-gray-400 mb-2">
              {totalVariables}の変数
            </div>
            {totalVariables > 0 && (
              <div className="text-xs text-gray-500">
                見えない変化が、あなたの中で起こっています
              </div>
            )}
          </div>
        </div>

        {/* Recent History */}
        {gameState.history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-light mb-4">最近の記録</h2>
            <div className="space-y-2">
              {gameState.history.slice(-5).reverse().map((entry, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">
                      {getCharacterName(entry.characterId)}との会話
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {entry.choiceMade && (
                    <div className="text-gray-400 text-xs mt-1">
                      選択: {entry.choiceMade}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getCharacterName(id: string): string {
  const names: Record<string, string> = {
    'shino': '坂口 詩乃',
    'minase': 'ミナセさん',
    'ayane': '市ノ瀬 あやね',
    'nazuna': 'なずな',
    'tomo': 'トモちゃん'
  };
  return names[id] || id;
}

function getTrustDescription(trustLevel: number): string {
  if (trustLevel >= 80) return '深い信頼';
  if (trustLevel >= 50) return '親しみ';
  if (trustLevel >= 20) return '好意的';
  if (trustLevel >= -20) return '普通';
  if (trustLevel >= -50) return '距離感';
  return '警戒';
}