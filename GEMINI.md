# VoteFlow Project Context

Real-time collaborative voting application with multiple voting mechanisms (Single Choice, Approval, Ranked Choice, Score Voting).

## Project Overview

VoteFlow is a full-stack TypeScript application designed for real-time voting sessions. It uses a modern tech stack to ensure instant updates across all connected clients.

- **Frontend**: React 18, TypeScript, Vite, React Router, Socket.io Client.
- **Backend**: Node.js, Express, Socket.io, TypeScript.
- **Storage**: Pluggable storage system supporting both in-memory and SQLite (default).
- **Architecture**: A monorepo-like structure where the root `package.json` manages both `client/` and `server/` via `concurrently`.

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Commands
- **Install Dependencies**: `npm install` (installs both client and server dependencies)
- **Development**: `npm run dev` (starts both client at http://localhost:5173 and server at http://localhost:3001)
- **Production Build**: `npm run build`
- **Start Production**: `npm start` (starts the built server)
- **Testing**: `npm test` (runs Jest tests in the server)

## Development Conventions

### General
- **TypeScript**: Strict typing is preferred. Use interfaces/types defined in `types/index.ts` (both client and server have their own).
- **Clean Code**: Keep functions small and focused. Add JSDoc comments to complex logic (e.g., voting calculations).

### Frontend (`client/`)
- **Styling**: Use **CSS Modules** (`*.module.css`) for component-specific styles.
- **Components**: Functional components with hooks.
- **State Management**: Use React Context for global state (e.g., `SocketContext`).
- **Socket Logic**: Centralized in `client/src/contexts/SocketContext.tsx`.

### Backend (`server/`)
- **API/Sockets**: Most communication happens over WebSockets via Socket.io. Handlers are located in `server/src/socket.ts`.
- **Storage**: Abstracted by `SessionStore` interface. Implementation defaults to SQLite (`server/src/store/sqlite.ts`).
- **Voting Logic**: Complex voting algorithms (like Ranked Choice) are isolated in `server/src/voting/calculate.ts`.
- **Security**: Uses `helmet`, `express-rate-limit`, and input validation.

### Testing
- Server-side tests use **Jest**. Tests are located in `server/src/__tests__/`.

## Key Files
- `server/src/index.ts`: Server entry point.
- `server/src/socket.ts`: Socket event handlers.
- `server/src/store/sqlite.ts`: SQLite database schema and operations.
- `client/src/App.tsx`: Main React component and routing.
- `client/src/contexts/SocketContext.tsx`: Socket.io connection and provider.
- `TASK.md`: Current backlog and pending improvements.
- `AGENTS.md`: High-level project summary for AI assistants.
