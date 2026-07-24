import { useMemo, useReducer, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useTranslate } from '../../lib/i18n';
import { useScratchpad } from './ScratchpadContext';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';
import { ScratchpadProblemPane } from './ScratchpadProblemPane';
import { ScratchpadSettings } from './ScratchpadSettings';
import { ScratchpadProvider } from './useScratchpadState';
import { useScratchpadHotkeys } from './useScratchpadHotkeys';
import { useScratchpadPersistence } from './useScratchpadPersistence';
import styles from './Scratchpad.module.css';

interface PdocMinimal {
  docId: number;
  pid?: string;
  title: string;
  content?: string | Record<string, string>;
  config?: { type?: string; langs?: string[] } | string;
  data?: unknown[];
  reference?: { domainId: string, pid: string | number };
}

export interface ScratchpadPanelProps {
  pdoc: PdocMinimal;
  tdoc?: { docId?: string; rule?: string };
  UserContext: { _id?: number; codeTemplate?: string; codeLang?: string; canViewRecord?: boolean };
  pretestConnUrl: string;
  postSubmitUrl: string;
  getSubmissionsUrl: string;
  contentText: string;
  contentLangs: string[];
  preferredLang: string;
  mode: 'normal' | 'contest' | 'view' | 'correction';
  problemId: number;
  onExit: () => void;
}

type ScratchpadLayout = { problem: number; editor: number };

const DEFAULT_LAYOUT: ScratchpadLayout = { problem: 45, editor: 55 };
const LAYOUT_STORAGE_KEY = 'scratchpad/layout';

function readLayout(): ScratchpadLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const layout = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? '') as Partial<ScratchpadLayout>;
    if (typeof layout.problem === 'number' && typeof layout.editor === 'number'
      && layout.problem > 0 && layout.editor > 0) {
      return { problem: layout.problem, editor: layout.editor };
    }
  } catch {
    // Use defaults when persisted state is absent or malformed.
  }
  return DEFAULT_LAYOUT;
}

function layoutReducer(_state: ScratchpadLayout, layout: ScratchpadLayout) {
  return layout;
}

export function ScratchpadPanel(props: ScratchpadPanelProps) {
  const t = useTranslate();
  const initialLang = (props.UserContext.codeLang ?? '').split('.')[0] || 'cpp';
  const initialCode = props.UserContext.codeTemplate ?? '';
  const [rid, setRid] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<'problem' | 'settings'>('problem');
  const [layout, setLayout] = useReducer(layoutReducer, undefined, readLayout);
  const problemKey = useMemo(
    () => `${props.UserContext._id ?? 0}/scratchpad/${props.problemId}`,
    [props.UserContext._id, props.problemId],
  );

  function handleExit() {
    if (window.confirm(t('Scratchpad.UnsavedConfirm'))) props.onExit();
  }

  return (
    <ScratchpadProvider initialLang={initialLang} initialCode={initialCode}>
      <PersistenceInner problemKey={problemKey} />
      <HotkeyInner onExit={handleExit} />
      <div
        className={styles.layout}
        style={{ display: 'block' }}
      >
        <Group
          defaultLayout={layout}
          id="scratchpad-main"
          onLayoutChanged={(nextLayout) => {
            const next = {
              problem: nextLayout.problem,
              editor: nextLayout.editor,
            };
            setLayout(next);
            window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
          }}
          orientation="horizontal"
        >
          <Panel id="problem" minSize="25%">
            <div className={styles.problemPane} style={{ height: '100%' }}>
              <div className={styles.pageTabs} role="tablist" aria-label="Scratchpad pages">
                <button
                  id="scratchpad-problem-tab"
                  className={styles.pageTab}
                  type="button"
                  role="tab"
                  aria-selected={activePage === 'problem'}
                  aria-controls="scratchpad-problem-panel"
                  onClick={() => setActivePage('problem')}
                >
                  Problem
                </button>
                <button
                  id="scratchpad-settings-tab"
                  className={styles.pageTab}
                  type="button"
                  role="tab"
                  aria-selected={activePage === 'settings'}
                  aria-controls="scratchpad-settings-panel"
                  onClick={() => setActivePage('settings')}
                >
                  Settings
                </button>
              </div>
              <div className={styles.pageContent}>
                {activePage === 'problem'
                  ? (
                      <div
                        id="scratchpad-problem-panel"
                        role="tabpanel"
                        aria-labelledby="scratchpad-problem-tab"
                        className={styles.pagePanel}
                      >
                        <ScratchpadProblemPane
                          pdoc={props.pdoc}
                          contentText={props.contentText}
                          contentLangs={props.contentLangs}
                          preferredLang={props.preferredLang}
                          mode={props.mode}
                        />
                      </div>
                    )
                  : <ScratchpadSettings />}
              </div>
            </div>
          </Panel>
          <Separator
            aria-label="Resize problem and editor panes"
            style={{ width: 5, background: 'var(--border)', cursor: 'col-resize' }}
          />
          <Panel id="editor" minSize="35%">
            <div style={{ display: 'grid', height: '100%' }}>
              <ScratchpadEditorPane
                pdoc={props.pdoc}
                pretestConnUrl={props.pretestConnUrl}
                postSubmitUrl={props.postSubmitUrl}
                getSubmissionsUrl={props.getSubmissionsUrl}
                problemId={props.problemId}
                tdoc={props.tdoc}
                UserContext={props.UserContext}
                onExit={handleExit}
                rid={rid}
                setRid={setRid}
              />
            </div>
          </Panel>
        </Group>
      </div>
    </ScratchpadProvider>
  );
}

function PersistenceInner({ problemKey }: { problemKey: string }) {
  const { state, dispatch } = useScratchpad();
  useScratchpadPersistence({
    problemKey,
    code: state.code,
    onLoaded: (draft) => dispatch({ type: 'SET_CODE', payload: draft }),
  });
  return null;
}

function HotkeyInner({ onExit }: { onExit: () => void }) {
  const { dispatch } = useScratchpad();
  useScratchpadHotkeys({
    onRunPretest: () => undefined,
    onSubmit: () => undefined,
    onExit,
    onTogglePretest: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'pretest' }),
    onToggleRecords: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'records' }),
    canPretest: true,
  });
  return null;
}
