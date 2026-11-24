# VoteFlow

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-japb-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/japb)

Real-time collaborative voting application with multiple voting mechanisms.

## Features

- **Real-time voting** - Votes and results update instantly across all connected clients over Socket.io
- **8 voting methods** - Single Choice, Approval, Ranked Choice, Score Voting, Planning Poker, Dot Voting, Roman Voting, and Fist of Five
- **Live results** - Visual charts with counts, percentages, winner indicators, and method-specific metrics (averages, medians, consensus/pass badges, runoff rounds)
- **Session management** - Create, join, leave, and close sessions with shareable 6-character IDs and direct links
- **Bulk & file import** - Paste or drag-and-drop options or complete sessions in plain Text, JSON, or YAML (with syntax highlighting, live preview, and server-side YAML parsing)
- **Export results** - Download session details, results, and individual votes as JSON or CSV
- **Participant list & inline renaming** - See who is in the session and update your display name in real time
- **Themes & color palettes** - Light/dark mode toggle (respects system preference) plus 9 selectable color palettes (`Pink`, `Indigo`, `Teal`, `Rose`, `Amber`, `Violet`, `Emerald`, `Sky`, `Slate`)
- **SQLite persistence** - Sessions, participants, and votes persist in a WAL-mode SQLite database by default (with an optional in-memory store and automatic scheduled cleanup of expired sessions)

## Installation

```bash
# Clone the repository
cd vote-flow

# Install dependencies (root, client, and server)
npm install
```

## Development

```bash
# Run both client and server
npm run dev
```

This starts:

- **Client**: <http://localhost:5173>
- **Server**: <http://localhost:3001>

## Production Build

```bash
# Build both client and server
npm run build

# Start the production server
npm start
```

## Testing

```bash
# Run the server Jest test suite from the repository root
npm test
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP & WebSocket server port |
| `DATABASE_PATH` | `./data/voteflow.db` | Path to the SQLite database file |
| `SESSION_STORE` | `sqlite` | Storage backend (`sqlite` or `memory`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` (dev) / same-origin (prod) | Comma-separated CORS allowed origins |
| `TRUST_PROXY` | `false` | Express `trust proxy` setting for reverse-proxy deployments (enables trusted `X-Forwarded-For` / `X-Forwarded-Proto` handling) |
| `ENFORCE_HTTPS` | `false` | Redirect HTTP requests to HTTPS when enabled behind a TLS-terminating proxy |
| `ACTIVE_SESSION_TTL` | `86400000` (24 hours) | Time-to-live in milliseconds for active sessions |
| `CLOSED_SESSION_TTL` | `1800000` (30 minutes) | Time-to-live in milliseconds for closed sessions |
| `CLEANUP_CRON` | `*/5 * * * *` (every 5 minutes) | `node-cron` schedule for deleting expired sessions |

## Usage

### Creating a Session

1. Click "Create New Session"
2. Enter a session title (e.g., "Best Lunch Spot")
3. Select one of the 8 voting methods
4. Configure options or method settings:
   - **Single Choice, Approval, Ranked Choice, Score Voting, Dot Voting**: Add at least 2 options manually (with optional descriptions) or use **Bulk / File Import**
   - **Dot Voting**: Optionally set the dot budget per voter (`1–10`, default `3`)
   - **Planning Poker**: No custom options required; optionally configure the Fibonacci card range (`1–89`)
   - **Roman Voting & Fist of Five**: No custom options required
5. Click "Create Session"
6. Share the 6-character session ID or copy the direct session link with participants

### Bulk & File Import (Text, JSON, YAML)

When creating a session, switch to bulk input to paste text or drag-and-drop/upload a file in any of three formats:

- **Text** (`.txt`, `.csv`): Comma-, semicolon-, or newline-delimited option names (escape literal delimiters with `\,` or `\;`)
- **JSON** (`.json`): Either an array of option strings/objects (`{ "name": "...", "description": "..." }`) or a full session object with `title`, `votingMethod`, optional `config`, and `options`
- **YAML** (`.yaml`, `.yml`): Either a YAML list of options or a full session mapping (`title`, `votingMethod`, optional `config`, `options`), parsed server-side via `POST /api/parse-yaml`

Live syntax highlighting and a preview panel validate the input before you apply it to the form.

### Joining a Session

1. Enter the 6-character session ID (or open a shared session link)
2. Enter your display name
3. Click "Join"

### Voting

