import React, { useState, useEffect } from 'react';
import { gameDebugger } from '../../debug/gameDebug';

interface DebugOverlayProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ isVisible, onToggle }) => {
  const [silenceCount, setSilenceCount] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setSilenceCount(gameDebugger.getSilenceCount());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm opacity-50 hover:opacity-100 transition-opacity"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">🔧 Debug Panel</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>🤐 Silence Count:</span>
          <span className="font-bold text-yellow-400">{silenceCount}</span>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              gameDebugger.incrementSilence();
              setSilenceCount(gameDebugger.getSilenceCount());
            }}
            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
          >
            +1
          </button>
          <button
            onClick={() => {
              gameDebugger.resetSilence();
              setSilenceCount(0);
            }}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
          >
            Reset
          </button>
        </div>
        
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => gameDebugger.logState()}
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
          >
            Log State
          </button>
          <button
            onClick={() => gameDebugger.logSilenceCount()}
            className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
          >
            Log Silence
          </button>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-400">
        Console commands:
        <div className="font-mono text-xs mt-1">
          <div>gameDebugger.logState()</div>
          <div>gameDebugger.logSilenceCount()</div>
        </div>
      </div>
    </div>
  );
};