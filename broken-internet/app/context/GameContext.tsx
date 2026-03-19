'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type LevelName = 'chess' | 'button' | 'cursor' | 'login' | 'timer' | 'checkmate' | 'lights' | 'race' | 'cursed' | 'bedroom' | 'blue-dot' | 'labyrinth' | 'rubik' | 'blacknet';

export const MAIN_LEVEL_ORDER: LevelName[] = [
  'button',
  'timer',
  'cursor',
  'login',
  'chess',
  'checkmate',
  'race',
  'blue-dot',
  'cursed',
  'bedroom',
  'labyrinth',
  'rubik',
  'lights',
];

interface LevelState {
  completed: boolean;
  attempts: number;
  completedAt?: number;
}

interface UserProfile {
  username: string;
  createdAt: number;
  electricianTag: boolean;
  unlockedTags: string[];
  activeTag: string | null;
}

interface GameState {
  levels: Record<LevelName, LevelState>;
  totalAttempts: number;
  allCompleted: boolean;
  profile: UserProfile | null;
  startedAt: number | null;
  completedAt: number | null;
}

interface GameContextType {
  gameState: GameState;
  completeLevel: (level: LevelName) => void;
  addAttempt: (level: LevelName) => void;
  adjustSpeedrunTime: (deltaMs: number) => void;
  resetGame: () => void;
  isLevelCompleted: (level: LevelName) => boolean;
  getLevelAttempts: (level: LevelName) => number;
  isLevelUnlocked: (level: LevelName) => boolean;
  loginUser: (username: string, password: string) => Promise<boolean>;
  registerUser: (username: string, password: string) => Promise<boolean>;
  logoutUser: () => void;
  startTimer: () => void;
  getElapsedTime: () => number;
  getAllProfiles: () => Promise<ProfileEntry[]>;
  setElectricianTag: () => Promise<void>;
  unlockTag: (tag: string) => Promise<void>;
  setActiveTag: (tag: string | null) => Promise<void>;
  recordHubBackClick: () => void;
}

export interface ProfileEntry {
  username: string;
  completedAt: number | null;
  totalTime: number | null;
  totalAttempts: number;
  levelsCompleted: number;
  electricianTag: boolean;
  unlockedTags: string[];
  activeTag: string | null;
}

const defaultLevelState: LevelState = { completed: false, attempts: 0 };

const initialGameState: GameState = {
  levels: {
    chess: { ...defaultLevelState },
    button: { ...defaultLevelState },
    cursor: { ...defaultLevelState },
    login: { ...defaultLevelState },
    timer: { ...defaultLevelState },
    checkmate: { ...defaultLevelState },
    lights: { ...defaultLevelState },
    race: { ...defaultLevelState },
    cursed: { ...defaultLevelState },
    bedroom: { ...defaultLevelState },
    'blue-dot': { ...defaultLevelState },
    labyrinth: { ...defaultLevelState },
    rubik: { ...defaultLevelState },
    blacknet: { ...defaultLevelState },
  },
  totalAttempts: 0,
  allCompleted: false,
  profile: null,
  startedAt: null,
  completedAt: null,
};

const STORAGE_KEY = 'broken-internet-save';

function loadState(): GameState {
  if (typeof window === 'undefined') return initialGameState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as GameState;
      // Backfill any newly added levels missing from old saved state
      const levels = { ...initialGameState.levels, ...parsed.levels };
      const profile = parsed.profile
        ? {
            ...parsed.profile,
            unlockedTags: Array.isArray((parsed.profile as UserProfile).unlockedTags)
              ? (parsed.profile as UserProfile).unlockedTags
              : [],
            activeTag: typeof (parsed.profile as UserProfile).activeTag === 'string'
              ? (parsed.profile as UserProfile).activeTag
              : null,
          }
        : null;
      return { ...parsed, levels, profile };
    }
  } catch {}
  return initialGameState;
}

