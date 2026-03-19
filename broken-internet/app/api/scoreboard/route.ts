import { NextResponse } from 'next/server';
import db, { isDatabaseConfigurationError } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        username,
        levels_completed,
        total_attempts,
        started_at,
        completed_at,
        electrician_tag,
        CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
          THEN completed_at - started_at
          ELSE NULL
        END as total_time
      FROM players
      ORDER BY
        CASE WHEN completed_at IS NOT NULL THEN 0 ELSE 1 END,
        (completed_at - started_at) ASC NULLS LAST,
        levels_completed DESC,
        total_attempts ASC
    `);

    const scoreboard = result.rows.map(row => ({
      username: row.username,
      levelsCompleted: row.levels_completed,
      totalAttempts: row.total_attempts,
      completedAt: row.completed_at ? Number(row.completed_at) : null,
      totalTime: row.total_time ? Number(row.total_time) : null,
      electricianTag: Boolean(row.electrician_tag),
    }));

    return NextResponse.json({ scoreboard });
  } catch (err) {
    if (isDatabaseConfigurationError(err)) {
      return NextResponse.json({ error: 'Database is not configured on the server' }, { status: 503 });
    }
    console.error('Scoreboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
