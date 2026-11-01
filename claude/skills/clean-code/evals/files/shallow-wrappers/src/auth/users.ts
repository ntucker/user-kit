import { repo } from '../db';
import type { Session, User } from './types';

export function getUserId(user: User): string {
  return user.id;
}

export function loadUser(id: string): Promise<User | undefined> {
  return repo.findUser(id);
}

export function hasRole(user: User, role: string): boolean {
  return user.roles.includes(role);
}

export function isAdmin(user: User): boolean {
  return hasRole(user, 'admin');
}

/** Admin rights also apply to org owners and to staff impersonating an admin. */
export function canManageBilling(session: Session): boolean {
  const effective = session.impersonating ?? session.user;
  return isAdmin(effective) || effective.id === session.org.ownerId;
}
