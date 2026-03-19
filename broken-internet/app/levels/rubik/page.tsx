'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
const DOUBLE_CLICK_WINDOW_MS = 700;
const CHAOS_LOSS_ATTEMPTS = 2;
const HIDDEN_HELP_AFTER_FAILS = 2;
const HELP_PENALTY_MS = 2 * 60 * 1000;

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

function injectCascadeSwaps(board: string[][], lockedFaces: boolean[], tileCount: number): string[][] {
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
  const pairCount = Math.min(Math.floor(tileCount / 2), Math.floor(mixed.length / 2));
  let cursor = 0;

  for (let pair = 0; pair < pairCount; pair += 1) {
    while (cursor + 1 < mixed.length) {
      const a = mixed[cursor];
      const b = mixed[cursor + 1];
      cursor += 2;
      if (a.face === b.face) continue;
      const temp = next[a.face][a.index];
      next[a.face][a.index] = next[b.face][b.index];
      next[b.face][b.index] = temp;
      break;
    }
  }

  return next;
}

function pickRandomSubset(faces: number[], count: number): number[] {
  if (count <= 0) return [];
  return shuffled(faces).slice(0, Math.min(count, faces.length));
}

function remixUnlockedOnly(board: string[][], lockedFaces: boolean[]): string[][] {
  const next = board.map(face => [...face]);
  const unlockedSlots: Pick[] = [];
  const colors: string[] = [];

  for (let face = 0; face < 9; face += 1) {
    if (lockedFaces[face]) continue;
    for (let index = 0; index < 9; index += 1) {
      if (index === CENTER_INDEX) continue;
      unlockedSlots.push({ face, index });
      colors.push(next[face][index]);
    }
  }

  const mixed = shuffled(colors);
  for (let i = 0; i < unlockedSlots.length; i += 1) {
    const slot = unlockedSlots[i];
    next[slot.face][slot.index] = mixed[i];
  }

  return next;
}

