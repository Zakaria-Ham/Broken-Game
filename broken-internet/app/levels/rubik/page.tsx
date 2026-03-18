'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

type Pick = { face: number; index: number };

type CenterClickState = {
  count: number;
  lastAt: number;
};

const FACE_COLORS = [
  '#ffffff',
  '#ffd700',
  '#1e90ff',
  '#32cd32',
  '#ff5a36',
  '#d000ff',
  '#00d4d4',
  '#ff69b4',
  '#9acd32',
];

const FACE_NAMES = ['U', 'D', 'F', 'B', 'L', 'R', 'X', 'Y', 'Z'];
const CENTER_INDEX = 4;
const TRIPLE_CLICK_WINDOW_MS = 900;

function createSolvedBoard(): string[][] {
  return FACE_COLORS.map(color => Array.from({ length: 9 }, () => color));
}

function countMismatches(board: string[][]): number {
  let mismatches = 0;
  for (let face = 0; face < 9; face += 1) {
    const target = FACE_COLORS[face];
    for (let i = 0; i < 9; i += 1) {
      if (board[face][i] !== target) mismatches += 1;
    }
  }
  return mismatches;
}

function isFaceSolved(board: string[][], face: number): boolean {
  const target = FACE_COLORS[face];
  return board[face].every(color => color === target);
}

function swapTiles(board: string[][], a: Pick, b: Pick): string[][] {
  const next = board.map(face => [...face]);
  const temp = next[a.face][a.index];
  next[a.face][a.index] = next[b.face][b.index];
  next[b.face][b.index] = temp;
  return next;
}

function shuffled<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = clone[i];
    clone[i] = clone[j];
    clone[j] = t;
  }
  return clone;
}

function remixBoard(): string[][] {
  const board = createSolvedBoard();
  const movableSlots: Pick[] = [];
  const colors: string[] = [];

  for (let face = 0; face < 9; face += 1) {
    for (let index = 0; index < 9; index += 1) {
      if (index === CENTER_INDEX) continue;
      movableSlots.push({ face, index });
      colors.push(board[face][index]);
    }
  }

  const mixed = shuffled(colors);
  for (let i = 0; i < movableSlots.length; i += 1) {
    const slot = movableSlots[i];
    board[slot.face][slot.index] = mixed[i];
  }

  // Avoid trivial starts.
  if (countMismatches(board) < 10) {
    return remixBoard();
  }

  return board;
}

function injectTrapSwap(board: string[][], lockedFaces: boolean[]): string[][] {
  const next = board.map(face => [...face]);
  const candidates: Pick[] = [];

  for (let face = 0; face < 9; face += 1) {
    if (lockedFaces[face]) continue;
    for (let index = 0; index < 9; index += 1) {
      if (index === CENTER_INDEX) continue;
      candidates.push({ face, index });
    }
  }

  const mixed = shuffled(candidates);
  for (let i = 0; i < mixed.length; i += 1) {
    for (let j = i + 1; j < mixed.length; j += 1) {
      if (mixed[i].face === mixed[j].face) continue;
      const a = mixed[i];
      const b = mixed[j];
      const temp = next[a.face][a.index];
      next[a.face][a.index] = next[b.face][b.index];
      next[b.face][b.index] = temp;
      return next;
    }
  }

  return next;
}