function saveState(state: GameState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// Sync local state from API player data
function normalizeTags(tags: unknown, electricianTag: boolean): string[] {
  const raw = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
  const unique = Array.from(new Set(raw));
  if (electricianTag && !unique.includes('electricien')) {
    unique.push('electricien');
  }
  return unique;
}

function applyServerData(prev: GameState, data: { levels: Record<string, { completed: boolean; attempts: number; completedAt: number | null }>; total_attempts: number; started_at: number | null; completed_at: number | null; levels_completed: number; electrician_tag?: boolean; unlocked_tags?: string[]; active_tag?: string | null }): GameState {
  const levels = { ...prev.levels } as Record<LevelName, LevelState>;
  for (const key of ['chess', 'button', 'cursor', 'login', 'timer', 'checkmate', 'lights', 'race', 'cursed', 'bedroom', 'blue-dot', 'labyrinth', 'rubik', 'blacknet'] as LevelName[]) {
    if (data.levels[key]) {
      levels[key] = {
        completed: data.levels[key].completed,
        attempts: data.levels[key].attempts,
        completedAt: data.levels[key].completedAt ?? undefined,
      };
    }
  }
  const allCompleted = Object.values(levels).every(l => l.completed);
  const electricianTag = Boolean(data.electrician_tag);
  const unlockedTags = normalizeTags(data.unlocked_tags, electricianTag);
  const activeTag = data.active_tag && unlockedTags.includes(data.active_tag)
    ? data.active_tag
    : (unlockedTags[0] ?? null);
  const profile = prev.profile
    ? {
        ...prev.profile,
        electricianTag,
        unlockedTags,
        activeTag,
      }
    : prev.profile;
  return {
    ...prev,
    levels,
    totalAttempts: data.total_attempts,
    allCompleted,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    profile,
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(loadState);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveState(gameState);
  }, [gameState]);

  // On mount, if logged in, sync from server
  useEffect(() => {
    if (gameState.profile) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_progress', username: gameState.profile.username }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.player) {
            setGameState(prev => applyServerData(prev, data.player));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeLevel = useCallback((level: LevelName) => {
    setGameState(prev => {
      const now = Date.now();
      // Auto-start timer on first level interaction
      const startedAt = prev.startedAt || now;
      const newLevels = {
        ...prev.levels,
        [level]: { ...prev.levels[level], completed: true, completedAt: now },
      };
      const allCompleted = Object.values(newLevels).every(l => l.completed);
      const completedAt = allCompleted && !prev.completedAt ? now : prev.completedAt;
      const newState = { ...prev, levels: newLevels, allCompleted, completedAt, startedAt };

      // Sync to server
      if (prev.profile) {
        if (!prev.startedAt) {
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start_timer', username: prev.profile.username }),
          }).catch(() => {});
        }
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete_level', username: prev.profile.username, level_name: level }),
        }).catch(() => {});
      }

      return newState;
    });
  }, []);

  const addAttempt = useCallback((level: LevelName) => {
    setGameState(prev => {
      // Auto-start timer on first level interaction
      const startedAt = prev.startedAt || Date.now();
      const newLevels = {
        ...prev.levels,
        [level]: { ...prev.levels[level], attempts: prev.levels[level].attempts + 1 },
      };
      const newState = { ...prev, levels: newLevels, totalAttempts: prev.totalAttempts + 1, startedAt };

      if (prev.profile) {
        if (!prev.startedAt) {
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start_timer', username: prev.profile.username }),
          }).catch(() => {});
        }
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_attempt', username: prev.profile.username, level_name: level }),
        }).catch(() => {});
      }

      return newState;
    });
  }, []);

  const adjustSpeedrunTime = useCallback((deltaMs: number) => {
    setGameState(prev => {
      const now = Date.now();
      const startedAtBase = prev.startedAt ?? now;
      const adjustedStartedAt = Math.min(startedAtBase - deltaMs, now);

      return {
        ...prev,
        startedAt: adjustedStartedAt,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    const profile = gameState.profile
      ? {
          ...gameState.profile,
          electricianTag: false,
          unlockedTags: [],
          activeTag: null,
        }
      : null;
    const newState: GameState = {
      ...initialGameState,
      levels: {
        chess: { ...defaultLevelState },
        button: { ...defaultLevelState },
        cursor: { ...defaultLevelState },
        login: { ...defaultLevelState },
        timer: { ...defaultLevelState },
        checkmate: { ...defaultLevelState },
        lights: { ...defaultLevelState },
        race: { ...defaultLevelState },
        cursed: { ...defaultLevelState },
        bedroom: { ...defaultLevelState },
        'blue-dot': { ...defaultLevelState },
        labyrinth: { ...defaultLevelState },
        rubik: { ...defaultLevelState },
        blacknet: { ...defaultLevelState },
      },
      profile,
      startedAt: null,
      completedAt: null,
    };
    setGameState(newState);

    if (profile) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', username: profile.username }),
      }).catch(() => {});
    }
  }, [gameState.profile]);

  const registerUser = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const profile: UserProfile = {
        username: data.user.username,
        createdAt: new Date(data.user.createdAt).getTime(),
        electricianTag: Boolean(data.user.electricianTag),
        unlockedTags: normalizeTags(data.user.unlockedTags, Boolean(data.user.electricianTag)),
        activeTag: data.user.activeTag ?? null,
      };
      setGameState(prev => ({ ...prev, profile }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loginUser = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const profile: UserProfile = {
        username: data.user.username,
        createdAt: new Date(data.user.createdAt).getTime(),
        electricianTag: Boolean(data.user.electricianTag),
        unlockedTags: normalizeTags(data.user.unlockedTags, Boolean(data.user.electricianTag)),
        activeTag: data.user.activeTag ?? null,
      };

      // Load progress from server
      const progressRes = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_progress', username: data.user.username }),
      });
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData?.player) {
          setGameState(prev => applyServerData({ ...prev, profile }, progressData.player));
          return true;
        }
      }

      setGameState(prev => ({ ...prev, profile }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logoutUser = useCallback(() => {
    const newState = { ...initialGameState, levels: { ...initialGameState.levels }, profile: null, startedAt: null, completedAt: null };
    setGameState(newState);
  }, []);

  const startTimer = useCallback(() => {
    setGameState(prev => {
      if (prev.startedAt) return prev;
      const now = Date.now();
      const newState = { ...prev, startedAt: now };

      if (prev.profile) {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_timer', username: prev.profile.username }),
        }).catch(() => {});
      }

      return newState;
    });
  }, []);

  const getElapsedTime = useCallback((): number => {
    if (!gameState.startedAt) return 0;
    const end = gameState.completedAt || Date.now();
    return end - gameState.startedAt;
  }, [gameState.startedAt, gameState.completedAt]);

  const isLevelCompleted = useCallback(
    (level: LevelName) => gameState.levels[level].completed,
    [gameState]
  );

  const getLevelAttempts = useCallback(
    (level: LevelName) => gameState.levels[level].attempts,
    [gameState]
  );

  const isLevelUnlocked = useCallback(
    (level: LevelName): boolean => {
      if (!gameState.profile) return false;

      if (level === 'blacknet') {
        if (!gameState.levels.lights.completed) return false;
        if (typeof window === 'undefined') return false;
        const key = `broken-internet:black-door-opened:${gameState.profile.username}`;
        return localStorage.getItem(key) === '1';
      }

      const idx = MAIN_LEVEL_ORDER.indexOf(level);
      if (idx < 0) return true;
      if (idx === 0) return true;

      const prevLevel = MAIN_LEVEL_ORDER[idx - 1];
      const prevState = gameState.levels[prevLevel];
      return prevState.completed || prevState.attempts >= 3;
    },
    [gameState.levels, gameState.profile]
  );

  const getAllProfiles = useCallback(async (): Promise<ProfileEntry[]> => {
    try {
      const res = await fetch('/api/scoreboard');
      if (!res.ok) return [];
      const data = await res.json();
      return data.scoreboard || [];
    } catch {
      return [];
    }
  }, []);

  const setElectricianTag = useCallback(async (): Promise<void> => {
    setGameState(prev => {
      if (!prev.profile || prev.profile.electricianTag) return prev;
      const nextTags = prev.profile.unlockedTags.includes('electricien')
        ? prev.profile.unlockedTags
        : [...prev.profile.unlockedTags, 'electricien'];
      return {
        ...prev,
        profile: {
          ...prev.profile,
          electricianTag: true,
          unlockedTags: nextTags,
          activeTag: prev.profile.activeTag ?? 'electricien',
        },
      };
    });

    const username = gameState.profile?.username;
    if (!username) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_electrician_tag', username }),
      });
    } catch {}
  }, [gameState.profile?.username]);

  const unlockTag = useCallback(async (tag: string): Promise<void> => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;

    setGameState(prev => {
      if (!prev.profile || prev.profile.unlockedTags.includes(cleanTag)) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          unlockedTags: [...prev.profile.unlockedTags, cleanTag],
          activeTag: prev.profile.activeTag ?? cleanTag,
        },
      };
    });

    const username = gameState.profile?.username;
    if (!username) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock_tag', username, tag: cleanTag }),
      });
    } catch {}
  }, [gameState.profile?.username]);

  const setActiveTag = useCallback(async (tag: string | null): Promise<void> => {
    setGameState(prev => {
      if (!prev.profile) return prev;
      if (tag && !prev.profile.unlockedTags.includes(tag)) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          activeTag: tag,
        },
      };
    });

    const username = gameState.profile?.username;
    if (!username) return;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active_tag', username, tag }),
      });
    } catch {}
  }, [gameState.profile?.username]);

  const recordHubBackClick = useCallback(() => {
    const username = gameState.profile?.username;
    if (!username || typeof window === 'undefined') return;

    const key = `broken-internet:hub-back-clicks:${username}`;
    const raw = Number(localStorage.getItem(key) || '0');
    const next = raw + 1;
    localStorage.setItem(key, String(next));

    if (next > 100) {
      void unlockTag('hubber');
    }
  }, [gameState.profile?.username, unlockTag]);

  return (
    <GameContext.Provider
      value={{
        gameState, completeLevel, addAttempt, adjustSpeedrunTime, resetGame,
        isLevelCompleted, getLevelAttempts, isLevelUnlocked,
        loginUser, registerUser, logoutUser,
        startTimer, getElapsedTime, getAllProfiles, setElectricianTag,
        unlockTag, setActiveTag, recordHubBackClick,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