export default function RubikLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, adjustSpeedrunTime, unlockTag, gameState } = useGame();

  const [board, setBoard] = useState<string[][]>(createSolvedBoard);
  const [lockedFaces, setLockedFaces] = useState<boolean[]>(Array.from({ length: 9 }, () => false));
  const [selectedTile, setSelectedTile] = useState<Pick | null>(null);
  const [message, setMessage] = useState('Left-click two tiles to swap. Right-click a tile for auto color-face swap.');
  const [trapTriggered, setTrapTriggered] = useState(false);
  const [chaosAttempts, setChaosAttempts] = useState(0);
  const [chaosTileCount, setChaosTileCount] = useState(4);
  const [hardLost, setHardLost] = useState(false);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [showHelpConfirm, setShowHelpConfirm] = useState(false);
  const [won, setWon] = useState(false);
  const centerClicksRef = useRef<CenterClickState[]>(
    Array.from({ length: 9 }, () => ({ count: 0, lastAt: 0 }))
  );

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

    if (allSolved && allLocked && !hardLost) {
      setWon(true);
      setConsecutiveFails(0);
      completeLevel('rubik');
    } else if (allSolved && !allLocked) {
      setMessage('All faces solved, but unstable. Double-click each solved center to lock every face.');
    }
  }, [completeLevel, hardLost, lockedFaces, solvedFaces, won]);

  const applySwapResult = (nextBoard: string[][], beforeMismatch: number, afterMismatch: number) => {
    if (beforeMismatch === 2 && afterMismatch === 0 && lockedCount < 7) {
      const cascaded = injectCascadeSwaps(nextBoard, lockedFaces, chaosTileCount);
      const nextAttempt = chaosAttempts + 1;

      setBoard(cascaded);
      setTrapTriggered(true);
      setChaosAttempts(nextAttempt);
      setChaosTileCount(prev => prev + 2);

      if (nextAttempt >= CHAOS_LOSS_ATTEMPTS) {
        setHardLost(true);
        setConsecutiveFails(prev => prev + 1);
        setMessage('YOU LOST. Unlocked faces collapsed into chaos. Press RETRY to restart from zero.');
      } else {
        setMessage(`Instability! ${chaosTileCount} unlocked tiles swapped (${nextAttempt}/${CHAOS_LOSS_ATTEMPTS}). Press RETRY or risk total collapse.`);
      }
      return;
    }

    setBoard(nextBoard);
  };

  const resetRound = () => {
    const previousLocked = lockedFaces
      .map((isLocked, face) => (isLocked ? face : -1))
      .filter(face => face >= 0);
    const preserveRatio = 0.2 + Math.random() * 0.35;
    const preserveCount = Math.floor(previousLocked.length * preserveRatio);
    const preservedFaces = pickRandomSubset(previousLocked, preserveCount);

    const nextLocked = Array.from({ length: 9 }, () => false);
    for (const face of preservedFaces) {
      nextLocked[face] = true;
    }

    const freshBoard = remixUnlockedOnly(board, nextLocked);

    for (const face of preservedFaces) {
      for (let i = 0; i < 9; i += 1) {
        freshBoard[face][i] = FACE_COLORS[face];
      }
    }

    setBoard(freshBoard);
    setLockedFaces(nextLocked);
    setSelectedTile(null);
    setTrapTriggered(false);
    setHardLost(false);
    setChaosAttempts(0);
    setChaosTileCount(4);
    setShowHelpConfirm(false);
    centerClicksRef.current = Array.from({ length: 9 }, () => ({ count: 0, lastAt: 0 }));

    if (preservedFaces.length > 0) {
      setMessage(`Board remixed. Saved ${preservedFaces.length} locked face(s) (${Math.round(preserveRatio * 100)}%).`);
    } else {
      setMessage('Board remixed. Start over from zero.');
    }
    addAttempt('rubik');
  };

  const handleCenterClick = (face: number) => {
    if (won || hardLost) return;

    if (lockedFaces[face]) {
      setMessage(`Face ${FACE_NAMES[face]} is already locked.`);
      return;
    }

    if (!solvedFaces[face]) {
      setMessage(`Center is fixed. Solve face ${FACE_NAMES[face]} first, then double-click its center to lock it.`);
      return;
    }

    const now = Date.now();
    const state = centerClicksRef.current[face];
    const fastEnough = now - state.lastAt <= DOUBLE_CLICK_WINDOW_MS;
    const count = fastEnough ? state.count + 1 : 1;
    centerClicksRef.current[face] = { count, lastAt: now };

    if (count >= 2) {
      setLockedFaces(old => {
        const locked = [...old];
        locked[face] = true;
        return locked;
      });
      if (selectedTile?.face === face) {
        setSelectedTile(null);
      }
      centerClicksRef.current[face] = { count: 0, lastAt: 0 };
      setMessage(`Face ${FACE_NAMES[face]} locked. Keep going.`);
    } else {
      setMessage(`Face ${FACE_NAMES[face]} solved. Center confirmation: ${count}/2.`);
    }
  };

  const handleRightClickSwap = (face: number, index: number) => {
    if (won || hardLost) return;

    if (lockedFaces[face]) {
      setMessage(`Face ${FACE_NAMES[face]} is locked and cannot be changed.`);
      return;
    }

    if (index === CENTER_INDEX) {
      setMessage('Center tile cannot be used for right-click swap.');
      return;
    }

    const sourceColor = board[face][index];
    const targetFace = FACE_COLORS.indexOf(sourceColor);
    if (targetFace < 0) {
      setMessage('No matching face found for this tile color.');
      return;
    }

    if (lockedFaces[targetFace] && targetFace !== face) {
      setMessage(`Target face ${FACE_NAMES[targetFace]} is locked.`);
      return;
    }

    const candidates = Array.from({ length: 9 }, (_, i) => i)
      .filter(i => i !== CENTER_INDEX)
      .filter(i => !(targetFace === face && i === index))
      .filter(i => board[targetFace][i] !== sourceColor);

    if (candidates.length === 0) {
      setMessage(`No different-color square available in face ${FACE_NAMES[targetFace]}.`);
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const swapped = swapTiles(board, { face, index }, { face: targetFace, index: pick });
    const beforeMismatch = countMismatches(board);
    const afterMismatch = countMismatches(swapped);

    setSelectedTile(null);
    applySwapResult(swapped, beforeMismatch, afterMismatch);
    setMessage(`Right-swap: tile moved toward face ${FACE_NAMES[targetFace]}.`);
  };

  const handleTileClick = (face: number, index: number) => {
    if (won) return;
    if (hardLost) {
      setMessage('YOU LOST. Press RETRY to restart from zero.');
      return;
    }

    if (trapTriggered) {
      if (!selectedTile && index !== CENTER_INDEX) {
        setMessage('Cube instability detected. RETRY is recommended before more swaps.');
      }
    }

    if (lockedFaces[face]) {
      setMessage(`Face ${FACE_NAMES[face]} is locked and cannot be changed.`);
      return;
    }

    if (index === CENTER_INDEX) {
      handleCenterClick(face);
      return;
    }

    if (!selectedTile) {
      setSelectedTile({ face, index });
      setMessage(`Selected tile on face ${FACE_NAMES[face]}. Pick another tile to swap.`);
      return;
    }

    if (selectedTile.face === face && selectedTile.index === index) {
      setSelectedTile(null);
      setMessage('Selection canceled.');
      return;
    }

    const first = selectedTile;
    setSelectedTile(null);

    if (lockedFaces[first.face]) {
      setMessage(`Face ${FACE_NAMES[first.face]} is locked and cannot be changed.`);
      return;
    }

    const swapped = swapTiles(board, first, { face, index });
    const beforeMismatch = countMismatches(board);
    const afterMismatch = countMismatches(swapped);

    applySwapResult(swapped, beforeMismatch, afterMismatch);

    const nowSolved = isFaceSolved(swapped, face);
    const firstSolved = isFaceSolved(swapped, first.face);
    if (nowSolved || firstSolved) {
      const solvedFace = nowSolved ? face : first.face;
      if (!lockedFaces[solvedFace]) {
        setMessage(`Face ${FACE_NAMES[solvedFace]} solved. Double-click its center tile to lock it.`);
      }
    } else {
      setMessage('Swap complete. Keep arranging by face color.');
    }
  };

  const handleConfirmHelpWin = () => {
    adjustSpeedrunTime(HELP_PENALTY_MS);
    completeLevel('rubik');
    setWon(true);
    setConsecutiveFails(0);
  };

  if (won) {
    const missedTagNote = gameState.profile?.unlockedTags.includes('ff')
      ? ''
      : ' This level has a hidden tag and you missed it: ff.';
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
            message={`You stabilized all nine faces and locked every center. Cube patched.${missedTagNote}`}
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
              border: hardLost
                ? '1px solid rgba(255, 90, 120, 0.5)'
                : '1px solid rgba(130, 172, 235, 0.25)',
              fontFamily: 'var(--font-terminal)',
              fontSize: '14px',
              color: hardLost ? '#ff9fb0' : '#a7caf5',
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
                    const isSelected = selectedTile?.face === face && selectedTile.index === index;
                    const isFixed = isCenter || lockedFaces[face];

                    return (
                      <button
                        key={`tile-${face}-${index}`}
                        onClick={() => handleTileClick(face, index)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          handleRightClickSwap(face, index);
                        }}
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

          {consecutiveFails >= HIDDEN_HELP_AFTER_FAILS && (
            <div style={{ marginTop: '650px', paddingTop: '40px' }}>
              {!showHelpConfirm && (
                <button
                  onClick={() => {
                    void unlockTag('ff');
                    setShowHelpConfirm(true);
                  }}
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '8px',
                    padding: '8px 10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#9ab7db',
                    cursor: 'pointer',
                  }}
                >
                  hidden override
                </button>
              )}

              {showHelpConfirm && (
                <div style={{ marginTop: '12px', maxWidth: '520px' }}>
                  <div
                    style={{
                      marginBottom: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 145, 0, 0.45)',
                      background: 'rgba(255, 145, 0, 0.08)',
                      fontFamily: 'var(--font-terminal)',
                      fontSize: '14px',
                      color: '#ffcf95',
                    }}
                  >
                    if you click confirm you win the level but lose 2min in the speedruntimer
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleConfirmHelpWin}
                      style={{
                        fontFamily: 'var(--font-pixel)',
                        fontSize: '9px',
                        padding: '8px 12px',
                        border: '1px solid #ff9c54',
                        borderRadius: '4px',
                        background: 'rgba(255, 140, 60, 0.14)',
                        color: '#ffd2a8',
                        cursor: 'pointer',
                      }}
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setShowHelpConfirm(false)}
                      style={{
                        fontFamily: 'var(--font-pixel)',
                        fontSize: '9px',
                        padding: '8px 12px',
                        border: '1px solid rgba(180, 200, 230, 0.4)',
                        borderRadius: '4px',
                        background: 'rgba(180, 200, 230, 0.08)',
                        color: '#b7cae7',
                        cursor: 'pointer',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LevelLayout>
  );
}
