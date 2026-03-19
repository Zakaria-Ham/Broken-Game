'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const REQUIRED_HOVER_SECONDS = 15;

export default function ButtonLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, unlockTag } = useGame();
  const [solved, setSolved] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [msg, setMsg] = useState('');
  const hoverTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoverStart = useRef<number>(0);
  const clickCount = useRef(0);

  const handleClick = () => {
    if (solved) return;
    setClicked(true);
    clickCount.current += 1;
    if (clickCount.current >= 75) {
      void unlockTag('Clicker');
    }
    addAttempt('button');
    setMsg("Nothing. Clicking doesn't work.");
    setTimeout(() => setMsg(''), 2000);
  };

  const handleMouseEnter = useCallback(() => {
    if (solved) return;
    hoverStart.current = Date.now();
    hoverTimer.current = setInterval(() => {
      const elapsed = (Date.now() - hoverStart.current) / 1000;
      if (elapsed >= REQUIRED_HOVER_SECONDS) {
        if (hoverTimer.current) clearInterval(hoverTimer.current);
        setSolved(true);
        completeLevel('button');
      }
    }, 100);
  }, [solved, completeLevel]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearInterval(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  return (
    <LevelLayout levelName="button" title="BUTTON.EXE">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 50px)',
        padding: '20px',
      }}>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '16px',
          color: 'var(--accent-red)',
          marginBottom: '8px',
        }}>
          button.exe
        </div>
        <p style={{
          fontFamily: 'var(--font-terminal)',
          fontSize: '20px',
          color: 'var(--text-secondary)',
          marginBottom: '60px',
        }}>
          A simple task. Keep your cursor .
        </p>

        {/* The button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '20px',
              padding: '30px 60px',
              background: solved ? 'var(--accent-green)' : 'var(--accent-red)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {solved ? 'DONE!' : 'CLICK ME'}
          </button>
        </div>

        {clicked && !solved && (
          <p style={{
            marginTop: '20px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            maybe clicking isn&apos;t the answer...
          </p>
        )}

        {msg && (
          <div style={{
            marginTop: '20px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '20px',
            color: 'var(--accent-red)',
            animation: 'glitch 0.3s',
          }}>
            {msg}
          </div>
        )}

        {solved && (
          <MessageBox
            message="You hovered long enough. Patience defeats all buttons."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
