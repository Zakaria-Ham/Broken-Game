'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

const W = 920;
const H = 440;
const GROUND_Y = 334;
const WORLD_END = 2500;

const PLAYER_W = 26;
const PLAYER_H = 44;
const GRAVITY = 0.58;
const SPEED = 2.8;
const JUMP_VEL = -11.2;

const HOLES = [
  { x: 260, w: 80 },
  { x: 470, w: 110 },
  { x: 740, w: 150 },
  { x: 980, w: 90 },
  { x: 1230, w: 170 },
  { x: 1510, w: 100 },
  { x: 1720, w: 200 },
  { x: 2050, w: 120 },
  { x: 2250, w: 160 },
];

const PLATFORMS = [
  { x: 520, y: 270, w: 70, h: 12 },
  { x: 780, y: 258, w: 60, h: 12 },
  { x: 860, y: 230, w: 60, h: 12 },
  { x: 1280, y: 272, w: 70, h: 12 },
  { x: 1355, y: 246, w: 70, h: 12 },
  { x: 1760, y: 272, w: 68, h: 12 },
  { x: 1840, y: 236, w: 68, h: 12 },
  { x: 1915, y: 204, w: 68, h: 12 },
  { x: 2300, y: 254, w: 74, h: 12 },
  { x: 2385, y: 220, w: 74, h: 12 },
];

