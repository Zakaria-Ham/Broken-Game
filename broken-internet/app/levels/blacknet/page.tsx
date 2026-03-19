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
const BASE_SPEED = 2.95;
const JUMP_VEL = -11.4;

const BASE_HOLES = [
  { x: 250, w: 90 },
  { x: 470, w: 130 },
  { x: 730, w: 160 },
  { x: 980, w: 95 },
  { x: 1220, w: 190 },
  { x: 1510, w: 105 },
  { x: 1710, w: 210 },
  { x: 2040, w: 120 },
  { x: 2250, w: 180 },
];

const BASE_PLATFORMS = [
  { x: 515, y: 274, w: 70, h: 12 },
  { x: 775, y: 264, w: 62, h: 12 },
  { x: 855, y: 236, w: 62, h: 12 },
  { x: 1270, y: 272, w: 72, h: 12 },
  { x: 1350, y: 246, w: 72, h: 12 },
  { x: 1750, y: 272, w: 70, h: 12 },
  { x: 1835, y: 236, w: 70, h: 12 },
  { x: 1915, y: 202, w: 70, h: 12 },
  { x: 2290, y: 258, w: 76, h: 12 },
  { x: 2380, y: 222, w: 76, h: 12 },
];

const REVERSE_ZONES = [
  { start: 620, end: 760 },
  { start: 1220, end: 1380 },
  { start: 1880, end: 2040 },
];

type Hole = { x: number; w: number };
type Platform = {
  x: number;
  baseX: number;
  y: number;
  w: number;
  h: number;
  moving: boolean;
  vx: number;
  moveTimer: number;
  deadlyTimer: number;
};
type Spike = { x: number; y: number; vy: number; size: number };

