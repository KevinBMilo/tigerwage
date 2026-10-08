import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth';
import applicationsRouter from './routes/applications';
import documentsRouter from './routes/documents';
import resumesRouter from './routes/resumes';
import profileRouter from './routes/profile';
import jobsRouter from './routes/jobs';
import { requireAuth } from './middleware/require-auth';

export const app = express();

// Behind API Gateway, the real visitor's IP arrives in a forwarded header
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/resumes', requireAuth, resumesRouter);
app.use('/api/applications/:applicationId/documents', requireAuth, documentsRouter);
app.use('/api/applications', requireAuth, applicationsRouter);

// Catches any error a route didn't handle: log the details, send a safe message
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
});