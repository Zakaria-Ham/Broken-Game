# 🌐 Broken Internet

> **Something is wrong with the web...**

**Broken Internet** is a browser-based puzzle/adventure game built around a deliberately broken digital world.

Players create an account, enter the game, progress through a collection of strange and increasingly challenging levels, track their attempts and completion progress, and compete through a persistent global scoreboard.

The game combines **retro pixel aesthetics, interactive puzzles, web-inspired environments, and persistent player progression** into one connected experience.

---

## 🎮 Overview

The internet is broken.

Something has gone wrong beneath the surface of the web, and the player is pulled into a strange digital environment where familiar concepts become puzzles.

Instead of following a conventional linear game structure, **Broken Internet** uses a collection of themed levels that each experiment with a different interaction or mechanic.

Your objective is simple:

**Complete every level.**

Your progress is saved to your account, your attempts are tracked, and completing the entire game records your final completion time.

---

## ✨ Features

* 🕹️ **14 interactive levels**
* 🔐 **Player registration and login**
* 💾 **Persistent game progress**
* 📊 **Global scoreboard**
* ⏱️ **Completion-time tracking**
* 🔢 **Attempt tracking**
* 🏷️ **Unlockable player tags**
* 👤 **Player profiles**
* 🧩 **Multiple puzzle/gameplay concepts**
* 🎨 **Retro-inspired pixel interface**
* 🌑 **Dark cyber/digital visual aesthetic**
* ⚡ **Client-side interactive gameplay**
* 🗄️ **PostgreSQL-backed persistence**
* 🔌 **REST-style Next.js API routes**
* 📱 **Responsive browser interface**

---

# 🧑‍🚀 Player Experience

## 1. Enter the Broken Internet

The experience begins with a minimalist terminal-inspired landing screen.

The title appears with a glitch effect:

```text
BROKEN INTERNET

something is wrong with the web...

[ ENTER ]
```

The player enters the game through the `ENTER` button.

---

## 2. Create an Account

Before starting, players authenticate through the built-in login/register interface.

Two options are available:

* **Sign In** — return to an existing profile
* **Register** — create a new player profile

Usernames must contain at least 2 valid characters, while passwords must contain at least 3 characters.

Once registration or login succeeds, the player can enter the game.

---

## 3. Discover the Levels

The game contains **14 tracked levels**:

|  # | Level     |
| -: | --------- |
| 01 | Chess     |
| 02 | Button    |
| 03 | Cursor    |
| 04 | Login     |
| 05 | Timer     |
| 06 | Checkmate |
| 07 | Lights    |
| 08 | Race      |
| 09 | Cursed    |
| 10 | Bedroom   |
| 11 | Blue Dot  |
| 12 | Labyrinth |
| 13 | Rubik     |
| 14 | Blacknet  |

Each level is represented independently in the progression system, allowing the game to track completion and attempts separately.

---

## 🧩 Gameplay Philosophy

Broken Internet is designed around **unexpected interactions**.

Rather than relying purely on traditional movement or combat mechanics, the levels can challenge the player's:

* Observation
* Timing
* Reaction
* Problem solving
* Pattern recognition
* Navigation
* Interaction with the interface
* Ability to understand unusual game rules

The goal is to make the player question what the interface is telling them.

---

# 🕹️ Intro Gameplay

Before entering the main game experience, the project includes an interactive canvas-based introduction.

The player controls a small pixel character inside a side-scrolling environment.

### Controls

| Key     | Action     |
| ------- | ---------- |
| `A`     | Move left  |
| `D`     | Move right |
| `←`     | Move left  |
| `→`     | Move right |
| `W`     | Jump       |
| `↑`     | Jump       |
| `SPACE` | Jump       |

The introduction uses a custom HTML5 Canvas game loop with:

* Character movement
* Gravity
* Jump physics
* Platform collision
* Camera following
* Collectible coins
* Parallax background elements
* Animated coins
* Pixel-art rendering

---

