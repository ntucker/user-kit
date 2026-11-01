import type { User } from '../users/types';
import { displayName, initials } from '../users/format';

export function profileHeaderHtml(user: User): string {
  return `<header><span class="avatar">${initials(user)}</span><h1>${displayName(user)}</h1></header>`;
}
