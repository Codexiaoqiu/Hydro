import type { Conversation } from './types';

export interface ConversationListProps {
  conversations: Conversation[];
  /** Currently selected target uid. */
  selected: number | null;
  onSelect: (targetUid: number) => void;
  /** Localized renderer hooks. */
  labels: { empty: string; you: string };
}

/**
 * Left-pane conversation picker. Renders a vertical list of users with whom
 * the current viewer has an open thread. Empty state is rendered when the
 * list is empty so the right pane never has to handle the "nothing" case.
 */
export function ConversationList({
  conversations, selected, onSelect, labels,
}: ConversationListProps) {
  if (!conversations.length) {
    return (
      <div style={{
        padding: 'var(--space-4)',
        color: 'var(--text-mute)',
        fontSize: 'var(--text-sm)',
      }}>
        {labels.empty}
      </div>
    );
  }
  return (
    <ul
      role="listbox"
      aria-label="Conversations"
      style={{
        listStyle: 'none', margin: 0, padding: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        height: '100%', overflowY: 'auto',
      }}
    >
      {conversations.map((c) => {
        const isActive = c.targetUid === selected;
        const last = c.messages[0];
        return (
          <li
            key={c.targetUid}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(c.targetUid)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(c.targetUid);
              }
            }}
            tabIndex={0}
            style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: 'var(--space-3) var(--space-4)',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              background: isActive ? 'var(--bg-1)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {c.udoc.avatarUrl
                ? <img src={c.udoc.avatarUrl} alt="" width={28} height={28}
                    style={{ borderRadius: '50%', objectFit: 'cover' }} />
                : <span aria-hidden style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--bg-3)', display: 'inline-block',
                }} />}
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {c.udoc.uname ?? `#${c.targetUid}`}
              </span>
            </div>
            {last && (
              <div style={{
                color: 'var(--text-mute)', fontSize: 'var(--text-xs)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}>
                {last.from === c.targetUid ? '' : `${labels.you}: `}
                {last.content.slice(0, 60)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
