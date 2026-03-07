'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame, LevelName } from '../context/GameContext';

export default function ProfilePage() {
  const router = useRouter();
  const { gameState, loginUser, registerUser, logoutUser, resetGame } = useGame();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const profile = gameState.profile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (username.length < 2) { setError('Username must be at least 2 characters'); return; }
    if (password.length < 3) { setError('Password must be at least 3 characters'); return; }

    if (tab === 'login') {
      const ok = await loginUser(username, password);
      if (ok) { setSuccess('Logged in!'); setUsername(''); setPassword(''); }
      else setError('Wrong username or password');
    } else {
      const ok = await registerUser(username, password);
      if (ok) { setSuccess('Account created!'); setUsername(''); setPassword(''); }
      else setError('Username already taken');
    }
  };

  const completedCount = Object.values(gameState.levels).filter(l => l.completed).length;

  // Format time
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const elapsed = gameState.startedAt
    ? (gameState.completedAt || Date.now()) - gameState.startedAt
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/hub')}
        style={{
          position: 'fixed', top: '16px', left: '16px',
          fontFamily: 'var(--font-pixel)', fontSize: '10px',
          color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        ← HUB
      </button>

      <h1 style={{
        fontFamily: 'var(--font-pixel)', fontSize: '20px',
        color: 'var(--accent-purple)', marginBottom: '30px',
      }}>
        PLAYER PROFILE
      </h1>

      {!profile ? (
        /* ── Login / Register form ── */
        <div style={{
          background: '#111', border: '1px solid #333', borderRadius: '8px',
          padding: '30px', width: '100%', maxWidth: '360px',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '24px', gap: '4px' }}>
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '10px',
                  fontFamily: 'var(--font-pixel)', fontSize: '9px',
                  background: tab === t ? 'var(--accent-purple)' : '#1a1a1a',
                  color: tab === t ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid #333', cursor: 'pointer',
                  borderRadius: t === 'login' ? '4px 0 0 4px' : '0 4px 4px 0',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block', fontFamily: 'var(--font-terminal)',
                fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '6px',
              }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
                style={{
                  width: '100%', padding: '10px', background: '#1a1a1a',
                  border: '1px solid #333', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-terminal)', fontSize: '18px',
                  borderRadius: '4px', outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block', fontFamily: 'var(--font-terminal)',
                fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '6px',
              }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                maxLength={50}
                style={{
                  width: '100%', padding: '10px', background: '#1a1a1a',
                  border: '1px solid #333', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-terminal)', fontSize: '18px',
                  borderRadius: '4px', outline: 'none',
                }}
              />
            </div>
            <button type="submit" style={{
              width: '100%', padding: '12px',
              fontFamily: 'var(--font-pixel)', fontSize: '10px',
              background: 'var(--accent-purple)', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {tab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {error && (
            <p style={{
              marginTop: '14px', fontFamily: 'var(--font-terminal)', fontSize: '16px',
              color: 'var(--accent-red)', textAlign: 'center',
            }}>{error}</p>
          )}
          {success && (
            <p style={{
              marginTop: '14px', fontFamily: 'var(--font-terminal)', fontSize: '16px',
              color: 'var(--accent-green)', textAlign: 'center',
            }}>{success}</p>
          )}
        </div>
      ) : (
        /* ── Profile card ── */
        <div style={{
          background: '#111', border: '1px solid #333', borderRadius: '8px',
          padding: '30px', width: '100%', maxWidth: '400px', textAlign: 'center',
        }}>
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', margin: '0 auto 20px',
            borderRadius: '50%', background: 'var(--accent-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', fontFamily: 'var(--font-pixel)', color: '#fff',
            boxShadow: '0 0 20px rgba(170,68,255,0.3)',
          }}>
            {profile.username.charAt(0).toUpperCase()}
          </div>

          <h2 style={{
            fontFamily: 'var(--font-pixel)', fontSize: '14px',
            color: 'var(--text-primary)', marginBottom: '20px',
          }}>
            {profile.username}
          </h2>

          {/* Stats grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px',
          }}>
            <div style={{ background: '#1a1a1a', padding: '14px', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Levels
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '18px', color: 'var(--accent-green)', marginTop: '4px' }}>
                {completedCount}/6
              </div>
            </div>
            <div style={{ background: '#1a1a1a', padding: '14px', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Attempts
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '18px', color: 'var(--accent-yellow)', marginTop: '4px' }}>
                {gameState.totalAttempts}
              </div>
            </div>
            <div style={{ background: '#1a1a1a', padding: '14px', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Time
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', color: 'var(--accent-blue)', marginTop: '4px' }}>
                {elapsed > 0 ? formatTime(elapsed) : '—'}
              </div>
            </div>
            <div style={{ background: '#1a1a1a', padding: '14px', borderRadius: '6px' }}>
              <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Status
              </div>
              <div style={{
                fontFamily: 'var(--font-pixel)', fontSize: '10px', marginTop: '6px',
                color: gameState.allCompleted ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {gameState.allCompleted ? 'WINNER!' : 'IN PROGRESS'}
              </div>
            </div>
          </div>

          {/* Level details */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            {(Object.keys(gameState.levels) as LevelName[]).map(name => {
              const lv = gameState.levels[name];
              return (
                <div key={name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderBottom: '1px solid #222',
                  fontFamily: 'var(--font-terminal)', fontSize: '16px',
                }}>
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-pixel)', fontSize: '8px',
                    color: lv.completed ? 'var(--accent-green)' : 'var(--text-secondary)',
                  }}>
                    {lv.completed ? '✓ DONE' : `${lv.attempts} tries`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { resetGame(); }}
              style={{
                flex: 1, padding: '10px', fontFamily: 'var(--font-pixel)', fontSize: '8px',
                background: 'transparent', border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)', cursor: 'pointer', borderRadius: '4px',
              }}
            >
              RESET GAME
            </button>
            <button
              onClick={() => { logoutUser(); }}
              style={{
                flex: 1, padding: '10px', fontFamily: 'var(--font-pixel)', fontSize: '8px',
                background: 'transparent', border: '1px solid var(--text-secondary)',
                color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px',
              }}
            >
              LOGOUT
            </button>
          </div>

          <button
            onClick={() => router.push('/scoreboard')}
            style={{
              marginTop: '16px', width: '100%', padding: '10px',
              fontFamily: 'var(--font-pixel)', fontSize: '8px',
              background: 'transparent', border: '1px solid var(--accent-yellow)',
              color: 'var(--accent-yellow)', cursor: 'pointer', borderRadius: '4px',
            }}
          >
            🏆 SCOREBOARD
          </button>
        </div>
      )}
    </div>
  );
}