## 🪙 The Coin Mechanic

The introduction contains six coins.

The player must collect all six coins to unlock the next part of the environment.

The final coin does not immediately appear.

After collecting the first five coins, the player must wait **10 seconds** for the sixth coin to appear.

Once all six coins are collected, the danger area opens.

This creates a deliberately unusual interaction where the player must recognize that the game is not behaving like a conventional platformer.

---

## ⚠️ The Danger Hole

After collecting all six coins, a hole opens in the ground.

The player can fall through it.

The environment also contains a large carton wall acting as a barrier.

If the player falls into the hole, the game displays:

```text
you fell into the internet...

entering the underground...
```

The experience then transitions to the main hub.

---

# 🏆 Progression System

Player progression is stored persistently in PostgreSQL.

For every player, the application can track:

* Username
* Number of completed levels
* Total attempts
* Game start time
* Game completion time
* Level-by-level completion
* Level-by-level attempts
* Unlocked tags
* Active player tag

This means progress is associated with the player's account rather than being limited to temporary browser state.

---

## 📈 Level Progress

Each level has its own progress record.

A level can contain:

```text
completed
attempts
completed_at
```

The backend automatically updates the player's overall statistics when a level is completed.

When all 14 levels are completed, the player's overall completion timestamp is recorded.

---

# 🏅 Tags

The game includes an unlockable tag system.

Player profiles can contain:

* Unlocked tags
* Active tag
* Special electrician status

The backend supports unlocking tags and changing the currently active tag.

The `electricien` tag is specifically represented by the electrician status stored in the player profile.

---

# 🥇 Scoreboard

Broken Internet includes a persistent global scoreboard.

The scoreboard exposes:

* Username
* Levels completed
* Total attempts
* Completion timestamp
* Total completion time
* Player tags
* Active tag

Completed players are prioritized, followed by completion time, number of completed levels, and attempts.

This allows players to compete not only by finishing the game, but by finishing it efficiently.

---

# 🛠️ Developer Overview

## Tech Stack

| Technology                 | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| **Next.js 16**             | Full-stack web framework                  |
| **React 19**               | User interface and interactive components |
| **TypeScript**             | Type-safe application development         |
| **PostgreSQL**             | Persistent player and progression data    |
| **Node.js**                | JavaScript runtime                        |
| **HTML5 Canvas**           | Interactive game rendering                |
| **Next.js Route Handlers** | Backend API                               |
| **ESLint**                 | Code quality and linting                  |

The project uses the **Next.js App Router** architecture.

---

# 🏗️ Architecture

The project combines three major layers.

```text
┌──────────────────────────────┐
│          Browser UI          │
│                              │
│ React / Next.js / Canvas     │
└──────────────┬───────────────┘
               │
               │ HTTP Requests
               ▼
┌──────────────────────────────┐
│       Next.js API Layer      │
│                              │
│ /api/auth                    │
│ /api/progress                │
│ /api/scoreboard              │
└──────────────┬───────────────┘
               │
               │ SQL
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
│                              │
│ players                      │
│ level_progress               │
└──────────────────────────────┘
```

---

# 🔐 Authentication

Authentication is implemented through the Next.js API layer.

The authentication endpoint supports:

```text
POST /api/auth
```

with actions for:

```text
login
register
```

The backend validates the username and password, checks for existing users during registration, and returns player information after successful authentication.

Passwords are transformed into a SHA-256 hash before being stored rather than being stored directly as plaintext.

> **Production security note:** For a production deployment, authentication should use a modern password-hashing algorithm such as Argon2id or bcrypt, together with proper sessions/tokens, rate limiting, and secure authentication practices.

---

# 📡 API

## Authentication

### `POST /api/auth`

Supported actions:

```text
login
register
```

Example request:

```json
{
  "action": "login",
  "username": "player",
  "password": "password"
}
```

---

## Progress

### `POST /api/progress`

Supported actions:

