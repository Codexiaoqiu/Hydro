/**
 * `/home/messages` — DM (direct message) inbox.
 *
 * Modernised port of `packages/ui-default/pages/home_messages.page.tsx`.
 * Differs from the legacy page in two structural ways:
 *
 *   1. The legacy page pulled in a Redux store + a jQuery-mounted message
 *      pad. We render a self-contained two-pane layout driven by local state
 *      + a small reducer on the page.
 *   2. Live updates now go through `useMessageStream` (one WebSocket,
 *      server-pushed events), instead of the legacy `messagepad` socket
 *      that decoded each frame ad-hoc.
 *
 * Backend contract is preserved: server injects `args.messages` (grouped by
 * the *other* party's uid), server accepts `POST /home/messages` for send
 * and delete, server pushes `user/message` events on the websocket.
 */
import { useEffect, useMemo, useState } from 'react';
import { ConversationList } from '../components/messages/ConversationList';
import { MessagePane } from '../components/messages/MessagePane';
import type { Conversation, HomeMessagesArgs, MessageMdoc, MessageUdoc } from '../components/messages/types';
import { usePageData, useUiContext } from '../context/page-data';
import { useMessageStream } from '../hooks/useMessageStream';
import { useTranslate } from '../lib/i18n';

function readSessionId(): string {
  // The server subscribes using the session cookie (`sid`). The cookie is
  // exposed via `document.cookie` in the browser; we extract it for the
  // WebSocket subscribe frame. Sessions without `sid` (e.g. dev tools) skip.
  if (typeof document === 'undefined') return '';
  const match = /(?:^|;\s*)sid=([^;]+)/.exec(document.cookie);
  return match?.[1] ?? '';
}

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?._id ?? '';
    const bLast = b.messages[b.messages.length - 1]?._id ?? '';
    return bLast.localeCompare(aLast);
  });
}

/**
 * Merge server-injected initial conversations with any locally-accumulated
 * messages. Used both at first mount (when local state is empty) and on every
 * SPA re-injection (when we must keep optimistic / unsynced entries).
 */
function mergeConversations(
  initial: Conversation[],
  local: Conversation[],
): Conversation[] {
  if (!local.length) return initial;
  const byId = new Map<number, Conversation>();
  for (const c of initial) byId.set(c.targetUid, { ...c, messages: [...c.messages] });
  for (const c of local) {
    const existing = byId.get(c.targetUid);
    if (!existing) {
      byId.set(c.targetUid, c);
      continue;
    }
    const seen = new Set(existing.messages.map((m) => String(m._id)));
    const extras = c.messages.filter((m) => !seen.has(String(m._id)));
    existing.messages = [...existing.messages, ...extras];
  }
  return sortConversations(Array.from(byId.values()));
}

function buildInitial(args: HomeMessagesArgs): Conversation[] {
  const out: Conversation[] = [];
  const grouped = args.messages ?? {};
  for (const [k, conv] of Object.entries(grouped)) {
    const targetUid = conv._id ?? Number(k);
    out.push({
      targetUid,
      udoc: conv.udoc,
      // Server stores most-recent-first; reverse so render order is chronological.
      messages: [...(conv.messages ?? [])].reverse(),
    });
  }
  return sortConversations(out);
}

