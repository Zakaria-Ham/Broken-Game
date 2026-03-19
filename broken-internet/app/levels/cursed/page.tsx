'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LevelLayout from '../../components/LevelLayout';
import MessageBox from '../../components/MessageBox';
import { useGame } from '../../context/GameContext';

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const W = 900;
const H = 500;
const GRAVITY = 0.5;
const PLAYER_W = 28;
const PLAYER_H = 44;
const PLAYER_SPEED = 3.5;
const JUMP_VEL = -10.5;
const DASH_SPEED = 12;
const DASH_DUR = 8;
const DASH_CD = 40;
const PROJECTILE_SPD = 8;
const PROJECTILE_CD = 20;
const PUNCH_RANGE = 42;
const PUNCH_CD = 12;
const PUNCH_DMG = 12;
const PROJ_DMG = 8;
const DOMAIN_DURATION = 300; // 5s at 60fps
const DOMAIN_DMG_MULT = 2.5;
const MAX_HP = 100;
const HIT_DMG = 25;
const INVULN_TIME = 60; // 1 second i-frames after hit

// Level sections (world X)
const BOSS_ARENA_X = 2600;
const LEVEL_END = 3800;

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface Platform { x: number; y: number; w: number; h: number; breakable?: boolean; broken?: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Projectile { x: number; y: number; vx: number; vy: number; friendly: boolean; dmg: number; life: number; }
interface EnergyOrb { x: number; y: number; collected: boolean; bobOffset: number; }

interface Enemy {
  type: 'small' | 'flying' | 'heavy';
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  alive: boolean;
  timer: number;
  facingLeft: boolean;
  shootTimer: number;
}

interface Boss {
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  alive: boolean;
  phase: 'idle' | 'slam' | 'shoot' | 'dash' | 'reviving' | 'dead' | 'truly_dead';
  timer: number;
  facingLeft: boolean;
  reviveCount: number;
  reviveSymbolTimer: number;
  symbolShattered: boolean;
  slamWarningTimer: number;
  invuln: boolean;
}

type GamePhase = 'playing' | 'boss_intro' | 'victory' | 'game_over';

/* ═══════════════════════════════════════════════
   LEVEL DATA
   ═══════════════════════════════════════════════ */
const GROUND_Y = 400;

function createPlatforms(): Platform[] {
  return [
    // ── ZONE 1: Tutorial area (x: 0–500) ──
    // Solid ground to learn movement
    { x: -100, y: GROUND_Y, w: 650, h: 120 },
    // Small step-up platform to teach jumping
    { x: 450, y: 360, w: 80, h: 16 },

    // ── ZONE 2: Platforming (x: 500–1200) ──
    // Easy gap → medium gap → slightly tricky
    { x: 580, y: 350, w: 100, h: 16 },
    { x: 730, y: 320, w: 90, h: 16 },
    { x: 870, y: 290, w: 100, h: 16 },
    { x: 1000, y: 330, w: 110, h: 16 },
    // Landing ground
    { x: 1100, y: GROUND_Y, w: 200, h: 120 },

    // ── ZONE 3: Combat training (x: 1100–1700) ──
    // Ground for first fights
    { x: 1100, y: GROUND_Y, w: 650, h: 120 },
    // Elevated platform for flying enemy encounter
    { x: 1350, y: 310, w: 120, h: 16 },
    { x: 1550, y: 280, w: 100, h: 16 },

    // ── ZONE 4: Energy orb collection (x: 1700–2400) ──
    { x: 1700, y: GROUND_Y, w: 500, h: 120 },
    // Platforms with orbs above
    { x: 1800, y: 320, w: 80, h: 16 },
    { x: 1950, y: 290, w: 80, h: 16 },
    { x: 2100, y: 310, w: 80, h: 16 },
    // Breakable platform (heavy enemy demo)
    { x: 2000, y: 360, w: 80, h: 16, breakable: true },

    // ── ZONE 5: Bridge to boss (x: 2200–2600) ──
    { x: 2200, y: GROUND_Y, w: 500, h: 120 },

    // ── ZONE 6: Boss arena (x: 2600–3600) ──
    { x: 2600, y: GROUND_Y, w: 1000, h: 120 },
    // Arena walls — top only, gap underneath to walk in
    { x: 2580, y: 80, w: 30, h: 220 },
    { x: 3590, y: 80, w: 30, h: 220 },
    // In-arena elevated platforms for dodging
    { x: 2800, y: 310, w: 100, h: 16 },
    { x: 3100, y: 280, w: 100, h: 16 },
    { x: 3400, y: 310, w: 100, h: 16 },
  ];
}

function createEnemies(): Enemy[] {
  return [
    // Zone 3 — combat training, gradual difficulty
    // 1) A single small curse (teaches melee)
    { type: 'small', x: 1200, y: 360, w: 22, h: 22, vx: 0, vy: 0, hp: 20, maxHp: 20, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
    // 2) Another small curse + a flying curse (teaches projectile)
    { type: 'small', x: 1400, y: 360, w: 22, h: 22, vx: 0, vy: 0, hp: 20, maxHp: 20, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
    { type: 'flying', x: 1500, y: 210, w: 26, h: 26, vx: 0, vy: 0, hp: 15, maxHp: 15, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
    // 3) Flying duo (teaches dealing with multiple enemies)
    { type: 'flying', x: 1600, y: 190, w: 26, h: 26, vx: 0, vy: 0, hp: 15, maxHp: 15, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },

    // Zone 4 — heavy enemy introduction
    { type: 'heavy', x: 1900, y: 350, w: 36, h: 44, vx: 0, vy: 0, hp: 60, maxHp: 60, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
    { type: 'small', x: 2050, y: 360, w: 22, h: 22, vx: 0, vy: 0, hp: 20, maxHp: 20, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },

    // Zone 5 — bridge guards
    { type: 'flying', x: 2350, y: 200, w: 26, h: 26, vx: 0, vy: 0, hp: 15, maxHp: 15, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
    { type: 'small', x: 2450, y: 360, w: 22, h: 22, vx: 0, vy: 0, hp: 20, maxHp: 20, alive: true, timer: 0, facingLeft: false, shootTimer: 0 },
  ];
}

function createOrbs(): EnergyOrb[] {
  return [
    // Zone 2 — breadcrumb orbs on platforms (reward exploration)
    { x: 740, y: 280, collected: false, bobOffset: 0 },
    { x: 1010, y: 290, collected: false, bobOffset: Math.PI * 0.5 },

    // Zone 3 — reward from fights
    { x: 1350, y: 270, collected: false, bobOffset: Math.PI },
    { x: 1560, y: 240, collected: false, bobOffset: Math.PI * 0.3 },

    // Zone 4 — main orb cluster (teaches that energy matters)
    { x: 1810, y: 280, collected: false, bobOffset: 0 },
    { x: 1850, y: 370, collected: false, bobOffset: Math.PI * 0.4 },
    { x: 1960, y: 252, collected: false, bobOffset: Math.PI * 0.8 },
    { x: 2060, y: 370, collected: false, bobOffset: Math.PI * 1.2 },
    { x: 2110, y: 270, collected: false, bobOffset: Math.PI * 0.6 },

    // Zone 5 — last few before boss
    { x: 2300, y: 370, collected: false, bobOffset: Math.PI * 0.2 },
    { x: 2500, y: 370, collected: false, bobOffset: Math.PI * 0.9 },

    // Zone 6 — inside arena (can refill during boss fight)
    { x: 2750, y: 370, collected: false, bobOffset: 0 },
    { x: 3300, y: 370, collected: false, bobOffset: Math.PI },
  ];
}

function createBoss(): Boss {
  return {
    x: 3100, y: GROUND_Y - 64, w: 56, h: 64,
    hp: 180, maxHp: 180,
    alive: true,
    phase: 'idle',
    timer: 0,
    facingLeft: true,
    reviveCount: 0,
    reviveSymbolTimer: 0,
    symbolShattered: false,
    slamWarningTimer: 0,
    invuln: false,
  };
}

/* ═══════════════════════════════════════════════
   DRAWING HELPERS
   ═══════════════════════════════════════════════ */

function drawCursedSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, shatter: boolean) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  if (shatter) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = r * 0.5 * (1 - alpha);
      ctx.save();
      ctx.translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
      ctx.rotate(angle + alpha * 3);
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 0);
      ctx.lineTo(-2, 4);
      ctx.closePath();
      ctx.fillStyle = `rgba(180, 60, 255, ${alpha})`;
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.strokeStyle = `rgba(180, 60, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0); ctx.lineTo(r * 0.6, 0);
    ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.2, a - 0.5, a + 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number) {
  ctx.fillStyle = '#220022';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ratio > 0.5 ? '#44cc44' : ratio > 0.25 ? '#ccaa00' : '#ff3344';
  ctx.fillRect(x, y, w * Math.max(0, ratio), h);
}

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function CursedDomainLevel() {
  const router = useRouter();
  const { completeLevel, addAttempt, unlockTag, gameState } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const restartRef = useRef<(() => void) | null>(null);
  const smallDeathCountRef = useRef(0);

  const initGame = useCallback(() => {
    const bgStars = Array.from({ length: 60 }, () => ({
      x: Math.random() * (LEVEL_END + 400),
      y: Math.random() * H * 0.7,
      s: Math.random() * 2 + 0.5,
      b: Math.random() * 0.5 + 0.1,
    }));
    const bgSymbols = Array.from({ length: 12 }, () => ({
      x: Math.random() * (LEVEL_END + 400),
      y: Math.random() * H * 0.5 + 30,
      r: Math.random() * 15 + 8,
      a: Math.random() * 0.12 + 0.03,
      speed: Math.random() * 0.003 + 0.001,
    }));

    return {
      running: true, animFrame: 0,
      keys: new Set<string>(), mouseDown: false,
      // Player
      px: 60, py: GROUND_Y - PLAYER_H - 4, pvx: 0, pvy: 0,
      onGround: true, facingLeft: false,
      dashTimer: 0, dashCd: 0, dashDir: 1,
      punchTimer: 0, punchCd: 0, projCd: 0,
      hp: MAX_HP, invulnTimer: 0,
      // Domain
      energy: 0, maxEnergy: 100,
      domainActive: false, domainTimer: 0, domainCooldown: 0,
      // World
      cameraX: 0,
      platforms: createPlatforms(),
      enemies: createEnemies(),
      orbs: createOrbs(),
      projectiles: [] as Projectile[],
      particles: [] as Particle[],
      boss: createBoss(),
      phase: 'playing' as GamePhase,
      bossIntroTimer: 0, victoryTimer: 0,
      bossReached: false,
      // Visual
      frameCount: 0,
      shakeTimer: 0, shakeIntensity: 0,
      whisperTimer: 0,
      stoneTabletVisible: false,
      bgStars, bgSymbols,
      // Game over
      gameOverTimer: 0,
      // Zone text
      zoneText: '' as string,
      zoneTextTimer: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let g = initGame();

    /* ── Input ── */
    const onKeyDown = (e: KeyboardEvent) => {
      g.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();

      // Game over restart
      if (g.phase === 'game_over' && e.key.toLowerCase() === 'r') {
        restartGame();
        return;
      }

      if (g.phase !== 'playing' && g.phase !== 'boss_intro') return;

      // Domain Expansion
      if (e.key.toLowerCase() === 'e' && g.energy >= g.maxEnergy && !g.domainActive && g.domainCooldown <= 0 && g.hp > 0) {
        g.domainActive = true;
        g.domainTimer = DOMAIN_DURATION;
        g.energy = 0;
        g.shakeTimer = 20;
        g.shakeIntensity = 6;
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          g.particles.push({
            x: g.px + PLAYER_W / 2, y: g.py + PLAYER_H / 2,
            vx: Math.cos(angle) * (3 + Math.random() * 4),
            vy: Math.sin(angle) * (3 + Math.random() * 4),
            life: 40 + Math.random() * 20, maxLife: 60,
            color: `hsl(${270 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`,
            size: 3 + Math.random() * 4,
          });
        }
      }
      // Punch
      if ((e.key.toLowerCase() === 'j') && g.punchCd <= 0 && g.hp > 0) triggerPunch();
      // Projectile
      if (e.key.toLowerCase() === 'k' && g.projCd <= 0 && g.hp > 0) triggerProjectile();
    };
    const onKeyUp = (e: KeyboardEvent) => g.keys.delete(e.key.toLowerCase());
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && g.punchCd <= 0 && g.hp > 0 && g.phase === 'playing') triggerPunch();
    };

    function restartGame() {
      g.running = false;
      cancelAnimationFrame(g.animFrame);
      g = initGame();
      setShowGameOver(false);
      loop();
    }
    restartRef.current = restartGame;

    function triggerPunch() {
      g.punchTimer = 10;
      g.punchCd = PUNCH_CD;
      const dir = g.facingLeft ? -1 : 1;
      for (let i = 0; i < 6; i++) {
        g.particles.push({
          x: g.px + PLAYER_W / 2 + dir * 20,
          y: g.py + PLAYER_H / 2 + (Math.random() - 0.5) * 16,
          vx: dir * (2 + Math.random() * 3), vy: (Math.random() - 0.5) * 2,
          life: 10 + Math.random() * 10, maxLife: 20,
          color: g.domainActive ? '#d040ff' : '#8844cc',
          size: 2 + Math.random() * 3,
        });
      }
    }

    function triggerProjectile() {
      g.projCd = PROJECTILE_CD;
      const dir = g.facingLeft ? -1 : 1;
      const dmg = g.domainActive ? PROJ_DMG * DOMAIN_DMG_MULT : PROJ_DMG;
      g.projectiles.push({
        x: g.px + PLAYER_W / 2 + dir * 16, y: g.py + PLAYER_H / 2,
        vx: dir * PROJECTILE_SPD, vy: 0,
        friendly: true, dmg, life: 80,
      });
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    /* ── Collision ── */
    function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    /* ── Damage enemy ── */
    function damageEnemy(e: Enemy, dmg: number) {
      e.hp -= dmg;
      if (e.hp <= 0) {
        e.alive = false;
        g.energy = Math.min(g.maxEnergy, g.energy + 10);
        for (let i = 0; i < 12; i++) {
          g.particles.push({
            x: e.x + e.w / 2, y: e.y + e.h / 2,
            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
            life: 20 + Math.random() * 20, maxLife: 40,
            color: '#aa44ff', size: 3 + Math.random() * 3,
          });
        }
      }
    }

    /* ── Damage boss ── */
    function damageBoss(dmg: number) {
      const bp = g.boss.phase as string;
      if (g.boss.invuln || bp === 'reviving' || bp === 'dead' || bp === 'truly_dead') return;
      g.boss.hp -= dmg;
      g.shakeTimer = 5; g.shakeIntensity = 3;
      if (g.boss.hp <= 0) {
        g.boss.hp = 0;
        if (g.domainActive) {
          // TRUE KILL
          g.boss.phase = 'truly_dead';
          g.boss.symbolShattered = true;
          g.boss.timer = 120;
          g.shakeTimer = 40; g.shakeIntensity = 8;
          for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            g.particles.push({
              x: g.boss.x + g.boss.w / 2, y: g.boss.y + g.boss.h / 2,
              vx: Math.cos(angle) * (2 + Math.random() * 6), vy: Math.sin(angle) * (2 + Math.random() * 6),
              life: 40 + Math.random() * 40, maxLife: 80,
              color: `hsl(${270 + Math.random() * 40}, 100%, ${60 + Math.random() * 30}%)`,
              size: 3 + Math.random() * 5,
            });
          }
        } else {
          // FAKE DEATH → revive
          g.boss.phase = 'reviving';
          g.boss.timer = 180;
          g.boss.invuln = true;
          g.boss.reviveCount++;
          g.boss.reviveSymbolTimer = 60;
          g.whisperTimer = 90;
          g.shakeTimer = 20; g.shakeIntensity = 5;
          addAttempt('cursed');
        }
      }
    }

    /* ── Player takes damage ── */
    function playerHit(source: 'small' | 'other' = 'other') {
      if (g.invulnTimer > 0 || g.hp <= 0) return;
      g.hp -= HIT_DMG;
      if (g.hp < 0) g.hp = 0;
      g.invulnTimer = INVULN_TIME;
      g.shakeTimer = 10; g.shakeIntensity = 5;
      // Hit particles
      for (let i = 0; i < 10; i++) {
        g.particles.push({
          x: g.px + PLAYER_W / 2, y: g.py + PLAYER_H / 2,
          vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
          life: 15 + Math.random() * 10, maxLife: 25,
          color: '#ff3366', size: 2 + Math.random() * 3,
        });
      }
      if (g.hp <= 0) {
        if (source === 'small') {
          smallDeathCountRef.current += 1;
          if (smallDeathCountRef.current >= 5) {
            void unlockTag('cursed');
          }
        }
        // GAME OVER — restart from beginning
        g.phase = 'game_over';
        g.gameOverTimer = 0;
        addAttempt('cursed');
      }
    }

    /* ══════════════════════════════════════
       GAME LOOP
       ══════════════════════════════════════ */
    function loop() {
      if (!g.running) return;
      g.animFrame = requestAnimationFrame(loop);
      g.frameCount++;
      update();
      draw(ctx!);
    }

    function update() {
      // Game over screen
      if (g.phase === 'game_over') {
        g.gameOverTimer++;
        if (g.gameOverTimer >= 90 && !showGameOver) setShowGameOver(true);
        updateParticles();
        return;
      }

      // Victory
      if (g.phase === 'victory') {
        g.victoryTimer++;
        if (g.victoryTimer >= 90 && !showVictory) setShowVictory(true);
        updateParticles();
        return;
      }

      // Boss truly dead transition
      const bp = g.boss.phase as string;
      if (bp === 'truly_dead') {
        g.boss.timer--;
        if (g.frameCount % 2 === 0) {
          g.particles.push({
            x: g.boss.x + Math.random() * g.boss.w, y: g.boss.y + Math.random() * g.boss.h,
            vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3,
            life: 30 + Math.random() * 20, maxLife: 50,
            color: `rgba(${150 + Math.random() * 100}, 40, 255, 0.8)`, size: 2 + Math.random() * 3,
          });
        }
        if (g.boss.timer <= 0) {
          g.boss.alive = false;
          g.phase = 'victory';
          g.victoryTimer = 0;
        }
        updateParticles();
        updateCamera();
        return;
      }

      // Boss reviving
      if (bp === 'reviving') {
        g.boss.timer--;
        g.boss.reviveSymbolTimer = Math.max(0, g.boss.reviveSymbolTimer - 1);
        if (g.frameCount % 3 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 60;
          g.particles.push({
            x: g.boss.x + g.boss.w / 2 + Math.cos(angle) * dist,
            y: g.boss.y + g.boss.h / 2 + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * 2, vy: -Math.sin(angle) * 2,
            life: 30, maxLife: 30, color: '#b040ff', size: 2 + Math.random() * 2,
          });
        }
        if (g.boss.timer <= 0) {
          g.boss.hp = g.boss.maxHp;
          g.boss.phase = 'idle';
          g.boss.timer = 60;
          g.boss.invuln = false;
          g.shakeTimer = 15; g.shakeIntensity = 6;
        }
      }

      /* ── Zone text triggers ── */
      if (g.zoneTextTimer > 0) g.zoneTextTimer--;
      if (g.px > 500 && g.px < 520 && g.zoneText !== 'Cursed Pathways') {
        g.zoneText = 'Cursed Pathways';
        g.zoneTextTimer = 120;
      }
      if (g.px > 1100 && g.px < 1120 && g.zoneText !== 'Den of Curses') {
        g.zoneText = 'Den of Curses';
        g.zoneTextTimer = 120;
      }
      if (g.px > 1700 && g.px < 1720 && g.zoneText !== 'Cursed Energy Nexus') {
        g.zoneText = 'Cursed Energy Nexus';
        g.zoneTextTimer = 120;
      }
      if (g.px > BOSS_ARENA_X + 50 && g.px < BOSS_ARENA_X + 70 && g.zoneText !== 'Cursed Spirit\'s Lair') {
        g.zoneText = 'Cursed Spirit\'s Lair';
        g.zoneTextTimer = 150;
      }

      /* ── Player movement ── */
      let moveX = 0;
      if (g.keys.has('arrowleft') || g.keys.has('a')) { moveX = -1; g.facingLeft = true; }
      if (g.keys.has('arrowright') || g.keys.has('d')) { moveX = 1; g.facingLeft = false; }

      // Dash
      if (g.dashTimer > 0) {
        g.pvx = g.dashDir * DASH_SPEED;
        g.dashTimer--;
      } else {
        g.pvx = moveX * PLAYER_SPEED;
      }
      if (g.keys.has('shift') && g.dashCd <= 0 && moveX !== 0 && g.dashTimer <= 0) {
        g.dashTimer = DASH_DUR; g.dashCd = DASH_CD; g.dashDir = moveX;
        g.invulnTimer = Math.max(g.invulnTimer, DASH_DUR);
        for (let i = 0; i < 8; i++) {
          g.particles.push({
            x: g.px + PLAYER_W / 2, y: g.py + PLAYER_H / 2 + (Math.random() - 0.5) * PLAYER_H,
            vx: -moveX * (1 + Math.random() * 3), vy: (Math.random() - 0.5) * 2,
            life: 10 + Math.random() * 8, maxLife: 18,
            color: '#7733cc', size: 2 + Math.random() * 2,
          });
        }
      }

      // Jump
      if ((g.keys.has(' ') || g.keys.has('arrowup') || g.keys.has('w')) && g.onGround) {
        g.pvy = JUMP_VEL; g.onGround = false;
      }

      // Gravity
      g.pvy += GRAVITY;

      // Move X + collisions
      g.px += g.pvx;
      if (g.px < -20) g.px = -20; // Left boundary
      for (const p of g.platforms) {
        if (p.broken) continue;
        if (rectsOverlap(g.px, g.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
          if (g.pvx > 0) g.px = p.x - PLAYER_W;
          else if (g.pvx < 0) g.px = p.x + p.w;
        }
      }

      // Move Y + collisions
      g.py += g.pvy;
      g.onGround = false;
      for (const p of g.platforms) {
        if (p.broken) continue;
        if (rectsOverlap(g.px, g.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
          if (g.pvy > 0) { g.py = p.y - PLAYER_H; g.pvy = 0; g.onGround = true; }
          else if (g.pvy < 0) { g.py = p.y + p.h; g.pvy = 0; }
        }
      }

      // Fall off map — take damage and reset to last safe ground
      if (g.py > H + 50) {
        g.py = GROUND_Y - PLAYER_H - 10;
        g.px = Math.max(60, g.px - 200); // Push back a bit
        g.pvy = 0; g.pvx = 0;
        playerHit();
      }

      // Cooldowns
      if (g.dashCd > 0) g.dashCd--;
      if (g.punchCd > 0) g.punchCd--;
      if (g.projCd > 0) g.projCd--;
      if (g.invulnTimer > 0) g.invulnTimer--;
      if (g.shakeTimer > 0) g.shakeTimer--;
      if (g.whisperTimer > 0) g.whisperTimer--;
      if (g.domainCooldown > 0) g.domainCooldown--;

      // Domain timer
      if (g.domainActive) {
        g.domainTimer--;
        if (g.frameCount % 4 === 0) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 40;
          g.particles.push({
            x: g.px + PLAYER_W / 2 + Math.cos(angle) * dist,
            y: g.py + PLAYER_H / 2 + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * 0.5, vy: -Math.sin(angle) * 0.5,
            life: 20 + Math.random() * 10, maxLife: 30,
            color: `hsl(${270 + Math.random() * 20}, 100%, ${60 + Math.random() * 20}%)`,
            size: 1 + Math.random() * 2,
          });
        }
        if (g.domainTimer <= 0) { g.domainActive = false; g.domainCooldown = 300; }
      }

      // Punch detection
      if (g.punchTimer > 0) {
        g.punchTimer--;
        const dir = g.facingLeft ? -1 : 1;
        const fX = g.px + PLAYER_W / 2 + dir * (PLAYER_W / 2);
        const fY = g.py + PLAYER_H / 2;
        const dmg = g.domainActive ? PUNCH_DMG * DOMAIN_DMG_MULT : PUNCH_DMG;
        for (const e of g.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x + e.w / 2 - fX, e.y + e.h / 2 - fY) < PUNCH_RANGE) damageEnemy(e, dmg);
        }
        if (g.boss.alive && g.bossReached) {
          if (Math.hypot(g.boss.x + g.boss.w / 2 - fX, g.boss.y + g.boss.h / 2 - fY) < PUNCH_RANGE + 20) damageBoss(dmg);
        }
      }

      // Update projectiles
      for (let i = g.projectiles.length - 1; i >= 0; i--) {
        const p = g.projectiles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (g.frameCount % 2 === 0) {
          g.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 8, maxLife: 8, color: p.friendly ? '#b040ff' : '#ff4466', size: 2 });
        }
        if (p.life <= 0) { g.projectiles.splice(i, 1); continue; }
        let removed = false;
        if (p.friendly) {
          for (const e of g.enemies) {
            if (!e.alive) continue;
            if (rectsOverlap(p.x - 4, p.y - 4, 8, 8, e.x, e.y, e.w, e.h)) {
              damageEnemy(e, p.dmg); g.projectiles.splice(i, 1); removed = true; break;
            }
          }
          if (!removed && g.boss.alive && g.bossReached) {
            if (rectsOverlap(p.x - 4, p.y - 4, 8, 8, g.boss.x, g.boss.y, g.boss.w, g.boss.h)) {
              damageBoss(p.dmg); g.projectiles.splice(i, 1); removed = true;
            }
          }
        } else {
          if (rectsOverlap(p.x - 4, p.y - 4, 8, 8, g.px, g.py, PLAYER_W, PLAYER_H)) {
            playerHit(); g.projectiles.splice(i, 1); removed = true;
          }
        }
        if (!removed) {
          for (const pl of g.platforms) {
            if (pl.broken) continue;
            if (rectsOverlap(p.x - 4, p.y - 4, 8, 8, pl.x, pl.y, pl.w, pl.h)) {
              g.projectiles.splice(i, 1); break;
            }
          }
        }
      }

      // Orbs
      for (const orb of g.orbs) {
        if (orb.collected) continue;
        orb.bobOffset += 0.03;
        const orbY = orb.y + Math.sin(orb.bobOffset) * 6;
        if (rectsOverlap(g.px, g.py, PLAYER_W, PLAYER_H, orb.x - 10, orbY - 10, 20, 20)) {
          orb.collected = true;
          g.energy = Math.min(g.maxEnergy, g.energy + 10);
          for (let i = 0; i < 8; i++) {
            g.particles.push({ x: orb.x, y: orbY, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1, life: 15 + Math.random() * 10, maxLife: 25, color: '#cc66ff', size: 2 + Math.random() * 2 });
          }
        }
      }

      // Enemies
      for (const e of g.enemies) {
        if (!e.alive) continue;
        e.timer++;
        const dist = Math.hypot((e.x + e.w / 2) - (g.px + PLAYER_W / 2), (e.y + e.h / 2) - (g.py + PLAYER_H / 2));
        if (Math.abs(e.x - g.cameraX) > W + 200) continue;
        e.facingLeft = g.px < e.x;

        if (e.type === 'small') {
          if (dist < 300 && e.timer % 70 === 0) {
            e.vx = (g.px > e.x ? 1 : -1) * 2.8;
            e.vy = -7;
          }
          e.vy += GRAVITY; e.x += e.vx; e.y += e.vy; e.vx *= 0.95;
          for (const p of g.platforms) {
            if (p.broken) continue;
            if (rectsOverlap(e.x, e.y, e.w, e.h, p.x, p.y, p.w, p.h) && e.vy > 0) { e.y = p.y - e.h; e.vy = 0; }
          }
          if (rectsOverlap(e.x, e.y, e.w, e.h, g.px, g.py, PLAYER_W, PLAYER_H)) playerHit('small');
        }

        if (e.type === 'flying') {
          e.y += Math.sin(e.timer * 0.05) * 0.5;
          if (dist < 400) e.x += (g.px > e.x ? 0.4 : -0.4);
          e.shootTimer++;
          if (e.shootTimer >= 100 && dist < 500) {
            e.shootTimer = 0;
            const angle = Math.atan2(g.py - e.y, g.px - e.x);
            g.projectiles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, friendly: false, dmg: 1, life: 120 });
          }
          if (rectsOverlap(e.x, e.y, e.w, e.h, g.px, g.py, PLAYER_W, PLAYER_H)) playerHit();
        }

        if (e.type === 'heavy') {
          if (dist < 350) e.vx = (g.px > e.x ? 0.7 : -0.7);
          else e.vx = 0;
          e.vy += GRAVITY; e.x += e.vx; e.y += e.vy;
          for (const p of g.platforms) {
            if (p.broken) continue;
            if (rectsOverlap(e.x, e.y, e.w, e.h, p.x, p.y, p.w, p.h) && e.vy > 0) { e.y = p.y - e.h; e.vy = 0; }
          }
          // Break breakable platforms
          for (const p of g.platforms) {
            if (p.breakable && !p.broken && rectsOverlap(e.x, e.y + e.h, e.w, 4, p.x, p.y, p.w, p.h)) {
              if (e.timer % 80 === 0) {
                p.broken = true;
                for (let i = 0; i < 10; i++) g.particles.push({ x: p.x + Math.random() * p.w, y: p.y, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3, life: 20 + Math.random() * 15, maxLife: 35, color: '#666', size: 3 + Math.random() * 3 });
              }
            }
          }
          if (rectsOverlap(e.x, e.y, e.w, e.h, g.px, g.py, PLAYER_W, PLAYER_H)) playerHit();
        }
      }

      // Boss AI
      const bossPhase = g.boss.phase as string;
      if (g.boss.alive && g.bossReached && bossPhase !== 'reviving' && bossPhase !== 'truly_dead') {
        const bDist = Math.hypot((g.boss.x + g.boss.w / 2) - (g.px + PLAYER_W / 2), (g.boss.y + g.boss.h / 2) - (g.py + PLAYER_H / 2));
        g.boss.facingLeft = g.px < g.boss.x;
        g.boss.timer++;

        if (g.boss.phase === 'idle') {
          g.boss.x += (g.px > g.boss.x ? 1 : -1) * 1.2;
          if (g.boss.timer >= 80) {
            const roll = Math.random();
            if (roll < 0.35) { g.boss.phase = 'slam'; g.boss.timer = 0; g.boss.slamWarningTimer = 40; }
            else if (roll < 0.7) { g.boss.phase = 'shoot'; g.boss.timer = 0; }
            else { g.boss.phase = 'dash'; g.boss.timer = 0; }
          }
        }
        if (g.boss.phase === 'slam') {
          if (g.boss.slamWarningTimer > 0) { g.boss.slamWarningTimer--; }
          else if (g.boss.timer === 1) {
            g.shakeTimer = 15; g.shakeIntensity = 6;
            for (let i = 0; i < 20; i++) g.particles.push({ x: g.boss.x + g.boss.w / 2 + (Math.random() - 0.5) * 120, y: g.boss.y + g.boss.h, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 4, life: 15 + Math.random() * 10, maxLife: 25, color: '#8833aa', size: 3 + Math.random() * 4 });
            if (bDist < 140 && g.py + PLAYER_H > g.boss.y + g.boss.h - 20) playerHit();
          }
          if (g.boss.timer >= 60) { g.boss.phase = 'idle'; g.boss.timer = 0; }
        }
        if (g.boss.phase === 'shoot') {
          if (g.boss.timer === 20 || g.boss.timer === 40 || g.boss.timer === 60) {
            const angle = Math.atan2(g.py - g.boss.y, g.px - g.boss.x);
            g.projectiles.push({ x: g.boss.x + g.boss.w / 2, y: g.boss.y + g.boss.h / 2, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, friendly: false, dmg: 1, life: 100 });
          }
          if (g.boss.timer >= 80) { g.boss.phase = 'idle'; g.boss.timer = 0; }
        }
        if (g.boss.phase === 'dash') {
          if (g.boss.timer < 15) {
            g.boss.x += (g.px > g.boss.x ? 1 : -1) * 9;
            g.particles.push({ x: g.boss.x + g.boss.w / 2, y: g.boss.y + g.boss.h / 2, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 10, maxLife: 10, color: '#6622aa', size: 4 + Math.random() * 3 });
            if (rectsOverlap(g.boss.x, g.boss.y, g.boss.w, g.boss.h, g.px, g.py, PLAYER_W, PLAYER_H)) playerHit();
          }
          g.boss.x = Math.max(BOSS_ARENA_X + 40, Math.min(BOSS_ARENA_X + 950, g.boss.x));
          if (g.boss.timer >= 40) { g.boss.phase = 'idle'; g.boss.timer = 0; }
        }
        g.boss.y = GROUND_Y - g.boss.h;
      }

      // Boss arena trigger
      if (!g.bossReached && g.px > BOSS_ARENA_X + 100) g.bossReached = true;

      // Stone tablet visibility
      g.stoneTabletVisible = Math.abs(g.px - (BOSS_ARENA_X + 30)) < 80 && g.py > 200;

      updateParticles();
      updateCamera();
    }

    function updateParticles() {
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i]; p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    }

    function updateCamera() {
      g.cameraX += ((g.px - W / 3) - g.cameraX) * 0.08;
    }

    /* ══════════════════════════════════════
       DRAW
       ══════════════════════════════════════ */
    function draw(ctx: CanvasRenderingContext2D) {
      const cx = g.cameraX;
      ctx.save();

      // Screen shake
      if (g.shakeTimer > 0) {
        const s = g.shakeIntensity * (g.shakeTimer / 20);
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }

      // BG
      ctx.fillStyle = g.domainActive ? '#08001a' : '#0a0812';
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const star of g.bgStars) {
        const sx = star.x - cx * 0.1;
        if (sx < -10 || sx > W + 10) continue;
        ctx.globalAlpha = Math.max(0, Math.min(1, star.b + Math.sin(g.frameCount * 0.02 + star.x) * 0.1));
        ctx.fillStyle = '#8866cc';
        ctx.fillRect(sx, star.y, star.s, star.s);
      }
      ctx.globalAlpha = 1;

      // BG cursed symbols
      for (const sym of g.bgSymbols) {
        const sx = sym.x - cx * 0.15;
        if (sx < -30 || sx > W + 30) continue;
        drawCursedSymbol(ctx, sx, sym.y, sym.r, sym.a + Math.sin(g.frameCount * sym.speed) * 0.01, false);
      }

      // Shadow spirits
      for (let i = 0; i < 3; i++) {
        const sx = (i * 1400 + 400) - cx * 0.2;
        if (sx < -40 || sx > W + 40) continue;
        const sy = 200 + Math.sin(g.frameCount * 0.01 + i * 2) * 30;
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#5522aa';
        ctx.beginPath(); ctx.ellipse(sx, sy, 15, 25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff44ff';
        ctx.fillRect(sx - 5, sy - 6, 3, 3);
        ctx.fillRect(sx + 3, sy - 6, 3, 3);
        ctx.globalAlpha = 1;
      }

      // Fog
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 5; i++) {
        const fx = (i * 900 + g.frameCount * 0.3) % (LEVEL_END + 800) - cx * 0.3;
        ctx.fillStyle = '#6633aa';
        ctx.beginPath(); ctx.ellipse(fx, GROUND_Y - 10, 200, 30, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* ── Platforms ── */
      for (const p of g.platforms) {
        if (p.broken) continue;
        const px = p.x - cx;
        if (px + p.w < -20 || px > W + 20) continue;

        if (p.h > 50) {
          // Ground
          ctx.fillStyle = '#1a1428';
          ctx.fillRect(px, p.y, p.w, p.h);
          ctx.fillStyle = '#3d2e5c';
          ctx.fillRect(px, p.y, p.w, 3);
          ctx.strokeStyle = '#5533aa44';
          ctx.lineWidth = 1;
          for (let i = 0; i < p.w; i += 80) {
            ctx.beginPath();
            ctx.moveTo(px + i + 20, p.y);
            ctx.lineTo(px + i + 30, p.y + 15);
            ctx.lineTo(px + i + 25, p.y + 30);
            ctx.stroke();
          }
        } else if (p.w === 30 && p.h === 220) {
          // Arena walls
          ctx.fillStyle = '#1c1430';
          ctx.fillRect(px, p.y, p.w, p.h);
          ctx.strokeStyle = '#5533aa44';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, p.y, p.w, p.h);
        } else {
          // Floating platform
          if (p.breakable) {
            ctx.fillStyle = '#2a1b3d';
            ctx.fillRect(px, p.y, p.w, p.h);
            ctx.strokeStyle = '#ff335544';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, p.y, p.w, p.h);
            ctx.beginPath();
            ctx.moveTo(px + p.w * 0.3, p.y);
            ctx.lineTo(px + p.w * 0.5, p.y + p.h);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#201838';
            ctx.fillRect(px, p.y, p.w, p.h);
            ctx.fillStyle = '#3d2e5c';
            ctx.fillRect(px, p.y, p.w, 2);
          }
        }
      }

      // Ground cracks
      ctx.strokeStyle = '#7744cc33';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const crackX = i * 400 + 150 - cx;
        if (crackX < -50 || crackX > W + 50) continue;
        ctx.beginPath();
        ctx.moveTo(crackX, GROUND_Y);
        ctx.lineTo(crackX + 15, GROUND_Y - 8);
        ctx.lineTo(crackX + 10, GROUND_Y - 18);
        ctx.lineTo(crackX + 20, GROUND_Y - 30);
        ctx.stroke();
        ctx.fillStyle = '#aa66ff';
        ctx.globalAlpha = 0.3 + Math.sin(g.frameCount * 0.04 + i) * 0.2;
        ctx.fillRect(crackX + 18, GROUND_Y - 33, 4, 4);
        ctx.globalAlpha = 1;
      }

      /* ── Stone Tablet ── */
      const tabletX = BOSS_ARENA_X + 20 - cx;
      const tabletY = 250;
      ctx.fillStyle = '#1a1330';
      ctx.fillRect(tabletX, tabletY, 60, 80);
      ctx.strokeStyle = '#3d2e5c';
      ctx.lineWidth = 1;
      ctx.strokeRect(tabletX, tabletY, 60, 80);
      if (g.stoneTabletVisible) {
        ctx.font = '7px monospace';
        ctx.fillStyle = '#6644aa88';
        ctx.textAlign = 'center';
        ctx.fillText('Within a', tabletX + 30, tabletY + 25);
        ctx.fillText('domain...', tabletX + 30, tabletY + 38);
        ctx.fillText('the curse', tabletX + 30, tabletY + 55);
        ctx.fillText('cannot', tabletX + 30, tabletY + 65);
        ctx.fillText('escape.', tabletX + 30, tabletY + 75);
        ctx.textAlign = 'left';
      }

      /* ── Orbs ── */
      for (const orb of g.orbs) {
        if (orb.collected) continue;
        const ox = orb.x - cx;
        if (ox < -20 || ox > W + 20) continue;
        const oy = orb.y + Math.sin(orb.bobOffset) * 6;
        ctx.globalAlpha = 0.3 + Math.sin(g.frameCount * 0.05 + orb.bobOffset) * 0.15;
        ctx.fillStyle = '#aa44ff';
        ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#dd88ff';
        ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#fff';
        ctx.fillRect(ox - 1, oy - 1, 2, 2);
        ctx.globalAlpha = 1;
      }

      /* ── Enemies ── */
      for (const e of g.enemies) {
        if (!e.alive) continue;
        const ex = e.x - cx;
        if (ex < -40 || ex > W + 40) continue;
        if (e.type === 'small') {
          ctx.fillStyle = '#2a1540';
          ctx.beginPath(); ctx.ellipse(ex + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#8844cc88'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#ff44aa';
          const ed = e.facingLeft ? -3 : 3;
          ctx.fillRect(ex + e.w / 2 - 4 + ed, e.y + e.h / 2 - 4, 3, 3);
          ctx.fillRect(ex + e.w / 2 + 2 + ed, e.y + e.h / 2 - 4, 3, 3);
          drawHpBar(ctx, ex, e.y - 8, e.w, 3, e.hp / e.maxHp);
        }
        if (e.type === 'flying') {
          ctx.fillStyle = '#1a0a30';
          ctx.beginPath();
          ctx.moveTo(ex + e.w / 2, e.y); ctx.lineTo(ex + e.w, e.y + e.h / 2);
          ctx.lineTo(ex + e.w / 2, e.y + e.h); ctx.lineTo(ex, e.y + e.h / 2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#aa55ff88'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#ff66cc';
          ctx.beginPath(); ctx.arc(ex + e.w / 2, e.y + e.h / 2, 3, 0, Math.PI * 2); ctx.fill();
          const wingFlap = Math.sin(g.frameCount * 0.15) * 4;
          ctx.strokeStyle = '#7733aa66';
          ctx.beginPath();
          ctx.moveTo(ex, e.y + e.h / 2); ctx.lineTo(ex - 10, e.y + e.h / 2 - 5 + wingFlap);
          ctx.moveTo(ex + e.w, e.y + e.h / 2); ctx.lineTo(ex + e.w + 10, e.y + e.h / 2 - 5 - wingFlap);
          ctx.stroke();
          drawHpBar(ctx, ex, e.y - 8, e.w, 3, e.hp / e.maxHp);
        }
        if (e.type === 'heavy') {
          ctx.fillStyle = '#1a0a28';
          ctx.fillRect(ex, e.y, e.w, e.h);
          ctx.strokeStyle = '#6633aa66'; ctx.lineWidth = 2; ctx.strokeRect(ex, e.y, e.w, e.h);
          ctx.fillStyle = '#cc44ff';
          ctx.fillRect(ex + 6, e.y + 10, 6, 4);
          ctx.fillRect(ex + e.w - 12, e.y + 10, 6, 4);
          ctx.fillStyle = '#440033';
          ctx.fillRect(ex + 8, e.y + 22, e.w - 16, 6);
          drawHpBar(ctx, ex, e.y - 8, e.w, 4, e.hp / e.maxHp);
        }
      }

      /* ── Boss ── */
      if (g.boss.alive && g.bossReached) {
        const bx = g.boss.x - cx;
        const by = g.boss.y;
        const bw = g.boss.w;
        const bh = g.boss.h;
        const bPhase = g.boss.phase as string;

        if (bPhase !== 'truly_dead' || g.boss.timer > 0) {
          const bodyAlpha = bPhase === 'truly_dead' ? g.boss.timer / 120 : 1;
          ctx.globalAlpha = bodyAlpha;

          // Shadow
          ctx.fillStyle = '#0a0020';
          ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh + 3, bw / 2 + 5, 5, 0, 0, Math.PI * 2); ctx.fill();
          // Body
          ctx.fillStyle = '#120828';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = '#8844cc'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
          // Glow
          const grd = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 5, bx + bw / 2, by + bh / 2, bw);
          grd.addColorStop(0, 'rgba(120, 40, 200, 0.15)');
          grd.addColorStop(1, 'rgba(120, 40, 200, 0)');
          ctx.fillStyle = grd;
          ctx.fillRect(bx - 10, by - 10, bw + 20, bh + 20);
          // 4 Eyes
          ctx.fillStyle = '#ff33aa';
          ctx.fillRect(bx + 10, by + 14, 6, 5);
          ctx.fillRect(bx + 22, by + 10, 6, 5);
          ctx.fillRect(bx + bw - 28, by + 10, 6, 5);
          ctx.fillRect(bx + bw - 16, by + 14, 6, 5);
          // Mouth
          ctx.fillStyle = '#300020';
          ctx.fillRect(bx + 12, by + 30, bw - 24, 10);
          ctx.fillStyle = '#cc66ff';
          ctx.fillRect(bx + 16, by + 30, 4, 6);
          ctx.fillRect(bx + bw - 20, by + 30, 4, 6);

          // Slam warning
          if (g.boss.slamWarningTimer > 0) {
            ctx.fillStyle = `rgba(255, 50, 80, ${(g.boss.slamWarningTimer / 40) * 0.3})`;
            ctx.fillRect(bx - 60, by + bh - 10, bw + 120, 14);
            ctx.font = '12px monospace';
            ctx.fillStyle = '#ff3355';
            ctx.textAlign = 'center';
            ctx.globalAlpha = (Math.sin(g.frameCount * 0.3) + 1) * 0.5 * bodyAlpha;
            ctx.fillText('!', bx + bw / 2, by - 10);
            ctx.globalAlpha = bodyAlpha;
            ctx.textAlign = 'left';
          }
          ctx.globalAlpha = 1;

          // Boss HP bar
          if (bPhase !== 'truly_dead') {
            const barW = 200;
            const barX = W / 2 - barW / 2;
            ctx.fillStyle = '#111'; ctx.fillRect(barX - 2, 18, barW + 4, 14);
            ctx.fillStyle = '#220033'; ctx.fillRect(barX, 20, barW, 10);
            const hpR = Math.max(0, g.boss.hp / g.boss.maxHp);
            ctx.fillStyle = hpR > 0.5 ? '#aa44ff' : hpR > 0.25 ? '#cc4488' : '#ff3355';
            ctx.fillRect(barX, 20, barW * hpR, 10);
            ctx.font = '8px monospace'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center';
            ctx.fillText('CURSED SPIRIT', W / 2, 44);
            ctx.textAlign = 'left';
          }

          // Revive symbol
          if (g.boss.reviveSymbolTimer > 0) drawCursedSymbol(ctx, bx + bw / 2, by - 30, 18, g.boss.reviveSymbolTimer / 60, false);
          // Symbol shatter
          if (g.boss.symbolShattered && bPhase === 'truly_dead') drawCursedSymbol(ctx, bx + bw / 2, by - 30, 20, g.boss.timer / 120, true);
        }
      }

      // Boss revive energy
      if ((g.boss.phase as string) === 'reviving') {
        const bx = g.boss.x - cx;
        ctx.strokeStyle = `rgba(160, 40, 220, ${0.3 + Math.sin(g.frameCount * 0.1) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx + g.boss.w / 2, g.boss.y + g.boss.h / 2, 60 + Math.sin(g.frameCount * 0.08) * 10, 0, Math.PI * 2); ctx.stroke();
      }

      /* ── Projectiles ── */
      for (const p of g.projectiles) {
        const ppx = p.x - cx;
        if (ppx < -10 || ppx > W + 10) continue;
        ctx.fillStyle = p.friendly ? (g.domainActive ? '#dd66ff' : '#aa44ff') : '#ff4466';
        ctx.shadowColor = p.friendly ? '#aa44ff' : '#ff2244';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(ppx, p.y, p.friendly ? 5 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      /* ── Particles ── */
      for (const p of g.particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cx - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      /* ── Player ── */
      if (g.hp > 0 && g.phase !== 'game_over') {
        const psx = g.px - cx;
        if (g.invulnTimer > 0 && g.frameCount % 4 < 2) ctx.globalAlpha = 0.4;

        // Domain circle
        if (g.domainActive) {
          const dr = 80 + Math.sin(g.frameCount * 0.06) * 10;
          ctx.strokeStyle = `rgba(160, 60, 255, ${0.4 + Math.sin(g.frameCount * 0.08) * 0.15})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(psx + PLAYER_W / 2, g.py + PLAYER_H / 2, dr, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = 'rgba(200, 100, 255, 0.2)';
          ctx.beginPath(); ctx.arc(psx + PLAYER_W / 2, g.py + PLAYER_H / 2, dr * 0.6, 0, Math.PI * 2); ctx.stroke();
        }

        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(psx + 6, g.py + 28, 6, 16);
        ctx.fillRect(psx + 16, g.py + 28, 6, 16);
        // Body
        ctx.fillStyle = g.domainActive ? '#2a1050' : '#1a0a28';
        ctx.fillRect(psx + 4, g.py + 12, 20, 18);
        // Head
        ctx.fillStyle = '#c8a882';
        ctx.fillRect(psx + 7, g.py, 14, 14);
        // Hair
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(psx + 6, g.py - 2, 16, 6);
        // Eyes
        ctx.fillStyle = g.domainActive ? '#dd66ff' : '#4488ff';
        const eyeX = g.facingLeft ? psx + 8 : psx + 14;
        ctx.fillRect(eyeX, g.py + 6, 3, 3);
        ctx.fillRect(eyeX + 5, g.py + 6, 3, 3);
        // Domain aura
        if (g.domainActive) {
          ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 15;
          ctx.strokeStyle = '#aa44ff44'; ctx.lineWidth = 1;
          ctx.strokeRect(psx + 2, g.py - 2, 24, 48);
          ctx.shadowBlur = 0;
        }
        // Punch visual
        if (g.punchTimer > 0) {
          const pd = g.facingLeft ? -1 : 1;
          ctx.fillStyle = g.domainActive ? '#dd66ff' : '#aa66cc';
          ctx.beginPath(); ctx.arc(psx + PLAYER_W / 2 + pd * 20, g.py + PLAYER_H / 2, 6 + g.punchTimer * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      /* ── HUD ── */
      // HP bar
      const hpBarW = 80;
      const hpBarH = 10;
      const hpBarX = 16;
      const hpBarY = H - 30;
      ctx.fillStyle = '#220022';
      ctx.fillRect(hpBarX, hpBarY, hpBarW + 4, hpBarH + 4);
      ctx.fillStyle = '#0a0010';
      ctx.fillRect(hpBarX + 2, hpBarY + 2, hpBarW, hpBarH);
      const hpRatio = g.hp / MAX_HP;
      ctx.fillStyle = hpRatio > 0.5 ? '#ff3366' : hpRatio > 0.25 ? '#ff6633' : '#ff2222';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fillRect(hpBarX + 2, hpBarY + 2, hpBarW * Math.max(0, hpRatio), hpBarH);
      ctx.shadowBlur = 0;
      ctx.font = '8px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('HP', hpBarX + 4, hpBarY - 2);

      // Energy bar
      ctx.fillStyle = '#111'; ctx.fillRect(108, H - 34, 104, 14);
      ctx.fillStyle = '#0a0020'; ctx.fillRect(110, H - 32, 100, 10);
      const eRatio = g.energy / g.maxEnergy;
      ctx.fillStyle = eRatio >= 1 ? '#dd88ff' : '#7733aa';
      ctx.fillRect(110, H - 32, 100 * eRatio, 10);
      ctx.font = '8px monospace'; ctx.fillStyle = '#aaa';
      ctx.fillText('CE', 112, H - 37);

      // Domain status
      if (g.domainActive) {
        ctx.fillStyle = '#dd66ff'; ctx.font = '10px monospace';
        ctx.fillText('DOMAIN ACTIVE', 110, H - 46);
        ctx.fillStyle = '#aa44ff44';
        ctx.fillRect(110, H - 57, 100 * (g.domainTimer / DOMAIN_DURATION), 4);
      } else if (g.domainCooldown > 0) {
        ctx.fillStyle = '#555'; ctx.font = '8px monospace';
        ctx.fillText(`Cooldown: ${Math.ceil(g.domainCooldown / 60)}s`, 110, H - 46);
      } else if (g.energy >= g.maxEnergy && g.frameCount % 60 < 40) {
        ctx.fillStyle = '#dd88ff'; ctx.font = '9px monospace';
        ctx.fillText('Press E - Domain Expansion', 110, H - 46);
      }

      // Whisper
      if (g.whisperTimer > 0) {
        ctx.globalAlpha = Math.min(1, g.whisperTimer / 30) * 0.6;
        ctx.fillStyle = '#8855aa'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('"Not strong enough..."', W / 2, H / 2 - 80);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Zone text
      if (g.zoneTextTimer > 0) {
        const zt = Math.min(1, g.zoneTextTimer < 20 ? g.zoneTextTimer / 20 : g.zoneTextTimer > 100 ? (120 - g.zoneTextTimer) / 20 : 1);
        ctx.globalAlpha = zt * 0.7;
        ctx.fillStyle = '#aa88dd'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(g.zoneText, W / 2, 80);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Revival counter
      if (g.boss.reviveCount > 0 && g.bossReached && (g.boss.phase as string) !== 'truly_dead') {
        ctx.fillStyle = '#55338866'; ctx.font = '8px monospace';
        ctx.fillText(`Revivals: ${g.boss.reviveCount}`, W - 90, H - 10);
      }

      // Game over screen
      if (g.phase === 'game_over') {
        ctx.fillStyle = `rgba(10, 0, 0, ${Math.min(0.75, g.gameOverTimer / 60)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff3355'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('CURSED', W / 2, H / 2 - 20);
        ctx.font = '10px monospace'; ctx.fillStyle = '#888';
        ctx.fillText('You have been consumed by the curse.', W / 2, H / 2 + 10);
        if (g.gameOverTimer > 60) {
          ctx.fillStyle = '#aa66cc'; ctx.font = '11px monospace';
          ctx.fillText('Press R to retry', W / 2, H / 2 + 40);
        }
        ctx.textAlign = 'left';
      }

      // Victory screen
      if (g.phase === 'victory') {
        const alpha = Math.min(1, g.victoryTimer / 60);
        ctx.fillStyle = `rgba(10, 0, 20, ${alpha * 0.7})`; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#dd88ff'; ctx.font = '18px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Cursed Seal Obtained', W / 2, H / 2 - 30);
        ctx.font = '11px monospace'; ctx.fillStyle = '#aa88cc';
        ctx.fillText('You have purified the domain.', W / 2, H / 2 + 5);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }

      // Domain overlay
      if (g.domainActive) {
        ctx.fillStyle = 'rgba(20, 0, 40, 0.15)'; ctx.fillRect(0, 0, W, H);
        const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(40, 0, 60, 0.25)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();
    }

    loop();

    return () => {
      g.running = false;
      cancelAnimationFrame(g.animFrame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initGame]);

  const handleVictory = useCallback(() => { completeLevel('cursed'); router.push('/hub'); }, [completeLevel, router]);
  const handleRetry = useCallback(() => { restartRef.current?.(); }, []);
  const missedTagNote = gameState.profile?.unlockedTags.includes('cursed') || smallDeathCountRef.current >= 5
    ? ''
    : ' This level has a hidden tag and you missed it: cursed. Hint: get defeated by small enemies 5 times.';

  return (
    <LevelLayout levelName="cursed" title="CURSED DOMAIN">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 50px)',
        background: 'radial-gradient(ellipse at center, #0a0020 0%, #050010 50%, #000 100%)',
        position: 'relative',
      }}>
        {showControls && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 100, background: 'rgba(10, 0, 30, 0.95)', border: '1px solid #5533aa',
            borderRadius: '8px', padding: '30px 40px', textAlign: 'center', maxWidth: '420px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', color: '#aa66ff', marginBottom: '20px' }}>CURSED DOMAIN</h2>
            <div style={{ fontFamily: 'var(--font-terminal)', fontSize: '15px', color: '#998', lineHeight: '2', textAlign: 'left' }}>
              <div><span style={{ color: '#aa88ff' }}>WASD / Arrows</span> — Move</div>
              <div><span style={{ color: '#aa88ff' }}>Space</span> — Jump</div>
              <div><span style={{ color: '#aa88ff' }}>Shift</span> — Dash</div>
              <div><span style={{ color: '#aa88ff' }}>Click / J</span> — Cursed Punch</div>
              <div><span style={{ color: '#aa88ff' }}>K</span> — Energy Projectile</div>
              <div><span style={{ color: '#aa88ff' }}>E</span> — Domain Expansion</div>
              <div style={{ marginTop: '10px', color: '#ff6688', fontSize: '13px' }}>Survive and defeat the boss.</div>
            </div>
            <button onClick={() => setShowControls(false)} style={{
              marginTop: '20px', fontFamily: 'var(--font-pixel)', fontSize: '10px',
              padding: '10px 30px', background: 'transparent', border: '1px solid #aa44ff',
              color: '#aa44ff', cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#aa44ff'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aa44ff'; }}
            >BEGIN</button>
          </div>
        )}

        <canvas ref={canvasRef} width={W} height={H} style={{
          border: '1px solid #2a1a3a', borderRadius: '4px',
          boxShadow: '0 0 30px rgba(120, 40, 200, 0.2), 0 0 60px rgba(80, 20, 160, 0.1)',
          imageRendering: 'pixelated', maxWidth: '100%',
        }} tabIndex={0} />

        {showVictory && <MessageBox message={`Cursed Seal Obtained — You have purified the domain.${missedTagNote}`} type="success" onClose={handleVictory} />}
        {showGameOver && <MessageBox message="You were consumed by the curse. Try again?" type="error" onClose={handleRetry} />}
      </div>
    </LevelLayout>
  );
}
