import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { setupSocketHandlers } from './socket';
import { createStore } from './store';
import { parseYAML, parseSessionYAML } from './parseYaml';
import { scheduleCleanup } from './jobs/cleanup-expired-sessions';

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : isProduction
    ? [] // Same-origin in production, no CORS needed
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));

const requestSizeLimit = '100kb';
app.use(express.json({ limit: requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimit }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// YAML parsing endpoint (offloads js-yaml to the server)
app.post('/api/parse-yaml', (req, res) => {
  const { content, mode } = req.body as { content?: string; mode?: string };
  if (typeof content !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing "content" string' });
  }
  if (mode === 'session') {
    return res.json(parseSessionYAML(content));
  }
  return res.json(parseYAML(content));
});

// Serve static client files in production
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (_, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  perMessageDeflate: false,
  httpCompression: false,
});

const store = createStore();

const PORT = process.env.PORT || 3001;

store.initialize()
  .then(() => {
    setupSocketHandlers(io, store);
    scheduleCleanup(store);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize store:', err);
    process.exit(1);
  });

httpServer.timeout = 30000;
httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;
