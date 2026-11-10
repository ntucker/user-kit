import { logger } from '@acme/logger';

export async function handleSearch(req: SearchRequest) {
  const log = logger.child({ requestId: req.id, service: 'search' });
  const started = Date.now();
  const results = await runQuery(req.query);
  log.info({
    event: 'search.completed',
    query_len: req.query.length,
    result_count: results.length,
    took_ms: Date.now() - started,
  });
  for (const r of results) {
    log.debug({ event: 'search.hit', doc_id: r.id, score: r.score });
  }
  return results;
}
