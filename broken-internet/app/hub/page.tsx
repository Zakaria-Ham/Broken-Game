'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Portal from '../components/Portal';
import MessageBox from '../components/MessageBox';
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
  const { gameState, startTimer } = useGame();
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  const [showKeyHint, setShowKeyHint] = useState(false);
  const [blackDoorOpen, setBlackDoorOpen] = useState(false);
  const [doorAnimating, setDoorAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntered(true);
  }, []);

  // Start timer automatically when a signed-in user reaches hub.
  useEffect(() => {
    if (!gameState.profile) return;
    if (gameState.startedAt || gameState.completedAt) return;
    startTimer();
  }, [gameState.profile, gameState.startedAt, gameState.completedAt, startTimer]);

  // Live timer tick
  useEffect(() => {
    if (!gameState.startedAt) return;
    if (gameState.completedAt) return;

    const iv = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(iv);
  }, [gameState.startedAt, gameState.completedAt]);

  const elapsed = gameState.startedAt
    ? Math.max(0, (gameState.completedAt ?? nowTick) - gameState.startedAt)
    : 0;

  const completedCount = Object.values(gameState.levels).filter(l => l.completed).length;
  const totalLevels = Object.keys(gameState.levels).length;
  const profile = mounted ? gameState.profile : null;
  const allCompleted = mounted ? gameState.allCompleted : false;
  const blacknetFixed = gameState.levels.blacknet?.completed;
  const lightsDone = gameState.levels.lights.completed;

  useEffect(() => {
    if (!profile) return;
    const openedKey = `broken-internet:black-door-opened:${profile.username}`;
    const pendingKey = `broken-internet:black-door-opening-pending:${profile.username}`;
    const hintKey = `broken-internet:black-door-hint-shown:${profile.username}`;

    const opened = localStorage.getItem(openedKey) === '1';
    const pending = localStorage.getItem(pendingKey) === '1';

    setBlackDoorOpen(opened);

    if (lightsDone && !opened && !localStorage.getItem(hintKey)) {
      setShowKeyHint(true);
      localStorage.setItem(hintKey, '1');
    }

    if (pending) {
      setDoorAnimating(true);
      localStorage.removeItem(pendingKey);
      localStorage.setItem(openedKey, '1');
      setBlackDoorOpen(true);
      const t = setTimeout(() => setDoorAnimating(false), 1800);
      return () => clearTimeout(t);
    }
  }, [lightsDone, profile]);

  return (
    <div style={{
      minHeight: '100vh',
      background: blacknetFixed
        ? 'radial-gradient(ellipse at center bottom, #1c3240 0%, #0e1c27 58%, #091219 100%)'
        : 'radial-gradient(ellipse at center bottom, #0a0a2e 0%, #050505 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '78px',
      paddingBottom: '110px',
      boxSizing: 'border-box',
      width: '100%',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {/* Ambient particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: blacknetFixed
          ? `
          radial-gradient(circle at 20% 30%, rgba(94,174,214,0.10) 0%, transparent 46%),
          radial-gradient(circle at 80% 70%, rgba(130,255,201,0.09) 0%, transparent 52%),
          radial-gradient(circle at 50% 55%, rgba(120,180,255,0.06) 0%, transparent 60%)
        `
          : `
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
          ⏱ {gameState.profile ? formatTime(elapsed) : '—'}
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
        marginTop: '8px',
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
        marginBottom: '34px',
        opacity: entered ? 1 : 0,
        transition: 'opacity 1.5s ease',
        position: 'relative',
        zIndex: 1,
      }}>
        {completedCount}/{totalLevels} websites fixed — {completedCount === totalLevels ? 'ALL CLEARED!' : 'choose a portal'}
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
        <Portal level="button" label="Button" href="/levels/button" color="#ff3355" />
        <Portal level="timer" label="Timer" href="/levels/timer" color="#00ff88" />
        <Portal level="cursor" label="Cursor" href="/levels/cursor" color="#4488ff" />
        <Portal level="login" label="Login" href="/levels/login" color="#aa44ff" />
        <Portal level="chess" label="Chess" href="/levels/chess" color="#ffcc00" />
        <Portal level="checkmate" label="Checkmate" href="/levels/checkmate" color="#ff8800" />
        <Portal level="race" label="Race" href="/levels/race" color="#00ccff" />
        <Portal level="blue-dot" label="Blue Dot" href="/levels/blue-dot" color="#2d7dff" />
        <Portal level="cursed" label="Cursed Domain" href="/levels/cursed" color="#8B00FF" />
        <Portal level="bedroom" label="Bedroom" href="/levels/bedroom-0804" color="#ff6699" />
        <Portal level="labyrinth" label="Labyrinth" href="/levels/labyrinth" color="#22d4aa" />
        <Portal level="rubik" label="Rubik Glitch" href="/levels/rubik" color="#fca311" />
        <Portal level="lights" label="Turn Light On" href="/levels/lights" color="#ffd166" />
      </div>

      {lightsDone && (
        <div style={{
          marginTop: '36px',
          position: 'relative',
          zIndex: 2,
          opacity: entered ? 1 : 0,
          transition: 'opacity 1.2s ease',
          textAlign: 'center',
        }}>
          <div
            onClick={() => {
              if (blackDoorOpen) {
                router.push('/levels/blacknet');
              } else {
                router.push('/profile');
              }
            }}
            style={{
              width: '220px',
              height: '260px',
              margin: '0 auto',
              borderRadius: '90px 90px 0 0',
              border: '3px solid #121212',
              background: blackDoorOpen
                ? 'radial-gradient(ellipse at center, #1f2a33 0%, #0b0d12 60%, #07080b 100%)'
                : 'radial-gradient(ellipse at center, #0a0a0a 0%, #050505 65%, #000 100%)',
              boxShadow: blackDoorOpen
                ? '0 0 40px rgba(94,200,200,0.35), inset 0 0 24px rgba(90,190,210,0.2)'
                : '0 0 26px rgba(0,0,0,0.8), inset 0 0 18px rgba(255,255,255,0.04)',
              transform: doorAnimating ? 'perspective(900px) rotateY(-72deg)' : 'perspective(900px) rotateY(0deg)',
              transformOrigin: 'left center',
              transition: 'transform 1.6s cubic-bezier(0.2, 0.9, 0.2, 1)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              left: '22px',
              top: '44px',
              width: '6px',
              height: '170px',
              background: 'rgba(255,255,255,0.08)',
            }} />
            {!blackDoorOpen && !doorAnimating && (
              <div style={{
                position: 'absolute',
                right: '34px',
                top: '126px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#2d2d2d',
                boxShadow: '0 0 8px rgba(255,255,255,0.1)',
              }} />
            )}
          </div>

          <div style={{
            marginTop: '12px',
            fontFamily: 'var(--font-pixel)',
            fontSize: '9px',
            letterSpacing: '1px',
            color: blackDoorOpen ? '#9ddde1' : '#7f8791',
          }}>
            {blackDoorOpen ? 'BLACKNET DOOR OPEN' : 'BLACK DOOR LOCKED'}
          </div>
          <div style={{
            marginTop: '4px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '15px',
            color: '#aab2bc',
          }}>
            {blackDoorOpen ? 'Enter Blacknet' : 'Find the hidden key in profile'}
          </div>
        </div>
      )}

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

      {showKeyHint && (
        <MessageBox
          type="info"
          message="A new black door appeared. Find the hidden key of the door."
          onClose={() => setShowKeyHint(false)}
        />
      )}
    </div>
  );
}
