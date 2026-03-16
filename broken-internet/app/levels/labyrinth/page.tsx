'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

type Token = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B';

type Position = {
  x: number;
  y: number;
};

const GRID_SIZE = 9;
const SPAWN: Position = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
const SEQUENCE: Token[] = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'A', 'B'];
const STEP_TIMEOUT_MS = 2200;
const SONAR_PULSE_MS = 1500;
const SONAR_VISIBLE_MS = 170;

const BLOCKED_CELLS = new Set<string>([
  '1,1', '2,1', '3,1', '5,1', '6,1', '7,1',
  '1,2', '3,2', '5,2', '7,2',
  '1,3', '2,3', '6,3', '7,3',
  '0,4', '1,4', '7,4', '8,4',
  '1,5', '2,5', '6,5', '7,5',
  '1,6', '3,6', '5,6', '7,6',
  '1,7', '2,7', '3,7', '5,7', '6,7', '7,7',
]);

function keyFor(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

function isInBounds(pos: Position): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
}

function isWalkable(pos: Position): boolean {
  return isInBounds(pos) && !BLOCKED_CELLS.has(keyFor(pos));
}

function toToken(key: string): Token | null {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup') return 'UP';
  if (normalized === 'arrowdown') return 'DOWN';
  if (normalized === 'arrowleft') return 'LEFT';
  if (normalized === 'arrowright') return 'RIGHT';
  if (normalized === 'a') return 'A';
  if (normalized === 'b') return 'B';
  return null;
}

export default function LabyrinthLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();

  const [playerPos, setPlayerPos] = useState<Position>(SPAWN);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [status, setStatus] = useState('You spawned in the center. Move blind and keep your nerve.');
  const [lastCorrectAt, setLastCorrectAt] = useState<number | null>(null);
  const [sonarVisible, setSonarVisible] = useState(false);
  const [won, setWon] = useState(false);

  const progressText = useMemo(() => {
    return `${sequenceIndex}/${SEQUENCE.length}`;
  }, [sequenceIndex]);

  const resetSequence = useCallback((reason: string) => {
    setSequenceIndex(0);
    setLastCorrectAt(null);
    setStatus(reason);
  }, []);

  useEffect(() => {
    addAttempt('labyrinth');
  }, [addAttempt]);

  useEffect(() => {
    if (won) return;
    const pulseInterval = setInterval(() => {
      setSonarVisible(true);
      setTimeout(() => setSonarVisible(false), SONAR_VISIBLE_MS);
    }, SONAR_PULSE_MS);

    return () => clearInterval(pulseInterval);
  }, [won]);

  useEffect(() => {
    if (won) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const token = toToken(event.key);
      if (!token) return;

      event.preventDefault();

      if (sequenceIndex > 0 && lastCorrectAt && Date.now() - lastCorrectAt > STEP_TIMEOUT_MS) {
        resetSequence('Too slow. Sequence timing expired.');
      }

      let hitWall = false;
      if (token === 'UP' || token === 'DOWN' || token === 'LEFT' || token === 'RIGHT') {
        const next = { ...playerPos };
        if (token === 'UP') next.y -= 1;
        if (token === 'DOWN') next.y += 1;
        if (token === 'LEFT') next.x -= 1;
        if (token === 'RIGHT') next.x += 1;

        if (!isWalkable(next)) {
          hitWall = true;
          setStatus('Thud. Invisible wall.');
        } else {
          setPlayerPos(next);
        }
      }

      if (hitWall) {
        if (sequenceIndex > 0) {
          resetSequence('Wall hit. Combo broken.');
        }
        return;
      }

      const expected = SEQUENCE[sequenceIndex];

      if (sequenceIndex === 0 && token === SEQUENCE[0]) {
        const atSpawn = playerPos.x === SPAWN.x && playerPos.y === SPAWN.y;
        if (!atSpawn) {
          resetSequence('Sequence must start from the spawn center.');
          return;
        }
      }

      if (token !== expected) {
        resetSequence('Wrong order. Sequence reset.');
        return;
      }

      const nextIndex = sequenceIndex + 1;
      if (nextIndex >= SEQUENCE.length) {
        completeLevel('labyrinth');
        setWon(true);
        setStatus('Hidden lock cracked.');
        return;
      }

      setSequenceIndex(nextIndex);
      setLastCorrectAt(Date.now());
      setStatus(nextIndex === 1 ? 'Good start. Keep exact order and speed.' : 'Still valid. Keep moving fast.');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [completeLevel, lastCorrectAt, playerPos, resetSequence, sequenceIndex, won]);

  if (won) {
    return (
      <LevelLayout levelName="labyrinth" title="INVISIBLE LABYRINTH">
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
            message="You decoded the invisible labyrinth. Portal stabilized."
            type="success"
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  return (
    <LevelLayout levelName="labyrinth" title="INVISIBLE LABYRINTH">
      <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: '<!-- hint: up+ up+ down+ down+ left+ right+ left+ right+ a+ b -->' }} />
      <div
        style={{
          minHeight: 'calc(100vh - 50px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #0c1724 0%, #060b12 75%)',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: 'min(90vw, 760px)',
            border: '1px solid #1b2f44',
            borderRadius: '10px',
            background: 'linear-gradient(180deg, rgba(7,14,24,0.95) 0%, rgba(5,9,15,0.98) 100%)',
            boxShadow: '0 0 40px rgba(20,90,140,0.18), inset 0 0 60px rgba(0,0,0,0.55)',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#58b4e8' }}>
              progress.sequence = {progressText}
            </div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#8bcfff' }}>
              combo window: {Math.floor(STEP_TIMEOUT_MS / 1000)}s
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              background: 'radial-gradient(circle at center, rgba(55,90,120,0.08), rgba(8,12,18,0.92))',
              border: '1px solid rgba(90,130,170,0.25)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isPlayer = x === playerPos.x && y === playerPos.y;
              const isCenter = x === SPAWN.x && y === SPAWN.y;

              return (
                <div
                  key={`${x}-${y}`}
                  style={{
                    position: 'absolute',
                    left: `${(x / GRID_SIZE) * 100}%`,
                    top: `${(y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    border: '1px solid rgba(60,90,120,0.025)',
                    background: isPlayer
                      ? (sonarVisible
                        ? 'radial-gradient(circle, rgba(0,255,170,0.65) 0%, rgba(0,255,170,0.12) 58%, transparent 72%)'
                        : 'transparent')
                      : isCenter
                        ? (sonarVisible
                          ? 'radial-gradient(circle, rgba(110,190,255,0.07) 0%, transparent 70%)'
                          : 'transparent')
                        : 'transparent',
                    transition: 'all 0.15s linear',
                  }}
                />
              );
            })}
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              border: '1px solid rgba(88,180,232,0.25)',
              borderRadius: '6px',
              fontFamily: 'var(--font-terminal)',
              fontSize: '14px',
              color: '#87c6ec',
              minHeight: '42px',
            }}
          >
            {`> ${status}`}
          </div>
        </div>
      </div>
    </LevelLayout>
  );
}
