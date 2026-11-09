import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import adminRoutes from './routes/admin';
import familyRoutes from './routes/families';
import { apiLimiter, authLimiter } from './middleware/security';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// Trust both reverse-proxy hops (host nginx -> client nginx) so each user's
// real IP is used for rate limiting instead of a shared proxy IP.
app.set('trust proxy', 2);

// Strict CORS — only allow the configured client origin
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '100kb' }));

// Health check (no auth, no rate limit)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Apply global rate limit to all API routes
app.use('/api', apiLimiter);

// Auth routes with stricter brute-force protection
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/groups', groupRoutes);
app.use('/api/groups', familyRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`moneysplit server running on http://localhost:${PORT}`);
});
