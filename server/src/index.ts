import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import authRouter from './routes/auth';
import applicationsRouter from './routes/applications';
import { requireAuth } from './middleware/require-auth';
import cron from 'node-cron';
import { sendReminders } from './jobs/send-reminders';
import documentsRouter from './routes/documents';
import profileRouter from './routes/profile';
import resumesRouter from './routes/resumes';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/applications/:applicationId/documents', requireAuth, documentsRouter);
app.use('/api/applications', requireAuth, applicationsRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/resumes', requireAuth, resumesRouter);

const port = process.env.PORT || 3000;

if (process.env.REMINDERS_CRON) {
  cron.schedule(process.env.REMINDERS_CRON, () => {
    sendReminders()
      .then(count => console.log(`Reminder job: sent ${count} email(s)`))
      .catch(err => console.error('Reminder job failed', err));
  });
  console.log(`Reminders scheduled: ${process.env.REMINDERS_CRON}`);
}

app.listen(port, () => console.log(`API running on port ${port}`));