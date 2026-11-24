# VoteFlow

Real-time collaborative voting application with multiple voting mechanisms.

## Project Structure

```
vote-flow/
├── client/          # React + TypeScript frontend (Vite)
├── server/          # Node.js + Express + Socket.io backend
├── package.json     # Root workspace (concurrently)
├── Dockerfile       # Multi-stage production container build
├── README.md        # User documentation
├── log.md           # Changelog of features
├── AGENTS.md        # This file
├── CLAUDE.md        # Claude Code guidance
└── GEMINI.md        # Gemini project context
```

## Commands

```bash
# Install dependencies (root, client, and server)
npm install

# Development (runs client + server)
npm run dev

# Build both client and server
npm run build

# Start production server
npm start

# Run server Jest test suite
npm test
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router, Socket.io Client, CSS Modules, PrismJS, react-simple-code-editor
- **Backend**: Node.js, Express, Socket.io, SQLite (`sqlite`/`sqlite3`), `js-yaml`, `node-cron`, Helmet, `express-rate-limit`
- **Dev & Test**: tsx, concurrently, TypeScript, Jest, `ts-jest`

## Voting Methods

All 8 voting methods are implemented as per-method modules in `server/src/voting/` and dispatched through `server/src/voting/index.ts` (`calculateResults`):

1. **`single`** (`server/src/voting/single.ts`) - Single Choice (Plurality)
2. **`approval`** (`server/src/voting/approval.ts`) - Approval Voting
3. **`ranked`** (`server/src/voting/ranked.ts`) - Ranked Choice (Instant-Runoff)
4. **`score`** (`server/src/voting/score.ts`) - Score Voting (1–5)
5. **`poker`** (`server/src/voting/poker.ts`) - Planning Poker (Fibonacci range, default 1–89; no custom options)
6. **`dot`** (`server/src/voting/dot.ts`) - Dot Voting (configurable dot budget, default 3)
7. **`roman`** (`server/src/voting/roman.ts`) - Roman Voting (thumbs up / down / sideways; no custom options)
8. **`fist-of-five`** (`server/src/voting/fist-of-five.ts`) - Fist of Five (1–5 confidence scale; no custom options)

## Features Implemented

- Real-time voting with Socket.io
- 8 voting mechanisms with method-specific visualizations and metrics
- Bulk and file import for options and full sessions (Text, JSON, YAML via `POST /api/parse-yaml`)
- Live results with visual charts
- Session management (create/join/leave/close)
- Share buttons (copy ID or clean link)
- Export to JSON/CSV
- Name entry modal + inline name change
- Participant list
- Light/dark theme toggle + 9 color palettes
- Pluggable persistence (SQLite default, optional in-memory store) with TTL expiration and `node-cron` cleanup
- Security: Helmet, rate limiting, input sanitization/validation, per-socket authentication, server-side vote validation, configurable `TRUST_PROXY` and `ENFORCE_HTTPS`

## HTTP Endpoints

- `GET /health` - Server health check
- `POST /api/parse-yaml` - Server-side YAML parser (`server/src/parseYaml.ts`) supporting options-only and full-session import

## Socket Events

### Client → Server
- `create-session` - Create new session
- `join-session` - Join or reconnect to an existing session
- `leave-session` - Leave the current session room and clean up socket association
- `submit-vote` - Submit or update vote (validated server-side against session method, options, and config)
- `close-session` - Close voting (verified against authenticated creator socket)
- `update-user-name` - Change display name (verified against authenticated socket identity)

### Server → Client
- `session-created` / `session-joined`
- `vote-submitted` / `results-updated`
- `session-updated`
- `user-joined` / `user-left` / `user-name-updated`
- `error`

### Socket Security & Validation
- Per-socket authentication binds each connected socket to its joined session and `userId`, preventing cross-user spoofing on voting, renaming, leaving, and closing sessions.
- Vote payloads are validated on the server against the active session's `votingMethod`, option IDs, and method-specific configuration (e.g., Planning Poker card range, Dot Voting dot budget).

## Server State & Storage

Session persistence is abstracted behind the `SessionStore` interface (`server/src/store/interface.ts`) and instantiated by `createStore()` in `server/src/store/index.ts` based on `SESSION_STORE`:

- **`sqlite` (default)** — `server/src/store/sqlite.ts` (WAL mode, tables: `sessions`, `users`, `votes`, `ip_sessions`, path via `DATABASE_PATH` defaulting to `./data/voteflow.db`)
- **`memory`** — `server/src/store/memory.ts` (in-memory `Map` store)

Active sessions expire after `ACTIVE_SESSION_TTL` (default 24 hours) and closed sessions expire after `CLOSED_SESSION_TTL` (default 30 minutes). Expired sessions are purged by `server/src/jobs/cleanup-expired-sessions.ts` on `CLEANUP_CRON` (default every 5 minutes).

## Conventions

- Use CSS Modules for styling
- TypeScript strict mode
- Functional React components
- Socket logic in `client/src/contexts/SocketContext.tsx`
- Voting calculations in per-method modules under `server/src/voting/` with entrypoint `server/src/voting/index.ts`

## Preferences

- Always verify builds pass (`npm run build`) and tests pass (`npm test`) after changes
- Keep code clean and readable
- Add security considerations for any user input
