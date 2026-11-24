import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { setupSocketHandlers } from './socket';
import { createStore } from './store';
import { parseYAML, parseSessionYAML } from './parseYaml';
import { scheduleCleanup } from './jobs/cleanup-expired-sessions';

const app = express();
const httpServer = createServer(app);

if (process.env.TRUST_PROXY) {
  const trustProxyValue = process.env.TRUST_PROXY.trim();
  if (trustProxyValue === 'true') {
    app.set('trust proxy', 1);
  } else if (trustProxyValue === 'false' || trustProxyValue === '0') {
    app.set('trust proxy', false);
  } else if (/^\d+$/.test(trustProxyValue)) {
    app.set('trust proxy', parseInt(trustProxyValue, 10));
  } else {
    app.set('trust proxy', trustProxyValue);
  }
}

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
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      upgradeInsecureRequests: process.env.ENFORCE_HTTPS === 'true' ? [] : null,
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
const clientIndexPath = path.join(clientDistPath, 'index.html');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// SPA fallback: serve index.html for all non-API routes when client build exists
app.get('*', (_, res) => {
  if (!fs.existsSync(clientIndexPath)) {
    res.status(404).send('Client build not found. Run "npm run build" or use the Vite dev server.');
    return;
  }
  res.sendFile(clientIndexPath);
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

let cleanupTask: ReturnType<typeof scheduleCleanup> | null = null;
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  if (cleanupTask) {
    await cleanupTask.stop();
    cleanupTask = null;
  }

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    if (httpServer.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await store.close();
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

store.initialize()
  .then(() => {
    setupSocketHandlers(io, store);
    cleanupTask = scheduleCleanup(store);

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
