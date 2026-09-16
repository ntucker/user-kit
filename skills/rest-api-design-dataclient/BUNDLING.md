# Response Bundling Patterns

Detailed patterns for bundling related entities in mutation responses.

## Trading Platform Example

When a trade affects multiple resources (trade record, account balance, portfolio):

```json
// POST /trade/
// Request
{ "coin": "doge", "amount": "50.23", "action": "buy" }

// Response - all affected entities
{
  "trade": {
    "id": 2893232,
    "user": 1,
    "amount": "50.2335324",
    "coin": "doge",
    "action": "buy",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "account": {
    "id": 899,
    "user": 1,
    "balance": "1287.00",
    "coin_value": "53.73"
  },
  "portfolio": {
    "id": 899,
    "user": 1,
    "holdings": [
      { "coin": "doge", "amount": "1050.23" }
    ]
  }
}
```

## Client Schema Definition

```typescript
import { resource, Entity } from '@data-client/rest';
import { Account } from './Account';
import { Portfolio } from './Portfolio';

export class Trade extends Entity {
  id = 0;
  user = 0;
  amount = '0';
  coin = '';
  action = '';
  created_at = '';
}

export const TradeResource = resource({
  path: '/trade/:id',
  schema: Trade,
}).extend(Base => ({
  create: Base.getList.push.extend({
    schema: {
      trade: Base.getList.push.schema,
      account: Account,
      portfolio: Portfolio,
    },
  }),
}));
```

## Social Media Example

Creating a post that affects user stats and feed:

```json
// POST /posts/
{
  "post": {
    "id": "456",
    "content": "Hello world",
    "author": { "id": "123", "name": "Paul" },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "userStats": {
    "id": "123",
    "postCount": 42,
    "lastPostAt": "2024-01-15T10:30:00Z"
  }
}
```

## E-commerce Order Example

```json
// POST /orders/
{
  "order": {
    "id": "ORD-789",
    "items": [...],
    "total": "99.99",
    "status": "pending"
  },
  "cart": {
    "id": "CART-123",
    "items": [],
    "itemCount": 0
  },
  "user": {
    "id": "123",
    "orderCount": 5,
    "totalSpent": "499.95"
  }
}
```

## Key Principle

Any entity that changes as a **side effect** of a mutation should be included in the response. This eliminates:
- Extra GET requests after mutations
- Stale data in the cache
- Race conditions from parallel refetches
