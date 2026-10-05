import 'dotenv/config';
import { pool } from '../db';
import { sendReminders } from './send-reminders';

sendReminders()
  .then(count => console.log(`Sent ${count} reminder email(s)`))
  .catch(err => console.error('Reminder job failed', err))
  .finally(() => pool.end());