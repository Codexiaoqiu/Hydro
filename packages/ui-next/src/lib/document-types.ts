// Canonical document-type constants mirrored from
// `packages/hydrooj/src/model/document.ts:22-31`. The server-side module
// owns the values; this SPA-side barrel exists only so consumers can use the
// symbolic name instead of bare integers. Always keep this list in sync with
// the server's `document.ts` block.
//
// ```ts
// export const TYPE_PROBLEM = 10 as const;
// export const TYPE_PROBLEM_SOLUTION = 11 as const;
// export const TYPE_PROBLEM_LIST = 12 as const;
// export const TYPE_DISCUSSION_NODE = 20 as const;
// export const TYPE_DISCUSSION = 21 as const;
// export const TYPE_DISCUSSION_REPLY = 22 as const;
// export const TYPE_CONTEST = 30 as const;
// export const TYPE_CONTEST_CLARIFICATION = 31 as const;
// export const TYPE_CONTEST_PRINT = 32 as const;
// export const TYPE_TRAINING = 40 as const;
// ```
export const TYPE_PROBLEM = 10 as const;
export const TYPE_PROBLEM_SOLUTION = 11 as const;
export const TYPE_PROBLEM_LIST = 12 as const;
export const TYPE_DISCUSSION_NODE = 20 as const;
export const TYPE_DISCUSSION = 21 as const;
export const TYPE_DISCUSSION_REPLY = 22 as const;
export const TYPE_CONTEST = 30 as const;
export const TYPE_CONTEST_CLARIFICATION = 31 as const;
export const TYPE_CONTEST_PRINT = 32 as const;
export const TYPE_TRAINING = 40 as const;