- **Single Choice**: Select one option
- **Approval**: Select all options you approve
- **Ranked Choice**: Click options to rank them in order of preference (1st, 2nd, 3rd, etc.)
- **Score Voting**: Rate each option from 1–5
- **Planning Poker**: Pick a Fibonacci effort card from the configured range
- **Dot Voting**: Distribute your allocated dots across the available options
- **Roman Voting**: Choose thumbs up, thumbs sideways, or thumbs down
- **Fist of Five**: Choose a confidence/support level from 1 to 5 fingers

### Updating Your Vote

You can change your vote at any time while the session is active. Make your new selection and click "Update Vote".

### Changing Your Name

Click the pencil icon next to your name in the participants list to edit it inline. Updates broadcast to all participants in real time.

### Exporting Results

Use the export buttons in the session view to download results and individual ballots as **JSON** or **CSV**.

### Closing a Session

Only the session creator can close voting. Click "Close Voting" to lock votes and display the final results. Closed sessions remain accessible until `CLOSED_SESSION_TTL` expires (30 minutes by default).

## Voting Methods Explained

### Single Choice (Plurality)

Each voter selects exactly one option. The option with the most votes wins.

- **Best for**: Simple decisions, binary choices

### Approval Voting

Voters can approve of multiple options. The option with the most approvals wins.

- **Best for**: Selecting multiple acceptable options, scheduling, hiring decisions

### Ranked Choice (Instant-Runoff)

Rank all options by preference. If no option receives >50% of first-choice votes, the lowest-performing option is eliminated and its votes redistribute to voters' next choices. This repeats until a majority winner emerges.

- **Best for**: Multi-candidate elections, ranked preferences

### Score Voting (Range)

Rate each option from 1–5 stars. The option with the highest total score wins, and average scores are shown for each option.

- **Best for**: Rating-based decisions, surveys, proposal scoring

### Planning Poker

Each participant selects a card from a configurable Fibonacci sequence (`1, 2, 3, 5, 8, 13, 21, 34, 55, 89`, default range `1–89`) to estimate effort. No custom options are needed. Results display the card distribution, average, median, and whether the team reached consensus (all voters selected the same card).

- **Best for**: Agile sprint planning, story point estimation

### Dot Voting

Each voter distributes a fixed budget of dots across options (default `3`, configurable from `1` to `10`). Voters can stack multiple dots on a single option or spread them across favorites. The option with the most total dots wins.

- **Best for**: Backlog prioritization, brainstorming workshops, feature ranking

### Roman Voting

Participants cast a thumbs up, thumbs sideways, or thumbs down to signal support, neutrality, or opposition. No custom options are needed. The proposal passes if thumbs-up votes strictly outnumber thumbs-down votes.

- **Best for**: Quick team alignment and go/no-go checks

### Fist of Five

Participants hold up 1–5 fingers to express their level of support (`5` = strong support, `3` = neutral / willing to go along, `1` = blocking concern). No custom options are needed. Results show distribution, average, median, and consensus (reached when no one votes `1` or `2`).

- **Best for**: Gauging team confidence, architecture and release sign-offs

## Persistence & Storage

VoteFlow uses a pluggable `SessionStore` layer:

- **SQLite (default)**: Stores sessions, participants, votes, and per-IP creation tracking in a WAL-mode SQLite database (`DATABASE_PATH`, default `./data/voteflow.db`).
- **In-memory (`SESSION_STORE=memory`)**: Stores session state in memory for ephemeral or lightweight setups.

A background `node-cron` job periodically removes expired active and closed sessions according to `CLEANUP_CRON`.

## Technologies Used

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Socket.io Client** - WebSocket client
- **CSS Modules** - Scoped styling with theme & color palette support
- **PrismJS & react-simple-code-editor** - Syntax-highlighted JSON/YAML bulk import editor

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web framework & REST endpoints (`/health`, `/api/parse-yaml`)
- **Socket.io** - Real-time WebSocket communication
- **SQLite (`sqlite` & `sqlite3`)** - Persistent session storage (WAL mode)
- **js-yaml** - Server-side YAML parsing
- **node-cron** - Scheduled cleanup of expired sessions
- **Helmet & express-rate-limit** - Security headers and rate limiting
- **Node.js `crypto`** - Cryptographic session IDs, UUIDs, and auth tokens
- **TypeScript** - Type safety

### Development & Testing

- **Jest & ts-jest** - Server-side unit and integration test suite
- **tsx** - TypeScript execution for dev
- **concurrently** - Run client and server in parallel
- **tsc** - TypeScript compiler

## Support the Project

If you find VoteFlow useful, consider supporting its development:

- **Buy Me a Coffee**: [buymeacoffee.com/japb](https://buymeacoffee.com/japb)

## License

MIT
