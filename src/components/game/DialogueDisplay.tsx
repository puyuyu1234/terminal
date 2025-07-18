import React, { useState, useEffect, useMemo } from 'react';
import type { Character } from '@/types';

interface DialogueDisplayProps {
  text: string;
  character: Character | null;
  isVisible: boolean;
  onTextComplete?: () => void;
}

export const DialogueDisplay: React.FC<DialogueDisplayProps> = ({
  text,
  character,
  isVisible,
  onTextComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Memoize the cleaned text to prevent unnecessary re-renders
  const cleanText = useMemo(() => {
    if (!text) return '';
    return String(text).replace(/undefined/g, '').trim();
  }, [text]);

  useEffect(() => {
    if (!isVisible || !cleanText) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    let currentIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (currentIndex < cleanText.length) {
        const char = cleanText[currentIndex];
        setDisplayedText(prev => prev + char);
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        setIsTyping(false);
        onTextComplete?.();
      }
    }, 50); // 50ms per character

    return () => clearInterval(typewriterInterval);
  }, [cleanText, isVisible]); // onTextCompleteを依存関係から削除

  if (!isVisible || !character) {
    return null;
  }

  return (
    <div className="bg-gray-800 border-l-4 border-blue-500 p-6 rounded-r-lg shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-blue-300">
          {character.name}
        </h3>
      </div>
      
      <div className="text-lg leading-relaxed">
        <p className="text-gray-100">
          {displayedText}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>
      </div>

      {/* Subtle atmosphere indicators */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
          <span>夕暮れの廃駅</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>風の音...</span>
          <div className="w-1 h-1 bg-gray-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};