interface GameData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpQueued: boolean;
  cameraX: number;
  dead: boolean;
  solved: boolean;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function BlacknetLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const rafRef = useRef(0);

  const [deadMessage, setDeadMessage] = useState('');
  const [statusText, setStatusText] = useState('MARIO MODE: jump gaps and use platforms.');
  const [solved, setSolved] = useState(false);
  const [dead, setDead] = useState(false);
  const [seed, setSeed] = useState(0);

  const setStatus = useCallback((text: string) => {
    setStatusText(prev => (prev === text ? prev : text));
  }, []);

  const spawnGame = useCallback((): GameData => {
    return {
      x: 36,
      y: GROUND_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      onGround: true,
      jumpQueued: false,
      cameraX: 0,
      dead: false,
      solved: false,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = spawnGame();
    gameRef.current = g;
    setDead(false);
    setSolved(false);
    setDeadMessage('');
    setStatus('MARIO MODE: jump gaps and use platforms.');

    const kill = (reason: string) => {
      if (g.dead || g.solved) return;
      g.dead = true;
      setDead(true);
      setDeadMessage(reason);
      addAttempt('blacknet');
    };

    const win = () => {
      if (g.dead || g.solved) return;
      g.solved = true;
      setSolved(true);
      setStatus('BLACKNET STABILIZED. HUB LIGHTING CALMED.');
      completeLevel('blacknet');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = true;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = true;
      if ((k === 'arrowup' || k === 'w' || k === ' ') && gameRef.current) {
        gameRef.current.jumpQueued = true;
      }
      if (['arrowleft', 'arrowright', 'arrowup', ' '].includes(k)) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = false;
      if (k === 'arrowright' || k === 'd') keysRef.current.right = false;
    };

    const render = () => {
      if (!gameRef.current) return;
      const s = gameRef.current;

      if (!s.dead && !s.solved) {
        if (keysRef.current.left && !keysRef.current.right) s.vx = -SPEED;
        else if (keysRef.current.right && !keysRef.current.left) s.vx = SPEED;
        else s.vx = 0;

        if (s.jumpQueued && s.onGround) {
          s.vy = JUMP_VEL;
          s.onGround = false;
        }
        s.jumpQueued = false;

        const prevY = s.y;

        s.vy += GRAVITY;
        s.x = clamp(s.x + s.vx, 0, WORLD_END + 40);
        s.y += s.vy;

        s.onGround = false;

        const isOverHole = HOLES.some(hole => s.x + PLAYER_W > hole.x && s.x < hole.x + hole.w);
        if (!isOverHole && s.y + PLAYER_H >= GROUND_Y) {
          s.y = GROUND_Y - PLAYER_H;
          s.vy = 0;
          s.onGround = true;
        }

        for (const p of PLATFORMS) {
          const crossingFromAbove = prevY + PLAYER_H <= p.y && s.y + PLAYER_H >= p.y;
          const overlapX = s.x + PLAYER_W > p.x && s.x < p.x + p.w;
          if (crossingFromAbove && overlapX && s.vy >= 0) {
            s.y = p.y - PLAYER_H;
            s.vy = 0;
            s.onGround = true;
          }
        }

        if (s.y > H + 120) {
          kill('Missed the jump. You fell into the void.');
        }

        if (s.x + PLAYER_W >= WORLD_END - 10) {
          win();
        }
      }

      s.cameraX = clamp(s.x - W * 0.36, 0, WORLD_END - W + 120);
      const cam = s.cameraX;

      ctx.clearRect(0, 0, W, H);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0a0f1f');
      sky.addColorStop(1, '#04060d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#151b2b';
      let cursor = 0;
      for (const hole of HOLES) {
        if (hole.x > cursor) {
          ctx.fillRect(cursor - cam, GROUND_Y, hole.x - cursor, H - GROUND_Y);
        }
        cursor = hole.x + hole.w;
      }
      if (cursor < WORLD_END + 220) {
        ctx.fillRect(cursor - cam, GROUND_Y, WORLD_END + 220 - cursor, H - GROUND_Y);
      }

      for (const hole of HOLES) {
        const hx = hole.x - cam;
        ctx.fillStyle = '#000';
        ctx.fillRect(hx, GROUND_Y - 1, hole.w, 160);
        ctx.strokeStyle = '#2f3a4e';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, GROUND_Y - 1, hole.w, 16);
      }

      for (const p of PLATFORMS) {
        const px = p.x - cam;
        ctx.fillStyle = '#5a768f';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.strokeStyle = '#2d465f';
        ctx.strokeRect(px, p.y, p.w, p.h);
      }

      const doorX = WORLD_END - 20 - cam;
      ctx.fillStyle = '#1f2f36';
      ctx.fillRect(doorX, GROUND_Y - 76, 30, 76);
      ctx.strokeStyle = '#9fe3d1';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX, GROUND_Y - 76, 30, 76);
      ctx.fillStyle = '#9fe3d1';
      ctx.fillRect(doorX + 6, GROUND_Y - 58, 18, 7);

      const px = s.x - cam;
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 6, s.y, 14, 14);
      ctx.fillRect(px + 3, s.y + 12, 20, PLAYER_H - 16);
      ctx.fillRect(px + 5, s.y + PLAYER_H - 2, 6, 2);
      ctx.fillRect(px + 15, s.y + PLAYER_H - 2, 6, 2);

      ctx.fillStyle = '#dce7ef';
      ctx.font = '12px monospace';
      ctx.fillText(`distance: ${Math.max(0, Math.floor(WORLD_END - s.x))}`, 18, 28);
      ctx.fillStyle = '#aeb8c2';
      ctx.fillText('arrows/WASD move, up/space jump', 18, 46);

      rafRef.current = requestAnimationFrame(render);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [addAttempt, completeLevel, seed, setStatus, spawnGame]);

  return (
    <LevelLayout levelName="blacknet" title="BLACKNET">
      <div style={{
        minHeight: 'calc(100vh - 50px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '22px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 10%, rgba(30,40,58,0.35) 0%, rgba(6,8,12,1) 64%)',
      }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: 'min(92vw, 980px)',
            height: 'auto',
            border: '1px solid #2b3140',
            borderRadius: '10px',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            background: '#07080c',
          }}
        />

        <div style={{
          position: 'absolute',
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-pixel)',
          fontSize: '9px',
          color: '#a9b9cc',
          letterSpacing: '0.8px',
          textAlign: 'center',
          maxWidth: 'min(88vw, 820px)',
          pointerEvents: 'none',
        }}>
          {statusText}
        </div>

        {dead && (
          <MessageBox
            message={`SYSTEM DOWN: ${deadMessage}`}
            onClose={() => setSeed(v => v + 1)}
            type="error"
          />
        )}

        {solved && (
          <MessageBox
            message="Blacknet repaired. The hub network feels calmer now."
            onClose={() => router.push('/hub')}
            type="success"
          />
        )}
      </div>
    </LevelLayout>
  );
}
