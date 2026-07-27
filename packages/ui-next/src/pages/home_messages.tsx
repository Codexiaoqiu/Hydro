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
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePageData, useUiContext } from '../context/page-data';
import { ConversationList } from '../components/messages/ConversationList';
import { MessagePane } from '../components/messages/MessagePane';
import type { Conversation, HomeMessagesArgs, MessageMdoc, MessageUdoc } from '../components/messages/types';
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

function buildInitial(args: HomeMessagesArgs): Conversation[] {
  const out: Conversation[] = [];
  const grouped = args.messages ?? {};
  for (const [k, conv] of Object.entries(grouped)) {
    const targetUid = conv._id ?? Number(k);
    out.push({
      targetUid,
      udoc: conv.udoc,
      messages: conv.messages ?? [],
    });
  }
  // Most recent message first within each thread; sort threads by recency.
  for (const c of out) {
    c.messages = [...c.messages].reverse();
  }
  out.sort((a, b) => {
    const at = a.messages[a.messages.length - 1]?._id ?? '';
    const bt = b.messages[b.messages.length - 1]?._id ?? '';
    return bt.localeCompare(at);
  });
  return out;
}

export default function HomeMessagesPage() {
  const { args } = usePageData() as unknown as { args: HomeMessagesArgs };
  const ui = useUiContext() as unknown as { ws_prefix?: string };
  const t = useTranslate();
  const selfUid = args.selfUid ?? 0;

  const [conversations, setConversations] = useState<Conversation[]>(() => buildInitial(args));
  const [selected, setSelected] = useState<number | null>(
    () => buildInitial(args)[0]?.targetUid ?? null,
  );
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // Live updates — every push carries both the new message and the sender.
  const handleIncoming = (payload: { udoc: MessageUdoc; mdoc: MessageMdoc }) => {
    const senderUid = payload.udoc._id;
    if (!senderUid || !payload.mdoc) return;
    setConversations((prev) => {
      const existing = prev.find((c) => c.targetUid === senderUid);
      const nextMsgs = payload.mdoc;
      if (existing) {
        return prev
          .map((c) => (c.targetUid === senderUid
            ? { ...c, messages: [...c.messages, nextMsgs] }
            : c))
          .sort((a, b) => {
            const aLast = a.messages[a.messages.length - 1]?._id ?? '';
            const bLast = b.messages[b.messages.length - 1]?._id ?? '';
            return bLast.localeCompare(aLast);
          });
      }
      // New conversation — prepend and select it.
      const fresh: Conversation = {
        targetUid: senderUid,
        udoc: payload.udoc,
        messages: [nextMsgs],
      };
      return [fresh, ...prev];
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
  // re-mounts the page (SPA navigation between routes).
  useEffect(() => {
    setConversations(buildInitial(args));
  }, [args.messages]);

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
    // Optimistic append; the WebSocket echo will dedupe if the server
    // happens to broadcast the same message back to us.
    setConversations((prev) => prev
      .map((c) => (c.targetUid === targetUid
        ? {
          ...c,
          messages: [...c.messages, {
            _id: `local-${Date.now()}`,
            from: selfUid,
            to: targetUid,
            content,
          }],
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
    setConversations((prev) => prev
      .map((c) => (c.targetUid === targetUid
        ? { ...c, messages: c.messages.filter((m) => String(m._id) !== id) }
        : c)));
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
