# Probes for testing-rules.md

Statements for a blind reader, with the answer the source gives (T true, F false, O open: the source does not settle it).

| # | Statement | Source |
|---|---|---|
| 1 | An integration test in packages/api may replace the Postgres client with a mock that returns canned rows. | F |
| 2 | A test of the password-reset flow should let the email provider really send the message to a test inbox, then check the inbox. | F |
| 3 | A test may call Stripe as long as it uses Stripe's test-mode keys. | F |
| 4 | A test that checks a token expires after an hour should advance a fake clock rather than wait or read the real time. | T |
| 5 | A test for the audit-log feature may assert on the log line that gets written. | T |
| 6 | A test of user deactivation should verify that `SessionStore.revokeAll` was called exactly once. | F |
| 7 | `it('transfer validation')` is an acceptable test name. | F |
| 8 | When a test fails intermittently in CI, wrapping it in a 3-attempt retry is an acceptable fix. | F |
| 9 | A flaky test that cannot be fixed the same day may be marked `it.skip` with no further annotation. | F |
| 10 | CI may run the test suites in parallel workers to save time. | F |
| 11 | Contract tests against the partner sandbox must be changed so they run without network access. | F |
| 12 | The 80% line coverage threshold is enforced on `packages/api`. | F |
| 13 | Frontend component tests in `packages/web` must not use snapshot assertions. | O |
| 14 | Production code must obtain the current time through an injected clock. | O |
| 15 | A new feature stores documents in MongoDB, which can run as a container in the test compose file. Its integration tests should run against that container rather than a hand-written fake. | T |
| 16 | A test that fires a webhook at a customer's real URL should let the request go out. | F |
| 17 | A test may rely on an earlier test in the same file having created the admin user. | F |
| 18 | A test of an API endpoint should compare the entire response body against a stored snapshot. | F |
| 19 | An integration test may use `waitFor` with a 2-second timeout chosen by trial and error to let a queue job finish. | F |
| 20 | Unit tests time out at 30 seconds. | F |
| 21 | A unit test of a pure pricing function in `packages/core` is forbidden from replacing the Postgres client with a mock. | O |
