import type { User } from '../users/types';

export interface Email {
  to: string;
  subject: string;
  html: string;
}

export function passwordResetEmail(user: User, resetUrl: string): Email {
  return {
    to: user.email,
    subject: 'Reset your password',
    html: `<p>Someone asked to reset your password.</p><p><a href="${resetUrl}">Choose a new one</a></p>`,
  };
}
