'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const SECRET_PASSWORD = 'tr0ub4dor';

export default function LoginLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [solved, setSolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (solved) return;

    if (password === SECRET_PASSWORD) {
      setSolved(true);
      completeLevel('login');
      return;
    }

    addAttempt('login');
    setAttempts(prev => prev + 1);

    const messages = [
      'Access denied.',
      'Wrong password. Look more carefully.',
      'The answer is right in front of you.',
      'Have you tried reading the placeholder?',
      'Literally... type the placeholder text.',
    ];
    setErrorMsg(messages[Math.min(attempts, messages.length - 1)]);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  return (
    <LevelLayout levelName="login" title="LOGIN.FAKE">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 50px)',
        padding: '20px',
      }}>
        {/* Fake login card */}
        <div style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '40px',
          width: '100%',
          maxWidth: '380px',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '30px',
          }}>
            <div style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '14px',
              color: 'var(--accent-purple)',
              marginBottom: '6px',
            }}>
              🔒 SecureLogin™
            </div>
            <p style={{
              fontFamily: 'var(--font-terminal)',
              fontSize: '16px',
              color: 'var(--text-secondary)',
            }}>
              Please sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-terminal)',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="user@broken.net"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-terminal)',
                  fontSize: '18px',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-terminal)',
                fontSize: '16px',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={SECRET_PASSWORD}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-terminal)',
                  fontSize: '18px',
                  borderRadius: '4px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--accent-purple)',
                color: '#fff',
                border: 'none',
                fontFamily: 'var(--font-pixel)',
                fontSize: '10px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              SIGN IN
            </button>
          </form>

          {errorMsg && (
            <div style={{
              marginTop: '16px',
              padding: '10px',
              background: 'rgba(255,51,85,0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '4px',
              fontFamily: 'var(--font-terminal)',
              fontSize: '16px',
              color: 'var(--accent-red)',
              textAlign: 'center',
            }}>
              {errorMsg}
            </div>
          )}

          <p style={{
            marginTop: '20px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '14px',
            color: '#444',
            textAlign: 'center',
          }}>
            Forgot password? Too bad.
          </p>
        </div>

        {solved && (
          <MessageBox
            message="You read the placeholder. Smart. Level complete."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
