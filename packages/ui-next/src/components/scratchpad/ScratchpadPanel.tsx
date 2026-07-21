import { useMemo, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import { useScratchpad } from './ScratchpadContext';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';
import { ScratchpadProblemPane } from './ScratchpadProblemPane';
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
  UserContext: { _id?: number; codeTemplate?: string; codeLang?: string };
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

export function ScratchpadPanel(props: ScratchpadPanelProps) {
  const t = useTranslate();
  const initialLang = (props.UserContext.codeLang ?? '').split('.')[0] || 'cpp';
  const initialCode = props.UserContext.codeTemplate ?? '';
  const [rid, setRid] = useState<string | null>(null);
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
      <div className={styles.layout}>
        <div className={styles.problemPane}>
          <ScratchpadProblemPane
            pdoc={props.pdoc}
            contentText={props.contentText}
            contentLangs={props.contentLangs}
            preferredLang={props.preferredLang}
            mode={props.mode}
          />
        </div>
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
