'use client';

import React from 'react';
import { useGame, LevelName } from '../context/GameContext';

const RAGE_MESSAGES = [
  "That didn't work.",
  "Maybe try thinking.",
  "Interesting choice.",
  "Are you even trying?",
  "The internet is judging you.",
  "Error 404: Skill not found.",
  "Have you tried turning your brain on and off?",
  "Nope.",
  "You're making the pixels sad.",
  "This is painful to watch.",
  "The game is losing patience.",
  "Try again. Or don't. I don't care.",
  "Wow. Just wow.",
  "That's not how anything works.",
  "You might be the worst player ever.",
];

interface RageCounterProps {
  level: LevelName;
}

export default function RageCounter({ level }: RageCounterProps) {
  const { getLevelAttempts } = useGame();
  const attempts = getLevelAttempts(level);

  if (attempts === 0) return null;

  const message = RAGE_MESSAGES[Math.min(attempts - 1, RAGE_MESSAGES.length - 1)];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255, 51, 85, 0.15)',
      border: '1px solid var(--accent-red)',
      padding: '12px 24px',
      borderRadius: '4px',
      fontFamily: 'var(--font-terminal)',
      fontSize: '20px',
      color: 'var(--accent-red)',
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
        Attempts: {attempts}
      </div>
      {message}
    </div>
  );
}
