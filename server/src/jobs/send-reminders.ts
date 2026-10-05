import type { RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { sendEmail } from '../email/send-email';
import { reminderDigestEmail, type ReminderItem } from '../email/templates';

interface UserReminders {
  email: string;
  interviews: ReminderItem[];
  interviewIds: number[];
  followUps: ReminderItem[];
  followUpIds: number[];
}

// Finds everything due, sends one digest email per user, and records what was sent.
// Returns the number of emails sent.
export async function sendReminders(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT a.id, a.user_id, u.email, a.company, a.position, a.interview_date, a.follow_up_date,
      (a.interview_date IS NOT NULL
        AND a.interview_reminder_sent_at IS NULL
        AND a.interview_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 1 DAY) AS interview_due,
      (a.follow_up_date IS NOT NULL
        AND a.follow_up_reminder_sent_at IS NULL
        AND a.follow_up_date <= CURDATE()) AS follow_up_due
    FROM applications a
    JOIN users u ON u.id = a.user_id
    WHERE u.email_verified_at IS NOT NULL
      AND a.status IN ('applied', 'interviewing')
    HAVING interview_due OR follow_up_due
  `);

  // Group the due items by user
  const byUser = new Map<number, UserReminders>();
  for (const row of rows) {
    let entry = byUser.get(row.user_id);
    if (!entry) {
      entry = { email: row.email, interviews: [], interviewIds: [], followUps: [], followUpIds: [] };
      byUser.set(row.user_id, entry);
    }
    if (row.interview_due) {
      entry.interviews.push({ company: row.company, position: row.position, date: row.interview_date });
      entry.interviewIds.push(row.id);
    }
    if (row.follow_up_due) {
      entry.followUps.push({ company: row.company, position: row.position, date: row.follow_up_date });
      entry.followUpIds.push(row.id);
    }
  }

  let sent = 0;
  for (const [userId, r] of byUser) {
    try {
      await sendEmail(
        reminderDigestEmail(r.email, r.interviews, r.followUps, process.env.APP_URL ?? '')
      );

      if (r.interviewIds.length > 0) {
        await pool.query(
          'UPDATE applications SET interview_reminder_sent_at = NOW() WHERE id IN (?)',
          [r.interviewIds]
        );
      }
      if (r.followUpIds.length > 0) {
        await pool.query(
          'UPDATE applications SET follow_up_reminder_sent_at = NOW() WHERE id IN (?)',
          [r.followUpIds]
        );
      }
      sent++;
    } catch (err) {
      // One user's failure shouldn't stop everyone else's reminders
      console.error(`Failed to send reminders to user ${userId}`, err);
    }
  }

  return sent;
}