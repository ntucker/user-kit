# Probes for api-errors.md

Statements for a blind reader, with the answer the source gives (T true, F false, O open: the source does not settle it).

| # | Statement | Source |
|---|---|---|
| 1 | A handler should return 403 when a customer requests an invoice that belongs to another account. | F |
| 2 | When the database is unreachable, the response body should include the database's error message so the customer can report it. | F |
| 3 | A 429 response must include a `Retry-After` header. | T |
| 4 | A nightly batch job that hits an unexpected null should catch it and produce the same structured error body the API returns. | F |
| 5 | The repository layer should log a failed query before rethrowing it. | F |
| 6 | The meaning of `ERR_BILLING_CARD_DECLINED` may change in a later release as long as the message is updated to match. | F |
| 7 | The human-readable message of an error may be reworded at any time. | T |
| 8 | An outbound POST that charges a card may be retried automatically if it carries an idempotency key. | T |
| 9 | A failed attempt to send an email should be retried automatically. | F |
| 10 | A request whose end date is earlier than its start date gets a 422 that names the fields. | T |
| 11 | Every 4xx error is reported to Sentry. | F |
| 12 | A 500 response includes the request id. | T |
| 13 | An error response may include the name and version of the library that failed, as long as there is no stack trace. | F |
| 14 | Internal admin tools must use the `{ "error": { "code", "message", "request_id" } }` body shape. | O |
| 15 | An outbound PATCH that increments a counter may be retried automatically. | F |
| 16 | If a customer sends a currency code we do not support, the response should say which field was wrong and what would have been accepted. | T |
| 17 | When an upstream provider times out, the response should name the provider's internal hostname so the customer can tell support. | F |
| 18 | An outbound DELETE may be retried automatically. | T |
| 19 | A validation error should be logged by the handler that detected it and again by the error middleware. | F |
| 20 | Customers' client code must retry any 5xx response up to three times. | O |
