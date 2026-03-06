'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const TIMER_KEY = 'broken-internet-timer-visited';

export default function TimerLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerDone, setTimerDone] = useState(false);
  const [solved, setSolved] = useState(false);
  const [waitMsg, setWaitMsg] = useState('');
  const hasCheckedRef = useRef(false);

  // Check if this is a refresh (second visit)
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const visited = sessionStorage.getItem(TIMER_KEY);
    if (visited === 'waited') {
      // Player has waited and refreshed — level complete!
      setSolved(true);
      completeLevel('timer');
      sessionStorage.removeItem(TIMER_KEY);
    }
  }, [completeLevel]);

  // Countdown timer
  useEffect(() => {
    if (solved) return;
    if (timeLeft <= 0) {
      setTimerDone(true);
      // Mark that the player has waited
      sessionStorage.setItem(TIMER_KEY, 'waited');
      return;
    }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, solved]);

  const handleClickAnything = () => {
    if (solved || !timerDone) return;
    addAttempt('timer');
    const messages = [
      "Nothing happened.",
      "Still nothing.",
      "The page is mocking you.",
      "Maybe the answer isn't on this page...",
      "What if you... refreshed?",
    ];
    const idx = Math.min(Math.floor(Math.random() * messages.length), messages.length - 1);
    setWaitMsg(messages[idx]);
    setTimeout(() => setWaitMsg(''), 2500);
  };

  return (
    <LevelLayout levelName="timer" title="TIMER.WAIT">
      <div
        onClick={handleClickAnything}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 50px)',
          padding: '20px',
          cursor: timerDone && !solved ? 'pointer' : 'default',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '14px',
          color: 'var(--accent-green)',
          marginBottom: '8px',
        }}>
          timer.wait
        </div>

        {!timerDone && !solved && (
          <>
            <p style={{
              fontFamily: 'var(--font-terminal)',
              fontSize: '24px',
              color: 'var(--text-secondary)',
              marginBottom: '40px',
            }}>
              Wait 10 seconds.
            </p>

            <div style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '48px',
              color: 'var(--accent-green)',
              textShadow: '0 0 20px rgba(0,255,136,0.3)',
            }}>
              {timeLeft}
            </div>

            {/* Progress bar */}
            <div style={{
              width: '300px',
              height: '8px',
              background: '#1a1a2e',
              borderRadius: '4px',
              marginTop: '30px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${((10 - timeLeft) / 10) * 100}%`,
                height: '100%',
                background: 'var(--accent-green)',
                transition: 'width 1s linear',
              }} />
            </div>
          </>
        )}

        {timerDone && !solved && (
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '20px',
              color: 'var(--accent-red)',
              marginBottom: '20px',
              animation: 'glitchText 0.5s infinite',
            }}>
              TIME&apos;S UP!
            </p>
            <p style={{
              fontFamily: 'var(--font-terminal)',
              fontSize: '22px',
              color: 'var(--text-secondary)',
            }}>
              ...
            </p>
            <p style={{
              fontFamily: 'var(--font-terminal)',
              fontSize: '18px',
              color: 'var(--text-secondary)',
              marginTop: '20px',
            }}>
              Nothing happened. Now what?
            </p>
          </div>
        )}

        {waitMsg && (
          <div style={{
            marginTop: '30px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '20px',
            color: 'var(--accent-red)',
            animation: 'glitch 0.3s',
          }}>
            {waitMsg}
          </div>
        )}

        {solved && (
          <MessageBox
            message="You refreshed. The internet respects persistence. Level complete."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
