import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import Editor from '@monaco-editor/react';

// TODO: 接入真正的 Monaco / CodeMirror
//
// This is the textarea fallback used everywhere `ProblemForm` / `Scratchpad`
// would otherwise have mounted `<MonacoEditor />`. The real Monaco bindings
// live in `packages/ui-default/components/scratchpad/ScratchpadEditorContainer.tsx`
// and depend on the `monaco-editor` npm package — that dependency has not
// been adopted into `@hydrooj/ui-next` yet, so the safe interim behaviour is
// a plain `<textarea>` styled to look like an editor surface.
//
// Markers preserved from ui-default's `DataInputComponent.jsx`:
//   * `spellCheck="false"`           — code shouldn't be spell-checked.
//   * `wrap="off"`                   — soft-wrapped code is unreadable.
//   * `data-monaco-fallback="true"`  — CSS hooks / e2e selectors can find
//                                       every fallback and swap it out once
//                                       the real Monaco is wired up.
//   * `className="language-<lang>"`  — keeps highlight.js / prism.js happy
//                                       (matches monaco's own `language-*`
//                                       class so any existing CSS keeps
//                                       rendering.

export interface MonacoEditorProps {
  value: string;
  onChange?: (next: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  rows?: number;
  /**
   * Forwarded to the underlying `<textarea>`. Used by screen readers to
   * announce the field; required for `textbox` accessibility in tests and
   * screen reader navigation.
   */
  'aria-label'?: string;
  /**
   * Forwarded to the underlying `<textarea>` so the editor can be submitted
   * as part of an enclosing `<form>`.
   */
  name?: string;
  /** Forwarded to the underlying `<textarea>` so labels can `htmlFor` it. */
  id?: string;
  /**
   * When true, render real Monaco via @monaco-editor/react. Default false
   * (textarea fallback) — only the scratchpad passes useMonaco to opt into
   * the heavier editor; problem_submit keeps the lightweight textarea.
   */
  useMonaco?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
  className,
  rows = 18,
  'aria-label': ariaLabel,
  name,
  id,
  useMonaco = false,
}: MonacoEditorProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  if (useMonaco) {
    return (
      <Editor
        value={value}
        language={language || 'plaintext'}
        theme="vs"
        onChange={(v) => onChange?.(v ?? '')}
        options={{ readOnly, fontFamily: 'var(--font-mono)', minimap: { enabled: false } }}
        height="100%"
        className={className}
        loading={<div style={{ padding: 'var(--space-4)', color: 'var(--text-mute)' }}>Loading editor…</div>}
      />
    );
  }

  const cls = [
    language ? `language-${language}` : '',
    'hydro-monaco-fallback',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <textarea
      id={id}
      name={name}
      aria-label={ariaLabel}
      className={cls}
      data-monaco-fallback="true"
      data-language={language ?? ''}
      spellCheck={false}
      value={value}
      onChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      // `wrap="off"` mirrors the `<textarea>` HTML attribute that the
      // underlying element supports natively; React forwards it as the
      // `wrap` prop. Combined with `whiteSpace: 'pre'` this gives the
      // monospace / no-soft-wrap behavior Monaco users expect.
      wrap="off"
      style={{
        width: '100%',
        minHeight: '320px',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
        resize: 'vertical',
        whiteSpace: 'pre',
      }}
    />
  );
}
