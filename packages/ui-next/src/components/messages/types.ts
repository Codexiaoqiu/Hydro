/* Shared types for the home_messages feature. */

export interface MessageMdoc {
  _id: string;
  from: number;
  to: number | number[];
  content: string;
  flag?: number;
  // Server timestamps; emitted by `message.send` indirectly via the `_id`
  // ObjectId, but we tolerate both shapes for forward-compat.
  at?: number;
}

export interface MessageUdoc {
  _id: number;
  uname?: string;
  avatarUrl?: string;
  [k: string]: unknown;
}

export interface Conversation {
  /** The other party's user id (uid). */
  targetUid: number;
  udoc: MessageUdoc;
  messages: MessageMdoc[];
}

export interface HomeMessagesArgs {
  /** Current logged-in user id (`UserContext._id`). */
  selfUid?: number;
  /** Grouped conversations keyed by the other party's uid. */
  messages?: Record<number, {
    _id: number;
    udoc: MessageUdoc;
    messages: MessageMdoc[];
  }>;
  /** WebSocket prefix, e.g. `wss://hydro.ac/`. */
  ws_prefix?: string;
}
