# VoteFlow

Real-time collaborative voting application with multiple voting mechanisms.

## Features

- **Real-time voting** - Votes update instantly across all connected clients
- **Multiple voting methods** - Single Choice, Approval, Ranked Choice, Score Voting
- **Live results** - Visual bar charts with percentages and winner indicators
- **Session management** - Create/join sessions with shareable 6-character IDs
- **Participant list** - See who's in the session

## Installation

```bash
# Clone the repository
cd vote-flow

# Install dependencies
npm install
```

## Development

```bash
# Run both client and server
npm run dev
```

This starts:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

## Production Build

```bash
# Build both client and server
npm run build

# Start the server
npm start
```

## Usage

### Creating a Session

1. Click "Create New Session"
2. Enter a session title (e.g., "Best Lunch Spot")
3. Select a voting method
4. Add at least 2 options
5. Click "Create Session"
6. Share the 6-character session ID with participants

### Joining a Session

1. Enter the session ID
2. Enter your name
3. Click "Join"

### Voting

- **Single Choice**: Select one option
- **Approval**: Select all options you approve
- **Ranked Choice**: Click options to rank them (1st, 2nd, 3rd, etc.)
- **Score Voting**: Rate each option from 1-5

### Updating Your Vote

You can change your vote at any time while the session is active. Just make your new selection and click "Update Vote".

### Changing Your Name

Click the pencil icon next to your name in the participants list to change it.

### Closing a Session

Only the session creator can close voting. Click "Close Voting" to end the session and show final results.

## Voting Methods Explained

### Single Choice (Plurality)
Each voter selects exactly one option. The option with the most votes wins.
- **Best for**: Simple decisions, binary choices

### Approval Voting
Voters can approve of multiple options. The option with the most approvals wins.
- **Best for**: Selecting multiple winners, hiring decisions

### Ranked Choice (Instant-Runoff)
Rank all options by preference. If no option gets >50%, the lowest-performing option is eliminated and its votes redistribute to voters' next choices. This repeats until a majority winner emerges.
- **Best for**: Elections, ranked preferences

### Score Voting (Range)
Rate each option from 1-5 stars. The option with the highest total score wins.
- **Best for**: Rating-based decisions, surveys

## Technologies Used

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Socket.io Client** - WebSocket client
- **CSS Modules** - Scoped styling

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.io** - Real-time WebSocket communication
- **UUID** - Unique ID generation
- **TypeScript** - Type safety

### Development
- **tsx** - TypeScript execution for dev
- **concurrently** - Run client and server in parallel
- **tsc** - TypeScript compiler

## License

MIT