export default function HomeMessagesPage() {
  const { args } = usePageData();
  const ui = useUiContext() as unknown as { ws_prefix?: string };
  const t = useTranslate();
  const selfUid = args.selfUid ?? 0;

  // Build the initial server snapshot once; subsequent re-injections are
  // merged via `mergeConversations` so optimistic / unsynced local messages
  // survive SPA navigation. `args` is itself a stable reference per mount,
  // so this only re-runs on actual page remount.
  const initialConversations = useMemo(() => buildInitial(args), [args]);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selected, setSelected] = useState<number | null>(
    initialConversations[0]?.targetUid ?? null,
  );

  // Live updates — every push carries both the new message and the sender.
  // Dedup rules:
  //   1. Same `_id` ⇒ already present, ignore (server may broadcast twice).
  //   2. A pending `local-*` with the same `(from, to, content)` ⇒ the WS
  //      echo of *our own* optimistic send; drop the local stub so the user
  //      only sees the server-canonical entry once.
  const handleIncoming = (payload: { udoc: MessageUdoc, mdoc: MessageMdoc }) => {
    const senderUid = payload.udoc._id;
    if (!senderUid || !payload.mdoc) return;
    setConversations((prev) => {
      const incomingId = String(payload.mdoc._id);
      const existing = prev.find((c) => c.targetUid === senderUid);
      if (existing) {
        const hasSameId = existing.messages.some((m) => String(m._id) === incomingId);
        if (!hasSameId) {
          const isOwnEcho = existing.messages.some((m) =>
            String(m._id).startsWith('local-')
            && m.from === payload.mdoc.from
            && String(m.to) === String(payload.mdoc.to)
            && m.content === payload.mdoc.content,
          );
          const nextMessages = isOwnEcho
            // Replace the local stub with the server-canonical entry so the
            // visible row carries the real ObjectId.
            ? existing.messages
              .filter((m) => !String(m._id).startsWith('local-')
                || m.from !== payload.mdoc.from
                || String(m.to) !== String(payload.mdoc.to)
                || m.content !== payload.mdoc.content)
              .concat(payload.mdoc)
            : [...existing.messages, payload.mdoc];
          return sortConversations(prev.map((c) => (c.targetUid === senderUid
            ? { ...c, messages: nextMessages }
            : c)));
        }
        return prev;
      }
      // New conversation — prepend and select it.
      const fresh: Conversation = {
        targetUid: senderUid,
        udoc: payload.udoc,
        messages: [payload.mdoc],
      };
      return sortConversations([fresh, ...prev]);
    });
    // Auto-select the conversation that just received a message so the user
    // sees it without an extra click (mirrors the ui-default behaviour).
    setSelected(senderUid);
  };

  useMessageStream({
    url: `${ui.ws_prefix ?? ''}websocket`,
    enabled: selfUid > 0,
    onMessage: handleIncoming,
    onOpen: (send) => {
      // Open-frame protocol mirrors `packages/hydrooj/src/handler/home.ts`
      // subscription: every privileged client subscribes to its own
      // `message:<selfUid>` channel.
      const sid = readSessionId();
      if (!sid) return;
      send(JSON.stringify({
        operation: 'subscribe',
        request_id: Math.random().toString(16).slice(2),
        credential: sid,
        channels: [`message:${selfUid}`],
      }));
    },
  });

  // Keep the underlying server injection in sync if a router refresh
  // re-mounts the page (SPA navigation between routes). Merge rather than
  // replace so optimistic stubs and unsynced WS events survive the swap.
  // We intentionally depend on the JSON-serialised contents so a router
  // refresh that yields an equivalent object doesn't trigger a no-op merge.
  // The `set-state-in-effect` and `exhaustive-deps` lints are by design —
  // this is the canonical sync-state-with-prop pattern (see React docs:
  // "You Might Not Need an Effect → Adjusting some state when a prop
  // changes"). Documented inline on the setState line.
  const argsMessages = args.messages;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations((prev) => mergeConversations(buildInitial({ ...args, messages: argsMessages }), prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(argsMessages ?? {}), selfUid]);

  const active = useMemo(
    () => conversations.find((c) => c.targetUid === selected) ?? null,
    [conversations, selected],
  );

  const sendMessage = async (targetUid: number, content: string) => {
    const fd = new URLSearchParams();
    fd.set('uid', String(targetUid));
    fd.set('content', content);
    const res = await fetch('/home/messages', { method: 'POST', body: fd, credentials: 'same-origin' });
    if (!res.ok) throw new Error(`send failed: ${res.status}`);
    // Optimistic append with a `local-*` id. The WS echo handler above
    // matches this stub by `(from, to, content)` and replaces it with the
    // server-canonical message, so the user only sees one row.
    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setConversations((prev) => prev.map((c) => (c.targetUid === targetUid
      ? {
        ...c,
        messages: [...c.messages, { _id: localId, from: selfUid, to: targetUid, content }],
      }
      : c)));
  };

  const deleteMessage = async (targetUid: number, id: string) => {
    if (id.startsWith('local-')) {
      // Pure optimistic message — just remove it from local state.
      setConversations((prev) => prev
        .map((c) => (c.targetUid === targetUid
          ? { ...c, messages: c.messages.filter((m) => String(m._id) !== id) }
          : c)));
      return;
    }
    const fd = new URLSearchParams();
    fd.set('operation', 'delete_message');
    fd.set('messageId', id);
    const res = await fetch('/home/messages', { method: 'POST', body: fd, credentials: 'same-origin' });
    if (!res.ok) throw new Error(`delete failed: ${res.status}`);
    setConversations((prev) => {
      const target = prev.find((c) => c.targetUid === targetUid);
      // Idempotent: if the server confirms a delete we already removed
      // locally (e.g. via a parallel WS event), the post-fetch update
      // would be a no-op anyway, but guard against double-decrement by
      // skipping when the id is already gone.
      if (!target?.messages.some((m) => String(m._id) === id)) return prev;
      return prev.map((c) => (c.targetUid === targetUid
        ? { ...c, messages: c.messages.filter((m) => String(m._id) !== id) }
        : c));
    });
  };

  return (
    <main style={{
      maxWidth: 960, margin: '0 auto', padding: 'var(--space-4)',
      height: 'calc(100vh - 120px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
        margin: '0 0 var(--space-4) 0',
      }}>
        {t('HomeMessages.Title')}
      </h1>
      <section
        aria-label={t('HomeMessages.Title')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 320px) 1fr',
          flex: 1,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <ConversationList
          conversations={conversations}
          selected={selected}
          onSelect={setSelected}
          labels={{ empty: t('HomeMessages.Empty'), you: t('HomeMessages.You') }}
        />
        {active
          ? (
            <MessagePane
              selfUid={selfUid}
              conversation={active}
              labels={{
                placeholder: t('HomeMessages.InputPlaceholder'),
                send: t('HomeMessages.Send'),
                sending: t('HomeMessages.Sending'),
                deleteFailed: t('HomeMessages.DeleteFailed'),
              }}
              onSend={(content) => sendMessage(active.targetUid, content)}
              onDelete={(id) => deleteMessage(active.targetUid, id)}
            />
          )
          : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-mute)', fontSize: 'var(--text-sm)',
              background: 'var(--bg-2)',
            }}>
              {t('HomeMessages.SelectConversation')}
            </div>
          )}
      </section>
    </main>
  );
}
