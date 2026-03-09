'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const W = 800;
const H = 450;
const GY = 340;                // ground Y
const CAR_W = 54;
const CAR_H = 24;
const GRAVITY = 0.55;
const MAX_SPD = 5.5;
const ACCEL = 0.22;
const FRIC = 0.08;
const BOOST_SPD = 9;
const BOOST_DUR = 90;
const JUMP_VEL = -9;           // up arrow jump
const START_X = 120;
const FINISH_X = 5200;
const SECRET_X = -250;
const TUNNEL_X = -500;
const TUNNEL_EXIT = 5000;
const COUNTDOWN_FRAMES = 180;  // 3-second countdown

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Obstacle { x: number; y: number; w: number; h: number; type: 'rock' | 'barrel' | 'gap' | 'spikes' | 'laser' | 'monster'; timer?: number; }
interface Ghost { x: number; color: string; speed: number; alive: boolean; deathX: number; label: string; }
interface Sign { x: number; lines: string[]; glow: boolean; }

/* ═══════════════════════════════════════════════
   TRACK DATA
   ═══════════════════════════════════════════════ */
const OBSTACLES: Obstacle[] = [
  { x: 700,  y: GY - 28, w: 36, h: 28, type: 'rock' },
  { x: 1100, y: GY - 32, w: 44, h: 32, type: 'rock' },
  { x: 1600, y: GY - 24, w: 30, h: 24, type: 'rock' },
  { x: 2400, y: GY - 30, w: 40, h: 30, type: 'rock' },
  { x: 3400, y: GY - 26, w: 34, h: 26, type: 'rock' },

  { x: 900,  y: GY - 26, w: 26, h: 26, type: 'barrel', timer: 0 },
//   { x: 1400, y: GY - 26, w: 26, h: 26, type: 'barrel', timer: 0 },
//   { x: 2100, y: GY - 26, w: 26, h: 26, type: 'barrel', timer: 0 },
//   { x: 2800, y: GY - 26, w: 26, h: 26, type: 'barrel', timer: 0 },
  { x: 3900, y: GY - 26, w: 26, h: 26, type: 'barrel', timer: 0 },

  { x: 1250, y: GY, w: 110, h: 110, type: 'gap' },
  { x: 2000, y: GY, w: 130, h: 110, type: 'gap' },
  { x: 2900, y: GY, w: 160, h: 110, type: 'gap' },
  { x: 3600, y: GY, w: 140, h: 110, type: 'gap' },

  { x: 1800, y: GY - 8, w: 60, h: 8,  type: 'spikes' },
  { x: 2600, y: GY - 8, w: 80, h: 8,  type: 'spikes' },
  { x: 3200, y: GY - 8, w: 70, h: 8,  type: 'spikes' },
  { x: -950, y: GY - 8, w: 70, h: 8,  type: 'spikes' },
  { x: -900, y: GY - 8, w: 70, h: 8,  type: 'spikes' },

  { x: 4000, y: GY - 120, w: 6, h: 120, type: 'laser', timer: 0 },
  { x: 4300, y: GY - 120, w: 6, h: 120, type: 'laser', timer: 0 },

  { x: 4600, y: GY - 140, w: 180, h: 140, type: 'monster', timer: 0 },
];

const SIGNS: Sign[] = [
  { x: 30,   lines: ['"Clean the mirror"'], glow: false },
  { x: 500,  lines: ['" If women goes right ','men goes left"'], glow: false },
  { x: 1700, lines: ['"Avenci laryare"'], glow: false },
  { x: 2700, lines: ['"Think different.', 'Drive different."'], glow: false },
  { x: 3500, lines: ['"I Told you', 'Trik sed ma tdi ma trad "'], glow: true },
];

const GHOSTS: Ghost[] = [
  { x: START_X, color: '#ff335566', speed: 4.2, alive: true, deathX: 1260, label: 'PLAYER_47' },
  { x: START_X, color: '#aa44ff66', speed: 3.8, alive: true, deathX: 2020, label: 'xXrAcErXx' },
  { x: START_X, color: '#ffcc0066', speed: 5.0, alive: true, deathX: 2920, label: 'TryHard99' },
  { x: START_X, color: '#00ff8866', speed: 4.5, alive: true, deathX: 4620, label: 'SpeedKing' },
];

