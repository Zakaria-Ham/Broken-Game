'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

type Phase = 'playing' | 'won' | 'lost' | 'blocked';
type DotPosition = { xPercent: number; yPercent: number };

const ROUND_DURATION_MS = 5 * 60 * 1000;
const LOCKOUT_MS = 10 * 60 * 1000;
const LOSS_PENALTY_MS = 2 * 60 * 1000;
const WIN_BONUS_MS = 1 * 60 * 1000;
const MISCLICK_PENALTY_MS = 4500;
const DECOY_PENALTY_MS = 9000;
const DOT_COUNT = 8;
const LOCK_KEY = 'broken-internet:blue-dot-lock-until';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function randomDotPosition() {
  // Keep the dot inside board bounds.
  const xPercent = 6 + Math.random() * 88;
  const yPercent = 8 + Math.random() * 84;
  return { xPercent, yPercent };
}

function distance(a: DotPosition, b: DotPosition): number {
  return Math.hypot(a.xPercent - b.xPercent, a.yPercent - b.yPercent);
}

function randomDotSet(count: number): DotPosition[] {
  const dots: DotPosition[] = [];
  while (dots.length < count) {
    const pos = randomDotPosition();
    if (dots.some(d => distance(d, pos) < 10)) continue;
    dots.push(pos);
  }
  return dots;
}

