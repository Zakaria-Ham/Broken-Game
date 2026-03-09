'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const PIECES: Record<string, string> = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
};

const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

export default function ChessLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();
  const [board, setBoard] = useState(INITIAL_BOARD.map(r => [...r]));
  const [solved, setSolved] = useState(false);
  const [shakeMsg, setShakeMsg] = useState('');
  const [dragAttempted, setDragAttempted] = useState(false);
  const [kingClicks, setKingClicks] = useState(0);

  const handlePieceClick = (row: number, col: number) => {
    if (solved) return;
    const piece = board[row][col];
    if (!piece) return;

    // The secret: click the black king 3 times in a row
    if (piece === 'k') {
      const next = kingClicks + 1;
      if (next >= 5) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = '';
        setBoard(newBoard);
        setSolved(true);
        completeLevel('chess');
        return;
      }
      setKingClicks(next);
      setShakeMsg(next === 1 ? 'The king trembles...' : 'The king is cracking...');
      setTimeout(() => setShakeMsg(''), 1500);
      return;
    }

    // Wrong piece clicked — reset king click streak
    setKingClicks(0);
    addAttempt('chess');
    setShakeMsg('Nothing happens. The pieces refuse to obey.');
    setTimeout(() => setShakeMsg(''), 2000);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragAttempted) {
      setDragAttempted(true);
      addAttempt('chess');
      setShakeMsg("Dragging doesn't work here. Try something else.");
      setTimeout(() => setShakeMsg(''), 2500);
    }
  };

  return (
    <LevelLayout levelName="chess" title="CHESS.COM (BROKEN)">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 50px)',
        padding: '20px',
      }}>
        {/* Fake site header */}
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '16px',
          color: 'var(--accent-yellow)',
          marginBottom: '8px',
        }}>
          ♟ chess.broken ♟
        </div>
        <p style={{
          fontFamily: 'var(--font-terminal)',
          fontSize: '20px',
          color: 'var(--text-secondary)',
          marginBottom: '30px',
        }}>
          Play chess. If you can.
        </p>

        {/* Board */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          width: 'min(400px, 90vw)',
          height: 'min(400px, 90vw)',
          border: '3px solid #444',
        }}>
          {board.map((row, ri) =>
            row.map((piece, ci) => {
              const isLight = (ri + ci) % 2 === 0;
              return (
                <div
                  key={`${ri}-${ci}`}
                  onClick={() => handlePieceClick(ri, ci)}
                  onDragStart={handleDragStart}
                  draggable={!!piece}
                  style={{
                    background: isLight ? '#2a2a3a' : '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(24px, 5vw, 40px)',
                    cursor: piece ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (piece) e.currentTarget.style.background = '#3a3a5a';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isLight ? '#2a2a3a' : '#1a1a2e';
                  }}
                >
                  {piece && PIECES[piece]}
                </div>
              );
            })
          )}
        </div>

        {/* Shake message */}
        {shakeMsg && (
          <div style={{
            marginTop: '20px',
            fontFamily: 'var(--font-terminal)',
            fontSize: '20px',
            color: 'var(--accent-red)',
            animation: 'glitch 0.3s',
          }}>
            {shakeMsg}
          </div>
        )}

        {solved && (
          <MessageBox
            message="You broke the rules. The king is dead. Level complete."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
