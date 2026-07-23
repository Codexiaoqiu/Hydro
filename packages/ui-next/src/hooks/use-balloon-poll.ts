import { useJsonPoll } from './use-json-poll';

/**
 * `useBalloonPoll` — convenience wrapper over `useJsonPoll` for the contest
 * balloon page. The wrapper exists for two reasons:
 *
 *   1. Auto-polling is enabled iff the contest is `isOngoing(tdoc, now)`.
 *      The page decides that and passes `enabled` in; the hook itself
 *      never reads the tdoc.
 *   2. `refresh()` is always usable, even when `enabled === false` —
 *      useful after a Send / Set-Color mutation when the contest has
 *      already ended and we still want to reconcile the row state.
 */
export interface UseBalloonPollArgs {
  url: string;
  enabled: boolean;
  intervalMs?: number;
}

export function useBalloonPoll<T = unknown>({
  url,
  enabled,
  intervalMs = 60_000,
}: UseBalloonPollArgs): ReturnType<typeof useJsonPoll<T>> {
  return useJsonPoll<T>({ url, enabled, intervalMs });
}