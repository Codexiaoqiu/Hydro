import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useScratchpad } from './ScratchpadContext';
import { usePretestSession } from './usePretestSession';
import { PretestPanel } from './PretestPanel';
import { RecordsPanel } from './RecordsPanel';
import { ScratchpadSlot } from './ScratchpadSlot';
import {
  readScratchpadSettings,
  SCRATCHPAD_SETTINGS_CHANGE_EVENT,
  DEFAULT_SCRATCHPAD_SETTINGS,
  type ScratchpadEditorTheme,
  type ScratchpadSettingsValue,
} from './ScratchpadSettings';
import { ScratchpadToolbar } from './ScratchpadToolbar';
import styles from './Scratchpad.module.css';

interface PdocMinimal {
  config?: { type?: string; langs?: Array<string | { key?: string; display?: string; validAs?: Record<string, string>; pretest?: string | false; remote_judge?: boolean }> } | string;
}

function availableLanguages(pdoc: PdocMinimal) {
  const langs = (typeof pdoc.config === 'object' && pdoc.config?.langs) || ['cpp'];
  const type = typeof pdoc.config === 'object' ? pdoc.config?.type : undefined;
  return langs
    .map((entry) => typeof entry === 'string' ? { key: entry, meta: undefined } : { key: entry.key ?? '', meta: entry })
    .filter(({ key, meta }) => {
      if (!key || meta?.pretest === false) return false;
      if (!meta || type !== 'remote_judge') return true;
      return typeof meta.pretest === 'string'
        || !!meta.remote_judge
        || !!(meta.validAs && Object.keys(meta.validAs).length);
    })
    .map(({ key }) => key);
}

export interface ScratchpadEditorPaneProps {
  pdoc: PdocMinimal;
  pretestConnUrl: string;
  postSubmitUrl: string;
  getSubmissionsUrl: string;
  problemId: number;
  tdoc?: { docId?: string };
  UserContext: { _id?: number; canViewRecord?: boolean; codeLang?: string; };
  onExit: () => void;
  rid: string | null;
  setRid: (rid: string | null) => void;
}

function readHydroTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function resolveEditorTheme(
  pref: ScratchpadEditorTheme,
  hydroTheme: 'light' | 'dark',
): 'vs-light' | 'vs-dark' {
  if (pref === 'vs-light') return 'vs-light';
  if (pref === 'vs-dark') return 'vs-dark';
  return hydroTheme === 'dark' ? 'vs-dark' : 'vs-light';
}

export function ScratchpadEditorPane({
  pdoc,
  pretestConnUrl,
  postSubmitUrl,
  getSubmissionsUrl,
  problemId,
  tdoc,
  UserContext,
  onExit,
  rid,
  setRid,
}: ScratchpadEditorPaneProps) {
  const { state, dispatch } = useScratchpad();

  usePretestSession({ url: pretestConnUrl, enabled: !!rid, rid, dispatch });

  const languages = useMemo(() => availableLanguages(pdoc), [pdoc]);
  const toolbarPdoc = typeof pdoc.config === 'object'
    ? { ...pdoc, config: { ...pdoc.config, langs: languages } }
    : { ...pdoc, config: { langs: languages } };
  useEffect(() => {
    if (languages.length && !languages.includes(state.lang)) {
      dispatch({ type: 'SET_LANG', payload: languages[0] });
    }
  }, [dispatch, languages, state.lang]);

  const [settings, setSettings] = useState<ScratchpadSettingsValue>(() => {
    // SSR safety: readScratchpadSettings already handles missing window.
    if (typeof window === 'undefined') return { ...DEFAULT_SCRATCHPAD_SETTINGS };
    return readScratchpadSettings();
  });
  const [hydroTheme, setHydroTheme] = useState<'light' | 'dark'>(() => readHydroTheme());

  useEffect(() => {
    function onSettingsChange(event: Event) {
      const detail = (event as CustomEvent<ScratchpadSettingsValue>).detail;
      if (detail) setSettings(detail);
    }
    function onThemeChange() {
      setHydroTheme(readHydroTheme());
    }
    window.addEventListener(SCRATCHPAD_SETTINGS_CHANGE_EVENT, onSettingsChange);
    window.addEventListener('hydro:theme-change', onThemeChange);
    return () => {
      window.removeEventListener(SCRATCHPAD_SETTINGS_CHANGE_EVENT, onSettingsChange);
      window.removeEventListener('hydro:theme-change', onThemeChange);
    };
  }, []);

  const editorTheme = resolveEditorTheme(settings.editorTheme, hydroTheme);
  const fontSize = settings.fontSize > 0 ? settings.fontSize : undefined;

  return (
    <section className={styles.editorPane} aria-label="Scratchpad editor pane">
      <ScratchpadToolbar
        postSubmitUrl={postSubmitUrl}
        pretestConnUrl={pretestConnUrl}
        getSubmissionsUrl={getSubmissionsUrl}
        problemId={problemId}
        pdoc={toolbarPdoc}
        tdoc={tdoc}
        UserContext={UserContext}
        onExit={onExit}
        setRid={setRid}
      />
      <div className={styles.editorToolbarExtras}>
        <ScratchpadSlot name="editor-toolbar-extra" />
      </div>
      <div className={styles.editorSurface}>
        <Editor
          value={state.code}
          language={state.lang || 'plaintext'}
          theme={editorTheme}
          onChange={(v) => dispatch({ type: 'SET_CODE', payload: v ?? '' })}
          options={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            minimap: { enabled: false },
          }}
          height="100%"
          aria-label="Code editor"
        />
      </div>
      {state.showPretestPanel && (
        <div className={styles.bottomPanel}>
          <PretestPanel />
        </div>
      )}
      {state.showRecordsPanel && (
        <div className={styles.bottomPanel}>
          <RecordsPanel
            submissionsUrl={getSubmissionsUrl}
            wsUrl={pretestConnUrl}
            canViewRecord={UserContext.canViewRecord}
          />
        </div>
      )}
    </section>
  );
}