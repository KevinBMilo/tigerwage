import type { EmailMessage } from './send-email';

export function verificationEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Confirm your Occupation account',
    text:
      `Welcome to Occupation!\n\n` +
      `Confirm your email address by opening this link:\n${link}\n\n` +
      `This link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    html:
      `<p>Welcome to Occupation!</p>` +
      `<p><a href="${link}">Confirm your email address</a></p>` +
      `<p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  };
}