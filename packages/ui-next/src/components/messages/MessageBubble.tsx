import type { MessageMdoc } from './types';

export interface MessageBubbleProps {
  message: MessageMdoc;
  selfUid: number;
  /** Deletable if the viewer sent this message — POST /delete_message. */
  onDelete?: (id: string) => void;
}

/**
 * Single message bubble. Outgoing messages anchor right with the brand tint;
 * incoming anchor left. Each bubble exposes a `Delete` affordance when the
 * sender is the current viewer.
 */
export function MessageBubble({ message, selfUid, onDelete }: MessageBubbleProps) {
  const outgoing = message.from === selfUid;
  const canDelete = outgoing && !!onDelete;
  return (
    <div style={{
      display: 'flex',
      justifyContent: outgoing ? 'flex-end' : 'flex-start',
      marginBottom: 'var(--space-2)',
    }}>
      <div
        style={{
          maxWidth: '70%',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          background: outgoing ? 'var(--accent)' : 'var(--bg-3)',
          color: outgoing ? 'var(--text-on-accent, #fff)' : 'var(--text)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <div>{message.content}</div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete!(String(message._id))}
            style={{
              marginTop: 'var(--space-1)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: outgoing ? 'rgba(255,255,255,0.7)' : 'var(--text-mute)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
