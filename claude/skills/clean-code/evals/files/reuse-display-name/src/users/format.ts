import type { User } from './types';

export function displayName(user: User): string {
  const preferred = user.preferredName?.trim();
  if (preferred) return preferred;
  return [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

export function initials(user: User): string {
  return displayName(user)
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}
