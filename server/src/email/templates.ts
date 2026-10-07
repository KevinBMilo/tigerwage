import type { EmailMessage } from './send-email';

export function verificationEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Confirm your TigerWage account',
    text:
      `Welcome to TigerWage!\n\n` +
      `Confirm your email address by opening this link:\n${link}\n\n` +
      `This link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    html:
      `<p>Welcome to TigerWage!</p>` +
      `<p><a href="${link}">Confirm your email address</a></p>` +
      `<p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  };
}

export function passwordResetEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Reset your TigerWage password',
    text:
      `We received a request to reset your TigerWage password.\n\n` +
      `Choose a new password by opening this link:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email; your password won't change.`,
    html:
      `<p>We received a request to reset your TigerWage password.</p>` +
      `<p><a href="${link}">Choose a new password</a></p>` +
      `<p>This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email; your password won't change.</p>`,
  };
}

export function passwordChangedEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Your TigerWage password was changed',
    text:
      `The password for your TigerWage account was just changed.\n\n` +
      `If you made this change, no action is needed. If you didn't, reset your password right away from the login page.`,
    html:
      `<p>The password for your TigerWage account was just changed.</p>` +
      `<p>If you made this change, no action is needed. If you didn't, reset your password right away from the login page.</p>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReminderItem {
  company: string;
  position: string;
  date: string;
}

export function reminderDigestEmail(
  to: string,
  interviews: ReminderItem[],
  followUps: ReminderItem[],
  appUrl: string
): EmailMessage {
  const textList = (items: ReminderItem[]) =>
    items.map(i => `  - ${i.company}, ${i.position} (${i.date})`).join('\n');

  const htmlList = (items: ReminderItem[]) =>
    `<ul>${items
      .map(i => `<li>${escapeHtml(i.company)}, ${escapeHtml(i.position)} (${i.date})</li>`)
      .join('')}</ul>`;

  let text = 'Here are your TigerWage reminders:\n\n';
  let html = '<p>Here are your TigerWage reminders:</p>';

  if (interviews.length > 0) {
    text += `Upcoming interviews:\n${textList(interviews)}\n\n`;
    html += `<h3>Upcoming interviews</h3>${htmlList(interviews)}`;
  }
  if (followUps.length > 0) {
    text += `Time to follow up:\n${textList(followUps)}\n\n`;
    html += `<h3>Time to follow up</h3>${htmlList(followUps)}`;
  }

  text += `Open TigerWage: ${appUrl}`;
  html += `<p><a href="${appUrl}">Open TigerWage</a></p>`;

  const count = interviews.length + followUps.length;
  return {
    to,
    subject: `TigerWage: ${count} reminder${count === 1 ? '' : 's'}`,
    text,
    html,
  };
}

export function accountDeletedEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Your TigerWage account has been deleted',
    text:
      `Your TigerWage account and all of its data, including applications, documents, and résumés, have been permanently deleted.\n\n` +
      `If you didn't do this, please reply to this email right away.`,
    html:
      `<p>Your TigerWage account and all of its data, including applications, documents, and résumés, have been permanently deleted.</p>` +
      `<p>If you didn't do this, please reply to this email right away.</p>`,
  };
}