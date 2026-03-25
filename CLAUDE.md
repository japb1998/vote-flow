# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root, client, server)
npm install

# Run client + server concurrently (client :5173, server :3001)
npm run dev

# Run only server (with tsx watch)
npm run dev:server

# Run only client
npm run dev:client

# Build both client and server
npm run build

# Start production server
npm start

# Run server tests
cd server && npx jest

# Run a single test file
cd server && npx jest src/__tests__/join-closed-session.test.ts
```

## Architecture

Full-stack TypeScript app: React frontend communicating with Express backend via Socket.io WebSockets.

### Server (`server/src/`)
- **`index.ts`** — Express + Socket.io server setup, static file serving, health endpoint
- **`socket.ts`** — All Socket.io event handlers (create/join/vote/close session, name updates). This is the main business logic file
- **`store/`** — Session persistence layer with an interface (`interface.ts`) and two implementations: `sqlite.ts` (default) and `memory.ts`. Factory in `index.ts` selects based on `SESSION_STORE` env var
- **`voting/calculate.ts`** — Result calculation for all 4 voting methods (single, approval, ranked choice with instant-runoff, score)
- **`types/index.ts`** — Shared TypeScript types (Session, Vote, Results, socket payloads)
- **`utils/helpers.ts`** — Input validation, sanitization, session ID generation, rate limit checks
- **`__tests__/`** — Jest tests (ts-jest preset, tests must be in `__tests__/` and match `*.test.ts`)

### Client (`client/src/`)
- **`contexts/SocketContext.tsx`** — Central state management: Socket.io connection, all event listeners, session/voting state. This is the primary state file
- **`pages/HomePage.tsx`** — Create/join session UI
- **`pages/SessionPage.tsx`** — Active session: voting interface + live results
- **`components/`** — Reusable UI components, each with a co-located `.module.css` file
- **`types/index.ts`** — Client-side type definitions (mirrors server types)
- **`utils/export.ts`** — JSON/CSV export for results

### Communication Flow
Client ↔ Server communication is entirely through Socket.io events (not REST). Key events: `create-session`, `join-session`, `submit-vote`, `close-session`. The Vite dev server proxies `/socket.io` to the backend at port 3001.

### Data Storage
SQLite with WAL mode. Schema is initialized inline in `server/src/store/sqlite.ts` (no migration framework). Tables: `sessions`, `users`, `votes`, `ip_sessions`. Database file defaults to `./data/voteflow.db`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Server port |
| `DATABASE_PATH` | `./data/voteflow.db` | SQLite database path |
| `SESSION_STORE` | `sqlite` | Store type (`sqlite` or `memory`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins (comma-separated) |

## Conventions

- CSS Modules for all component styling (`.module.css` files)
- TypeScript strict mode in both client and server
- Functional React components only
- All socket logic lives in `SocketContext.tsx` on the client
- Voting calculations are server-side only (`server/src/voting/`)
- Input sanitization required for all user-provided strings
- Verify builds pass (`npm run build`) after changes