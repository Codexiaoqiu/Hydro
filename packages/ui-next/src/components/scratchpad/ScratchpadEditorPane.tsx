import { useScratchpad } from './ScratchpadContext';
import { usePretestSession } from './usePretestSession';
import { MonacoEditor } from '../problem/MonacoEditor';
import { PretestPanel } from './PretestPanel';
import { RecordsPanel } from './RecordsPanel';
import { ScratchpadToolbar } from './ScratchpadToolbar';
import styles from './Scratchpad.module.css';

interface PdocMinimal {
  config?: { type?: string; langs?: string[] } | string;
}

export interface ScratchpadEditorPaneProps {
  pdoc: PdocMinimal;
  pretestConnUrl: string;
  postSubmitUrl: string;
  getSubmissionsUrl: string;
  problemId: number;
  tdoc?: { docId?: string };
  UserContext: { _id?: number };
  onExit: () => void;
  rid: string | null;
  setRid: (rid: string | null) => void;
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

  return (
    <section className={styles.editorPane} aria-label="Scratchpad editor pane">
      <ScratchpadToolbar
        postSubmitUrl={postSubmitUrl}
        pretestConnUrl={pretestConnUrl}
        getSubmissionsUrl={getSubmissionsUrl}
        problemId={problemId}
        pdoc={pdoc}
        tdoc={tdoc}
        UserContext={UserContext}
        onExit={onExit}
        setRid={setRid}
      />
      <div className={styles.editorSurface}>
        <MonacoEditor
          useMonaco
          value={state.code}
          onChange={(v) => dispatch({ type: 'SET_CODE', payload: v })}
          language={state.lang}
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
          <RecordsPanel submissionsUrl={getSubmissionsUrl} />
        </div>
      )}
    </section>
  );
}
