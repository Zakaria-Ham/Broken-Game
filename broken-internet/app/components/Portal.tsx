'use client';

import React from 'react';
import Link from 'next/link';
import { useGame, LevelName } from '../context/GameContext';

interface PortalProps {
  level: LevelName;
  label: string;
  href: string;
  color: string;
}

export default function Portal({ level, label, href, color }: PortalProps) {
  const { isLevelCompleted } = useGame();
  const completed = isLevelCompleted(level);

  return (
    <Link href={href}>
      <div style={{
        width: '140px',
        height: '180px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* Portal glow */}
        <div style={{
          width: '80px',
          height: '110px',
          borderRadius: '40px 40px 0 0',
          background: completed
            ? `radial-gradient(ellipse at center, ${color}44, ${color}11)`
            : `radial-gradient(ellipse at center, ${color}22, transparent)`,
          border: `2px solid ${completed ? color : color + '66'}`,
          boxShadow: completed
            ? `0 0 30px ${color}66, 0 0 60px ${color}33, inset 0 0 30px ${color}22`
            : `0 0 10px ${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {completed && (
            <span style={{ fontSize: '28px' }}>✓</span>
          )}
          {!completed && (
            <span style={{
              fontSize: '24px',
              opacity: 0.6,
              animation: 'flicker 2s infinite',
            }}>?</span>
          )}
        </div>

        {/* Label */}
        <div style={{
          marginTop: '12px',
          fontFamily: 'var(--font-pixel)',
          fontSize: '8px',
          color: completed ? color : 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {label}
        </div>

        {/* Status */}
        <div style={{
          marginTop: '4px',
          fontSize: '16px',
          fontFamily: 'var(--font-terminal)',
          color: completed ? 'var(--accent-green)' : 'var(--text-secondary)',
        }}>
          {completed ? 'SOLVED' : 'UNSOLVED'}
        </div>
      </div>
    </Link>
  );
}
