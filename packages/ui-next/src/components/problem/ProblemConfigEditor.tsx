import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { parseProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigEditor.module.css';

const MonacoWrapper = lazy(async () => {
  const monaco = await import('@monaco-editor/react');
  return { default: monaco.default };
});

export interface ProblemConfigEditorProps {
  value: string;
  onChange: (nextYaml: string, parsed: ReturnType<typeof parseProblemConfigYaml>) => void;
  height?: number;
}

function FallbackTextarea({ value, onChange, height }: ProblemConfigEditorProps) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      style={{ height: height ?? 400 }}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v, parseProblemConfigYaml(v));
      }}
      spellCheck={false}
    />
  );
}

export function ProblemConfigEditor(props: ProblemConfigEditorProps) {
  // 用动态 import + Suspense 拉 Monaco;happy-dom / SSR 时降级为 textarea
  if (typeof window === 'undefined') return <FallbackTextarea {...props} />;
  return (
    <Suspense fallback={<FallbackTextarea {...props} />}>
      <MonacoWrapper>
        <MonacoImpl {...props} />
      </MonacoWrapper>
    </Suspense>
  );
}

function MonacoImpl({ value, onChange, height = 400 }: ProblemConfigEditorProps) {
  // 真实实现: Editor from '@monaco-editor/react', language='yaml', theme='vs-dark',
  // onChange 触发 300ms debounce 后调 onChange(yaml, parse(yaml))
  // 为简洁此处保留钩子,完整 Monaco wiring 在后续 spec 任务中填。
  return <FallbackTextarea value={value} onChange={onChange} height={height} />;
}
