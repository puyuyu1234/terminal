import React from "react";

interface MainMenuProps {
  onStartGame: () => void;
  onShowStats: () => void;
  totalVisits: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onShowStats,
  totalVisits,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center px-6">
        {/* Title */}
        <h1 className="text-6xl font-thin mb-4 text-gray-200">廃駅ホームの</h1>
        <h2 className="text-4xl font-light mb-8 text-gray-300">待ち人</h2>

        {/* Subtitle */}
        <p className="text-lg text-gray-400 mb-12 leading-relaxed">
          取り壊し予定の旧駅舎。
          <br />
          そこには、なぜか毎晩、ひとり、またひとりと少女たちが現れる。
          <br />
          あなたはこの駅のベンチに座り、彼女たちと短い会話を交わすことができる。
        </p>

        {/* Visit Counter */}
        {totalVisits > 0 && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400">これまでの訪問回数</div>
            <div className="text-2xl font-light text-blue-300">
              {totalVisits}
            </div>
          </div>
        )}

        {/* Menu Buttons */}
        <div className="space-y-4">
          <button
            onClick={onStartGame}
            className="w-full max-w-md px-8 py-4 bg-gray-800 text-white rounded-lg 
                     hover:bg-gray-700 transition-colors duration-200 
                     border border-gray-600 hover:border-gray-500"
          >
            <div className="text-xl font-light">
              {totalVisits === 0 ? "はじめての夜" : "今夜も駅へ"}
            </div>
            <div className="text-sm text-gray-400 mt-1">新しい会話を始める</div>
          </button>

          <button
            onClick={onShowStats}
            className="w-full max-w-md px-8 py-3 bg-transparent text-gray-400 
                     rounded-lg border border-gray-700 hover:border-gray-600 
                     hover:text-gray-300 transition-colors duration-200"
          >
            記録を見る
          </button>
        </div>

        {/* Atmosphere Text */}
        <div className="mt-16 text-sm text-gray-600">
          <p className="mb-2">
            「ゲームに目的もクリアもない。ただ、話し、聞き、忘れ、記憶のずれを体験する。」
          </p>
        </div>
      </div>
    </div>
  );
};
