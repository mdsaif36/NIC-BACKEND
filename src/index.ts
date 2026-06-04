import express from 'express';
// Git auto-push active
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for local development, proxy handles frontend connection
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Attach Socket.IO to Express app context
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
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
