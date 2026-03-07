'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame, ProfileEntry } from '../context/GameContext';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function ScoreboardPage() {
  const router = useRouter();
  const { getAllProfiles, gameState } = useGame();
  const [scores, setScores] = useState<ProfileEntry[]>([]);

  useEffect(() => {
    getAllProfiles().then(setScores);
  }, [getAllProfiles]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
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
        color: 'var(--accent-yellow)', marginBottom: '10px',
      }}>
        🏆 SCOREBOARD
      </h1>
      <p style={{
        fontFamily: 'var(--font-terminal)', fontSize: '18px',
        color: 'var(--text-secondary)', marginBottom: '30px',
      }}>
        fastest internet fixers
      </p>

      {scores.length === 0 ? (
        <p style={{
          fontFamily: 'var(--font-terminal)', fontSize: '20px',
          color: 'var(--text-secondary)', marginTop: '40px',
        }}>
          No players yet. Be the first!
        </p>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px',
            gap: '8px', padding: '10px 16px',
            fontFamily: 'var(--font-pixel)', fontSize: '7px',
            color: 'var(--text-secondary)', borderBottom: '2px solid #333',
          }}>
            <span>#</span>
            <span>PLAYER</span>
            <span style={{ textAlign: 'center' }}>LEVELS</span>
            <span style={{ textAlign: 'center' }}>TRIES</span>
            <span style={{ textAlign: 'right' }}>TIME</span>
          </div>

          {/* Rows */}
          {scores.map((entry, i) => {
            const isMe = gameState.profile?.username === entry.username;
            const medalColors = ['#ffcc00', '#c0c0c0', '#cd7f32'];
            const rankColor = i < 3 ? medalColors[i] : 'var(--text-secondary)';

            return (
              <div
                key={entry.username}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px',
                  gap: '8px', padding: '12px 16px', alignItems: 'center',
                  borderBottom: '1px solid #1a1a1a',
                  background: isMe ? 'rgba(170,68,255,0.08)' : 'transparent',
                  borderLeft: isMe ? '3px solid var(--accent-purple)' : '3px solid transparent',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: '12px',
                  color: rankColor,
                }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </span>

                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: '10px',
                  color: isMe ? 'var(--accent-purple)' : 'var(--text-primary)',
                }}>
                  {entry.username}
                  {isMe && <span style={{ fontSize: '7px', color: 'var(--accent-purple)', marginLeft: '6px' }}>(you)</span>}
                </span>

                <span style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-pixel)', fontSize: '10px',
                  color: entry.levelsCompleted === 5 ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}>
                  {entry.levelsCompleted}/7
                </span>

                <span style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-terminal)', fontSize: '18px',
                  color: 'var(--text-secondary)',
                }}>
                  {entry.totalAttempts}
                </span>

                <span style={{
                  textAlign: 'right',
                  fontFamily: 'var(--font-pixel)', fontSize: '9px',
                  color: entry.totalTime ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}>
                  {entry.totalTime ? formatTime(entry.totalTime) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
