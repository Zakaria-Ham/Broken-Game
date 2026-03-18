import { NextRequest, NextResponse } from 'next/server';
import db, { isDatabaseConfigurationError } from '@/lib/db';

const VALID_LEVELS = ['chess', 'button', 'cursor', 'login', 'timer', 'checkmate', 'lights', 'race', 'cursed', 'bedroom', 'blue-dot', 'labyrinth', 'rubik'];

async function getPlayerData(username: string) {
  const playerRes = await db.query(
    'SELECT id, username, levels_completed, total_attempts, started_at, completed_at FROM players WHERE username = $1',
    [username]
  );
  if (playerRes.rows.length === 0) return null;

  const player = playerRes.rows[0];
  const levelsRes = await db.query(
    'SELECT level_name, completed, attempts, completed_at FROM level_progress WHERE player_id = $1',
    [player.id]
  );

  const levels: Record<string, { completed: boolean; attempts: number; completedAt: number | null }> = {};
  for (const row of levelsRes.rows) {
    levels[row.level_name] = {
      completed: row.completed,
      attempts: row.attempts,
      completedAt: row.completed_at ? Number(row.completed_at) : null,
    };
  }

  return {
    username: player.username,
    levels_completed: player.levels_completed,
    total_attempts: player.total_attempts,
    started_at: player.started_at ? Number(player.started_at) : null,
    completed_at: player.completed_at ? Number(player.completed_at) : null,
    levels,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, level_name } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const clean = username.slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, '');

    switch (action) {
      case 'get_progress': {
        const player = await getPlayerData(clean);
        if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        return NextResponse.json({ player });
      }

      case 'complete_level': {
        if (!level_name || !VALID_LEVELS.includes(level_name)) {
          return NextResponse.json({ error: 'Invalid level name' }, { status: 400 });
        }
        const playerRes = await db.query('SELECT id FROM players WHERE username = $1', [clean]);
        if (playerRes.rows.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const playerId = playerRes.rows[0].id;
        const now = Date.now();

        // Mark level completed
        await db.query(
          `INSERT INTO level_progress (player_id, level_name, completed, completed_at)
           VALUES ($1, $2, true, $3)
           ON CONFLICT (player_id, level_name) DO UPDATE SET completed = true, completed_at = COALESCE(level_progress.completed_at, $3)`,
          [playerId, level_name, now]
        );

        // Update player stats
        const countRes = await db.query(
          'SELECT COUNT(*) as cnt FROM level_progress WHERE player_id = $1 AND completed = true',
          [playerId]
        );
        const levelsCompleted = parseInt(countRes.rows[0].cnt);
        const allDone = levelsCompleted >= VALID_LEVELS.length;
        await db.query(
          `UPDATE players SET levels_completed = $1, completed_at = CASE WHEN $2 AND completed_at IS NULL THEN $3 ELSE completed_at END, updated_at = NOW() WHERE id = $4`,
          [levelsCompleted, allDone, now, playerId]
        );

        const player = await getPlayerData(clean);
        return NextResponse.json({ player });
      }

      case 'add_attempt': {
        if (!level_name || !VALID_LEVELS.includes(level_name)) {
          return NextResponse.json({ error: 'Invalid level name' }, { status: 400 });
        }
        const playerRes = await db.query('SELECT id FROM players WHERE username = $1', [clean]);
        if (playerRes.rows.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const playerId = playerRes.rows[0].id;

        await db.query(
          `INSERT INTO level_progress (player_id, level_name, attempts)
           VALUES ($1, $2, 1)
           ON CONFLICT (player_id, level_name) DO UPDATE SET attempts = level_progress.attempts + 1`,
          [playerId, level_name]
        );
        await db.query(
          'UPDATE players SET total_attempts = total_attempts + 1, updated_at = NOW() WHERE id = $1',
          [playerId]
        );

        const player = await getPlayerData(clean);
        return NextResponse.json({ player });
      }

      case 'start_timer': {
        const now = Date.now();
        await db.query(
          'UPDATE players SET started_at = COALESCE(started_at, $1), updated_at = NOW() WHERE username = $2',
          [now, clean]
        );
        const player = await getPlayerData(clean);
        return NextResponse.json({ player });
      }

      case 'reset': {
        const playerRes = await db.query('SELECT id FROM players WHERE username = $1', [clean]);
        if (playerRes.rows.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        const playerId = playerRes.rows[0].id;

        await db.query('DELETE FROM level_progress WHERE player_id = $1', [playerId]);
        await db.query(
          'UPDATE players SET levels_completed = 0, total_attempts = 0, started_at = NULL, completed_at = NULL, updated_at = NOW() WHERE id = $1',
          [playerId]
        );
        // Re-init level rows
        for (const lvl of VALID_LEVELS) {
          await db.query('INSERT INTO level_progress (player_id, level_name) VALUES ($1, $2)', [playerId, lvl]);
        }

        const player = await getPlayerData(clean);
        return NextResponse.json({ player });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    if (isDatabaseConfigurationError(err)) {
      return NextResponse.json({ error: 'Database is not configured on the server' }, { status: 503 });
    }
    console.error('Progress API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Broken Internet API',
    endpoints: {
      POST: {
        actions: ['get_progress', 'complete_level', 'add_attempt', 'start_timer', 'reset'],
        body: { username: 'string', action: 'string', level_name: 'string (optional)' },
      },
    },
  });
}
