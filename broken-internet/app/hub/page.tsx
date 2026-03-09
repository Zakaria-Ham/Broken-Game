'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Portal from '../components/Portal';
import { useGame } from '../context/GameContext';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function HubPage() {
  const { gameState } = useGame();
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntered(true);
  }, []);

  // Live timer tick
  useEffect(() => {
    if (!gameState.startedAt) return;
    if (gameState.completedAt) {
      setElapsed(gameState.completedAt - gameState.startedAt);
      return;
    }
    const iv = setInterval(() => {
      setElapsed(Date.now() - gameState.startedAt!);
    }, 1000);
    return () => clearInterval(iv);
  }, [gameState.startedAt, gameState.completedAt]);

  const completedCount = Object.values(gameState.levels).filter(l => l.completed).length;
  const profile = mounted ? gameState.profile : null;
  const allCompleted = mounted ? gameState.allCompleted : false;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center bottom, #0a0a2e 0%, #050505 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(170,68,255,0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(0,255,136,0.05) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(68,136,255,0.03) 0%, transparent 60%)
        `,
      }} />

      {/* Top bar — profile & timer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50px',
        background: 'rgba(5,5,5,0.9)', borderBottom: '1px solid #222',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 100,
      }}>
        {/* Left: profile */}
        <div
          onClick={() => router.push('/profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: profile ? 'var(--accent-purple)' : '#333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-pixel)', fontSize: '12px', color: '#fff',
          }}>
            {profile ? profile.username.charAt(0).toUpperCase() : '?'}
          </div>
          <span style={{
            fontFamily: 'var(--font-pixel)', fontSize: '9px',
            color: profile ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {profile ? profile.username : 'Sign In'}
          </span>
        </div>

        {/* Center: timer */}
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: '11px',
          color: allCompleted ? 'var(--accent-green)' : 'var(--accent-yellow)',
          textShadow: allCompleted ? '0 0 10px rgba(0,255,136,0.4)' : 'none',
        }}>
          ⏱ {gameState.startedAt ? (elapsed > 0 ? formatTime(elapsed) : '0s') : '—'}
          {allCompleted && ' ★'}
        </div>

        {/* Right: scoreboard */}
        <button
          onClick={() => router.push('/scoreboard')}
          style={{
            fontFamily: 'var(--font-pixel)', fontSize: '9px',
            color: 'var(--accent-yellow)', background: 'none', border: 'none',
            cursor: 'pointer',
          }}
        >
          🏆 SCORES
        </button>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-pixel)',
        fontSize: 'clamp(16px, 3vw, 28px)',
        color: 'var(--text-primary)',
        marginBottom: '10px',
        opacity: entered ? 1 : 0,
        transition: 'opacity 1s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        THE UNDERGROUND HUB
      </h1>

      <p style={{
        fontFamily: 'var(--font-terminal)',
        fontSize: '20px',
        color: 'var(--text-secondary)',
        marginBottom: '50px',
        opacity: entered ? 1 : 0,
        transition: 'opacity 1.5s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        {completedCount}/7 websites fixed — {completedCount === 7 ? 'ALL CLEARED!' : 'choose a portal'}
      </p>

      {/* Portals grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '30px',
        justifyContent: 'center',
        maxWidth: '900px',
        opacity: entered ? 1 : 0,
        transition: 'opacity 2s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        <Portal level="chess" label="Chess" href="/levels/chess" color="#ffcc00" />
        <Portal level="button" label="Button" href="/levels/button" color="#ff3355" />
        <Portal level="cursor" label="Cursor" href="/levels/cursor" color="#4488ff" />
        <Portal level="login" label="Login" href="/levels/login" color="#aa44ff" />
        <Portal level="timer" label="Timer" href="/levels/timer" color="#00ff88" />
        <Portal level="checkmate" label="Checkmate" href="/levels/checkmate" color="#ff8800" />
        <Portal level="race" label="Race" href="/levels/race" color="#00ccff" />
      </div>

      {/* Final portal */}
      {allCompleted && (
        <div
          onClick={() => router.push('/')}
          style={{
            marginTop: '60px',
            padding: '20px 40px',
            border: '2px solid var(--accent-green)',
            borderRadius: '8px',
            fontFamily: 'var(--font-pixel)',
            fontSize: '12px',
            color: 'var(--accent-green)',
            cursor: 'pointer',
            animation: 'fadeIn 1s ease-out',
            boxShadow: '0 0 40px rgba(0,255,136,0.3), 0 0 80px rgba(0,255,136,0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          🌐 YOU FIXED THE INTERNET 🌐
        </div>
      )}

      {/* Bottom stats */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        fontFamily: 'var(--font-terminal)',
        fontSize: '16px',
        color: 'var(--text-secondary)',
      }}>
        Total attempts: {gameState.totalAttempts}
      </div>

      {/* Prompt to create profile */}
      {!profile && (
        <div
          onClick={() => router.push('/profile')}
          style={{
            position: 'fixed', bottom: '20px', left: '20px',
            fontFamily: 'var(--font-pixel)', fontSize: '8px',
            color: 'var(--accent-purple)', cursor: 'pointer',
            padding: '8px 16px', border: '1px solid var(--accent-purple)',
            borderRadius: '4px', animation: 'fadeIn 2s ease-out',
          }}
        >
          Create profile to save score →
        </div>
      )}
    </div>
  );
}