```text
get_progress
complete_level
add_attempt
start_timer
reset
set_electrician_tag
unlock_tag
set_active_tag
```

Example:

```json
{
  "action": "complete_level",
  "username": "player",
  "level_name": "chess"
}
```

The endpoint validates level names against the game's 14-level list and updates the player's statistics accordingly.

---

## Scoreboard

### `GET /api/scoreboard`

Returns the current global scoreboard.

Example response:

```json
{
  "scoreboard": []
}
```

The scoreboard calculates total completion time from the player's start and completion timestamps and sorts completed players ahead of unfinished players.

---

# 🗄️ Database

Broken Internet uses PostgreSQL for persistent game data.

## Database

The default database name is:

```text
broken_internet
```

---

## Database Schema

### `players`

Stores the player's main profile and global statistics.

```text
players
├── id
├── username
├── password_hash
├── levels_completed
├── total_attempts
├── electrician_tag
├── unlocked_tags
├── active_tag
├── started_at
├── completed_at
├── created_at
└── updated_at
```

### `level_progress`

Stores progress for individual levels.

```text
level_progress
├── id
├── player_id
├── level_name
├── completed
├── attempts
└── completed_at
```

The database also defines indexes for player and level lookups.

---

# 🔄 Automatic Database Initialization

The application contains a database initialization layer in:

```text
lib/db.ts
```

When the database connection is configured, the application can automatically create the required tables and indexes.

It also ensures that existing players receive progress records for newly added levels.

A manual schema bootstrap is still available through:

```text
schema.sql
```

This makes local setup easier while allowing the application to maintain its schema requirements when new levels are introduced.

---

# 📁 Project Structure

The important application areas are organized around the Next.js App Router:

```text
broken-internet/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts
│   │   │
│   │   ├── progress/
│   │   │   └── route.ts
│   │   │
│   │   └── scoreboard/
│   │       └── route.ts
│   │
│   ├── context/
│   │   └── GameContext.tsx
│   │
│   ├── intro/
│   │   └── page.tsx
│   │
│   └── ...
│
├── lib/
│   └── db.ts
│
├── public/
│   └── ...
│
├── schema.sql
├── package.json
├── tsconfig.json
├── next.config.*
└── ...
```

The exact implementation can evolve as new levels and game systems are added.

---

# ⚙️ Requirements

Before running the project locally, install:

* **Node.js 20+**
* **npm 10+**
* **PostgreSQL 14+**
* **Git**

The repository currently specifies Next.js `16.1.6`, React `19.2.3`, PostgreSQL support through the `pg` package, and TypeScript.

Check your installed versions:

```bash
node -v
npm -v
psql --version
```

---

# 🚀 Installation

## 1. Clone the repository

```bash
git clone https://github.com/Zakaria-Ham/Broken-Game.git
```

Move into the project:

```bash
cd Broken-Game/broken-internet
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Create the PostgreSQL database

Create a database named:

```text
broken_internet
```

Using `createdb`:

```bash
createdb -U postgres broken_internet
```

Or through `psql`:

```bash
psql -U postgres -c "CREATE DATABASE broken_internet;"
```

You can also create the database through **pgAdmin**.

---

# 🔑 Environment Variables

Create:

```text
.env.local
```

in the project root.

Add:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/broken_internet
```

Replace:

```text
postgres
```

with your PostgreSQL username if necessary.

Replace:

```text
YOUR_PASSWORD
```

with your PostgreSQL password.

If PostgreSQL is running on another host or port, update the connection string accordingly.

### Important

Never commit `.env.local` or expose your database credentials publicly.

---

# 🧱 Initialize the Database

For a manual schema setup:

```bash
psql -U postgres -d broken_internet -f schema.sql
```

The schema creates the required `players` and `level_progress` tables together with their indexes.

The application also contains automatic database initialization, so the schema can be created when the application first accesses the database.

---

# 💻 Run the Development Server

Start the development environment:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 📜 Available Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Create a production build    |
| `npm run start` | Start the production server  |
| `npm run lint`  | Run ESLint                   |