// Parallax mountains (pre-generated)
const MOUNTAINS = Array.from({ length: 20 }, (_, i) => ({
  x: i * 400 - 200,
  h: 40 + Math.sin(i * 2.7) * 30 + Math.cos(i * 1.3) * 20,
  w: 160 + Math.sin(i * 1.1) * 60,
}));

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function RaceLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [solved, setSolved] = useState(false);
  const [deaths, setDeaths] = useState(0);
  const [secretFound, setSecretFound] = useState(false);
  const [inTunnel, setInTunnel] = useState(false);
  const [phase, setPhase] = useState<'countdown' | 'racing' | 'tunnel' | 'won'>('countdown');

  const gameRef = useRef({
    carX: START_X,
    carY: GY - CAR_H,
    velX: 0,
    velY: 0,
    onGround: true,
    alive: true,
    boost: 0,
    inTunnel: false,
    tunnelProg: 0,
    secretTriggered: false,
    camX: 0,
    won: false,
    deathCount: 0,
    respawnTimer: 0,
    countdown: COUNTDOWN_FRAMES,
    frame: 0,
    wheelAngle: 0,
    shakeX: 0,
    shakeY: 0,
    shakeDecay: 0,
    flashAlpha: 0,
    keys: { left: false, right: false, up: false, space: false },
    obstacles: OBSTACLES.map(o => ({ ...o })),
    ghosts: GHOSTS.map(g => ({ ...g })),
    particles: [] as Particle[],
    dustTimer: 0,
    tiltAngle: 0,
  });

  const animRef = useRef(0);

  /* ── helpers ── */
  const shake = (intensity: number) => {
    const g = gameRef.current;
    g.shakeDecay = intensity;
  };
  const flash = (alpha: number) => { gameRef.current.flashAlpha = alpha; };

  const spawnParticles = (x: number, y: number, count: number, color: string, spread: number, upward = false) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: upward ? -Math.random() * spread * 0.8 : (Math.random() - 0.5) * spread,
        life: 20 + Math.random() * 30,
        maxLife: 50,
        color,
        size: 1 + Math.random() * 3,
      });
    }
  };

  /* ── keyboard ── */
  useEffect(() => {
    const g = gameRef.current;
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'd' || k === 'D') g.keys.right = true;
      if (k === 'ArrowLeft'  || k === 'a' || k === 'A') g.keys.left = true;
      if (k === 'ArrowUp'    || k === 'w' || k === 'W') g.keys.up = true;
      if (k === ' ') { g.keys.space = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'd' || k === 'D') g.keys.right = false;
      if (k === 'ArrowLeft'  || k === 'a' || k === 'A') g.keys.left = false;
      if (k === 'ArrowUp'    || k === 'w' || k === 'W') g.keys.up = false;
      if (k === ' ') g.keys.space = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  /* ── respawn ── */
  const respawn = useCallback(() => {
    const g = gameRef.current;
    g.carX = START_X; g.carY = GY - CAR_H;
    g.velX = 0; g.velY = 0;
    g.onGround = true; g.alive = true;
    g.boost = 0; g.inTunnel = false;
    g.tunnelProg = 0; g.secretTriggered = false;
    g.particles = []; g.tiltAngle = 0;
    g.obstacles = OBSTACLES.map(o => ({ ...o }));
    g.ghosts = GHOSTS.map(gh => ({ ...gh }));
    setInTunnel(false);
    setSecretFound(false);
    setPhase('racing');
  }, []);

  /* ══════════════════════════════════════════
     MAIN GAME LOOP
     ══════════════════════════════════════════ */
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;
    const t = g.frame++;

    if (g.won) { animRef.current = requestAnimationFrame(gameLoop); return; }

    /* ── COUNTDOWN ── */
    if (g.countdown > 0) {
      g.countdown--;
      if (g.countdown === 0) setPhase('racing');
    }

    /* ── SHAKE / FLASH decay ── */
    if (g.shakeDecay > 0) {
      g.shakeX = (Math.random() - 0.5) * g.shakeDecay * 2;
      g.shakeY = (Math.random() - 0.5) * g.shakeDecay * 2;
      g.shakeDecay *= 0.9;
      if (g.shakeDecay < 0.3) { g.shakeX = 0; g.shakeY = 0; g.shakeDecay = 0; }
    }
    if (g.flashAlpha > 0) g.flashAlpha *= 0.88;

    /* ── RESPAWN TIMER ── */
    if (!g.alive) {
      g.respawnTimer--;
      if (g.respawnTimer <= 0) respawn();
    }

    /* ── GHOST RACERS update ── */
    if (g.countdown <= 0) {
      for (const gh of g.ghosts) {
        if (gh.alive) {
          gh.x += gh.speed;
          if (gh.x >= gh.deathX) {
            gh.alive = false;
            spawnParticles(gh.x, GY - 15, 12, '#ff3355', 4, true);
          }
        }
      }
    }

    /* ── PLAYER UPDATE ── */
    if (g.alive && !g.inTunnel && g.countdown <= 0) {
      // Movement
      if (g.keys.right) {
        g.velX = Math.min(g.velX + ACCEL, g.boost > 0 ? BOOST_SPD : MAX_SPD);
      } else if (g.keys.left) {
        g.velX = Math.max(g.velX - ACCEL, g.boost > 0 ? -BOOST_SPD : -MAX_SPD);
      } else {
        if (g.velX > 0) g.velX = Math.max(0, g.velX - FRIC);
        if (g.velX < 0) g.velX = Math.min(0, g.velX + FRIC);
      }

      // Jump
      if (g.keys.up && g.onGround) {
        g.velY = JUMP_VEL;
        g.onGround = false;
        spawnParticles(g.carX + CAR_W / 2, GY, 6, '#555', 3, true);
      }

      // Boost
      if (g.keys.space && g.boost === 0 && g.onGround) {
        g.boost = BOOST_DUR;
        shake(4);
      }
      if (g.boost > 0) g.boost--;

      g.carX += g.velX;

      // Gravity
      if (!g.onGround) g.velY += GRAVITY;
      g.carY += g.velY;

      // Tilt car based on velocity
      const targetTilt = g.velX * 0.015 + (g.velY > 2 ? 0.1 : g.velY < -2 ? -0.08 : 0);
      g.tiltAngle += (targetTilt - g.tiltAngle) * 0.15;

      // Wheel rotation
      g.wheelAngle += g.velX * 0.15;

      // Dust particles when driving on ground
      if (g.onGround && Math.abs(g.velX) > 1) {
        g.dustTimer++;
        if (g.dustTimer % 3 === 0) {
          const dustCol = g.boost > 0 ? '#ff660088' : '#66554433';
          g.particles.push({
            x: g.carX + (g.velX > 0 ? 0 : CAR_W),
            y: GY - 2,
            vx: -g.velX * 0.3 + (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 1.5,
            life: 15 + Math.random() * 10,
            maxLife: 25,
            color: dustCol,
            size: 2 + Math.random() * 3,
          });
        }
      }

      // Ground / gap check
      let overGap = false;
      for (const obs of g.obstacles) {
        if (obs.type === 'gap' && g.carX + CAR_W > obs.x + 8 && g.carX < obs.x + obs.w - 8) {
          overGap = true; break;
        }
      }
      if (!overGap && g.carY >= GY - CAR_H) {
        g.carY = GY - CAR_H; g.velY = 0; g.onGround = true;
      } else if (overGap) {
        g.onGround = false;
      }

      // Fall death
      if (g.carY > H + 60) {
        killPlayer('FELL INTO THE VOID');
      }

      // Obstacle collisions
      for (const obs of g.obstacles) {
        if (obs.type === 'gap') continue;
        // Lasers toggle on/off
        if (obs.type === 'laser') {
          obs.timer = (obs.timer ?? 0) + 1;
          const on = (obs.timer % 120) < 70;
          if (!on) continue;
        }
        const hit = g.carX + CAR_W - 4 > obs.x && g.carX + 4 < obs.x + obs.w &&
                    g.carY + CAR_H > obs.y && g.carY < obs.y + obs.h;
        if (!hit) continue;

        if (obs.type === 'monster') {
          spawnParticles(g.carX + CAR_W / 2, g.carY, 30, '#ff2200', 8, false);
          spawnParticles(g.carX + CAR_W / 2, g.carY, 15, '#ffaa00', 6, true);
          shake(12); flash(1);
          killPlayer('DEVOURED BY THE DESTROYER');
        } else if (obs.type === 'barrel') {
          spawnParticles(obs.x + obs.w / 2, obs.y, 20, '#ff6600', 6, true);
          spawnParticles(obs.x + obs.w / 2, obs.y, 8, '#ffcc00', 4, true);
          shake(8); flash(0.6);
          killPlayer('BARREL EXPLOSION');
        } else if (obs.type === 'spikes') {
          spawnParticles(g.carX + CAR_W / 2, GY - 5, 10, '#cc0000', 4, true);
          shake(6); flash(0.4);
          killPlayer('IMPALED ON SPIKES');
        } else if (obs.type === 'laser') {
          spawnParticles(g.carX + CAR_W / 2, g.carY + CAR_H / 2, 15, '#00ffff', 5, false);
          shake(6); flash(0.7);
          killPlayer('LASER DISINTEGRATION');
        } else if (obs.type === 'rock') {
          g.velX = g.velX > 0 ? -4 : 4;
          g.carX = g.velX < 0 ? obs.x - CAR_W - 2 : obs.x + obs.w + 2;
          shake(3);
          spawnParticles(obs.x + obs.w / 2, obs.y, 6, '#888', 3, true);
        }
      }

      // Secret trigger — must be boosting backward
      if (g.carX < SECRET_X && !g.secretTriggered && g.velX < -MAX_SPD && g.boost > 0) {
        g.secretTriggered = true;
        setSecretFound(true);
        shake(5);
        spawnParticles(g.carX, GY, 20, '#ff8800', 5, true);
      }

      // Tunnel entrance — must still be boosting backward
      if (g.carX < TUNNEL_X && g.secretTriggered && !g.inTunnel && g.velX < -MAX_SPD && g.boost > 0) {
        g.inTunnel = true;
        g.tunnelProg = 0;
        setInTunnel(true);
        setPhase('tunnel');
      }
    }

    // Tunnel progress
    if (g.inTunnel) {
      g.tunnelProg += 0.006;
      if (g.tunnelProg >= 1) {
        g.inTunnel = false;
        g.carX = TUNNEL_EXIT;
        g.carY = GY - CAR_H;
        g.velX = 3; g.velY = 0;
        g.onGround = true;
        setInTunnel(false);
        setPhase('racing');
      }
    }

    // Win
    if (!g.inTunnel && g.carX >= FINISH_X && g.alive && g.countdown <= 0) {
      g.won = true;
      setSolved(true);
      setPhase('won');
      completeLevel('race');
    }

    // Camera
    if (!g.inTunnel) {
      const target = g.carX - W / 3;
      g.camX += (target - g.camX) * 0.08;
    }

    // Update particles
    g.particles = g.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; return p.life > 0;
    });

    /* ══════════════════════════════════════
       DRAW
       ══════════════════════════════════════ */
    ctx.save();
    ctx.translate(g.shakeX, g.shakeY);
    ctx.clearRect(-10, -10, W + 20, H + 20);

    if (g.inTunnel) {
      drawTunnel(ctx, g.tunnelProg, t);
    } else {
      const cam = g.camX;

      // ── SKY with gradient ──
      const sky = ctx.createLinearGradient(0, 0, 0, GY);
      sky.addColorStop(0, '#020010');
      sky.addColorStop(0.4, '#0a0825');
      sky.addColorStop(1, '#150a30');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GY);

      // ── STARS (twinkling parallax) ──
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 50) % 2000) - (cam * 0.03 % 2000);
        const sy = (i * 73 + 10) % (GY - 60);
        const tw = Math.sin(t * 0.05 + i * 1.7) * 0.5 + 0.5;
        const brightness = 80 + tw * 175;
        ctx.fillStyle = `rgb(${brightness},${brightness},${brightness + 30})`;
        const sz = i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1;
        ctx.fillRect(sx < 0 ? sx + 2000 : sx, sy, sz, sz);
      }

      // ── PARALLAX MOUNTAINS ──
      ctx.fillStyle = '#0d0820';
      for (const m of MOUNTAINS) {
        const mx = m.x - cam * 0.15;
        const wrappedX = ((mx % 4000) + 4000) % 4000 - 200;
        ctx.beginPath();
        ctx.moveTo(wrappedX - m.w / 2, GY);
        ctx.lineTo(wrappedX, GY - m.h);
        ctx.lineTo(wrappedX + m.w / 2, GY);
        ctx.closePath();
        ctx.fill();
      }
      // Mid-ground hills
      ctx.fillStyle = '#110d28';
      for (let i = 0; i < 30; i++) {
        const hx = i * 250 - cam * 0.3;
        const wrappedX = ((hx % 3000) + 3000) % 3000 - 300;
        const hh = 20 + Math.sin(i * 1.8) * 15;
        ctx.beginPath();
        ctx.moveTo(wrappedX - 60, GY);
        ctx.quadraticCurveTo(wrappedX, GY - hh, wrappedX + 60, GY);
        ctx.closePath();
        ctx.fill();
      }

      // ── GROUND ──
      const groundGrad = ctx.createLinearGradient(0, GY, 0, H);
      groundGrad.addColorStop(0, '#1a1408');
      groundGrad.addColorStop(1, '#0a0a04');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GY, W, H - GY);

      // Ground surface detail — road markings
      ctx.strokeStyle = '#2a2410';
      ctx.lineWidth = 1;
      for (let i = -1; i < 60; i++) {
        const rx = i * 100 - (cam % 100);
        ctx.beginPath();
        ctx.moveTo(rx, GY + 1);
        ctx.lineTo(rx + 40, GY + 1);
        ctx.stroke();
      }
      // Ground line (bright)
      ctx.strokeStyle = '#3a3018';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); ctx.stroke();

      // ── GAPS ──
      for (const obs of g.obstacles) {
        if (obs.type !== 'gap') continue;
        const gx = obs.x - cam;
        if (gx > W + 50 || gx + obs.w < -50) continue;

        // Void
        const voidGrad = ctx.createLinearGradient(gx, GY, gx, GY + obs.h);
        voidGrad.addColorStop(0, '#030303');
        voidGrad.addColorStop(1, '#000000');
        ctx.fillStyle = voidGrad;
        ctx.fillRect(gx, GY, obs.w, obs.h);

        // Danger glow at edges
        ctx.fillStyle = 'rgba(255,50,0,0.08)';
        ctx.fillRect(gx - 5, GY, 10, obs.h);
        ctx.fillRect(gx + obs.w - 5, GY, 10, obs.h);

        // Broken edge lines
        ctx.strokeStyle = '#3a2200';
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.moveTo(gx + j * 5, GY);
          ctx.lineTo(gx + j * 8 + 5, GY + 15 + j * 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(gx + obs.w - j * 5, GY);
          ctx.lineTo(gx + obs.w - j * 8 - 5, GY + 15 + j * 8);
          ctx.stroke();
        }
      }

      // ── START LINE ──
      const slx = START_X - cam - 10;
      // Checkered flag pattern
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#007744';
        ctx.fillRect(slx, GY - 70 + i * 8, 8, 8);
        ctx.fillStyle = i % 2 === 0 ? '#007744' : '#00ff88';
        ctx.fillRect(slx + 8, GY - 70 + i * 8, 8, 8);
      }
      ctx.fillStyle = '#553300';
      ctx.fillRect(slx + 6, GY - 6, 4, 6);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.textAlign = 'center';
      ctx.fillText('START', slx + 8, GY - 75);
      ctx.textAlign = 'left';

      // ── FINISH LINE ──
      const flx = FINISH_X - cam;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffcc00' : '#886600';
        ctx.fillRect(flx, GY - 70 + i * 8, 8, 8);
        ctx.fillStyle = i % 2 === 0 ? '#886600' : '#ffcc00';
        ctx.fillRect(flx + 8, GY - 70 + i * 8, 8, 8);
      }
      ctx.fillStyle = '#553300';
      ctx.fillRect(flx + 6, GY - 6, 4, 6);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffcc00';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', flx + 8, GY - 75);
      ctx.textAlign = 'left';

      // ── SIGNS ──
      for (const sign of SIGNS) {
        const sx = sign.x - cam;
        if (sx < -180 || sx > W + 180) continue;
        // Post
        ctx.fillStyle = '#3a2a10';
        ctx.fillRect(sx + 40, GY - 55, 3, 55);
        // Board
        const bw = 120;
        const bh = sign.lines.length * 14 + 10;
        const bx = sx - 10;
        const by = GY - 55 - bh;
        ctx.fillStyle = 'rgba(20,15,5,0.92)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = sign.glow ? '#ff3333' : '#4a3a10';
        ctx.lineWidth = sign.glow ? 2 : 1;
        ctx.strokeRect(bx, by, bw, bh);
        // Text
        ctx.font = '8px monospace';
        ctx.fillStyle = sign.glow ? '#ff4444' : '#aa9944';
        sign.lines.forEach((line, li) => {
          ctx.fillText(line, bx + 6, by + 14 + li * 14);
        });
        // Glow effect
        if (sign.glow) {
          ctx.shadowColor = '#ff3333';
          ctx.shadowBlur = 8;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.shadowBlur = 0;
        }
      }

      // ── OBSTACLES ──
      for (const obs of g.obstacles) {
        if (obs.type === 'gap') continue;
        const ox = obs.x - cam;
        if (ox < -200 || ox > W + 200) continue;

        if (obs.type === 'rock') {
          // Multi-shade rock
          const rGrad = ctx.createLinearGradient(ox, obs.y, ox + obs.w, obs.y + obs.h);
          rGrad.addColorStop(0, '#666');
          rGrad.addColorStop(0.5, '#444');
          rGrad.addColorStop(1, '#333');
          ctx.fillStyle = rGrad;
          ctx.beginPath();
          ctx.moveTo(ox, obs.y + obs.h);
          ctx.lineTo(ox + obs.w * 0.2, obs.y + obs.h * 0.3);
          ctx.lineTo(ox + obs.w * 0.5, obs.y);
          ctx.lineTo(ox + obs.w * 0.8, obs.y + obs.h * 0.2);
          ctx.lineTo(ox + obs.w, obs.y + obs.h);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Crack detail
          ctx.strokeStyle = '#3a3a3a';
          ctx.beginPath();
          ctx.moveTo(ox + obs.w * 0.4, obs.y + 2);
          ctx.lineTo(ox + obs.w * 0.5, obs.y + obs.h * 0.6);
          ctx.stroke();

        } else if (obs.type === 'barrel') {
          // Animated danger barrel
          const pulse = Math.sin(t * 0.1) * 0.15;
          ctx.fillStyle = `rgb(${140 + pulse * 60},${30 + pulse * 20},0)`;
          // Barrel shape (rounded rect)
          const br = 4;
          ctx.beginPath();
          ctx.moveTo(ox + br, obs.y);
          ctx.lineTo(ox + obs.w - br, obs.y);
          ctx.arcTo(ox + obs.w, obs.y, ox + obs.w, obs.y + br, br);
          ctx.lineTo(ox + obs.w, obs.y + obs.h - br);
          ctx.arcTo(ox + obs.w, obs.y + obs.h, ox + obs.w - br, obs.y + obs.h, br);
          ctx.lineTo(ox + br, obs.y + obs.h);
          ctx.arcTo(ox, obs.y + obs.h, ox, obs.y + obs.h - br, br);
          ctx.lineTo(ox, obs.y + br);
          ctx.arcTo(ox, obs.y, ox + br, obs.y, br);
          ctx.closePath();
          ctx.fill();
          // Metal bands
          ctx.strokeStyle = '#aa6600';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox, obs.y + 6); ctx.lineTo(ox + obs.w, obs.y + 6);
          ctx.moveTo(ox, obs.y + obs.h - 6); ctx.lineTo(ox + obs.w, obs.y + obs.h - 6);
          ctx.stroke();
          // Danger symbol
          ctx.fillStyle = '#ff4400';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', ox + obs.w / 2, obs.y + obs.h - 9);
          ctx.textAlign = 'left';
          // Warning glow
          ctx.shadowColor = '#ff4400';
          ctx.shadowBlur = 6 + pulse * 10;
          ctx.strokeStyle = '#ff440044';
          ctx.strokeRect(ox - 2, obs.y - 2, obs.w + 4, obs.h + 4);
          ctx.shadowBlur = 0;

        } else if (obs.type === 'spikes') {
          // Metallic spikes
          const spikeCount = Math.floor(obs.w / 10);
          for (let i = 0; i < spikeCount; i++) {
            const sx = ox + i * 10;
            const sGrad = ctx.createLinearGradient(sx + 5, obs.y - 12, sx + 5, obs.y + obs.h);
            sGrad.addColorStop(0, '#cccccc');
            sGrad.addColorStop(0.3, '#888888');
            sGrad.addColorStop(1, '#444444');
            ctx.fillStyle = sGrad;
            ctx.beginPath();
            ctx.moveTo(sx, obs.y + obs.h);
            ctx.lineTo(sx + 5, obs.y - 12);
            ctx.lineTo(sx + 10, obs.y + obs.h);
            ctx.closePath();
            ctx.fill();
          }
          // Blood-red glow at tips
          ctx.fillStyle = 'rgba(255,0,0,0.15)';
          ctx.fillRect(ox - 2, obs.y - 14, obs.w + 4, 6);

        } else if (obs.type === 'laser') {
          const on = ((obs.timer ?? 0) % 120) < 70;
          if (on) {
            // Laser beam
            const laserGrad = ctx.createLinearGradient(ox - 3, 0, ox + obs.w + 3, 0);
            laserGrad.addColorStop(0, 'rgba(0,255,255,0)');
            laserGrad.addColorStop(0.5, 'rgba(0,255,255,0.8)');
            laserGrad.addColorStop(1, 'rgba(0,255,255,0)');
            ctx.fillStyle = laserGrad;
            ctx.fillRect(ox - 8, obs.y, obs.w + 16, obs.h);
            // Core
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ox + 1, obs.y, 2, obs.h);
            // Glow
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            ctx.fillStyle = 'rgba(0,255,255,0.3)';
            ctx.fillRect(ox - 4, obs.y, obs.w + 8, obs.h);
            ctx.shadowBlur = 0;
            // Emitters
            ctx.fillStyle = '#333';
            ctx.fillRect(ox - 6, obs.y - 6, 16, 8);
            ctx.fillRect(ox - 6, obs.y + obs.h - 2, 16, 8);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ox - 2, obs.y - 3, 8, 3);
            ctx.fillRect(ox - 2, obs.y + obs.h, 8, 3);
          } else {
            // Off state — dim emitters
            ctx.fillStyle = '#222';
            ctx.fillRect(ox - 6, obs.y - 6, 16, 8);
            ctx.fillRect(ox - 6, obs.y + obs.h - 2, 16, 8);
            ctx.fillStyle = '#0a4444';
            ctx.fillRect(ox - 2, obs.y - 3, 8, 3);
          }

        } else if (obs.type === 'monster') {
          const mf = Math.sin(t * 0.04) * 4;
          const breathe = Math.sin(t * 0.02) * 3;

          // Shadow
          ctx.fillStyle = 'rgba(255,0,0,0.05)';
          ctx.beginPath();
          ctx.ellipse(ox + obs.w / 2, GY + 5, obs.w * 0.6, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Body
          const bodyGrad = ctx.createLinearGradient(ox, obs.y, ox + obs.w, obs.y + obs.h);
          bodyGrad.addColorStop(0, '#2a0000');
          bodyGrad.addColorStop(0.5, '#440000');
          bodyGrad.addColorStop(1, '#1a0000');
          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.moveTo(ox + 10, obs.y + obs.h);
          ctx.lineTo(ox, obs.y + obs.h * 0.4 + mf);
          ctx.quadraticCurveTo(ox + obs.w * 0.3, obs.y + mf - 10, ox + obs.w / 2, obs.y + mf);
          ctx.quadraticCurveTo(ox + obs.w * 0.7, obs.y + mf - 10, ox + obs.w, obs.y + obs.h * 0.4 + mf);
          ctx.lineTo(ox + obs.w - 10, obs.y + obs.h);
          ctx.closePath();
          ctx.fill();

          // Eyes (glowing)
          const eyeY = obs.y + 30 + mf;
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.ellipse(ox + 50, eyeY, 14, 10 + breathe, 0, 0, Math.PI * 2);
          ctx.ellipse(ox + 130, eyeY, 14, 10 + breathe, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // Pupils (follow player)
          const pupilOffset = Math.min(4, Math.max(-4, (g.carX - obs.x) * 0.01));
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ox + 52 + pupilOffset, eyeY + 1, 6, 0, Math.PI * 2);
          ctx.arc(ox + 132 + pupilOffset, eyeY + 1, 6, 0, Math.PI * 2);
          ctx.fill();
          // Eye shine
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(ox + 46, eyeY - 4, 3, 0, Math.PI * 2);
          ctx.arc(ox + 126, eyeY - 4, 3, 0, Math.PI * 2);
          ctx.fill();

          // Mouth with teeth
          const mouthY = obs.y + 75 + mf;
          ctx.fillStyle = '#1a0000';
          ctx.beginPath();
          ctx.moveTo(ox + 40, mouthY);
          ctx.quadraticCurveTo(ox + 90, mouthY + 30 + breathe * 2, ox + 140, mouthY);
          ctx.closePath();
          ctx.fill();
          // Teeth
          ctx.fillStyle = '#ddcccc';
          for (let ti = 0; ti < 7; ti++) {
            const tx = ox + 50 + ti * 13;
            ctx.beginPath();
            ctx.moveTo(tx, mouthY + 2);
            ctx.lineTo(tx + 4, mouthY + 10 + (ti % 2) * 4);
            ctx.lineTo(tx + 8, mouthY + 2);
            ctx.closePath();
            ctx.fill();
          }

          // Label with glow
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 10;
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#ff3333';
          ctx.textAlign = 'center';
          ctx.fillText('☠ THE DESTROYER ☠', ox + obs.w / 2, obs.y - 12 + mf);
          ctx.font = '8px monospace';
          ctx.fillStyle = '#aa2222';
          ctx.fillText('>> NOTHING GETS PAST <<', ox + obs.w / 2, obs.y - 1 + mf);
          ctx.textAlign = 'left';
          ctx.shadowBlur = 0;
        }
      }

      // ── GHOST RACERS ──
      for (const gh of g.ghosts) {
        const gx = gh.x - cam;
        if (gx < -100 || gx > W + 100) continue;
        if (gh.alive) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = gh.color;
          ctx.fillRect(gx, GY - CAR_H, CAR_W - 6, CAR_H - 4);
          ctx.fillRect(gx + 8, GY - CAR_H - 12, 30, 12);
          ctx.font = '7px monospace';
          ctx.fillStyle = '#ffffff55';
          ctx.fillText(gh.label, gx, GY - CAR_H - 16);
          ctx.globalAlpha = 1;
        } else {
          // Ghost death marker
          ctx.globalAlpha = 0.25;
          ctx.font = '8px monospace';
          ctx.fillStyle = '#ff3355';
          ctx.textAlign = 'center';
          ctx.fillText('☠', gh.deathX - cam, GY - 10);
          ctx.fillStyle = '#666';
          ctx.fillText(gh.label, gh.deathX - cam, GY - 22);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
        }
      }

      // ── PARTICLES ──
      for (const p of g.particles) {
        const px = p.x - cam;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── CAR ──
      if (g.alive) {
        const cx = g.carX - cam;
        const cy = g.carY;
        ctx.save();
        ctx.translate(cx + CAR_W / 2, cy + CAR_H / 2);
        ctx.rotate(g.tiltAngle);
        ctx.translate(-(cx + CAR_W / 2), -(cy + CAR_H / 2));

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx + CAR_W / 2, GY + 4, CAR_W * 0.45, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boost flame
        if (g.boost > 0) {
          const flameLen = 8 + Math.random() * 18;
          const flameGrad = ctx.createLinearGradient(cx - flameLen, cy, cx, cy);
          flameGrad.addColorStop(0, 'rgba(255,100,0,0)');
          flameGrad.addColorStop(0.5, `rgba(255,${100 + Math.random() * 80},0,0.7)`);
          flameGrad.addColorStop(1, '#ffcc00');
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 4);
          ctx.lineTo(cx - flameLen, cy + CAR_H / 2);
          ctx.lineTo(cx, cy + CAR_H - 4);
          ctx.closePath();
          ctx.fill();
          // Inner bright flame
          ctx.fillStyle = `rgba(255,255,200,${0.3 + Math.random() * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 8);
          ctx.lineTo(cx - flameLen * 0.5, cy + CAR_H / 2);
          ctx.lineTo(cx, cy + CAR_H - 8);
          ctx.closePath();
          ctx.fill();
        }

        // Car body (gradient)
        const carGrad = ctx.createLinearGradient(cx, cy, cx, cy + CAR_H);
        if (g.boost > 0) {
          carGrad.addColorStop(0, '#ff5555');
          carGrad.addColorStop(1, '#aa2222');
        } else {
          carGrad.addColorStop(0, '#5599ff');
          carGrad.addColorStop(1, '#2255aa');
        }
        ctx.fillStyle = carGrad;
        // Rounded body
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy + CAR_H);
        ctx.lineTo(cx, cy + 6);
        ctx.quadraticCurveTo(cx + 2, cy, cx + 8, cy);
        ctx.lineTo(cx + CAR_W - 4, cy);
        ctx.quadraticCurveTo(cx + CAR_W, cy, cx + CAR_W, cy + 4);
        ctx.lineTo(cx + CAR_W, cy + CAR_H);
        ctx.closePath();
        ctx.fill();

        // Roof / cabin
        const roofGrad = ctx.createLinearGradient(cx + 14, cy - 14, cx + 14, cy);
        roofGrad.addColorStop(0, g.boost > 0 ? '#cc3333' : '#3377cc');
        roofGrad.addColorStop(1, g.boost > 0 ? '#aa2222' : '#2255aa');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy);
        ctx.lineTo(cx + 16, cy - 14);
        ctx.lineTo(cx + 42, cy - 14);
        ctx.lineTo(cx + 46, cy);
        ctx.closePath();
        ctx.fill();

        // Windshield
        ctx.fillStyle = 'rgba(130,200,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx + 40, cy - 12);
        ctx.lineTo(cx + 44, cy - 2);
        ctx.lineTo(cx + 40, cy - 2);
        ctx.closePath();
        ctx.fill();
        // Rear window
        ctx.fillStyle = 'rgba(130,200,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(cx + 18, cy - 12);
        ctx.lineTo(cx + 14, cy - 2);
        ctx.lineTo(cx + 18, cy - 2);
        ctx.closePath();
        ctx.fill();

        // Headlight
        ctx.fillStyle = '#ffee88';
        ctx.fillRect(cx + CAR_W - 3, cy + 4, 4, 5);
        ctx.shadowColor = '#ffee88';
        ctx.shadowBlur = 8;
        ctx.fillRect(cx + CAR_W - 3, cy + 4, 4, 5);
        ctx.shadowBlur = 0;
        // Taillight
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(cx - 1, cy + 4, 3, 5);

        // Wheels with spinning spokes
        drawWheel(ctx, cx + 12, cy + CAR_H + 1, 8, g.wheelAngle);
        drawWheel(ctx, cx + CAR_W - 12, cy + CAR_H + 1, 8, g.wheelAngle);

        // Neon underglow (boost)
        if (g.boost > 0) {
          ctx.shadowColor = '#ff4400';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = 'rgba(255,68,0,0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + 5, cy + CAR_H + 2);
          ctx.lineTo(cx + CAR_W - 5, cy + CAR_H + 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

    //   // ── SECRET ZONE hint ──
    //   if (!g.secretTriggered) {
    //     const stx = -30 - cam;
    //     if (stx > -250 && stx < W + 50) {
    //       // Subtle arrow pointing left
    //       ctx.globalAlpha = 0.15 + Math.sin(t * 0.06) * 0.08;
    //       ctx.fillStyle = '#ffaa00';
    //       ctx.font = '18px monospace';
    //       ctx.fillText('◀ ◀ ◀', stx - 50, GY - 20);
    //       ctx.globalAlpha = 1;
    //     }
    //   }

      // ── SECRET TUNNEL entrance ──
      if (g.secretTriggered && !g.inTunnel && g.carX < SECRET_X + 300) {
        const crx = TUNNEL_X - cam;
        // Glowing crack effect
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        const crackPoints = [[-25, 0], [-15, 18], [-5, 8], [5, 28], [15, 12], [25, 35], [35, 20], [45, 40], [55, 25], [65, 45]];
        for (let i = 0; i < crackPoints.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(crx + crackPoints[i][0], GY + crackPoints[i][1]);
          ctx.lineTo(crx + crackPoints[i + 1][0], GY + crackPoints[i + 1][1]);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Tunnel opening
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(crx + 20, GY + 10, 45, 30, 0, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(crx + 20, GY + 10, 45, 30, 0, 0, Math.PI);
        ctx.stroke();

        // Pulsing label
        ctx.globalAlpha = 0.6 + Math.sin(t * 0.08) * 0.4;
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#ff8800';
        ctx.textAlign = 'center';
        ctx.fillText('▼ SECRET TUNNEL ▼', crx + 20, GY + 50);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      // ── DEATH SCREEN ──
      if (!g.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);

        // Glitch lines
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `rgba(255,50,50,${0.05 + Math.random() * 0.08})`;
          const gy = Math.random() * H;
          ctx.fillRect(0, gy, W, 2);
        }

        ctx.textAlign = 'center';
        // Death cause text
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillText('DESTROYED', W / 2, H / 2 - 20);
        ctx.shadowBlur = 0;

        ctx.font = '11px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(`Respawning in ${Math.ceil(g.respawnTimer / 60)}...`, W / 2, H / 2 + 10);

        // Show hint after enough deaths
        if (g.deathCount >= 4) {
          ctx.font = '9px monospace';
          ctx.fillStyle = '#555';
          ctx.fillText(g.deathCount >= 8 ? '>> DRIVE LEFT FROM THE START <<' : 'Maybe there\'s another way...', W / 2, H / 2 + 35);
        }
        ctx.textAlign = 'left';
      }
    }

    // ── FLASH OVERLAY ──
    if (g.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,100,0,${g.flashAlpha * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── HUD ──
    drawHUD(ctx, g, t);

    // ── COUNTDOWN ──
    if (g.countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      const sec = Math.ceil(g.countdown / 60);
      ctx.font = 'bold 60px monospace';
      ctx.fillStyle = sec === 1 ? '#00ff88' : '#ffcc00';
      ctx.shadowColor = sec === 1 ? '#00ff88' : '#ffcc00';
      ctx.shadowBlur = 20;
      ctx.fillText(sec === 0 ? 'GO!' : String(sec), W / 2, H / 2 + 15);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#888';
      ctx.shadowBlur = 0;
      ctx.fillText('GET READY...', W / 2, H / 2 + 45);
      ctx.textAlign = 'left';
    }

    // ── SCANLINE OVERLAY ──
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < H; i += 3) {
      ctx.fillRect(0, i, W, 1);
    }

    ctx.restore();
    animRef.current = requestAnimationFrame(gameLoop);

    /* ── helper: kill player ── */
    function killPlayer(_cause: string) {
      if (!g.alive) return;
      g.alive = false;
      g.deathCount++;
      g.respawnTimer = 90;
      setDeaths(g.deathCount);
      addAttempt('race');
    }
  }, [addAttempt, completeLevel, respawn]);

  /* ── Draw wheel with spokes ── */
  function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
    // Tire
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Spokes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = angle + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
      ctx.stroke();
    }
    // Hubcap
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Draw HUD ── */
  function drawHUD(ctx: CanvasRenderingContext2D, g: typeof gameRef.current, t: number) {
    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 32);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(W, 32); ctx.stroke();

    ctx.font = 'bold 10px monospace';

    // Deaths with skull
    ctx.fillStyle = g.deathCount > 0 ? '#ff3355' : '#555';
    ctx.fillText(`☠ ${g.deathCount}`, 12, 21);

    // Speed
    const speed = Math.abs(g.velX);
    const speedPct = speed / BOOST_SPD;
    ctx.fillStyle = '#444';
    ctx.fillRect(80, 10, 80, 12);
    const speedCol = g.boost > 0 ? '#ff4400' : speed > MAX_SPD * 0.7 ? '#ffcc00' : '#00ccff';
    ctx.fillStyle = speedCol;
    ctx.fillRect(80, 10, 80 * speedPct, 12);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(80, 10, 80, 12);
    ctx.fillStyle = '#ddd';
    ctx.font = '8px monospace';
    ctx.fillText(`${Math.round(speed * 25)} km/h`, 84, 20);

    // Progress bar
    if (!g.inTunnel) {
      const prog = Math.max(0, Math.min(1, (g.carX - START_X) / (FINISH_X - START_X)));
      const barX = 190; const barW = 200;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, 12, barW, 8);
      // Track colored sections
      ctx.fillStyle = '#00ccff33';
      ctx.fillRect(barX, 12, barW * prog, 8);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(barX, 12, barW, 8);
      // Car dot
      ctx.fillStyle = '#00ccff';
      ctx.beginPath();
      ctx.arc(barX + barW * prog, 16, 4, 0, Math.PI * 2);
      ctx.fill();
      // Ghost dots
      for (const gh of g.ghosts) {
        if (!gh.alive) continue;
        const gProg = Math.max(0, Math.min(1, (gh.x - START_X) / (FINISH_X - START_X)));
        ctx.fillStyle = '#ffffff33';
        ctx.beginPath();
        ctx.arc(barX + barW * gProg, 16, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Obstacle markers
      ctx.fillStyle = '#ff333333';
      for (const obs of g.obstacles) {
        if (obs.type === 'monster') {
          const mProg = (obs.x - START_X) / (FINISH_X - START_X);
          ctx.fillRect(barX + barW * mProg - 1, 11, 3, 10);
        }
      }
      // Finish marker
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(barX + barW - 1, 10, 2, 12);
      // Percentage
      ctx.fillStyle = '#aaa';
      ctx.font = '8px monospace';
      ctx.fillText(`${Math.round(prog * 100)}%`, barX + barW + 6, 20);
    } else {
      // Tunnel progress
      ctx.fillStyle = '#ff8800';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`TUNNEL ${Math.round(g.tunnelProg * 100)}%`, 190, 21);
    }

    // Boost indicator
    const boostX = W - 120;
    ctx.fillStyle = g.boost > 0 ? '#ff4400' : '#2a2a2a';
    ctx.fillRect(boostX, 10, 50, 12);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(boostX, 10, 50, 12);
    if (g.boost > 0) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(boostX, 10, 50 * (g.boost / BOOST_DUR), 12);
    }
    ctx.fillStyle = g.boost > 0 ? '#fff' : '#555';
    ctx.font = '7px monospace';
    ctx.fillText('NITRO', boostX + 8, 19);

    // Controls hint (fades out)
    if (t < 300) {
      ctx.globalAlpha = Math.max(0, 1 - t / 300);
      ctx.fillStyle = '#555';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('A/D or ←/→ = Drive  |  W/↑ = Jump  |  SPACE = Nitro', W / 2, H - 8);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  /* ── Draw 3D-perspective tunnel ── */
  function drawTunnel(ctx: CanvasRenderingContext2D, progress: number, t: number) {
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, W, H);

    // 3D tunnel rings
    const centerX = W / 2;
    const centerY = H / 2;
    for (let i = 20; i >= 0; i--) {
      const depth = (i / 20 + progress * 3) % 1;
      const scale = 0.1 + depth * 2.5;
      const rw = 60 * scale;
      const rh = 40 * scale;
      const alpha = depth < 0.15 ? depth / 0.15 : depth > 0.85 ? (1 - depth) / 0.15 : 1;

      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = `hsl(${25 + i * 3}, 80%, ${20 + depth * 30}%)`;
      ctx.lineWidth = 1 + depth * 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, rw, rh, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Tunnel ambient lights
    for (let i = 0; i < 12; i++) {
      const lDepth = ((i / 12 + progress * 2) % 1);
      const lScale = 0.1 + lDepth * 2.5;
      const angle = (i * Math.PI * 2) / 6 + t * 0.02;
      const lx = centerX + Math.cos(angle) * 50 * lScale;
      const ly = centerY + Math.sin(angle) * 35 * lScale;
      const lr = 3 + lDepth * 5;
      ctx.fillStyle = `rgba(255,${100 + i * 10},0,${0.15 * (1 - lDepth)})`;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Car (centered, slight bob)
    const cx = centerX - CAR_W / 2;
    const cy = centerY + 20 + Math.sin(t * 0.08) * 3;

    // Car glow
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 15;

    const carGrad = ctx.createLinearGradient(cx, cy, cx, cy + CAR_H);
    carGrad.addColorStop(0, '#5599ff');
    carGrad.addColorStop(1, '#2255aa');
    ctx.fillStyle = carGrad;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + CAR_H);
    ctx.lineTo(cx, cy + 4);
    ctx.quadraticCurveTo(cx + 2, cy, cx + 8, cy);
    ctx.lineTo(cx + CAR_W - 4, cy);
    ctx.quadraticCurveTo(cx + CAR_W, cy, cx + CAR_W, cy + 4);
    ctx.lineTo(cx + CAR_W, cy + CAR_H);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Roof
    ctx.fillStyle = '#3377cc';
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 16, cy - 14);
    ctx.lineTo(cx + 42, cy - 14); ctx.lineTo(cx + 46, cy);
    ctx.closePath();
    ctx.fill();

    // Headlight beam
    ctx.fillStyle = 'rgba(255,238,136,0.05)';
    ctx.beginPath();
    ctx.moveTo(cx + CAR_W, cy + 2);
    ctx.lineTo(cx + CAR_W + 200, cy - 60);
    ctx.lineTo(cx + CAR_W + 200, cy + CAR_H + 60);
    ctx.closePath();
    ctx.fill();

    // Speed streaks
    for (let i = 0; i < 15; i++) {
      const sy = ((i * 35 + t * 8) % H);
      const sx = ((i * 137 + t * 12) % W);
      const sl = 20 + Math.random() * 40;
      ctx.strokeStyle = `rgba(255,${150 + i * 5},0,${0.08 + Math.random() * 0.06})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - sl, sy);
      ctx.stroke();
    }

    // HUD text
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff8800';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 10;
    ctx.fillText('SECRET UNDERGROUND PASSAGE', centerX, 35);
    ctx.shadowBlur = 0;

    // Progress
    ctx.font = '10px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Bypassing all obstacles... ${Math.round(progress * 100)}%`, centerX, H - 30);

    // Progress bar
    const pbW = 300;
    const pbX = centerX - pbW / 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(pbX, H - 18, pbW, 6);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(pbX, H - 18, pbW * progress, 6);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(pbX, H - 18, pbW, 6);

    ctx.textAlign = 'left';
  }

  /* ── Start loop ── */
  useEffect(() => {
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  return (
    <LevelLayout levelName="race" title="THE IMPOSSIBLE RACE">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 'calc(100vh - 50px)',
        padding: '20px', userSelect: 'none',
      }}>
        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: '14px',
          color: '#00ccff', marginBottom: '4px',
          textShadow: '0 0 10px rgba(0,200,255,0.5), 0 0 30px rgba(0,200,255,0.2)',
          letterSpacing: '2px',
        }}>
          race.impossible
        </div>
        <div style={{
          fontFamily: 'var(--font-terminal)', fontSize: '12px',
          color: '#444', marginBottom: '10px',
        }}>
          [CLASSIFIED] Track: HIGHWAY_NULL / Difficulty: IMPOSSIBLE
        </div>

        <p style={{
          fontFamily: 'var(--font-terminal)', fontSize: '14px',
          color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center',
          maxWidth: '500px', lineHeight: '1.5',
        }}>
          {phase === 'countdown'
            ? 'Engines warming up...'
            : inTunnel
            ? '> Secret passage activated. Routing through underground bypass...'
            : secretFound
            ? '> Ground collapse detected behind START. Investigate immediately!'
            : '> Reach the finish line. No one ever has.'}
        </p>

        {/* Death hint messages */}
        {deaths > 0 && !solved && phase === 'racing' && (
          <div style={{
            fontFamily: 'var(--font-pixel)', fontSize: '8px',
            color: deaths >= 5 ? '#ff3355' : '#555',
            marginBottom: '6px', textAlign: 'center',
          }}>
            {deaths < 3 && `${deaths} death${deaths > 1 ? 's' : ''}. Keep trying...`}
            {deaths >= 3 && deaths < 6 && 'The signs are trying to tell you something.'}
            {deaths >= 6 && deaths < 10 && '>> Why does everyone go RIGHT? <<'}
            {deaths >= 10 && '>> DRIVE. LEFT. FROM. THE. START. <<'}
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          style={{
            border: '2px solid #1a1a1a',
            borderRadius: '6px',
            maxWidth: '100%',
            background: '#020010',
            boxShadow: '0 0 30px rgba(0,200,255,0.08), inset 0 0 60px rgba(0,0,0,0.5)',
          }}
        />

        {/* Mobile controls */}
        <div style={{
          display: 'flex', gap: '8px', marginTop: '10px',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { label: '◀', key: 'left', color: '#555' },
            { label: '▲', key: 'up', color: '#00ccff' },
            { label: '▶', key: 'right', color: '#555' },
            { label: 'NITRO', key: 'space', color: '#ff6600' },
          ].map(btn => (
            <button
              key={btn.key}
              onPointerDown={() => { gameRef.current.keys[btn.key as 'left' | 'right' | 'up' | 'space'] = true; }}
              onPointerUp={() => { gameRef.current.keys[btn.key as 'left' | 'right' | 'up' | 'space'] = false; }}
              onPointerLeave={() => { gameRef.current.keys[btn.key as 'left' | 'right' | 'up' | 'space'] = false; }}
              style={{
                fontFamily: 'var(--font-pixel)', fontSize: btn.key === 'space' ? '8px' : '12px',
                padding: btn.key === 'space' ? '12px 20px' : '12px 16px',
                background: '#111',
                color: btn.color,
                border: `1px solid ${btn.color}33`,
                borderRadius: '6px',
                cursor: 'pointer', touchAction: 'none', userSelect: 'none',
                transition: 'all 0.1s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* NPC hint */}
        {deaths >= 5 && !solved && !inTunnel && phase === 'racing' && (
          <div style={{
            marginTop: '12px', padding: '10px 16px',
            fontFamily: 'var(--font-terminal)', fontSize: '13px',
            color: '#666', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid #1a1a1a', borderRadius: '4px',
            maxWidth: '460px', lineHeight: '1.6',
          }}>
            <span style={{ color: '#444' }}>GHOST_RACER_01:</span>{' '}
            &quot;I tried a thousand times going right. Every single time, the Destroyer wins.
            Maybe the answer isn&apos;t at the finish line...&quot;
          </div>
        )}

        {/* Victory */}
        {solved && (
          <MessageBox
            message="SECRET PATH FOUND. The race was never meant to be won by going forward. While every ghost racer rushed right to their doom, you questioned the rules themselves. Level complete."
            type="success"
            onClose={() => router.push('/hub')}
          />
        )}
      </div>
    </LevelLayout>
  );
}
