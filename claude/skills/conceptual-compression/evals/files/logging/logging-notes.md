# Logging notes (from memory, incomplete)

- Use the shared logger, not console.log.
- Always include the request id.
- Payments logs amounts in cents.
- Don't log the card number. Marco got burned by this.
- Errors go at error level, obviously.
- I think we said debug logs are off in prod?
- There's more in the incident writeups, and you can see how the services actually do it.
