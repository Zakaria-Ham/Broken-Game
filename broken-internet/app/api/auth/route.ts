import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import db, { isDatabaseConfigurationError } from '@/lib/db';

function hashPassword(password: string): string {
  return createHash('sha256').update(password + '_broken_internet_salt').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const clean = username.slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, '');
    if (clean.length < 2) {
      return NextResponse.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
    }
    if (password.length < 3) {
      return NextResponse.json({ error: 'Password must be at least 3 characters' }, { status: 400 });
    }

    const hashed = hashPassword(password);

    if (action === 'register') {
      // Check if username exists
      const existing = await db.query('SELECT id FROM players WHERE username = $1', [clean]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }

      const result = await db.query(
        'INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at, electrician_tag',
        [clean, hashed]
      );

      // Initialize level_progress rows
      const levels = ['chess', 'button', 'cursor', 'login', 'timer', 'checkmate', 'lights', 'race', 'cursed', 'bedroom', 'blue-dot', 'labyrinth', 'rubik', 'blacknet'];
      for (const level of levels) {
        await db.query(
          'INSERT INTO level_progress (player_id, level_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [result.rows[0].id, level]
        );
      }

      return NextResponse.json({
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username,
          createdAt: result.rows[0].created_at,
          electricianTag: Boolean(result.rows[0].electrician_tag),
        },
      });

    } else if (action === 'login') {
      const result = await db.query(
        'SELECT id, username, created_at, electrician_tag FROM players WHERE username = $1 AND password_hash = $2',
        [clean, hashed]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      return NextResponse.json({
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username,
          createdAt: result.rows[0].created_at,
          electricianTag: Boolean(result.rows[0].electrician_tag),
        },
      });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "login" or "register"' }, { status: 400 });
    }
  } catch (err) {
    if (isDatabaseConfigurationError(err)) {
      return NextResponse.json({ error: 'Database is not configured on the server' }, { status: 503 });
    }
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
