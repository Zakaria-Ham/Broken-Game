'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ──────────────── constants ────────────────
const W = 1000;
const H = 400;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 3.5;
const GROUND_Y = 310;
const CHAR_W = 28;
const CHAR_H = 34;
const HOLE_X = 750;
const HOLE_WIDTH = 90;

interface Platform {
  x: number; y: number; w: number;
}

const PLATFORMS: Platform[] = [
  { x: 200, y: 255, w: 80 },
  { x: 350, y: 220, w: 70 },
  { x: 500, y: 250, w: 90 },
];

// Collectible coins
interface Coin { x: number; y: number; collected: boolean }
const INITIAL_COINS: Coin[] = [
  { x: 230, y: 230, collected: false },
  { x: 375, y: 195, collected: false },
  { x: 535, y: 225, collected: false },
  { x: 120, y: 280, collected: false },
  { x: 680, y: 280, collected: false },
];

export default function IntroPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [fell, setFell] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const fellRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;

    // ── state ──
    let x = 60, y = GROUND_Y - CHAR_H;
    let vx = 0, vy = 0;
    let onGround = true;
    let facing = 1; // 1 right, -1 left
    let animTick = 0;
    let coins = INITIAL_COINS.map(c => ({ ...c }));
    let score = 0;
    let cameraX = 0;

    // ── input ──
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && onGround) {
        vy = JUMP_FORCE;
        onGround = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── helpers ──
    function isOverHole(px: number) {
      return px + CHAR_W / 2 > HOLE_X + 8 && px + CHAR_W / 2 < HOLE_X + HOLE_WIDTH - 8;
    }

    function platformUnder(px: number, py: number, prevY: number): number | null {
      for (const p of PLATFORMS) {
        if (px + CHAR_W > p.x && px < p.x + p.w) {
          if (prevY + CHAR_H <= p.y + 2 && py + CHAR_H >= p.y) {
            return p.y - CHAR_H;
          }
        }
      }
      return null;
    }

    // ── draw functions ──
    function drawChar(cx: number, cy: number, frame: number) {
      ctx!.save();
      const drawX = cx - cameraX;
      if (facing === -1) {
        ctx!.translate(drawX + CHAR_W, 0);
        ctx!.scale(-1, 1);
      } else {
        ctx!.translate(drawX, 0);
      }

      // Head
      ctx!.fillStyle = '#00ff88';
      ctx!.fillRect(6, cy, 16, 10);
      // Hat
      ctx!.fillStyle = '#ff3355';
      ctx!.fillRect(4, cy - 4, 20, 5);
      ctx!.fillRect(8, cy - 7, 12, 4);
      // Body
      ctx!.fillStyle = '#4488ff';
      ctx!.fillRect(4, cy + 10, 20, 12);
      // Eyes
      ctx!.fillStyle = '#fff';
      ctx!.fillRect(10, cy + 2, 3, 3);
      ctx!.fillRect(16, cy + 2, 3, 3);
      ctx!.fillStyle = '#000';
      ctx!.fillRect(11, cy + 3, 2, 2);
      ctx!.fillRect(17, cy + 3, 2, 2);
      // Legs
      ctx!.fillStyle = '#00ff88';
      if (!onGround) {
        ctx!.fillRect(6, cy + 22, 7, 12);
        ctx!.fillRect(15, cy + 22, 7, 12);
      } else if (frame % 2 === 0) {
        ctx!.fillRect(5, cy + 22, 8, 12);
        ctx!.fillRect(17, cy + 22, 8, 10);
      } else {
        ctx!.fillRect(5, cy + 22, 8, 10);
        ctx!.fillRect(17, cy + 22, 8, 12);
      }
      // Shoes
      ctx!.fillStyle = '#663300';
      ctx!.fillRect(4, cy + CHAR_H - 4, 10, 4);
      ctx!.fillRect(16, cy + CHAR_H - 4, 10, 4);

      ctx!.restore();
    }

    function drawScene() {
      if (!ctx) return;
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#08081a');
      grad.addColorStop(1, '#0f0f2d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#444';
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97 + 13) % 1200) - cameraX * 0.3;
        const sy = (i * 53 + 7) % 220;
        if (sx > -5 && sx < W + 5) ctx.fillRect(sx, sy, 2, 2);
      }

      // Mountains (parallax)
      ctx.fillStyle = '#111128';
      for (let i = 0; i < 6; i++) {
        const mx = i * 200 - cameraX * 0.15;
        ctx.beginPath();
        ctx.moveTo(mx, GROUND_Y);
        ctx.lineTo(mx + 80, GROUND_Y - 100 - (i % 3) * 30);
        ctx.lineTo(mx + 160, GROUND_Y);
        ctx.fill();
      }

      // Ground
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // Ground top edge
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(0, GROUND_Y, W, 3);
      // Ground detail bricks
      ctx.fillStyle = '#16213e';
      for (let gx = -((cameraX | 0) % 20); gx < W; gx += 20) {
        ctx.fillRect(gx, GROUND_Y + 6, 18, 10);
        ctx.fillRect(gx + 10, GROUND_Y + 18, 18, 10);
      }

      // Hole in the world
      const holeScreenX = HOLE_X - cameraX;
      ctx.fillStyle = '#000';
      ctx.fillRect(holeScreenX, GROUND_Y, HOLE_WIDTH, H - GROUND_Y);
      // Hole edges
      ctx.fillStyle = '#ff335566';
      ctx.fillRect(holeScreenX - 3, GROUND_Y - 2, 6, H - GROUND_Y + 2);
      ctx.fillRect(holeScreenX + HOLE_WIDTH - 3, GROUND_Y - 2, 6, H - GROUND_Y + 2);
      // Hole glow
      ctx.fillStyle = 'rgba(255,0,50,0.05)';
      ctx.fillRect(holeScreenX - 10, GROUND_Y + 5, HOLE_WIDTH + 20, 60);

      // ⚠ DANGER sign
      const signX = holeScreenX + HOLE_WIDTH / 2;
      const signY = GROUND_Y - 60;
      // Post
      ctx.fillStyle = '#555';
      ctx.fillRect(signX - 2, signY + 20, 4, 42);
      // Sign board
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(signX - 35, signY, 70, 22);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DANGER', signX, signY + 15);
      // Skull icon
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('☠', signX, signY - 5);
      ctx.textAlign = 'left';

      // Platforms
      for (const p of PLATFORMS) {
        const px = p.x - cameraX;
        // Platform body
        ctx.fillStyle = '#2a4a3a';
        ctx.fillRect(px, p.y, p.w, 10);
        ctx.fillStyle = '#3a6a4a';
        ctx.fillRect(px, p.y, p.w, 3);
        // Brick detail
        ctx.fillStyle = '#1a3a2a';
        for (let bx = 0; bx < p.w; bx += 12) {
          ctx.fillRect(px + bx, p.y + 4, 10, 5);
        }
      }

      // Coins
      ctx.fillStyle = '#ffcc00';
      for (const c of coins) {
        if (c.collected) continue;
        const coinScreen = c.x - cameraX;
        // Spinning effect
        const t = Date.now() / 200;
        const sw = 8 * Math.abs(Math.cos(t + c.x));
        ctx.fillRect(coinScreen + 4 - sw / 2, c.y, sw, 10);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(coinScreen + 4 - sw / 2 + 1, c.y + 2, Math.max(sw - 2, 1), 6);
        ctx.fillStyle = '#ffcc00';
      }
    }

    function drawHUD() {
      if (!ctx) return;
      // Score
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(10, 10, 140, 30);
      ctx.strokeStyle = '#ffcc00';
      ctx.strokeRect(10, 10, 140, 30);
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText('COINS: ' + score + '/' + INITIAL_COINS.length, 20, 30);

      // Controls help
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(W - 300, 10, 290, 50);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(W - 300, 10, 290, 50);
      ctx.fillStyle = '#888';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('← → or A D : Move', W - 288, 28);
      ctx.fillText('SPACE or ↑  : Jump', W - 288, 48);
    }

    // ── main loop ──
    let raf: number;
    function loop() {
      if (fellRef.current) return;
      animTick++;

      const keys = keysRef.current;
      // Movement
      vx = 0;
      if (keys.has('arrowright') || keys.has('d')) { vx = MOVE_SPEED; facing = 1; }
      if (keys.has('arrowleft') || keys.has('a')) { vx = -MOVE_SPEED; facing = -1; }

      const prevY = y;
      vy += GRAVITY;
      x += vx;
      y += vy;

      // Clamp left
      if (x < 0) x = 0;

      // Ground collision (only if not over hole)
      if (!isOverHole(x)) {
        if (y + CHAR_H >= GROUND_Y) {
          y = GROUND_Y - CHAR_H;
          vy = 0;
          onGround = true;
        }
      }

      // Platform collision
      const platY = platformUnder(x, y, prevY);
      if (platY !== null && vy >= 0) {
        y = platY;
        vy = 0;
        onGround = true;
      }

      // Coin collection
      for (const c of coins) {
        if (c.collected) continue;
        if (x + CHAR_W > c.x && x < c.x + 12 && y + CHAR_H > c.y && y < c.y + 10) {
          c.collected = true;
          score++;
        }
      }

      // Fell into hole!
      if (y > H + 50) {
        fellRef.current = true;
        setFell(true);
        return;
      }

      // Camera follow
      const targetCam = x - W / 3;
      cameraX += (targetCam - cameraX) * 0.08;
      if (cameraX < 0) cameraX = 0;

      // Draw
      ctx!.clearRect(0, 0, W, H);
      drawScene();
      drawChar(x, y, Math.floor(animTick / 8));
      drawHUD();

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Fell → fade → hub
  useEffect(() => {
    if (!fell) return;
    const t1 = setTimeout(() => setFadeOut(true), 800);
    const t2 = setTimeout(() => router.push('/hub'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [fell, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        position: 'relative',
      }}
      tabIndex={0}
      onKeyDown={() => {}}
    >
      {!fell && (
        <>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              imageRendering: 'pixelated',
              border: '1px solid #222',
            }}
          />
          <p style={{
            marginTop: '16px',
            fontFamily: 'var(--font-pixel)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            animation: 'fadeIn 1s ease-out',
          }}>
            Use arrow keys or WASD to move — SPACE to jump — reach the hole...
          </p>
        </>
      )}

      {fell && (
        <div style={{ animation: 'fadeIn 0.8s ease-out', textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: '16px',
            color: 'var(--accent-red)',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 1s ease',
          }}>
            you fell into the internet...
          </p>
          <p style={{
            fontFamily: 'var(--font-terminal)',
            fontSize: '20px',
            color: 'var(--text-secondary)',
            marginTop: '16px',
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 1.2s ease',
          }}>
            entering the underground...
          </p>
        </div>
      )}
    </div>
  );
}
