# VoteFlow

Real-time collaborative voting application with multiple voting mechanisms.

## Project Structure

```
vote-flow/
├── client/          # React + TypeScript frontend (Vite)
├── server/          # Node.js + Express + Socket.io backend
├── package.json     # Root workspace (concurrently)
├── README.md       # User documentation
├── log.md          # Changelog of all features
├── SPEC.md         # Full specification
└── AGENTS.md       # This file
```

## Commands

```bash
# Install dependencies
npm install

# Development (runs client + server)
npm run dev

# Build both
npm run build

# Start production
npm start
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router, Socket.io Client, CSS Modules
- **Backend**: Node.js, Express, Socket.io, UUID, Helmet, express-rate-limit
- **Dev**: tsx, concurrently, TypeScript

## Voting Methods

1. **single** - Single Choice (Plurality)
2. **approval** - Approval Voting
3. **ranked** - Ranked Choice (Instant-Runoff)
4. **score** - Score Voting (1-5)

## Features Implemented

- Real-time voting with Socket.io
- 4 voting mechanisms
- Live results with visual charts
- Session management (create/join/close)
- Share buttons (copy ID or link)
- Export to JSON/CSV
- Name entry modal + name change
- Participant list
- Session TTL (30 min after close)
- Security: Helmet, rate limiting, input validation, XSS prevention

## Socket Events

### Client → Server
- `create-session` - Create new session
- `join-session` - Join existing session
- `submit-vote` - Submit vote
- `close-session` - Close voting (creator only)
- `update-user-name` - Change display name

### Server → Client
- `session-created` / `session-joined`
- `vote-submitted` / `results-updated`
- `session-updated`
- `user-joined` / `user-left` / `user-name-updated`
- `error`

## Server State

Sessions stored in-memory with Map:
```typescript
const sessions = new Map<string, Session>();
const sessionUsers = new Map<string, Map<string, UserInfo>>();
```

Closed sessions auto-expire after 30 minutes.

## Conventions

- Use CSS Modules for styling
- TypeScript strict mode
- Functional React components
- Socket logic in SocketContext
- Voting calculations in server/src/voting/

## Preferences

- Always verify builds pass (npm run build) after changes
- Keep code clean and readable
- Add security considerations for any user input
