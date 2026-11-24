# VoteFlow Project Context

Real-time collaborative voting application with 8 voting mechanisms: Single Choice (`single`), Approval (`approval`), Ranked Choice (`ranked`), Score Voting (`score`), Planning Poker (`poker`), Dot Voting (`dot`), Roman Voting (`roman`), and Fist of Five (`fist-of-five`).

## Project Overview

VoteFlow is a full-stack TypeScript application designed for real-time voting sessions. It uses a modern tech stack to ensure instant updates across all connected clients.

- **Frontend**: React 18, TypeScript, Vite, React Router, Socket.io Client, CSS Modules, PrismJS (`react-simple-code-editor`).
- **Backend**: Node.js, Express, Socket.io, TypeScript, `js-yaml`, `node-cron`, Helmet, `express-rate-limit`.
- **Storage**: Pluggable `SessionStore` supporting SQLite (default, WAL mode) and in-memory storage via `SESSION_STORE`.
- **Architecture**: A monorepo-like structure where the root `package.json` manages both `client/` and `server/` via `concurrently`.

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Commands
- **Install Dependencies**: `npm install` (installs root, client, and server dependencies)
- **Development**: `npm run dev` (starts both client at http://localhost:5173 and server at http://localhost:3001)
- **Production Build**: `npm run build`
- **Start Production**: `npm start` (starts the built server)
- **Testing**: `npm test` (runs Jest tests in `server/` via root script)

## Development Conventions

### General
- **TypeScript**: Strict typing is preferred. Use interfaces/types defined in `types/index.ts` (both client and server have their own).
- **Clean Code**: Keep functions small and focused. Add JSDoc comments to complex logic (e.g., voting calculations).

### Frontend (`client/`)
- **Styling**: Use **CSS Modules** (`*.module.css`) for component-specific styles. Supports light/dark mode (`ThemeToggle`) and 9 color palettes (`PalettePicker`).
- **Components**: Functional components with hooks, including `BulkOptionInput` for Text/JSON/YAML bulk and file imports.
- **State Management**: Use React Context for global state (`SocketContext`).
- **Socket Logic**: Centralized in `client/src/contexts/SocketContext.tsx`.

### Backend (`server/`)
- **Sockets & API**: Real-time session/voting communication happens over WebSockets via Socket.io in `server/src/socket.ts` (`create-session`, `join-session`, `leave-session`, `submit-vote`, `close-session`, `update-user-name`, `disconnect`), with per-socket authentication and server-side vote validation. HTTP routes in `server/src/index.ts` expose `GET /health` and `POST /api/parse-yaml` (backed by `server/src/parseYaml.ts`).
- **Storage**: Abstracted by `SessionStore` (`server/src/store/interface.ts`) with factory `server/src/store/index.ts` selecting via `SESSION_STORE` between SQLite default (`server/src/store/sqlite.ts`) and in-memory (`server/src/store/memory.ts`). Scheduled cleanup runs via `server/src/jobs/cleanup-expired-sessions.ts`.
- **Voting Logic**: Implemented as per-method modules in `server/src/voting/` (`single.ts`, `approval.ts`, `ranked.ts`, `score.ts`, `poker.ts`, `dot.ts`, `roman.ts`, `fist-of-five.ts`) and dispatched from `server/src/voting/index.ts` (`calculateResults`).
- **Security**: Uses `helmet`, `express-rate-limit`, input sanitization/validation, per-socket identity verification, server-side vote validation, and configurable `TRUST_PROXY` / `ENFORCE_HTTPS`.

### Testing
- Server-side tests use **Jest** (`ts-jest`). Tests are located in `server/src/__tests__/` and run with `npm test` from the repository root.

## Key Files
- `server/src/index.ts`: Server entry point, middleware, `/health`, and `/api/parse-yaml`.
- `server/src/socket.ts`: Socket event handlers, per-socket auth, and vote validation.
- `server/src/parseYaml.ts`: Server-side YAML parser for bulk/session imports.
- `server/src/voting/index.ts`: Dispatcher for all 8 per-method voting modules in `server/src/voting/`.
- `server/src/store/sqlite.ts`: Default SQLite database schema and operations (`server/src/store/memory.ts` for in-memory option).
- `server/src/jobs/cleanup-expired-sessions.ts`: Scheduled expired-session cleanup (`node-cron`).
- `client/src/App.tsx`: Main React component and routing.
- `client/src/contexts/SocketContext.tsx`: Socket.io connection and provider.
- `AGENTS.md` / `CLAUDE.md`: Repository summaries and guidance for AI assistants.
