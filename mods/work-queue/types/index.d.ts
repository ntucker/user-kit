/** What an item waits on before it can start; it is open until cleared */
export type Wait =
  /** A pull request, `owner/repo#123`; cleared once it merges */
  | { kind: 'pr'; pr: string; isMerged?: boolean }
  /** A question only the person can answer */
  | { kind: 'decision'; ask: string }
  /** Another queue item; cleared once that item is done or dropped */
  | { kind: 'item'; item: number }
  /** Anything else; with `after` (YYYY-MM-DD) it clears on that day */
  | { kind: 'event'; what: string; after?: string };

export type ItemState = 'queued' | 'running' | 'done' | 'dropped';

export type Priority = 'high' | 'normal' | 'low';

export type Note = { date: string; text: string };

export type Item = {
  n: number;
  title: string;
  /** A self-contained description: enough to start the work cold */
  brief: string;
  state: ItemState;
  waits: Wait[];
  priority?: Priority;
  repo?: string;
  /** Where the item came from: a thread, a PR comment, a request */
  source?: string;
  /** The thread or session working on it */
  thread?: { title: string; url?: string };
  /** PRs the work opened, `owner/repo#123` */
  prs?: string[];
  notes?: Note[];
  /** YYYY-MM-DD dates the item started and ended */
  started?: string;
  ended?: string;
  /** How a done or dropped item ended */
  outcome?: string;
};

export type Queue = {
  version: 1;
  /** Standing rules for whoever starts items (capacity, what to ask first) */
  rules?: string;
  /** Item numbers to start first, in order; the rest follow by priority */
  order?: number[];
  items: Item[];
};

/** Where an item sits, derived from its state and its open waits */
export type Group =
  | 'decision'
  | 'ready'
  | 'pr'
  | 'item'
  | 'event'
  | 'running'
  | 'done';

export type Tab = 'open' | 'running' | 'done';

/** The queue file as last read */
export type QueueSnapshot =
  | { kind: 'ok'; queue: Queue; mtimeMs: number }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

/** What the `queue` tool takes */
export type ToolInput = {
  action: 'list' | 'get' | 'add' | 'update';
  n?: number;
  withDone?: boolean;
  title?: string;
  brief?: string;
  state?: ItemState;
  priority?: Priority;
  repo?: string;
  source?: string;
  /** Adds waits */
  addWaits?: Wait[];
  /** Removes waits, matched by kind and what they name */
  clearWaits?: Wait[];
  thread?: { title: string; url?: string };
  /** Adds PRs */
  prs?: string[];
  note?: string;
  outcome?: string;
};

declare module 'claude-code' {
  interface McpToolInputs {
    'mcp__work-queue__queue': ToolInput;
  }

  interface PluginState {
    'work-queue': {
      snapshot: QueueSnapshot | null;
      tab: Tab;
      /** The item the pane shows in full */
      selected: number | null;
    };
  }
}
