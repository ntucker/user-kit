# Incident 2025-08: search logging cost

## What happened

`search-service` logged the entire response body of every query at info level. Bodies are up to 2 MB. Log ingestion cost went up ninefold in a month before anyone noticed, and the lines were useless anyway: the collector drops any line over 8 KB, so most of them never arrived.

## Actions

- Log what describes the event, not its content: `query_len`, `result_count`, `took_ms`.
- The collector's 8 KB per-line limit is now documented. A dropped line leaves no trace, so a large line is a silent hole in the logs.
- Info level is for one line per request. Anything per-item inside a request goes at debug.
