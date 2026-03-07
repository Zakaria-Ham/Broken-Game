'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const PIECES: Record<string, string> = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
};

/*
   Board at 0° — Black's perspective (Black at bottom, White at top).
   White is CRUSHING — has Queen + Rook + full pawns vs Black's lone King + pawns.

   Row 0 (top):    White back rank — Rd1, Kg1
   Row 1:          White pawns
   Row 3:          White Queen (dominant)
   Row 6:          Black pawns
   Row 7 (bottom): Black King only — hopeless!

   The trick: player is Black and losing. They must find the hidden
   "return the table" text, click it to rotate 90° at a time.
   At 180° the board flips — player becomes White!
   Then White plays Rd8# (back rank mate).
*/
const BOARD: string[][] = [
  ['', '', '', 'R', '', '', 'K', ''],
  ['P', 'P', 'P', 'P', '', 'P', 'P', 'P'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', 'Q', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['p', 'p', 'p', '', '', 'p', 'p', 'p'],
  ['', '', '', '', '', '', 'k', ''],
];

// Winning move as White: Rook from [0][3] to [7][3] = Rd8#
const SOLUTION_FROM = { row: 3, col: 4 };
const SOLUTION_TO = { row: 7, col: 4 };

type Phase = 'stuck' | 'flipped' | 'won';

const STUCK_TAUNTS = [
  "You have NO winning moves as Black 💀",
  "Give it up, Black is finished",
  "There's nothing you can do... or is there?",
  "Black is toast. Maybe think outside the board?",
  "Clicking random squares won't save you 🤡",
  "Bro you're down a Queen AND a Rook",
  "Accept defeat... unless you can't?",
];

const WRONG_TAUNTS = [
  "That's not the winning move!",
  "Think harder — the back rank is wide open",
  "Not quite. Which piece can reach the 8th rank?",
  "Wrong! The d-file is completely open...",
  "The Rook wants to slide all the way down!",
];

export default function CheckmateLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();

  const [phase, setPhase] = useState<Phase>('stuck');
  const [rotation, setRotation] = useState(0);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [message, setMessage] = useState('');
  const [stuckClicks, setStuckClicks] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);

  // Progressive hints when stuck
  useEffect(() => {
    if (stuckClicks >= 15 && hintLevel < 3) setHintLevel(3);
    else if (stuckClicks >= 8 && hintLevel < 2) setHintLevel(2);
    else if (stuckClicks >= 3 && hintLevel < 1) setHintLevel(1);
  }, [stuckClicks, hintLevel]);

  // Hidden rotate — triggered by clicking "return the table" text
  const handleSecretRotate = () => {
    if (phase !== 'stuck') return;
    addAttempt('checkmate');

    const next = rotation + 90;
    setRotation(next);

    if (next >= 180) {
      setRotation(180);
      setPhase('flipped');
      setMessage('You flipped the board! You\'re White now — deliver checkmate!');
      setTimeout(() => setMessage(''), 3500);
    } else {
      setMessage('Something shifted...');
      setTimeout(() => setMessage(''), 1500);
    }
  };

  // Square clicks
  const handleSquareClick = (row: number, col: number) => {
    if (phase === 'won') return;

    // Phase: stuck as Black — every click is useless
    if (phase === 'stuck') {
      addAttempt('checkmate');
      setStuckClicks(c => c + 1);
      setMessage(STUCK_TAUNTS[Math.floor(Math.random() * STUCK_TAUNTS.length)]);
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    // Phase: flipped — playing as White
    const piece = BOARD[row][col];
    const isWhite = piece !== '' && piece === piece.toUpperCase();

    if (!selectedPiece) {
      if (isWhite) {
        setSelectedPiece({ row, col });
      } else if (piece) {
        setMessage("That's Black's piece — you're White now!");
        setTimeout(() => setMessage(''), 2000);
      }
      return;
    }

    // Click same = deselect
    if (selectedPiece.row === row && selectedPiece.col === col) {
      setSelectedPiece(null);
      return;
    }

    // Click another white piece = reselect
    if (isWhite) {
      setSelectedPiece({ row, col });
      return;
    }

    // Check solution: Rook from [0][3] → [7][3]
    const fromOK = selectedPiece.row === SOLUTION_FROM.row && selectedPiece.col === SOLUTION_FROM.col;
    const toOK = row === SOLUTION_TO.row && col === SOLUTION_TO.col;

    if (fromOK && toOK) {
      setSelectedPiece(null);
      setPhase('won');
      completeLevel('checkmate');
      return;
    }

    // Wrong move
    addAttempt('checkmate');
    setSelectedPiece(null);
    setMessage(WRONG_TAUNTS[Math.floor(Math.random() * WRONG_TAUNTS.length)]);
    setTimeout(() => setMessage(''), 2500);
  };

  const hintText =
    hintLevel >= 3
      ? 'Read the text above very carefully. Every word matters...'
      : hintLevel >= 2
      ? 'Maybe the answer isn\'t on the board. Look at the whole page...'
      : hintLevel >= 1
      ? 'There has to be another way...'
      : '';

  return (
    <LevelLayout levelName="checkmate" title="CHECKMATE.BUG">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 50px)',
        padding: '20px', userSelect: 'none', overflow: 'hidden',
      }}>
        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: '16px',
          color: 'var(--accent-yellow)', marginBottom: '8px',
          textShadow: '0 0 10px rgba(255,136,0,0.5)',
        }}>
          ♚ CHECKMATE.BUG ♚
        </div>

        {/* Status line */}
        <p style={{
          fontFamily: 'var(--font-terminal)', fontSize: '20px',
          color: phase === 'stuck' ? 'var(--accent-red)' : phase === 'flipped' ? 'var(--accent-green)' : 'var(--accent-green)',
          marginBottom: '4px', textAlign: 'center',
          textShadow: phase === 'stuck' ? '0 0 8px rgba(255,0,0,0.3)' : '0 0 8px rgba(0,255,100,0.3)',
        }}>
          {phase === 'stuck' && 'You are Black. White is about to crush you!'}
          {phase === 'flipped' && 'You are White now! Deliver checkmate in 1!'}
          {phase === 'won' && 'Checkmate!'}
        </p>

        {/* The description with the hidden clickable phrase */}
        {phase === 'stuck' && (
          <p style={{
            fontFamily: 'var(--font-terminal)', fontSize: '14px',
            color: '#777', marginBottom: '16px',
            textAlign: 'center', maxWidth: '420px', lineHeight: '1.6',
          }}>
            Your position is hopeless. There is absolutely no way to{' '}
            <span
              onClick={handleSecretRotate}
              style={{
                color: '#777',
                cursor: 'inherit',
                transition: 'text-shadow 0.3s, color 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.textShadow = '0 0 8px rgba(255,200,0,0.5)';
                e.currentTarget.style.color = '#999';
                e.currentTarget.style.cursor = 'pointer';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.textShadow = 'none';
                e.currentTarget.style.color = '#777';
                e.currentTarget.style.cursor = 'inherit';
              }}
            >
              return the table
            </span>
            {' '}in this game.
          </p>
        )}

        {/* After flip — instruction */}
        {phase === 'flipped' && (
          <p style={{
            fontFamily: 'var(--font-pixel)', fontSize: '9px',
            color: 'var(--accent-yellow)', marginBottom: '14px',
            animation: 'flicker 1.5s infinite',
          }}>
            White to move — CHECKMATE IN 1
          </p>
        )}

        {/* Dynamic message */}
        {message && (
          <div style={{
            fontFamily: 'var(--font-terminal)', fontSize: '16px',
            color: message.includes('White now') || message.includes('checkmate') ? 'var(--accent-green)' : 'var(--accent-red)',
            marginBottom: '10px', animation: 'glitch 0.3s',
            textAlign: 'center', maxWidth: '400px',
          }}>
            {message}
          </div>
        )}

        {/* The board */}
        <div style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.8s ease-out',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
            width: 'min(380px, 85vw)', height: 'min(380px, 85vw)',
            border: '3px solid #555',
            boxShadow: phase === 'won'
              ? '0 0 30px rgba(0,255,136,0.3)'
              : '0 0 20px rgba(255,100,0,0.15)',
          }}>
            {BOARD.map((row, ri) =>
              row.map((piece, ci) => {
                const isLight = (ri + ci) % 2 === 0;
                const isSelected = selectedPiece?.row === ri && selectedPiece?.col === ci;
                const isWhitePiece = piece !== '' && piece === piece.toUpperCase();
                const isBlackPiece = piece !== '' && piece === piece.toLowerCase();
                const canClick = phase === 'flipped' && (isWhitePiece || selectedPiece);

                return (
                  <div
                    key={`${ri}-${ci}`}
                    onClick={() => handleSquareClick(ri, ci)}
                    style={{
                      background: isSelected
                        ? 'rgba(255,200,0,0.4)'
                        : isLight ? '#3a3020' : '#2a2010',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(22px, 4.5vw, 38px)',
                      cursor: canClick ? 'pointer' : 'default',
                      userSelect: 'none', transition: 'background 0.2s',
                      borderRight: ci < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      borderBottom: ri < 7 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    {piece && (
                      <span style={{
                        display: 'inline-block',
                        transform: `rotate(-${rotation}deg)`,
                        transition: 'transform 0.8s ease-out',
                        filter: isBlackPiece
                          ? 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                          : 'drop-shadow(0 0 3px rgba(255,255,200,0.5))',
                      }}>
                        {PIECES[piece]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Hints when stuck */}
        {hintText && phase === 'stuck' && (
          <div style={{
            marginTop: '16px', fontFamily: 'var(--font-terminal)', fontSize: '13px',
            color: '#555', textAlign: 'center', maxWidth: '380px',
            fontStyle: 'italic',
          }}>
            {hintText}
          </div>
        )}

        {/* Deselect button */}
        {selectedPiece && phase === 'flipped' && (
          <button onClick={() => setSelectedPiece(null)} style={{
            fontFamily: 'var(--font-pixel)', fontSize: '8px',
            padding: '8px 16px', marginTop: '14px',
            background: '#2a2a2a', color: 'var(--text-secondary)',
            border: '1px solid #555', borderRadius: '4px', cursor: 'pointer',
          }}>
            ✕ DESELECT
          </button>
        )}

        {/* Victory */}
        {phase === 'won' && (
          <MessageBox
            message="Rd8#! Back rank mate! You turned the tables! 🏆"
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
