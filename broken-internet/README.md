# Broken Internet

Broken Internet is a browser puzzle game built with Next.js and PostgreSQL.

This README explains everything you need to run the project after cloning from GitHub, including database setup.

## Stack

- Next.js 16 (App Router)
- React 19
- PostgreSQL
- TypeScript

## Prerequisites

Install these first:

- Node.js 20+ (Node 22 LTS recommended)
- npm 10+
- PostgreSQL 14+ (local or remote)
- Git

Check versions:

```bash
node -v
npm -v
psql --version
```

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd broken-internet
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create PostgreSQL database

Create a database named `broken_internet`.

### Option A: psql command line

```bash
createdb -U postgres broken_internet
```

If `createdb` is not available:

```bash
psql -U postgres -c "CREATE DATABASE broken_internet;"
```

### Option B: pgAdmin

Create a new database:

- Name: `broken_internet`
- Owner: your PostgreSQL user (often `postgres`)

## 4. Create environment file

Create `.env.local` in the project root and add:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/broken_internet
```

Notes:

- Replace `postgres` and `YOUR_PASSWORD` with your real PostgreSQL username/password.
- If PostgreSQL is not on localhost or uses another port, update host/port.
- Keep `.env.local` private; do not commit it.

## 5. Initialize schema

Run the SQL schema file:

```bash
psql -U postgres -d broken_internet -f schema.sql
```

This creates:

- `players` table
- `level_progress` table
- related indexes

Important:

- The app also has auto-initialization on first DB query, but running `schema.sql` manually is recommended for first-time setup.

## 6. Start the app

```bash
npm run dev
```

Open:

- http://localhost:3000

## 7. Verify API and DB connection

Quick check in browser:

- http://localhost:3000/api/scoreboard

Expected result when connected:

```json
{
	"scoreboard": []
}
```

If database is not configured, API returns a `503` error.

## Available scripts

```bash
npm run dev    # start development server
npm run build  # create production build
npm run start  # run production server
npm run lint   # run ESLint
```

## Project structure (important parts)

- `app/api/auth/route.ts` - login/register API
- `app/api/progress/route.ts` - progress tracking API
- `app/api/scoreboard/route.ts` - leaderboard API
- `lib/db.ts` - PostgreSQL connection + initialization
- `schema.sql` - manual DB schema bootstrap

## Troubleshooting

### Error: Database is not configured

Cause:

- `DATABASE_URL` missing or invalid.

Fix:

1. Confirm `.env.local` exists in project root.
2. Confirm `DATABASE_URL` is correct.
3. Restart dev server after changing env vars.

### Error: client password must be a string

Cause:

- Connection string is malformed or password is missing.

Fix:

1. Re-check `DATABASE_URL` format.
2. Ensure password section is present.

### Error connecting with psql on Windows

Try explicit host and port:

```bash
psql -h localhost -p 5432 -U postgres -d broken_internet -f schema.sql
```

If prompted for password, enter your PostgreSQL password.

## Production notes

- Set `DATABASE_URL` in your hosting environment.
- Run `npm run build` before `npm run start`.
- Ensure PostgreSQL network access/firewall rules allow your app host.

## License

Add your preferred license here (MIT, Apache-2.0, etc.).
