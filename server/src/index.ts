import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { setupSocketHandlers } from './socket';

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

io.use((socket, next) => {
  const ip = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
  const connectedIPs = new Map<string, { count: number; since: number }>();
  
  const now = Date.now();
  const existing = connectedIPs.get(ip);
  
  if (existing) {
    if (existing.count > 50) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return next(new Error('Too many connections from this IP'));
    }
    existing.count++;
  } else {
    connectedIPs.set(ip, { count: 1, since: now });
  }
  
  setInterval(() => {
    const old = connectedIPs.get(ip);
    if (old && now - old.since > 60000) {
      connectedIPs.delete(ip);
    }
  }, 60000);
  
  next();
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

httpServer.timeout = 30000;
httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;
