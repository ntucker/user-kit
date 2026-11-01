import { canManageBilling, getUserId, isAdmin, loadUser } from '../auth/users';
import type { Session } from '../auth/types';

export async function billingPage(session: Session, targetId: string) {
  if (!canManageBilling(session)) return { status: 403 };
  const target = await loadUser(targetId);
  if (!target) return { status: 404 };
  return {
    status: 200,
    body: { id: getUserId(target), admin: isAdmin(target) },
  };
}
