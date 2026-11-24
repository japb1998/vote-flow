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

# Run server tests (from repository root)
npm test

# Run a single test file
npm test -- src/__tests__/join-closed-session.test.ts
```

## Architecture

Full-stack TypeScript app: React frontend communicating with an Express + Socket.io backend supporting 8 voting methods (`single`, `approval`, `ranked`, `score`, `poker`, `dot`, `roman`, `fist-of-five`).

### Server (`server/src/`)
- **`index.ts`** — Express + Socket.io server setup, static file serving, security middleware (`helmet`, rate limiting, optional `TRUST_PROXY` and `ENFORCE_HTTPS`), `GET /health`, and `POST /api/parse-yaml`
- **`socket.ts`** — All Socket.io event handlers (`create-session`, `join-session`, `leave-session`, `submit-vote`, `close-session`, `update-user-name`, `disconnect`), per-socket authentication/authorization, and server-side vote validation. This is the main business logic file
- **`parseYaml.ts`** — Server-side YAML parsing (`parseYAML`, `parseSessionYAML`) using `js-yaml`, backing `POST /api/parse-yaml` for options and full-session imports
- **`store/`** — Session persistence layer with `SessionStore` interface (`interface.ts`), factory (`index.ts`) switching on `SESSION_STORE`, and two implementations: `sqlite.ts` (default) and `memory.ts`
- **`voting/`** — Per-method result calculators (`single.ts`, `approval.ts`, `ranked.ts`, `score.ts`, `poker.ts`, `dot.ts`, `roman.ts`, `fist-of-five.ts`) aggregated and dispatched via `voting/index.ts` (`calculateResults`)
- **`types/index.ts`** — Shared TypeScript types (`Session`, `SessionConfig`, `Vote`, `Results`, `VotingMethod`, socket payloads)
- **`utils/helpers.ts`** — Input validation, sanitization, session ID generation, Fibonacci sequence, capacity/rate limit checks
- **`jobs/cleanup-expired-sessions.ts`** — `node-cron` scheduled job to delete expired sessions from the store
- **`__tests__/`** — Jest tests (`ts-jest` preset, tests must be in `__tests__/` and match `*.test.ts`)

### Client (`client/src/`)
- **`contexts/SocketContext.tsx`** — Central state management: Socket.io connection, all event listeners, session/voting state. This is the primary state file
- **`pages/HomePage.tsx`** — Create/join session UI across all 8 voting methods, method-specific configuration, and bulk/file import
- **`pages/SessionPage.tsx`** — Active session: voting interface, live results, participant list, share/export controls
- **`components/`** — Reusable UI components with co-located `.module.css` files (including `BulkOptionInput.tsx`, `ResultsChart.tsx`, `VotingMethodInfo.tsx`, `ThemeToggle.tsx`, `PalettePicker.tsx`)
- **`utils/optionParsers.ts`** — Client-side Text/JSON parsing and `/api/parse-yaml` YAML integration for bulk/file imports
- **`utils/export.ts`** — JSON/CSV export for session results and votes
- **`types/index.ts`** — Client-side type definitions (mirrors server types)

### Communication Flow
Real-time session and voting communication runs over Socket.io (`create-session`, `join-session`, `leave-session`, `submit-vote`, `close-session`, `update-user-name`) with per-socket identity binding and server-side vote validation. Lightweight HTTP endpoints handle health checks (`GET /health`) and YAML parsing (`POST /api/parse-yaml`). The Vite dev server proxies `/socket.io` and `/api` to the backend at port 3001.

### Data Storage
Pluggable `SessionStore` defaulting to SQLite (`SESSION_STORE=sqlite`) in WAL mode, with an in-memory option (`SESSION_STORE=memory`). Schema is initialized inline in `server/src/store/sqlite.ts` (with additive column checks). Tables: `sessions`, `users`, `votes`, `ip_sessions`. Database file defaults to `./data/voteflow.db`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Server port |
| `DATABASE_PATH` | `./data/voteflow.db` | SQLite database path |
| `SESSION_STORE` | `sqlite` | Store type (`sqlite` or `memory`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` (dev) / same-origin (prod) | CORS origins (comma-separated) |
| `TRUST_PROXY` | `false` | Express `trust proxy` setting for reverse-proxy deployments |
| `ENFORCE_HTTPS` | `false` | Redirect HTTP traffic to HTTPS when enabled behind a TLS proxy |
| `ACTIVE_SESSION_TTL` | `86400000` (24h) | TTL for active sessions (ms) |
| `CLOSED_SESSION_TTL` | `1800000` (30min) | TTL for closed sessions (ms) |
| `CLEANUP_CRON` | `*/5 * * * *` (every 5min) | Cron schedule for session cleanup |

## Conventions

- CSS Modules for all component styling (`.module.css` files)
- TypeScript strict mode in both client and server
- Functional React components only
- All socket logic lives in `SocketContext.tsx` on the client
- Voting calculations are server-side only in per-method files under `server/src/voting/` dispatched through `server/src/voting/index.ts`
- Input sanitization, per-socket auth checks, and vote payload validation required on the server
- Verify builds pass (`npm run build`) and tests pass (`npm test`) after changes