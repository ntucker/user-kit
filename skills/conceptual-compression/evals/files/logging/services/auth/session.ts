import { logger } from '@acme/logger';

export async function lookupSession(req: AuthRequest) {
  const log = logger.child({ requestId: req.id, service: 'auth' });
  const session = await sessions.find(req.sessionId);
  if (!session) {
    log.warn({ event: 'session.missing', session_id_prefix: req.sessionId.slice(0, 6) });
    return null;
  }
  // TODO remove
  console.log('session ok', session.userEmail);
  log.info({ event: 'session.found', user_id: session.userId });
  return session;
}