export default function BlueDotLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, adjustSpeedrunTime, isLevelCompleted } = useGame();

  const [phase, setPhase] = useState<Phase>('playing');
  const [roundStartedAt, setRoundStartedAt] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(ROUND_DURATION_MS);
  const [lockRemainingMs, setLockRemainingMs] = useState<number>(0);
  const [dots, setDots] = useState<DotPosition[]>([]);
  const [correctDotIndex, setCorrectDotIndex] = useState(0);
  const [dotVisible, setDotVisible] = useState(false);
  const [dotPulse, setDotPulse] = useState(true);
  const [blackout, setBlackout] = useState(false);
  const [glitchFlash, setGlitchFlash] = useState(false);
  const [penaltyText, setPenaltyText] = useState('');
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showFakeWin, setShowFakeWin] = useState(false);
  const [didApplyResultAdjustment, setDidApplyResultAdjustment] = useState(false);

  const levelAlreadySolved = isLevelCompleted('blue-dot');

  const difficulty = useMemo(() => {
    const progress = 1 - remainingMs / ROUND_DURATION_MS;
    return Math.max(0, Math.min(1, progress));
  }, [remainingMs]);

  const targetSizePx = useMemo(() => {
    return Math.max(2.4, 6.2 - difficulty * 3.2);
  }, [difficulty]);

  const resetRoundState = useCallback((now: number) => {
    setRoundStartedAt(now);
    setRemainingMs(ROUND_DURATION_MS);
    setDots(randomDotSet(DOT_COUNT));
    setCorrectDotIndex(Math.floor(Math.random() * DOT_COUNT));
    setDotVisible(false);
    setDotPulse(true);
    setBlackout(false);
    setPenaltyText('');
    setCorrectStreak(0);
    setShowFakeWin(false);
  }, []);

  const setLockUntil = useCallback((ts: number) => {
    try {
      localStorage.setItem(LOCK_KEY, String(ts));
    } catch {}
  }, []);

  const readLockUntil = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  const applyTimePenalty = useCallback((penaltyMs: number, message: string) => {
    setRoundStartedAt(prev => prev - penaltyMs);
    setRemainingMs(prev => Math.max(0, prev - penaltyMs));
    setPenaltyText(message);
    setGlitchFlash(true);
    setTimeout(() => setGlitchFlash(false), 250);
    setTimeout(() => setPenaltyText(''), 1200);
  }, []);

  // Initial lock check.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const lockUntil = readLockUntil();
      if (!lockUntil) {
        const now = Date.now();
        resetRoundState(now);
        setPhase('playing');
        addAttempt('blue-dot');
        return;
      }

      const now = Date.now();
      if (lockUntil > now) {
        setPhase('blocked');
        setLockRemainingMs(lockUntil - now);
        return;
      }

      resetRoundState(now);
      setPhase('playing');
      addAttempt('blue-dot');
    });

    return () => cancelAnimationFrame(frame);
  }, [addAttempt, readLockUntil, resetRoundState]);

  // Main game timer and lock countdown ticker.
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();

      if (phase === 'playing') {
        const left = Math.max(0, ROUND_DURATION_MS - (now - roundStartedAt));
        setRemainingMs(left);

        if (left <= 0) {
          const lockUntil = now + LOCKOUT_MS;
          setLockUntil(lockUntil);
          setPhase('lost');

          if (!didApplyResultAdjustment) {
            adjustSpeedrunTime(LOSS_PENALTY_MS);
            setDidApplyResultAdjustment(true);
          }
        }
      }

      if (phase === 'blocked') {
        const lockUntil = readLockUntil();
        if (!lockUntil) {
          setPhase('playing');
          resetRoundState(now);
          setDidApplyResultAdjustment(false);
          addAttempt('blue-dot');
          return;
        }

        const left = lockUntil - now;
        if (left <= 0) {
          setPhase('playing');
          resetRoundState(now);
          setDidApplyResultAdjustment(false);
          addAttempt('blue-dot');
        } else {
          setLockRemainingMs(left);
        }
      }
    }, 250);

    return () => clearInterval(iv);
  }, [
    addAttempt,
    adjustSpeedrunTime,
    didApplyResultAdjustment,
    phase,
    readLockUntil,
    roundStartedAt,
    resetRoundState,
    setLockUntil,
  ]);

  // All dots move constantly; visibility and blackout make color identification harder.
  useEffect(() => {
    if (phase !== 'playing' || showFakeWin) return;

    const moveIv = setInterval(() => {
      setDots(randomDotSet(DOT_COUNT));
      if (Math.random() < 0.35 + difficulty * 0.45) {
        setCorrectDotIndex(Math.floor(Math.random() * DOT_COUNT));
      }
      setDotPulse(prev => !prev);
    }, Math.max(420, 980 - Math.floor(difficulty * 420)));

    const blinkIv = setInterval(() => {
      const visibleChance = Math.max(0.15, 0.46 - difficulty * 0.2);
      setDotVisible(Math.random() < visibleChance);
    }, 210);

    const blackoutIv = setInterval(() => {
      const chance = 0.25 + difficulty * 0.45;
      if (Math.random() < chance) {
        setBlackout(true);
        setTimeout(() => setBlackout(false), 250 + Math.floor(difficulty * 850));
      }
    }, 2200);

    return () => {
      clearInterval(moveIv);
      clearInterval(blinkIv);
      clearInterval(blackoutIv);
    };
  }, [difficulty, phase, showFakeWin]);

  const resetRoundIfUnlocked = useCallback(() => {
    setPhase('blocked');
    const lockUntil = readLockUntil();
    if (!lockUntil) {
      const now = Date.now();
      setPhase('playing');
      resetRoundState(now);
      setDidApplyResultAdjustment(false);
      addAttempt('blue-dot');
      return;
    }

    const left = lockUntil - Date.now();
    if (left <= 0) {
      const now = Date.now();
      setPhase('playing');
      resetRoundState(now);
      setDidApplyResultAdjustment(false);
      addAttempt('blue-dot');
    } else {
      setLockRemainingMs(left);
    }
  }, [addAttempt, readLockUntil, resetRoundState]);

  const handleDotClick = () => {
    if (phase !== 'playing') return;

    if (correctStreak === 0) {
      setCorrectStreak(1);
      setShowFakeWin(true);
      setPenaltyText('oh nice you find it , FIND IT AGAIN!!!');
      setTimeout(() => setPenaltyText(''), 1800);
      return;
    }

    setPhase('won');

    if (!levelAlreadySolved) {
      completeLevel('blue-dot');
    }

    if (!didApplyResultAdjustment) {
      adjustSpeedrunTime(-WIN_BONUS_MS);
      setDidApplyResultAdjustment(true);
    }
  };

  const handleDotPick = (e: React.MouseEvent, index: number) => {
    if (phase !== 'playing') return;
    if (showFakeWin) return;
    e.stopPropagation();

    if (index === correctDotIndex) {
      handleDotClick();
      return;
    }

    applyTimePenalty(DECOY_PENALTY_MS, '-9s decoy trap');
    setCorrectStreak(0);

    setDots(randomDotSet(DOT_COUNT));
    setCorrectDotIndex(prev => (prev + 1) % DOT_COUNT);
    setDotVisible(false);
  };

  const handleBoardMiss = () => {
    if (phase !== 'playing') return;
    if (showFakeWin) return;
    applyTimePenalty(MISCLICK_PENALTY_MS, '-4.5s blind click');
    setCorrectStreak(0);
  };

  const closeFakeWinMessage = () => {
    setShowFakeWin(false);
    setPenaltyText('');
    setDots(randomDotSet(DOT_COUNT));
    setCorrectDotIndex(prev => (prev + 2) % DOT_COUNT);
    setDotVisible(false);
  };

  const boardMessage = useMemo(() => {
    if (phase === 'playing') return 'Find the real dot two times in a row. One mistake resets the streak.';
    if (phase === 'lost') return 'Connection failed. The node vanished into darkness.';
    if (phase === 'blocked') return 'Firewall lock active after timeout.';
    return 'Target acquired.';
  }, [phase]);

  if (phase === 'won') {
    return (
      <LevelLayout levelName="blue-dot" title="BLUE DOT">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 50px)',
            padding: '20px',
          }}
        >
          <MessageBox
            type="success"
            message="You found the blue dot. Time bonus: -1 minute on your speedrun timer."
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  if (phase === 'lost') {
    return (
      <LevelLayout levelName="blue-dot" title="BLUE DOT">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 50px)',
            padding: '20px',
          }}
        >
          <MessageBox
            type="error"
            message="Signal lost. The void consumed your trace. Penalty: +2 minutes. Level locked for 10 real minutes."
            onClose={resetRoundIfUnlocked}
          />
        </div>
      </LevelLayout>
    );
  }

  return (
    <LevelLayout levelName="blue-dot" title="BLUE DOT">
      <div
        style={{
          minHeight: 'calc(100vh - 50px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'radial-gradient(circle at center, #0a1940 0%, #070f28 58%, #030611 100%)',
        }}
      >
        <div
          onClick={handleBoardMiss}
          style={{
            width: 'min(92vw, 980px)',
            height: 'min(72vh, 620px)',
            border: '1px solid #0e1420',
            borderRadius: '10px',
            position: 'relative',
            overflow: 'hidden',
            background: 'radial-gradient(circle at center, rgba(38, 78, 158, 0.35) 0%, rgba(14, 35, 88, 0.75) 40%, rgba(7, 16, 42, 0.95) 78%)',
            boxShadow: glitchFlash
              ? 'inset 0 0 130px rgba(180, 30, 30, 0.25), 0 0 40px rgba(130, 10, 10, 0.4)'
              : 'inset 0 0 140px rgba(9, 19, 53, 0.9), 0 0 40px rgba(8, 16, 44, 0.75)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              right: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 2,
              fontFamily: 'var(--font-terminal)',
              fontSize: '13px',
              color: '#4f6b8f',
              letterSpacing: '0.5px',
            }}
          >
            <span>{boardMessage}</span>
            <span>
              {phase === 'blocked' ? `LOCK: ${formatCountdown(lockRemainingMs)}` : `TIME: ${formatCountdown(remainingMs)}`}
            </span>
          </div>

          {penaltyText && phase === 'playing' && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                right: '16px',
                zIndex: 3,
                fontFamily: 'var(--font-pixel)',
                fontSize: '8px',
                color: '#ff5577',
                textShadow: '0 0 8px rgba(255, 80, 120, 0.5)',
              }}
            >
              {penaltyText}
            </div>
          )}

          {showFakeWin && phase === 'playing' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(4, 8, 25, 0.75)',
                padding: '20px',
              }}
            >
              <MessageBox
                type="success"
                message="oh nice you find it , FIND IT AGAIN!!!"
                onClose={closeFakeWinMessage}
              />
            </div>
          )}

          {/* Atmospheric noise layers to make spotting the dot harder. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(90,130,220,0.1) 0%, transparent 40%), radial-gradient(circle at 70% 60%, rgba(78,117,214,0.09) 0%, transparent 36%), radial-gradient(circle at 50% 85%, rgba(98, 104, 218, 0.08) 0%, transparent 34%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 2px, transparent 4px)',
              opacity: 0.25,
              pointerEvents: 'none',
            }}
          />

          {phase === 'playing' && dots.map((dot, i) => {
            const isRealDot = i === correctDotIndex;
            return (
            <button
              key={`dot-${i}`}
              onClick={e => handleDotPick(e, i)}
              aria-label={isRealDot ? 'Real blue dot' : 'Fake blue dot'}
              style={{
                position: 'absolute',
                left: `${dot.xPercent}%`,
                top: `${dot.yPercent}%`,
                width: `${isRealDot ? targetSizePx : Math.max(2.3, targetSizePx - 0.2)}px`,
                height: `${isRealDot ? targetSizePx : Math.max(2.3, targetSizePx - 0.2)}px`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: 'none',
                opacity: dotVisible ? 1 : 0.12,
                background: isRealDot
                  ? (dotPulse ? 'rgba(112, 144, 236, 0.36)' : 'rgba(102, 136, 228, 0.24)')
                  : (dotPulse ? 'rgba(108, 126, 226, 0.34)' : 'rgba(98, 118, 220, 0.22)'),
                boxShadow: isRealDot
                  ? '0 0 3px rgba(114, 144, 230, 0.24)'
                  : '0 0 3px rgba(108, 126, 225, 0.22)',
                cursor: 'pointer',
                transition: 'opacity 120ms linear',
              }}
            />
            );
          })}

          {blackout && phase === 'playing' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.96)',
                pointerEvents: 'none',
              }}
            />
          )}

          {phase === 'blocked' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2d4a75',
                fontFamily: 'var(--font-pixel)',
                fontSize: '11px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.8)',
              }}
            >
              This level is blocked for {formatCountdown(lockRemainingMs)}
            </div>
          )}
        </div>
      </div>
    </LevelLayout>
  );
}
