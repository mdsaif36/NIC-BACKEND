import express from 'express';
// Git auto-push active
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sequelize from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import referralPostRoutes from './routes/referralPosts.js';
import './models/UserActivity.js';
import './models/ReferralPost.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Security configuration
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

// Configure Socket.IO with restricted CORS
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach Socket.IO to Express app context
app.set('io', io);

// Security Headers with Helmet
app.use(helmet());

// Configure Rate Limiters
const isProd = process.env.NODE_ENV === 'production';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 150 : 10000, // lenient limit in dev to allow continuous testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isProd ? 15 : 1000, // lenient limit in dev to prevent blocking developers
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login or registration attempts. Please try again after 5 minutes.' }
});

// Global Rate Limiting
app.use(globalLimiter);

// Configure Express CORS with restricted origin
app.use(cors({
  origin: clientOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/referral-posts', referralPostRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({ 
    message: 'Internal server error', 
    error: isDev ? err.message : 'An unexpected error occurred.' 
  });
});

// Socket.IO Events
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId) {
    socket.join(`user_${userId}`);
    // console.log(`User ${userId} joined room user_${userId} on connection`);
  }

  // Fallback explicit join event
  socket.on('join', (data: { userId: number | string }) => {
    if (data && data.userId) {
      socket.join(`user_${data.userId}`);
      // console.log(`User ${data.userId} explicitly joined room user_${data.userId}`);
    }
  });

  socket.on('disconnect', () => {
    // console.log('Socket disconnected:', socket.id);
  });
});

// Port and DB sync
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify DB Connection
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Sync database schemas
    await sequelize.sync();
    console.log('Database tables synchronized.');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();
