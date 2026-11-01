import { getUserId, hasRole, loadUser } from '../auth/users';

export async function teamMember(id: string) {
  const user = await loadUser(id);
  if (!user) return { status: 404 };
  return { status: 200, body: { id: getUserId(user), editor: hasRole(user, 'editor') } };
}