These scripts are defined directly in the project's `package.json`.

---

# 🔎 Verify the API

After starting the application, the scoreboard API can be tested directly:

```text
http://localhost:3000/api/scoreboard
```

If the database is correctly configured, a new installation with no players will return:

```json
{
  "scoreboard": []
}
```

If the database is not configured, the API reports a `503` database configuration error.

---

# 🧪 Development Workflow

A typical development workflow is:

```text
1. Start PostgreSQL
        ↓
2. Configure .env.local
        ↓
3. Run npm install
        ↓
4. Run npm run dev
        ↓
5. Open localhost:3000
        ↓
6. Register a player
        ↓
7. Play and test levels
        ↓
8. Verify progress
        ↓
9. Check scoreboard
```

When adding a new level, the progression system should also be updated so that the backend recognizes the new level and initializes its progress records.

The current level registry is shared by the authentication/progress/database initialization logic.

---

# 🎨 Design Direction

The visual identity of Broken Internet is built around a retro digital aesthetic.

Key characteristics include:

* Dark backgrounds
* Pixel-style typography
* Terminal-inspired text
* Neon green accents
* Purple interface accents
* Red danger states
* Glitch effects
* Pixel-art graphics
* Minimal interface elements
* Cyber/underground atmosphere

The introductory game scene uses a dark gradient sky, stars, parallax mountains, pixel-art terrain, collectible coins, danger signage, and a custom pixel character.

---

# 🧠 Technical Highlights

## HTML5 Canvas Game Loop

The introductory platform section is rendered using a native HTML5 Canvas.

The game maintains:

```text
Player position
Velocity
Gravity
Jump state
Facing direction
Animation state
Camera position
Coin state
Collision state
```

The scene is continuously updated using:

```text
requestAnimationFrame()
```

This provides a lightweight real-time rendering loop directly in the browser.

---

## Physics

The intro sequence uses simple custom physics.

The current implementation includes:

```text
Gravity = 0.5
Jump force = -10
Movement speed = 3.5
```

The player is affected by vertical velocity and can jump when grounded. Platform and ground collision logic determines when the player lands.

---

## Camera System

The camera follows the player's horizontal position.

Rather than instantly moving the camera, the implementation interpolates toward a target position, producing smoother movement through the environment.

---

# 📊 Progress Tracking

The backend keeps global statistics such as:

```text
levels_completed
total_attempts
started_at
completed_at
```

At the level level, it records:

```text
level_name
completed
attempts
completed_at
```

This enables features such as:

* Continue where you left off
* Track completed levels
* Track failed attempts
* Calculate completion time
* Build a global leaderboard
* Detect full-game completion

---

# 🏁 Full Completion

The game considers the complete level set finished when all **14 registered levels** are completed.

At that point, the player's completion timestamp can be stored and used by the scoreboard to calculate their total completion time.

---

# 🐛 Error Handling

The backend handles several common situations, including:

* Missing username/password
* Invalid usernames
* Short passwords
* Existing usernames
* Invalid login credentials
* Unknown players
* Invalid level names
* Locked tags
* Missing database configuration
* Internal server errors

API responses use appropriate HTTP status codes such as:

```text
400 Bad Request
401 Unauthorized
404 Not Found
409 Conflict
503 Service Unavailable
500 Internal Server Error
```

---

# 🔒 Security Considerations

The project is currently structured as a game project rather than a production authentication platform.

Before deploying publicly, consider adding:

* Strong password hashing such as Argon2id
* Secure session management
* HTTP-only cookies
* CSRF protection where applicable
* Rate limiting
* Login attempt protection
* Input validation on every endpoint
* Database connection security
* Production environment variables
* HTTPS
* Proper authorization checks
* Secure password reset functionality

The current implementation performs username sanitization and parameterized SQL queries, which helps prevent malformed input and SQL injection through the demonstrated query paths.

---

