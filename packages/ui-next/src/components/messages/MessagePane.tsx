import { type FormEvent, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Conversation } from './types';

export interface MessagePaneProps {
  selfUid: number;
  conversation: Conversation;
  labels: {
    placeholder: string;
    send: string;
    sending: string;
    deleteFailed: string;
  };
  onSend: (content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

/**
 * Right pane: header + scrollable message list + send form. Self-contained
 * state machine for the `sending` flag so multiple bubbles submit cleanly.
 */
export function MessagePane({
  selfUid, conversation, labels, onSend, onDelete,
}: MessagePaneProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-2)',
    }}>
      <header style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600, fontSize: 'var(--text-md)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      }}>
        {conversation.udoc.avatarUrl
          ? <img
            src={conversation.udoc.avatarUrl}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: '50%', objectFit: 'cover' }} />
          : <span
            aria-hidden
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg-3)', display: 'inline-block',
            }} />}
        <span>{conversation.udoc.uname ?? `#${conversation.targetUid}`}</span>
      </header>
      <div
        role="log"
        aria-live="polite"
        style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}
      >
        {conversation.messages.length === 0 && (
          <div style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)', textAlign: 'center', marginTop: 'var(--space-5)' }}>
            —
          </div>
        )}
        {conversation.messages.map((m) => (
          <MessageBubble
            key={String(m._id)}
            message={m}
            selfUid={selfUid}
            onDelete={(id) => { void onDelete(id); }}
          />
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex', gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          placeholder={labels.placeholder}
          style={{
            flex: 1, padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            background: 'var(--bg-1)', color: 'var(--text)', fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)', border: 'none',
            background: 'var(--accent)', color: 'var(--text-on-accent, #fff)',
            cursor: sending ? 'wait' : 'pointer',
            opacity: !draft.trim() || sending ? 0.6 : 1,
            fontWeight: 600,
          }}
        >
          {sending ? labels.sending : labels.send}
        </button>
      </form>
    </div>
  );
}
