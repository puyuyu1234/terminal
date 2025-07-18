import React, { useState } from 'react';

interface Choice {
  id: string;
  text: string;
  index: number;
}

interface ChoiceSelectorProps {
  choices: Choice[];
  onChoiceSelect: (index: number) => void;
  isVisible: boolean;
  disabled?: boolean;
}

export const ChoiceSelector: React.FC<ChoiceSelectorProps> = ({
  choices,
  onChoiceSelect,
  isVisible,
  disabled = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleChoiceClick = async (index: number) => {
    if (disabled || isSelecting) return;
    
    setSelectedIndex(index);
    setIsSelecting(true);
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      onChoiceSelect(index);
      setSelectedIndex(null);
      setIsSelecting(false);
    }, 300);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleChoiceClick(index);
    }
  };

  if (!isVisible || choices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400 mb-4">
        あなたの選択：
      </div>
      
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          onClick={() => handleChoiceClick(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled || isSelecting}
          className={`
            w-full p-4 text-left rounded-lg border-2 transition-all duration-200
            ${
              selectedIndex === index
                ? 'bg-blue-600 border-blue-400 text-white transform scale-105'
                : disabled || isSelecting
                ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 hover:border-gray-500'
            }
            ${!disabled && !isSelecting ? 'hover:shadow-lg' : ''}
          `}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">{choice.text}</span>
            <div className="flex items-center space-x-2">
              {selectedIndex === index && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span className="text-sm text-gray-400">
                {getChoiceIcon(choice.text)}
              </span>
            </div>
          </div>
        </button>
      ))}
      
      {isSelecting && (
        <div className="text-center text-sm text-gray-400 mt-4">
          <div className="animate-pulse">選択中...</div>
        </div>
      )}
    </div>
  );
};

function getChoiceIcon(text: string): string {
  // Simple icon mapping based on choice text
  if (text.includes('...') || text === '...') return '💭';
  if (text.includes('？') || text.includes('?')) return '❓';
  if (text.includes('はい') || text.includes('そう')) return '✓';
  if (text.includes('いいえ') || text.includes('違う')) return '✗';
  if (text.includes('待つ') || text.includes('待とう')) return '⏰';
  if (text.includes('行く') || text.includes('離れる')) return '🚶';
  return '💬';
}