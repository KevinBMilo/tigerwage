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

export function passwordResetEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Reset your Occupation password',
    text:
      `We received a request to reset your Occupation password.\n\n` +
      `Choose a new password by opening this link:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email; your password won't change.`,
    html:
      `<p>We received a request to reset your Occupation password.</p>` +
      `<p><a href="${link}">Choose a new password</a></p>` +
      `<p>This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email; your password won't change.</p>`,
  };
}

export function passwordChangedEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Your Occupation password was changed',
    text:
      `The password for your Occupation account was just changed.\n\n` +
      `If you made this change, no action is needed. If you didn't, reset your password right away from the login page.`,
    html:
      `<p>The password for your Occupation account was just changed.</p>` +
      `<p>If you made this change, no action is needed. If you didn't, reset your password right away from the login page.</p>`,
  };
}