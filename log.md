# VoteFlow Changelog

All changes and features added to the VoteFlow project.

---

## Initial Setup

### Project Structure
- Full-stack TypeScript application
- **Frontend**: React 18 + TypeScript + Vite (port 5173)
- **Backend**: Node.js + Express + Socket.io (port 3001)
- Real-time WebSocket communication via Socket.io

### Voting Mechanisms Implemented
1. **Single Choice (Plurality)** - Vote for one option, most votes wins
2. **Approval Voting** - Vote for all approved options, most approvals wins
3. **Ranked Choice (IRV)** - Rank all options, eliminate lowest until majority winner
4. **Score Voting (Range)** - Rate 1-5, highest total score wins

---

## Feature: Back Button Fix

**Problem**: Back button didn't properly clear session state, causing immediate redirect back to session.

**Solution**:
- Added `leaveSession()` function to SocketContext
- Clears currentSession, userId, userName, results, and users state
- Properly disconnects from session before navigating away

---

## Feature: Name Entry & Name Change

**Problem**: Used browser `prompt()` for name entry, poor UX.

**Solution**:
- Created proper modal UI for initial name entry when joining a session
- Added pencil icon (✏️) next to user's name in participants list
- Click to edit name inline
- Name changes broadcast to all participants in real-time

**Server Changes**:
- Added `update-user-name` socket event
- Added `user-name-updated` broadcast event

---

## Feature: Duplicate Participants Fix

**Problem**: Updating vote added new participant instead of updating existing.

**Solution**:
- Fixed SocketContext `vote-submitted` handler to use functional state update
- Now correctly updates existing user instead of adding duplicate

---

## Feature: Voting Method Explanation Cards

**Added Components**:
- `VotingMethodInfo.tsx` - Collapsible info card for selected method
- `VotingMethodInfoStandalone.tsx` - Full list of all methods on home page

**Information Provided**:
- Single Choice: Best for simple decisions
- Approval: Best for selecting multiple winners
- Ranked Choice: Best for elections
- Score Voting: Best for rating-based decisions

---

## Feature: README Documentation

Created comprehensive `README.md` with:
- Installation instructions
- Development commands
- Usage guide for all features
- Explanation of each voting method
- Technologies used (frontend, backend, development tools)

---

## Feature: Security Measures

### Server (index.ts)
- **Helmet** - Security headers (CSP, etc.)
- **Rate limiting** - 1000 requests per 15 min per IP
- **Request size limit** - 100KB max payload
- **CORS** - Configurable allowed origins via ALLOWED_ORIGINS env var
- **Socket connection limits** - Max 50 connections per IP
- **Socket timeouts** - Proper HTTP timeout settings
- **Compression disabled** - Prevents compression attacks

### Socket Handlers (socket.ts)
- **Input validation** - Type checking on all payloads
- **Session limits** - Max 100 sessions server-wide
- **User limits** - Max 50 users per session
- **Session creation limits** - Max 5 sessions per IP
- **Voting method validation** - Only allow valid methods
- **Options limit** - Max 20 options per session
- **XSS prevention** - Strip `<>` characters from inputs

### Helpers (utils/helpers.ts)
- **Secure random** - Use crypto.randomFillSync for session IDs
- **String sanitization** - Remove dangerous characters
- **Length limits** - Prevent buffer overflow attacks

---

## Feature: Export Results

**Added export functionality**:
- **JSON export** - Full session data including votes, results, timestamps
- **CSV export** - Human-readable format with results and all votes

**Export includes**:
- Session info (title, ID, method, status)
- Results (totals, percentages, winner, average scores for score voting)
- All votes with user names and timestamps

**UI**:
- Download buttons in results panel
- Downloads as `vote-{sessionId}.json` or `vote-{sessionId}.csv`

---

## Feature: Session TTL

**Added automatic session cleanup**:
- Sessions are marked with `closedAt` timestamp when closed
- Server runs cleanup interval (every 60 seconds)
- Closed sessions automatically expire after 30 minutes
- Reduces memory usage for old sessions

---

## Feature: Share Button

**Added share functionality in session header**:
- 📋 button - Copies just the session ID to clipboard
- "Share" button - Copies full session link (e.g., `http://localhost:5173/session/ABC123`)
- Shows "✓" confirmation for 2 seconds after copying

---

## Files Created/Modified

### Server
- `server/src/index.ts` - Main server with security middleware
- `server/src/socket.ts` - Socket handlers with validation
- `server/src/types/index.ts` - TypeScript types with closedAt field
- `server/src/utils/helpers.ts` - Validation & sanitization functions

### Client
- `client/src/App.tsx` - Main app with routing
- `client/src/contexts/SocketContext.tsx` - State management with leaveSession, updateUserName
- `client/src/pages/HomePage.tsx` - Home with voting method info
- `client/src/pages/SessionPage.tsx` - Session UI with share/export buttons
- `client/src/components/VotingMethodInfo.tsx` - Voting method explanations
- `client/src/utils/export.ts` - JSON/CSV export utilities
- `client/src/types/index.ts` - Types with closedAt field

### Config
- `package.json` - Root with concurrently
- `server/package.json` - Added helmet, express-rate-limit
- `README.md` - Full documentation

---

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Start production
npm start
```
