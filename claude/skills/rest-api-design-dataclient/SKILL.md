---
name: rest-api-design-dataclient
description: Design REST APIs for performant, data-safe atomic operations with Reactive Data Client. Use when designing backend APIs, reviewing API contracts, discussing response schemas, or optimizing client-server data flow for normalized caching.
---

# REST API Design for Data Client

Design APIs that enable atomic mutations, automatic cache consistency, and optimistic updates without network cascades.

## Core Principles

### 1. Response Bundling (Atomic Mutations)

**Bundle all affected entities in mutation responses** to avoid network cascades.

```
BAD: Network Cascade
Client → POST /trade → Server
Server → { trade } → Client
Client → GET /account → Server (extra round trip!)
Server → { account } → Client

GOOD: Response Bundling  
Client → POST /trade → Server
Server → { trade, account } → Client (single response)
```

**API Response Pattern:**

```json
// POST /trade/
{
  "trade": {
    "id": 2893232,
    "user": 1,
    "amount": "50.2335324",
    "coin": "doge"
  },
  "account": {
    "id": 899,
    "user": 1,
    "balance": "1337.00"
  }
}
```

### 2. Entity Identification

**Always include the primary key in responses** - even when it seems redundant.

```json
// GET /products/btc-usd/ticker
// BAD: Missing identifier
{ "price": "32000.50", "volume": "1234" }

// GOOD: Include pk
{ "product_id": "btc-usd", "price": "32000.50", "volume": "1234" }
```

If the pk is only in the URL, clients must reconstruct it. Include it explicitly.

### 3. Nested Relational Data

**Nest related entities** rather than returning flat ID references.

```json
// BAD: Flat references require multiple fetches
{
  "id": "1",
  "title": "My post",
  "author_id": "123",
  "comment_ids": ["249", "250"]
}

// GOOD: Nested entities enable single-fetch normalization
{
  "id": "1", 
  "title": "My post",
  "author": { "id": "123", "name": "Paul" },
  "comments": [
    { "id": "249", "content": "Nice!", "commenter": { "id": "245", "name": "Jane" } }
  ]
}
```

Deeply nested responses normalize into a flat entity table - subsequent requests for the same user/comment return instantly from cache.

## List vs Detail Responses (Partial Entities)

Use **summary schemas for lists**, **full schemas for details**.

```json
// GET /articles (list - minimal fields)
[
  { "id": "1", "title": "First Article" },
  { "id": "2", "title": "Second Article" }
]

// GET /articles/1 (detail - full fields)
{
  "id": "1",
  "title": "First Article",
  "content": "Full article content here...",
  "createdAt": "2024-01-15T10:30:00Z",
  "meta": {
    "viewCount": 1523,
    "likeCount": 42
  }
}
```

**Expensive data in nested entities** - Move view counts, analytics, related items into a separate nested object. This simplifies client-side conditional rendering.

## Pagination

### Cursor-Based (Recommended)

```json
// GET /posts?cursor=abc123
{
  "posts": [
    { "id": "1", "title": "Post 1" },
    { "id": "2", "title": "Post 2" }
  ],
  "cursor": "def456"
}
```

### Offset-Based

```json
// GET /posts?page=2
{
  "results": [...],
  "page": 2,
  "total": 100
}
```

**Pagination in headers** is acceptable but requires client-side parsing:

```
Link: <https://api.example.com/posts?cursor=xyz>; rel="next"
```

## Optimistic Update Support

### Include Timestamps for Ordering

To prevent race conditions with optimistic updates, include an `updatedAt` field:

```json
// Accept updatedAt in request
POST /api/count/increment
{ "updatedAt": 1706234567890 }

// Return it in response
{ "count": 42, "updatedAt": 1706234567890 }
```

The client uses this to reorder out-of-sequence responses correctly.

### Return Full Entity on Mutation

For `PATCH` requests, return the **complete updated entity**, not just changed fields:

```json
// PATCH /todos/5 with { "completed": true }

// BAD: Only changed field
{ "completed": true }

// GOOD: Full entity
{ "id": 5, "title": "Buy milk", "completed": true, "userId": 1 }
```

## Collection Mutations

### Create (POST) - Return the Created Entity

```json
// POST /todos
// Request: { "title": "New todo" }
// Response:
{ "id": 123, "title": "New todo", "completed": false }
```

The `id` from the server replaces any temporary client ID.

### Delete - Return Identifier

```json
// DELETE /todos/5
// Response (minimal):
{ "id": 5 }

// Or HTTP 204 No Content (client uses request params)
```

## Anti-Patterns

### 1. Action-Based Responses Without Entity Data

```json
// BAD: No entity data to cache
POST /todos/5/complete → { "success": true }

// GOOD: Return updated entity
POST /todos/5/complete → { "id": 5, "title": "...", "completed": true }
```

### 2. Inconsistent Entity Shapes

```json
// BAD: Different shapes for same entity
GET /users/1 → { "id": 1, "name": "..." }
GET /posts/1 → { "author": { "userId": 1, "displayName": "..." } }

// GOOD: Consistent shape
GET /users/1 → { "id": 1, "name": "..." }  
GET /posts/1 → { "author": { "id": 1, "name": "..." } }
```

### 3. Returning Arrays Without Wrapper

```json
// Inflexible: Can't add pagination metadata
GET /posts → [...]

// Better: Wrapper allows metadata
GET /posts → { "posts": [...], "cursor": "..." }
```

### 4. Missing IDs on Nested Entities

```json
// BAD: Anonymous nested data can't be normalized
{ "id": 1, "author": { "name": "Paul" } }

// GOOD: All entities have IDs
{ "id": 1, "author": { "id": 123, "name": "Paul" } }
```

## Quick Reference: HTTP Method → Response Pattern

| Method | Response | Notes |
|--------|----------|-------|
| GET (single) | Full entity | Include all fields |
| GET (list) | `{ items: [...], cursor? }` | Summary entities OK |
| POST | Created entity + side effects | Include generated ID |
| PUT | Full updated entity | All fields |
| PATCH | Full updated entity | Not just changed fields |
| DELETE | `{ id }` or 204 | Minimal response OK |

## References

- Read [Response bundling patterns](references/bundling.md) when deciding what one endpoint should return together (nested entities, side effects, list + detail).
- Read [Client schema examples](references/client-schemas.md) when writing the Data Client `Entity`/`schema` definitions that consume an endpoint.
