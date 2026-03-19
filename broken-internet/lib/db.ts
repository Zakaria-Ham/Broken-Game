import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL?.trim();
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

const DB_NOT_CONFIGURED_ERROR =
  'Database is not configured. Set DATABASE_URL to enable auth/progress/scoreboard APIs.';

if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });
}

let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!pool) {
    throw new Error(DB_NOT_CONFIGURED_ERROR);
  }
  if (!initPromise) {
    initPromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          levels_completed INTEGER DEFAULT 0,
          total_attempts INTEGER DEFAULT 0,
          electrician_tag BOOLEAN DEFAULT FALSE,
          started_at BIGINT,
          completed_at BIGINT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE players ADD COLUMN IF NOT EXISTS electrician_tag BOOLEAN DEFAULT FALSE;
        CREATE TABLE IF NOT EXISTS level_progress (
          id SERIAL PRIMARY KEY,
          player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
          level_name VARCHAR(50) NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          attempts INTEGER DEFAULT 0,
          completed_at BIGINT,
          UNIQUE(player_id, level_name)
        );
        CREATE INDEX IF NOT EXISTS idx_level_progress_player ON level_progress(player_id);
        CREATE INDEX IF NOT EXISTS idx_level_progress_level ON level_progress(level_name);
      `)
      .then(async () => {
        // Ensure all players have rows for every level (handles newly added levels).
        const levels = ['chess', 'button', 'cursor', 'login', 'timer', 'checkmate', 'lights', 'race', 'cursed', 'bedroom', 'blue-dot', 'labyrinth', 'rubik', 'blacknet'];
        await Promise.all(
          levels.map((lvl) =>
            pool.query(
              `INSERT INTO level_progress (player_id, level_name)
               SELECT p.id, $1::varchar FROM players p
               WHERE NOT EXISTS (SELECT 1 FROM level_progress lp WHERE lp.player_id = p.id AND lp.level_name = $1::varchar)`,
              [lvl]
            )
          )
        );
      })
      .then(() => {
        console.log('✓ Database tables ready');
      })
      .catch((err: unknown) => {
        initPromise = null;
        const message = err instanceof Error ? err.message : String(err);
        console.error('✗ Database init failed:', message);
        throw err;
      });
  }

  await initPromise;
}

const db = {
  async query(text: string, params?: unknown[]) {
    if (!pool) {
      throw new Error(DB_NOT_CONFIGURED_ERROR);
    }
    await ensureInitialized();
    return pool.query(text, params);
  },
};

export const isDatabaseConfigured = Boolean(pool);
export function isDatabaseConfigurationError(err: unknown) {
  if (!(err instanceof Error)) {
    return false;
  }
  return err.message.includes(DB_NOT_CONFIGURED_ERROR) || err.message.includes('client password must be a string');
}

export { initPromise };
export default db;
