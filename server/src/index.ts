import cron from 'node-cron';
import { app } from './app';
import { sendReminders } from './jobs/send-reminders';

if (process.env.REMINDERS_CRON) {
  cron.schedule(process.env.REMINDERS_CRON, () => {
    sendReminders()
      .then(count => console.log(`Reminder job: sent ${count} email(s)`))
      .catch(err => console.error('Reminder job failed', err));
  });
  console.log(`Reminders scheduled: ${process.env.REMINDERS_CRON}`);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API running on port ${port}`));