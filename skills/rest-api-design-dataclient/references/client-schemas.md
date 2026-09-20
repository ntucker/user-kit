# Client Schema Examples

Data Client schema patterns for consuming well-designed REST APIs.

## Nested Relational Data

```typescript
import { Collection, Entity, resource } from '@data-client/rest';

export class User extends Entity {
  id = '';
  name = '';
}

export class Comment extends Entity {
  id = '';
  content = '';
  commenter = User.fromJS();

  static schema = {
    commenter: User,
  };
}

export class Post extends Entity {
  id = '';
  title = '';
  author = User.fromJS();
  comments: Comment[] = [];

  static schema = {
    author: User,
    // Collection enables .push/.unshift mutations
    comments: new Collection([Comment], {
      nestKey: (parent, key) => ({ postId: parent.id }),
    }),
  };
}

export const PostResource = resource({
  path: '/posts/:id',
  schema: Post,
});
```

## Partial Entities (List vs Detail)

```typescript
import { validateRequired, Collection, Entity, resource } from '@data-client/rest';

// Summary for list endpoints
export class ArticleSummary extends Entity {
  id = '';
  title = '';

  static key = 'Article'; // Same key as Article - they share cache
}

// Full entity for detail endpoints
export class Article extends ArticleSummary {
  content = '';
  createdAt = Temporal.Instant.fromEpochMilliseconds(0);
  meta = ArticleMeta.fromJS();

  static schema = {
    createdAt: Temporal.Instant.from,
    meta: ArticleMeta,
  };

  // Ensures detail fetch when summary data isn't sufficient
  static validate(processedEntity) {
    return validateRequired(processedEntity, this.defaults);
  }
}

export const ArticleResource = resource({
  path: '/article/:id',
  schema: Article,
}).extend({
  getList: {
    schema: new Collection([ArticleSummary]),
  },
});
```

## Response Bundling Schema

```typescript
import { resource, Entity } from '@data-client/rest';

export class Trade extends Entity {
  id = 0;
  amount = '0';
  coin = '';
}

export class Account extends Entity {
  id = 0;
  balance = '0';
}

export const TradeResource = resource({
  path: '/trade/:id',
  schema: Trade,
}).extend(Base => ({
  create: Base.getList.push.extend({
    schema: {
      trade: Base.getList.push.schema,
      account: Account,
    },
  }),
}));

// Usage
ctrl.fetch(TradeResource.create, { coin: 'doge', amount: '50' });
// Both Trade and Account are updated atomically
```

## Pagination Schema

```typescript
import { Collection, Entity, resource } from '@data-client/rest';

export class Post extends Entity {
  id = '';
  title = '';
}

export const PostResource = resource({
  path: '/posts/:id',
  schema: Post,
  paginationField: 'cursor',
}).extend('getList', {
  schema: { 
    posts: new Collection([Post]), 
    cursor: '' 
  },
});

// Usage
const { posts, cursor } = useSuspense(PostResource.getList);
// Load more:
ctrl.fetch(PostResource.getList.getPage, { cursor });
```

## Optimistic Updates with Timestamps

```typescript
import { Entity, RestEndpoint } from '@data-client/rest';

export class CountEntity extends Entity {
  count = 0;
  updatedAt = 0;

  pk() {
    return 'SINGLETON';
  }

  // Reorder responses if server processed out-of-order
  static shouldReorder(existingMeta, incomingMeta, existing, incoming) {
    return incoming.updatedAt < existing.updatedAt;
  }
}

export const increment = new RestEndpoint({
  path: '/api/count/increment',
  method: 'POST',
  body: undefined,
  schema: CountEntity,
  
  getRequestInit() {
    return RestEndpoint.prototype.getRequestInit.call(this, {
      updatedAt: Date.now(),
    });
  },
  
  getOptimisticResponse(snap) {
    const data = snap.get(CountEntity, {});
    if (!data) throw snap.abort;
    return {
      count: data.count + 1,
      updatedAt: snap.fetchedAt,
    };
  },
});
```

## Client-Side Joins

When API doesn't nest data but you want relational access:

```typescript
export class Todo extends Entity {
  id = 0;
  userId = 0;
  user? = User.fromJS();
  title = '';

  static schema = {
    user: User,
  };

  // Transform userId reference into nested user
  static process(todo) {
    return { ...todo, user: todo.userId };
  }
}

// Now todo.user is populated from User table if fetched
```
