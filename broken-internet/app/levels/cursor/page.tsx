'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

export default function CursorLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();
  const [solved, setSolved] = useState(false);
  const [squarePos, setSquarePos] = useState({ x: 400, y: 300 });
  const [msg, setMsg] = useState('');
  const lastMouse = useRef({ x: 0, y: 0, time: Date.now() });
  const slowCount = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (solved) return;

    const now = Date.now();
    const dt = now - lastMouse.current.time;
    if (dt < 16) return; // throttle

    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 1) * 16;

    lastMouse.current = { x: e.clientX, y: e.clientY, time: now };

    // Fast cursor: square runs away
    if (speed > 3) {
      slowCount.current = 0;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Move square away from cursor
      const sqCenterX = squarePos.x + 25;
      const sqCenterY = squarePos.y + 25;
      const angle = Math.atan2(sqCenterY - e.clientY + rect.top, sqCenterX - e.clientX + rect.left);
      const escapeSpeed = Math.min(speed * 5, 80);

      let newX = squarePos.x + Math.cos(angle) * escapeSpeed;
      let newY = squarePos.y + Math.sin(angle) * escapeSpeed;

      // Keep within bounds
      newX = Math.max(20, Math.min(rect.width - 70, newX));
      newY = Math.max(20, Math.min(rect.height - 70, newY));

      setSquarePos({ x: newX, y: newY });
    } else {
      // Slow cursor
      slowCount.current++;
      if (slowCount.current > 60) {
        setSolved(true);
        completeLevel('cursor');
      }
    }
  }, [solved, squarePos, completeLevel]);

  const handleSquareClick = () => {
    if (solved) return;
    addAttempt('cursor');
    setMsg("Too fast! The square escaped.");
    setTimeout(() => setMsg(''), 2000);
  };

  // Initialize mouse position
  useEffect(() => {
    lastMouse.current = { x: 0, y: 0, time: Date.now() };
  }, []);

  return (
    <LevelLayout levelName="cursor" title="CURSOR.TRAP">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 50px)',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'crosshair',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '80px',
          fontFamily: 'var(--font-pixel)',
          fontSize: '14px',
          color: 'var(--accent-blue)',
          zIndex: 10,
        }}>
          cursor.trap
        </div>
        <p style={{
          position: 'absolute',
          top: '110px',
          fontFamily: 'var(--font-terminal)',
          fontSize: '20px',
          color: 'var(--text-secondary)',
          zIndex: 10,
        }}>
          Move your cursor to the red square.
        </p>

        {/* The escaping square */}
        {!solved && (
          <div
            onClick={handleSquareClick}
            style={{
              position: 'absolute',
              left: `${squarePos.x}px`,
              top: `${squarePos.y}px`,
              width: '50px',
              height: '50px',
              background: 'var(--accent-red)',
              boxShadow: '0 0 20px rgba(255,51,85,0.5)',
              transition: 'left 0.15s ease-out, top 0.15s ease-out',
              cursor: 'pointer',
            }}
          />
        )}

        {/* Hint after some attempts */}
        {slowCount.current > 10 && !solved && (
          <p style={{
            position: 'absolute',
            bottom: '100px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}>
            maybe... go slower?
          </p>
        )}

        {msg && (
          <div style={{
            position: 'absolute',
            bottom: '60px',
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
            message="The square trusted you. Slow and steady wins. Level complete."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
