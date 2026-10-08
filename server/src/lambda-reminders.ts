import { sendReminders } from './jobs/send-reminders';

export const handler = async () => {
  const sent = await sendReminders();
  console.log(`Reminder job: sent ${sent} email(s)`);
  return { sent };
};