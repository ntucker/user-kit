# Testing rules

These rules are for the backend test suite in `packages/api` and `packages/core`. We've added to them every time something bit us.

## Dependencies

- Do not mock the Postgres client in integration tests. Use the test container. We had mocks that returned rows in a shape the real driver never produces, and the migration bug in March sailed through 400 green tests.
- Do not mock Redis either. Use the local Redis from `docker-compose.test.yml`. The mock didn't implement key expiry and we shipped a session bug.
- Do not mock the S3 client. Use MinIO, it's already in the compose file.
- Do not write a fake for the search index. Run the real OpenSearch container. Our fake didn't tokenize the same way.
- For queues, use the real BullMQ against the test Redis, not the in-memory stub.
- Do mock the clock. Use fake timers. Never `sleep()` in a test and never read the real `Date.now()`.
- Do mock the email sender (SendGrid). A test must never be able to send a real email. Same for SMS (Twilio) and for push notifications.
- Do mock the payment provider. Never call Stripe from a test, not even in test mode, because test-mode webhooks arrive whenever they like.
- Random IDs: inject the ID generator and pass a seeded one in tests.

## What to assert

- Do not test private methods. Test through the public function.
- Do not assert on internal state of a service (e.g. reaching into `service._cache`).
- Do not assert that a specific internal helper was called, or how many times.
- Do not snapshot entire response bodies. Assert on the fields the test is about.
- Do not assert on log output unless the log line is the feature (audit logs are a feature).
- Do not assert on the exact SQL that was generated.
- Assert on what a caller can observe: return values, HTTP status and body, rows in the database, messages on the queue.
- Example: for "deactivating a user revokes sessions", log in, deactivate, then make a request with the old session and expect a 401. Don't check that `SessionStore.revokeAll` was called.

## Naming

- `it('returns 404 when the user does not exist')`, not `it('works')` or `it('test user')`.
- `it('rejects a transfer larger than the balance')`, not `it('transfer validation')`.
- `it('sends one welcome email per signup, even when signup is retried')`, not `it('email')`.
- If the test fails, the name alone should tell the on-call person what is broken.

## Flakiness

- Never add a retry to make a test pass.
- Do not use `waitFor` with a guessed timeout. Wait on the actual condition.
- Tests must not depend on the order they run in.
- Do not share mutable fixtures between tests. Build what you need in the test.
- Truncate all tables between tests (`resetDb()` in `test/setup.ts` does this).
- Do not use unseeded random data.
- Do not rely on the machine's timezone or locale. CI runs in UTC; your laptop doesn't.
- Do not rely on wall-clock time (see clock rule above).
- All tests must be able to run with the network disabled, except for the containers in the compose file.
- If a test is flaky and you can't fix it the same day, mark it `it.skip` with a link to a ticket. Skipped tests without a ticket link fail lint.

## Running

- CI runs `yarn test:ci --runInBand`. It has to be in-band because all suites share one Postgres container on port 5433.
- Integration tests time out at 30s, unit tests at 5s.
- Coverage threshold is 80% lines, enforced on `packages/core` only.
- Contract tests against the partner sandbox (`yarn test:contract`) do hit the network. They run nightly, not on PRs.
