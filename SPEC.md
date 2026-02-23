# VoteFlow - Real-Time Collaborative Voting Application

## Project Overview

**Project Name:** VoteFlow  
**Project Type:** Full-stack Web Application (TypeScript)  
**Core Functionality:** A real-time collaborative voting platform supporting multiple voting mechanisms with live result updates  
**Target Users:** Teams, organizations, and communities needing to make decisions collaboratively

---

## Technical Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + Socket.io
- **Real-time:** WebSocket via Socket.io
- **Styling:** CSS Modules
- **State Management:** React Context + useReducer

---

## Architecture

```
vote-flow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript interfaces
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global styles
│   └── index.html
├── server/                # Node.js backend
│   └── src/
│       ├── index.ts       # Entry point
│       ├── socket.ts      # Socket.io handlers
│       ├── types/         # TypeScript interfaces
│       ├── utils/         # Utility functions
│       └── voting/        # Voting mechanism implementations
└── package.json           # Root workspace
```

---

## Voting Mechanisms

### 1. Single Choice (Plurality)
- Users select exactly one option
- Option with most votes wins

### 2. Approval Voting
- Users can select multiple options they approve
- Option with most approvals wins

### 3. Ranked Choice (Instant-Runoff)
- Users rank all options by preference
- If no option has >50%, eliminate lowest and redistribute
- Repeat until winner determined

### 4. Score Voting (Range)
- Users assign a score (1-5) to each option
- Option with highest total score wins

---

## Data Models

### Session
```typescript
interface Session {
  id: string;              // Unique session ID (6 chars)
  title: string;           // Session title
  createdAt: number;       // Timestamp
  status: 'active' | 'closed';
  votingMethod: VotingMethod;
  options: Option[];
  votes: Vote[];
  currentRound?: number;   // For ranked choice
}
```

### Option
```typescript
interface Option {
  id: string;
  name: string;
  description?: string;
}
```

### Vote
```typescript
interface Vote {
  id: string;
  userId: string;
  userName: string;
  selections: Selection[];
  timestamp: number;
}
```

### Selection (varies by method)
```typescript
// Single Choice
interface SingleChoiceSelection {
  optionId: string;
}

// Approval
interface ApprovalSelection {
  optionIds: string[];
}

// Ranked Choice
interface RankedSelection {
  rankings: string[];  // Option IDs in ranked order
}

// Score
interface ScoreSelection {
  scores: Record<string, number>;  // optionId -> score
}
```

---

## API & Socket Events

### Socket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `create-session` | `{ title, votingMethod, options }` | Create new voting session |
| `join-session` | `{ sessionId, userName }` | Join existing session |
| `submit-vote` | `{ sessionId, vote }` | Submit vote |
| `close-session` | `{ sessionId }` | Close voting (admin) |

### Socket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `session-created` | `{ session }` | Session created successfully |
| `session-joined` | `{ session, userId }` | Joined session info |
| `vote-submitted` | `{ sessionId, vote }` | New vote received |
| `session-updated` | `{ session }` | Session state changed |
| `results-updated` | `{ sessionId, results }` | Live results |
| `error` | `{ message }` | Error message |

---

## UI/UX Specification

### Pages

1. **Home Page** (`/`)
   - "Create Session" button
   - "Join Session" input with session ID
   - Recent sessions list (localStorage)

2. **Session Page** (`/session/:id`)
   - Session header (title, status, method badge)
   - Options list with voting UI
   - Live results panel (collapsible on mobile)
   - Participants list
   - "Close Session" button (for creator)

### Components

- `Button` - Primary, secondary, danger variants
- `Input` - Text input with label
- `Card` - Container with shadow
- `Badge` - Status/method indicator
- `OptionCard` - Voting option with selection UI
- `ResultsChart` - Bar chart for live results
- `ParticipantsList` - Connected users
- `Modal` - For confirmations

### Color Palette

```css
--color-bg: #0f0f0f;
--color-bg-elevated: #1a1a1a;
--color-bg-hover: #252525;
--color-border: #2a2a2a;
--color-text: #f5f5f5;
--color-text-muted: #888888;
--color-primary: #6366f1;
--color-primary-hover: #818cf8;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--color-ranked: #8b5cf6;
--color-approval: #06b6d4;
--color-score: #f97316;
```

### Typography

- **Font Family:** "JetBrains Mono", monospace (headings), system-ui (body)
- **Headings:** 
  - H1: 2rem, weight 700
  - H2: 1.5rem, weight 600
  - H3: 1.25rem, weight 600
- **Body:** 1rem, weight 400
- **Small:** 0.875rem

### Spacing System

- `--space-xs`: 0.25rem
- `--space-sm`: 0.5rem
- `--space-md`: 1rem
- `--space-lg`: 1.5rem
- `--space-xl`: 2rem
- `--space-2xl`: 3rem

### Animations

- Button hover: `transform: scale(1.02)`, 150ms ease
- Card hover: `box-shadow` increase, 200ms ease
- Results bar: `width` transition 300ms ease-out
- Page transitions: fade in 200ms

---

## Functionality Specification

### Session Creation
1. User enters session title
2. Selects voting method from dropdown
3. Adds options (minimum 2, add/remove)
4. Clicks "Create"
5. Redirected to session page with shareable ID

### Joining Session
1. User enters 6-character session ID
2. Enters display name
3. Clicks "Join"
4. Redirected to session page
5. Existing votes/results load immediately

### Voting Flow
1. User sees all options
2. Selects according to voting method rules
3. Clicks "Submit Vote"
4. Vote is broadcast to all participants
5. Results update in real-time

### Live Results
- Results panel shows:
  - Current vote counts/percentages
  - Visual bar chart
  - For ranked choice: current round info
  - For score: average scores
- Updates instantly when any user votes

### Ranked Choice Algorithm
1. Count first-choice votes for each option
2. If any option has >50%, winner found
3. Otherwise, eliminate option with fewest votes
4. Redistribute eliminated option's votes to next choices
5. Repeat until winner

---

## Acceptance Criteria

### Must Have
- [ ] Create session with title, method, and options
- [ ] Join session via 6-character ID
- [ ] All 4 voting mechanisms work correctly
- [ ] Real-time vote updates across all clients
- [ ] Live results with visual representation
- [ ] Mobile-responsive design

### Should Have
- [ ] Participant list with online status
- [ ] Session status indicator (active/closed)
- [ ] Prevent duplicate voting (one vote per user)
- [ ] Copy session link button

### Nice to Have
- [ ] Session history in localStorage
- [ ] Dark/light theme toggle
- [ ] Export results as JSON

---

## Security Considerations

- Session IDs are 6 random alphanumeric characters
- User IDs are generated UUIDs
- Votes are tied to user IDs (prevents duplicate voting)
- No authentication required (intended for collaborative sessions)
- Input sanitization on all user inputs