interface GameData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpQueued: boolean;
  holes: Hole[];
  platforms: Platform[];
  spikes: Spike[];
  spikeTimer: number;
  reverseTimer: number;
  reverseCooldown: number;
  slowTimer: number;
  phaseWalkTimer: number;
  shakeTimer: number;
  cameraX: number;
  dead: boolean;
  solved: boolean;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export default function BlacknetLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, unlockTag } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const rafRef = useRef(0);

  const [deadMessage, setDeadMessage] = useState('');
  const [statusText, setStatusText] = useState('BLACKNET CHAOS: nothing behaves twice the same.');
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
      holes: BASE_HOLES.map(h => ({ ...h })),
      platforms: BASE_PLATFORMS.map(p => ({ ...p, baseX: p.x, moving: false, vx: 0, moveTimer: 0, deadlyTimer: 0 })),
      spikes: [],
      spikeTimer: randomInt(11 * 60, 15 * 60),
      reverseTimer: 0,
      reverseCooldown: 0,
      slowTimer: 0,
      phaseWalkTimer: 0,
      shakeTimer: 0,
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
    setStatus('BLACKNET CHAOS: nothing behaves twice the same.');

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
      void unlockTag('light');
    };

    const triggerJumpChaos = () => {
      // Sometimes holes shift right when jump starts.
      if (Math.random() < 0.36) {
        const nearest = g.holes
          .map((hole, idx) => ({ idx, d: Math.abs(hole.x - g.x) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest && nearest.d < 280) {
          const shift = randomInt(-120, 120);
          const h = g.holes[nearest.idx];
          h.x = clamp(h.x + shift, 80, WORLD_END - h.w - 40);
          setStatus('Void shift detected. Hole moved during jump.');
        }
      }

      // Sometimes you can walk over void for a short moment.
      if (Math.random() < 0.18) {
        g.phaseWalkTimer = randomInt(70, 120);
        setStatus('Phase glitch: void collision briefly disabled.');
      }

      // Sometimes movement slows down.
      if (Math.random() < 0.3) {
        g.slowTimer = randomInt(130, 220);
        setStatus('Latency spike: movement slowed.');
      }

      // Platforms near jump zone can start moving and sabotage timing.
      const near = g.platforms.filter(p => Math.abs(p.x - g.x) <= 100);
      if (near.length > 0 && Math.random() < 0.7) {
        const p = near[Math.floor(Math.random() * near.length)];
        p.moving = true;
        p.vx = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.3);
        p.moveTimer = randomInt(70, 130);
        setStatus('Platform drift activated.');
      }

      // Rare lethal platform trap.
      if (near.length > 0 && Math.random() < 0.22) {
        const p = near[Math.floor(Math.random() * near.length)];
        p.deadlyTimer = randomInt(45, 90);
        setStatus('Platform corruption: one platform turned lethal.');
      }
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
        if (s.reverseTimer > 0) s.reverseTimer -= 1;
        if (s.reverseCooldown > 0) s.reverseCooldown -= 1;
        if (s.slowTimer > 0) s.slowTimer -= 1;
        if (s.phaseWalkTimer > 0) s.phaseWalkTimer -= 1;
        if (s.shakeTimer > 0) s.shakeTimer -= 1;

        // Reverse controls trigger in special zones.
        if (s.reverseTimer <= 0 && s.reverseCooldown <= 0) {
          const inReverseZone = REVERSE_ZONES.some(z => s.x >= z.start && s.x <= z.end);
          if (inReverseZone) {
            s.reverseTimer = randomInt(110, 190);
            s.reverseCooldown = randomInt(210, 330);
            s.shakeTimer = Math.max(s.shakeTimer, 120);
            setStatus('Signal scramble: controls reversed in this sector.');
          }
        }

        const reversed = s.reverseTimer > 0;
        const moveSpeed = s.slowTimer > 0 ? BASE_SPEED * 0.58 : BASE_SPEED;

        const leftPressed = reversed ? keysRef.current.right : keysRef.current.left;
        const rightPressed = reversed ? keysRef.current.left : keysRef.current.right;

        if (leftPressed && !rightPressed) s.vx = -moveSpeed;
        else if (rightPressed && !leftPressed) s.vx = moveSpeed;
        else s.vx = 0;

        if (s.jumpQueued && s.onGround) {
          s.vy = JUMP_VEL;
          s.onGround = false;
          triggerJumpChaos();
        }
        s.jumpQueued = false;

        const prevY = s.y;

        s.vy += GRAVITY;
        s.x = clamp(s.x + s.vx, 0, WORLD_END + 40);
        s.y += s.vy;

        for (const p of s.platforms) {
          if (p.moving) {
            p.x += p.vx;
            if (p.x < p.baseX - 62 || p.x > p.baseX + 62) {
              p.vx *= -1;
            }
            p.moveTimer -= 1;
            if (p.moveTimer <= 0) {
              p.moving = false;
              p.vx = 0;
              p.x += (p.baseX - p.x) * 0.4;
            }
          } else {
            p.x += (p.baseX - p.x) * 0.2;
          }
          if (p.deadlyTimer > 0) p.deadlyTimer -= 1;
        }

        s.onGround = false;

        const overHole = s.holes.some(hole => s.x + PLAYER_W > hole.x && s.x < hole.x + hole.w);
        const holeActsSolid = s.phaseWalkTimer > 0;

        if ((!overHole || holeActsSolid) && s.y + PLAYER_H >= GROUND_Y) {
          s.y = GROUND_Y - PLAYER_H;
          s.vy = 0;
          s.onGround = true;
        }

        for (const p of s.platforms) {
          const crossingFromAbove = prevY + PLAYER_H <= p.y && s.y + PLAYER_H >= p.y;
          const overlapX = s.x + PLAYER_W > p.x && s.x < p.x + p.w;
          if (crossingFromAbove && overlapX && s.vy >= 0) {
            if (p.deadlyTimer > 0) {
              kill('Corrupted platform triggered. You died on landing.');
              break;
            }
            s.y = p.y - PLAYER_H;
            s.vy = 0;
            s.onGround = true;
          }
        }

        if (!s.dead && s.y > H + 120) {
          kill('Missed jump. Fell into blacknet void.');
        }

        // One spike every 11-15 seconds.
        s.spikeTimer -= 1;
        if (s.spikeTimer <= 0) {
          s.spikes.push({
            x: clamp(s.x + randomInt(-170, 170), 40, WORLD_END - 40),
            y: -30,
            vy: 2.3 + Math.random() * 0.9,
            size: 22,
          });
          s.spikeTimer = randomInt(11 * 60, 15 * 60);
        }

        for (const spike of s.spikes) {
          spike.vy += 0.22;
          spike.y += spike.vy;
        }
        s.spikes = s.spikes.filter(spike => spike.y < H + 80);

        for (const spike of s.spikes) {
          if (
            overlaps(
              s.x,
              s.y,
              PLAYER_W,
              PLAYER_H,
              spike.x - spike.size * 0.42,
              spike.y - spike.size,
              spike.size * 0.84,
              spike.size,
            )
          ) {
            kill('Falling spike hit you.');
            break;
          }
        }

        if (!s.dead && s.x + PLAYER_W >= WORLD_END - 10) {
          win();
        }
      }

      s.cameraX = clamp(s.x - W * 0.36, 0, WORLD_END - W + 120);
      const shakeX = s.shakeTimer > 0 ? (Math.random() - 0.5) * 8 : 0;
      const shakeY = s.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
      const cam = s.cameraX + shakeX;

      ctx.clearRect(0, 0, W, H);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#090a14');
      sky.addColorStop(1, '#03050a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 48; i += 1) {
        const sx = ((i * 119) % (WORLD_END + 420)) - cam * 0.24;
        const sy = (i * 63) % 220;
        ctx.fillStyle = i % 2 === 0 ? '#171d2a' : '#0f141f';
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Draw ground segments between holes.
      ctx.fillStyle = '#151b2b';
      let cursor = 0;
      for (const hole of s.holes) {
        if (hole.x > cursor) {
          ctx.fillRect(cursor - cam, GROUND_Y + shakeY, hole.x - cursor, H - GROUND_Y);
        }
        cursor = hole.x + hole.w;
      }
      if (cursor < WORLD_END + 220) {
        ctx.fillRect(cursor - cam, GROUND_Y + shakeY, WORLD_END + 220 - cursor, H - GROUND_Y);
      }

      for (const hole of s.holes) {
        const hx = hole.x - cam;
        ctx.fillStyle = '#000';
        ctx.fillRect(hx, GROUND_Y - 1 + shakeY, hole.w, 160);
        ctx.strokeStyle = s.phaseWalkTimer > 0 ? '#7ae4ff' : '#2f3a4e';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, GROUND_Y - 1 + shakeY, hole.w, 16);
      }

      for (const p of s.platforms) {
        const px = p.x - cam;
        ctx.fillStyle = p.deadlyTimer > 0 ? '#8f2535' : '#5a768f';
        ctx.fillRect(px, p.y + shakeY, p.w, p.h);
        ctx.strokeStyle = p.deadlyTimer > 0 ? '#f78193' : '#2d465f';
        ctx.strokeRect(px, p.y + shakeY, p.w, p.h);
      }

      for (const spike of s.spikes) {
        const sx = spike.x - cam;
        ctx.fillStyle = '#d8d8d8';
        ctx.beginPath();
        ctx.moveTo(sx, spike.y - spike.size + shakeY);
        ctx.lineTo(sx - spike.size * 0.45, spike.y + shakeY);
        ctx.lineTo(sx + spike.size * 0.45, spike.y + shakeY);
        ctx.closePath();
        ctx.fill();
      }

      const doorX = WORLD_END - 20 - cam;
      ctx.fillStyle = '#1f2f36';
      ctx.fillRect(doorX, GROUND_Y - 76 + shakeY, 30, 76);
      ctx.strokeStyle = '#9fe3d1';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX, GROUND_Y - 76 + shakeY, 30, 76);
      ctx.fillStyle = '#9fe3d1';
      ctx.fillRect(doorX + 6, GROUND_Y - 58 + shakeY, 18, 7);

      const px = s.x - cam;
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 6, s.y + shakeY, 14, 14);
      ctx.fillRect(px + 3, s.y + 12 + shakeY, 20, PLAYER_H - 16);
      ctx.fillRect(px + 5, s.y + PLAYER_H - 2 + shakeY, 6, 2);
      ctx.fillRect(px + 15, s.y + PLAYER_H - 2 + shakeY, 6, 2);

      ctx.fillStyle = '#dce7ef';
      ctx.font = '12px monospace';
      ctx.fillText(`distance: ${Math.max(0, Math.floor(WORLD_END - s.x))}`, 18, 28);
      ctx.fillText(`spike: ${Math.ceil(s.spikeTimer / 60)}s`, 18, 46);
      ctx.fillStyle = '#aeb8c2';
      if (s.reverseTimer > 0) {
        ctx.fillText('controls reversed', 18, 64);
      } else if (s.slowTimer > 0) {
        ctx.fillText('movement slowed', 18, 64);
      } else if (s.phaseWalkTimer > 0) {
        ctx.fillText('void is temporarily walkable', 18, 64);
      } else {
        ctx.fillText('arrows/WASD move, up/space jump', 18, 64);
      }

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
  }, [addAttempt, completeLevel, seed, setStatus, spawnGame, unlockTag]);

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
            message="Blacknet repaired. You survived the worst node. Tag unlocked: light."
            onClose={() => router.push('/hub')}
            type="success"
          />
        )}
      </div>
    </LevelLayout>
  );
}
