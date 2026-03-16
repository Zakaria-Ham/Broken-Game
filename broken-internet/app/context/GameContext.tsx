'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type LevelName = 'chess' | 'button' | 'cursor' | 'login' | 'timer' | 'checkmate' | 'race' | 'cursed' | 'bedroom' | 'blue-dot' | 'labyrinth';

interface LevelState {
  completed: boolean;
  attempts: number;
  completedAt?: number;
}

interface UserProfile {
  username: string;
  createdAt: number;
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
  loginUser: (username: string, password: string) => Promise<boolean>;
  registerUser: (username: string, password: string) => Promise<boolean>;
  logoutUser: () => void;
  startTimer: () => void;
  getElapsedTime: () => number;
  getAllProfiles: () => Promise<ProfileEntry[]>;
}

export interface ProfileEntry {
  username: string;
  completedAt: number | null;
  totalTime: number | null;
  totalAttempts: number;
  levelsCompleted: number;
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
    race: { ...defaultLevelState },
    cursed: { ...defaultLevelState },
    bedroom: { ...defaultLevelState },
    'blue-dot': { ...defaultLevelState },
    labyrinth: { ...defaultLevelState },
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
      return { ...parsed, levels };
    }
  } catch {}
  return initialGameState;
}

function saveState(state: GameState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// Sync local state from API player data
function applyServerData(prev: GameState, data: { levels: Record<string, { completed: boolean; attempts: number; completedAt: number | null }>; total_attempts: number; started_at: number | null; completed_at: number | null; levels_completed: number }): GameState {
  const levels = { ...prev.levels } as Record<LevelName, LevelState>;
  for (const key of ['chess', 'button', 'cursor', 'login', 'timer', 'checkmate', 'race', 'cursed', 'bedroom', 'blue-dot', 'labyrinth'] as LevelName[]) {
    if (data.levels[key]) {
      levels[key] = {
        completed: data.levels[key].completed,
        attempts: data.levels[key].attempts,
        completedAt: data.levels[key].completedAt ?? undefined,
      };
    }
  }
  const allCompleted = Object.values(levels).every(l => l.completed);
  return {
    ...prev,
    levels,
    totalAttempts: data.total_attempts,
    allCompleted,
    startedAt: data.started_at,
    completedAt: data.completed_at,
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
    const profile = gameState.profile;
    const newState: GameState = {
      ...initialGameState,
      levels: {
        chess: { ...defaultLevelState },
        button: { ...defaultLevelState },
        cursor: { ...defaultLevelState },
        login: { ...defaultLevelState },
        timer: { ...defaultLevelState },
        checkmate: { ...defaultLevelState },
        race: { ...defaultLevelState },
        cursed: { ...defaultLevelState },
        bedroom: { ...defaultLevelState },
        'blue-dot': { ...defaultLevelState },
        labyrinth: { ...defaultLevelState },
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
      const profile: UserProfile = { username: data.user.username, createdAt: new Date(data.user.createdAt).getTime() };
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
      const profile: UserProfile = { username: data.user.username, createdAt: new Date(data.user.createdAt).getTime() };

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

  return (
    <GameContext.Provider
      value={{
        gameState, completeLevel, addAttempt, adjustSpeedrunTime, resetGame,
        isLevelCompleted, getLevelAttempts,
        loginUser, registerUser, logoutUser,
        startTimer, getElapsedTime, getAllProfiles,
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