# 🚧 Known Limitations

Broken Internet is an evolving game project.

Potential areas for future improvement include:

* More sophisticated authentication/session handling
* More advanced game physics
* Additional levels
* Expanded tag system
* More detailed player statistics
* Sound effects and music
* Mobile/touch controls
* More extensive accessibility support
* Improved production security
* Automated testing
* CI/CD
* Expanded leaderboard features

---

# 🗺️ Roadmap

Potential future milestones:

### Gameplay

* [ ] Add more levels
* [ ] Add new puzzle mechanics
* [ ] Add additional interactive environments
* [ ] Add sound effects
* [ ] Add background music
* [ ] Add additional animations
* [ ] Add difficulty progression

### Player System

* [ ] Expand player profiles
* [ ] Add more unlockable tags
* [ ] Add achievements
* [ ] Add personal statistics
* [ ] Add level-specific best times

### Competitive Features

* [ ] Improved leaderboard
* [ ] Fastest completion rankings
* [ ] Level-specific rankings
* [ ] Achievement rankings

### Technical

* [ ] Automated tests
* [ ] Improved authentication security
* [ ] Production deployment configuration
* [ ] CI/CD pipeline
* [ ] Better error monitoring

---

# 🤝 Contributing

Contributions are welcome.

To contribute:

### 1. Fork the repository

```bash
git fork
```

or use GitHub's **Fork** button.

### 2. Create a branch

```bash
git checkout -b feature/my-feature
```

### 3. Make your changes

Test the game locally and verify that existing levels and progression still work.

### 4. Commit your changes

```bash
git add .
git commit -m "feat: add new game feature"
```

### 5. Push your branch

```bash
git push origin feature/my-feature
```

### 6. Open a Pull Request

Describe:

* What changed
* Why it was changed
* How it was tested
* Any new dependencies
* Any database changes

---

# 📌 Database Changes

If a contribution modifies the database structure:

1. Update `schema.sql`
2. Update the automatic initialization logic
3. Ensure existing players remain compatible
4. Test a fresh database
5. Test an existing database
6. Document any migration requirements

This is particularly important because the application automatically ensures that player progress rows exist for the current level set.

---

# 🧑‍💻 Local Development Checklist

Before considering a feature complete:

```text
[ ] PostgreSQL is running
[ ] DATABASE_URL is configured
[ ] Dependencies are installed
[ ] Development server starts
[ ] Registration works
[ ] Login works
[ ] Game loads
[ ] Level can be completed
[ ] Failed attempts are recorded
[ ] Progress persists after refresh
[ ] Scoreboard updates
[ ] Existing levels still work
[ ] npm run lint passes
[ ] npm run build succeeds
```

---

# 📷 Screenshots

Add screenshots of the main game screens here.

Recommended screenshots:

```text
Landing Screen
     ↓
Authentication
     ↓
Game Hub
     ↓
Level Gameplay
     ↓
Scoreboard
     ↓
Completed Game
```

Example:

```md
![Broken Internet Landing Screen](./screenshots/landing.png)

![Broken Internet Gameplay](./screenshots/gameplay.png)

![Broken Internet Scoreboard](./screenshots/scoreboard.png)
```

---

# 🌐 Repository

**GitHub:**
https://github.com/Zakaria-Ham/Broken-Game

**Project:**
`broken-internet`

---

# 📄 License

Add the project's license here if/when one is selected.

For example:

```text
This project is licensed under the MIT License.
```

If the repository does not currently contain a license file, do not claim that the project is MIT licensed until one is actually added.

---

# 👤 Author

**Zakaria-Ham**

GitHub:
https://github.com/Zakaria-Ham

---

# ⭐ Support the Project

If you enjoyed **Broken Internet**:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest new puzzle ideas
* 🤝 Contribute improvements
* 🔀 Open a Pull Request

---

<div align="center">

### 🌐 BROKEN INTERNET

**Something is wrong with the web...**

*Enter the underground.*

</div>
