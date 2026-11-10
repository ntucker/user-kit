# Incident 2025-03: access tokens in logs

## What happened

`auth-service` logged the full set of request headers at debug level when a session lookup failed. Debug logging had been switched on in production for `auth-service` a week earlier to chase an unrelated bug and was never switched off. For seven days every failed lookup wrote a live `Authorization` header to the log store, which 140 people can search.

## Why

- The code assumed debug lines never reach production. Log level is configuration, and configuration changes.
- Headers were logged wholesale because it was convenient.

## Actions

- All tokens issued in the window were revoked.
- Never log a secret (token, password, API key, session cookie) at any level. The level is not a safeguard.
- Never log a headers or body object wholesale. Log named fields you chose.
- `auth-service` now logs `user_id`, never the email address, so that log access does not mean access to personal data.
