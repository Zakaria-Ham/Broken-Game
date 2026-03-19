'use client';

import React, { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RageCounter from './RageCounter';
import { LevelName, useGame } from '../context/GameContext';

interface LevelLayoutProps {
  children: ReactNode;
  levelName: LevelName;
  title: string;
}

export default function LevelLayout({ children, levelName, title }: LevelLayoutProps) {
  const router = useRouter();
  const { gameState, isLevelUnlocked } = useGame();

  useEffect(() => {
    if (!gameState.profile) {
      router.replace('/intro');
      return;
    }
    if (!isLevelUnlocked(levelName)) {
      router.replace('/hub');
    }
  }, [gameState.profile, isLevelUnlocked, levelName, router]);

  if (!gameState.profile || !isLevelUnlocked(levelName)) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: 'var(--bg-darker)',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 999,
      }}>
        <Link href="/hub" style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'color 0.2s',
        }}>
          ← BACK TO HUB
        </Link>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '10px',
          color: 'var(--accent-purple)',
        }}>
          {title}
        </span>
      </div>

      {/* Content */}
      <div style={{ paddingTop: '50px', minHeight: '100vh' }}>
        {children}
      </div>

      <RageCounter level={levelName} />
    </div>
  );
}
