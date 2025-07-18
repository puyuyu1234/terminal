import { useState } from 'react';
import { MainMenu } from './components/game/MainMenu';
import { GameSession } from './components/game/GameSession';
import { GameStats } from './components/game/GameStats';
import { useGameEngine } from './hooks/useGameEngine';

type GameMode = 'menu' | 'session' | 'stats';

function App() {
  const { gameState, startNewSession, makeChoice } = useGameEngine();
  const [currentMode, setCurrentMode] = useState<GameMode>('menu');

  const handleStartGame = async () => {
    setCurrentMode('session');
    await startNewSession();
  };

  const handleSessionEnd = () => {
    setCurrentMode('menu');
  };

  const handleShowStats = () => {
    setCurrentMode('stats');
  };

  const handleBackToMenu = () => {
    setCurrentMode('menu');
  };

  if (gameState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">初期化中...</p>
        </div>
      </div>
    );
  }

  if (gameState.error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">エラーが発生しました</div>
          <div className="text-gray-400 mb-6">{gameState.error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  switch (currentMode) {
    case 'session':
      return (
        <div className="min-h-screen bg-gray-900 text-white py-8">
          <GameSession 
            gameState={gameState}
            makeChoice={makeChoice}
            onSessionEnd={handleSessionEnd} 
          />
        </div>
      );
    
    case 'stats':
      return (
        <GameStats 
          gameState={gameState.context?.state || {
            player: { totalVisits: 0, silenceCount: 0, lastVisitDate: '', currentSessionStart: '' },
            characters: new Map(),
            flags: new Set(),
            variables: new Map(),
            history: []
          }}
          onBack={handleBackToMenu}
        />
      );
    
    default:
      return (
        <MainMenu
          onStartGame={handleStartGame}
          onShowStats={handleShowStats}
          totalVisits={gameState.context?.state?.player?.totalVisits || 0}
        />
      );
  }
}

export default App;