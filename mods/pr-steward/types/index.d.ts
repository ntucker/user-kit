export type CheckState = 'fail' | 'pending' | 'pass' | 'skip';

export type Check = { name: string; state: CheckState; url?: string };

export type Thread = {
  author: string;
  path?: string;
  body: string;
  url: string;
};

export type Pr = {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  /** The head commit's SHA */
  head: string;
  /** CLEAN, BLOCKED, BEHIND, DIRTY (conflicts), UNSTABLE, ... */
  mergeState: string;
  reviewDecision: string;
  /** GitHub's overall CI state, which also counts checks past the listed ones */
  ci: 'pass' | 'fail' | 'pending' | 'none';
  checks: Check[];
  threads: Thread[];
  /** Vercel docs preview, when the PR changes the website or docs */
  preview?: string;
};

/** A repository's `.claude/pr-steward.json` */
export type RepoConfig = {
  /** Link `url` ({number} is the PR's) once a check named `check` exists */
  preview?: { check: string; url: string };
  /** Steps /land adds after conflicts, CI and review threads */
  land: string[];
};

/** What the last refresh found: a PR, no PR for this branch, or why gh failed */
export type PrSnapshot =
  | { kind: 'pr'; pr: Pr; land: string[] }
  | { kind: 'none'; branch: string }
  | { kind: 'error'; message: string };

declare module 'claude-code' {
  interface PluginState {
    'pr-steward': { snapshot: PrSnapshot | null };
  }
}