export default function RubikLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();

  const [board, setBoard] = useState<string[][]>(createSolvedBoard);
  const [lockedFaces, setLockedFaces] = useState<boolean[]>(Array.from({ length: 9 }, () => false));
  const [selected, setSelected] = useState<Pick | null>(null);
  const [message, setMessage] = useState('Click two non-center tiles to swap their colors.');
  const [centerClicks, setCenterClicks] = useState<CenterClickState[]>(
    Array.from({ length: 9 }, () => ({ count: 0, lastAt: 0 }))
  );
  const [trapTriggered, setTrapTriggered] = useState(false);
  const [won, setWon] = useState(false);

  const solvedFaces = useMemo(() => {
    return Array.from({ length: 9 }, (_, face) => isFaceSolved(board, face));
  }, [board]);

  const lockedCount = useMemo(() => lockedFaces.filter(Boolean).length, [lockedFaces]);

  useEffect(() => {
    setBoard(remixBoard());
    addAttempt('rubik');
  }, [addAttempt]);

  useEffect(() => {
    if (won) return;
    const allSolved = solvedFaces.every(Boolean);
    const allLocked = lockedFaces.every(Boolean);

    if (allSolved && allLocked) {
      setWon(true);
      completeLevel('rubik');
    } else if (allSolved && !allLocked) {
      setMessage('All faces solved, but unstable. Triple-click each solved center to lock every face.');
    }
  }, [completeLevel, lockedFaces, solvedFaces, won]);

  const resetRound = () => {
    setBoard(remixBoard());
    setLockedFaces(Array.from({ length: 9 }, () => false));
    setSelected(null);
    setTrapTriggered(false);
    setCenterClicks(Array.from({ length: 9 }, () => ({ count: 0, lastAt: 0 })));
    setMessage('Board remixed. Start over.');
    addAttempt('rubik');
  };

  const handleCenterClick = (face: number) => {
    if (lockedFaces[face]) {
      setMessage(`Face ${FACE_NAMES[face]} is already locked.`);
      return;
    }

    if (!solvedFaces[face]) {
      setMessage(`Center is fixed. Solve face ${FACE_NAMES[face]} first, then triple-click its center to lock it.`);
      return;
    }

    const now = Date.now();
    setCenterClicks(prev => {
      const next = [...prev];
      const state = next[face];
      const fastEnough = now - state.lastAt <= TRIPLE_CLICK_WINDOW_MS;
      const count = fastEnough ? state.count + 1 : 1;
      next[face] = { count, lastAt: now };

      if (count >= 3) {
        setLockedFaces(old => {
          const locked = [...old];
          locked[face] = true;
          return locked;
        });
        setSelected(current => (current?.face === face ? null : current));
        next[face] = { count: 0, lastAt: 0 };
        setMessage(`Face ${FACE_NAMES[face]} locked. Keep going.`);
      } else {
        setMessage(`Face ${FACE_NAMES[face]} solved. Center clicks: ${count}/3.`);
      }

      return next;
    });
  };

  const handleTileClick = (face: number, index: number) => {
    if (won) return;

    if (trapTriggered) {
      setMessage('Cube instability detected. Press Retry to remix and restart.');
      return;
    }

    if (lockedFaces[face]) {
      setMessage(`Face ${FACE_NAMES[face]} is locked and cannot be changed.`);
      return;
    }

    if (index === CENTER_INDEX) {
      handleCenterClick(face);
      return;
    }

    if (!selected) {
      setSelected({ face, index });
      setMessage(`Selected tile on face ${FACE_NAMES[face]}. Pick another tile to swap.`);
      return;
    }

    if (selected.face === face && selected.index === index) {
      setSelected(null);
      setMessage('Selection canceled.');
      return;
    }

    const first = selected;
    setSelected(null);

    if (lockedFaces[first.face]) {
      setMessage(`Face ${FACE_NAMES[first.face]} is locked and cannot be changed.`);
      return;
    }

    const swapped = swapTiles(board, first, { face, index });
    const beforeMismatch = countMismatches(board);
    const afterMismatch = countMismatches(swapped);

    if (beforeMismatch === 2 && afterMismatch === 0) {
      const trapped = injectTrapSwap(swapped, lockedFaces);
      setBoard(trapped);
      setTrapTriggered(true);
      setMessage('Last-2 trap triggered. Two other tiles jumped across faces. Press Retry.');
      return;
    }

    setBoard(swapped);

    const nowSolved = isFaceSolved(swapped, face);
    const firstSolved = isFaceSolved(swapped, first.face);
    if (nowSolved || firstSolved) {
      const solvedFace = nowSolved ? face : first.face;
      if (!lockedFaces[solvedFace]) {
        setMessage(`Face ${FACE_NAMES[solvedFace]} solved. Triple-click its center tile to lock it.`);
      }
    } else {
      setMessage('Swap complete. Keep arranging by face color.');
    }
  };

  if (won) {
    return (
      <LevelLayout levelName="rubik" title="RUBIK GLITCH">
        <div
          style={{
            minHeight: 'calc(100vh - 50px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <MessageBox
            type="success"
            message="You stabilized all nine faces and locked every center. Cube patched."
            onClose={() => router.push('/hub')}
          />
        </div>
      </LevelLayout>
    );
  }

  return (
    <LevelLayout levelName="rubik" title="RUBIK GLITCH">
      <div
        style={{
          minHeight: 'calc(100vh - 50px)',
          background: 'radial-gradient(circle at 50% 25%, #101f3f 0%, #080d1d 58%, #050811 100%)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 'min(1100px, 96vw)',
            border: '1px solid #26385d',
            borderRadius: '10px',
            padding: '16px',
            background: 'linear-gradient(180deg, rgba(10, 18, 34, 0.95), rgba(6, 11, 21, 0.98))',
            boxShadow: '0 0 50px rgba(40, 80, 140, 0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '9px', color: '#88b6ff' }}>
              solved faces: {solvedFaces.filter(Boolean).length}/9 | locked faces: {lockedCount}/9
            </div>
            <button
              onClick={resetRound}
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: '9px',
                padding: '8px 12px',
                border: '1px solid #ff6a7a',
                borderRadius: '4px',
                background: 'rgba(255, 80, 105, 0.15)',
                color: '#ff8b97',
                cursor: 'pointer',
              }}
            >
              RETRY
            </button>
          </div>

          <div
            style={{
              marginBottom: '14px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(130, 172, 235, 0.25)',
              fontFamily: 'var(--font-terminal)',
              fontSize: '14px',
              color: '#a7caf5',
              minHeight: '44px',
            }}
          >
            {`> ${message}`}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {board.map((faceTiles, face) => (
              <div
                key={`face-${face}`}
                style={{
                  border: lockedFaces[face] ? '1px solid #44e58c' : '1px solid rgba(89, 122, 174, 0.65)',
                  borderRadius: '8px',
                  padding: '10px',
                  background: lockedFaces[face]
                    ? 'linear-gradient(180deg, rgba(10, 45, 26, 0.6), rgba(8, 19, 13, 0.8))'
                    : 'linear-gradient(180deg, rgba(15, 24, 42, 0.72), rgba(9, 14, 26, 0.92))',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '8px',
                    marginBottom: '8px',
                    color: lockedFaces[face] ? '#86ffc2' : '#8db4ea',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>FACE {FACE_NAMES[face]}</span>
                  <span>{lockedFaces[face] ? 'LOCKED' : solvedFaces[face] ? 'SOLVED' : 'UNSOLVED'}</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                  }}
                >
                  {faceTiles.map((color, index) => {
                    const isCenter = index === CENTER_INDEX;
                    const isSelected = selected?.face === face && selected.index === index;
                    const isFixed = isCenter || lockedFaces[face];

                    return (
                      <button
                        key={`tile-${face}-${index}`}
                        onClick={() => handleTileClick(face, index)}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: '4px',
                          border: isSelected ? '2px solid #f8ff91' : '1px solid rgba(0, 0, 0, 0.45)',
                          background: color,
                          cursor: isFixed ? 'not-allowed' : 'pointer',
                          opacity: lockedFaces[face] && !isCenter ? 0.72 : 1,
                          position: 'relative',
                          boxShadow: isCenter
                            ? 'inset 0 0 0 2px rgba(255,255,255,0.2), 0 0 10px rgba(0,0,0,0.35)'
                            : '0 0 8px rgba(0,0,0,0.25)',
                        }}
                        aria-label={`Face ${FACE_NAMES[face]} tile ${index + 1}`}
                      >
                        {isCenter && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '4px',
                              top: '2px',
                              fontSize: '11px',
                              color: lockedFaces[face] ? '#dcffe8' : '#f2f2f2',
                              textShadow: '0 0 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {lockedFaces[face] ? 'L' : 'C'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LevelLayout>
  );
}
