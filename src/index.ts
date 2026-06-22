import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import sequelize from './config/db.js';
import { swaggerSpec } from './utils/swagger.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import referralPostRoutes from './routes/referralPosts.js';
import notificationRoutes from './routes/notifications.js';

// Model imports (register associations)
import './models/UserActivity.js';
import './models/ReferralPost.js';
import './models/AuditLog.js';
import './models/Notification.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ─── CORS & Socket.IO ──────────────────────────────────────────────────────────
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow Swagger UI to load its own scripts/styles inline
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 150 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isProd ? 15 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login or registration attempts. Please try again after 5 minutes.' },
});

app.use(globalLimiter);

// ─── CORS + Body Parser ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// ─── Static File Serving ──────────────────────────────────────────────────────
// Serve uploaded files (resumes, screenshots) through the API.
// When switching to S3, remove these lines and serve presigned URLs instead.
app.use('/api/users/files/resumes', express.static(path.join(process.cwd(), 'uploads', 'resumes')));
app.use('/api/users/files/screenshots', express.static(path.join(process.cwd(), 'uploads', 'screenshots')));

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
// Available at: http://localhost:5000/api-docs
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'NextInCampus API Docs',
    customCss: `
      .swagger-ui .topbar { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
      .swagger-ui .topbar-wrapper img { content: url(''); }
      .swagger-ui .topbar-wrapper::after {
        content: '🎓 NextInCampus API';
        color: #a78bfa;
        font-family: 'Segoe UI', sans-serif;
        font-weight: 700;
        font-size: 18px;
      }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  })
);

// Serve raw OpenAPI JSON for tooling
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/referral-posts', referralPostRoutes);
app.use('/api/referrals', referralPostRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    message: 'Internal server error',
    error: isDev ? err.message : 'An unexpected error occurred.',
  });
});

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(`user_${userId}`);
  }

  socket.on('join', (data: { userId: number | string }) => {
    if (data?.userId) {
      socket.join(`user_${data.userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Socket cleanup handled automatically by Socket.IO
  });
});

// ─── Server Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    const isSqlite = sequelize.getDialect() === 'sqlite';
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' && !isSqlite });
    console.log('✅ Database tables synchronized.');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`💚 Health:   http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();
