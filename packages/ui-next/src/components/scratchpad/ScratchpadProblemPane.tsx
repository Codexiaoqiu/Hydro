import { Article } from '../article/Article';
import { Link } from '../link';
import { Alert } from '../primitives';
import { useTranslate } from '../../lib/i18n';

interface PdocMinimal {
  docId: number;
  pid?: string;
  title: string;
  config?: { type?: string; langs?: string[] } | string;
  data?: unknown[];
  reference?: { domainId: string, pid: string | number };
}

export interface ScratchpadProblemPaneProps {
  pdoc: PdocMinimal;
  contentText: string;
  contentLangs: string[];
  preferredLang: string;
  mode: 'normal' | 'contest' | 'view' | 'correction';
}

export function ScratchpadProblemPane({ pdoc, contentText, contentLangs, preferredLang, mode }: ScratchpadProblemPaneProps) {
  const t = useTranslate();
  const noData = !pdoc.data || (Array.isArray(pdoc.data) && pdoc.data.length === 0);
  const configError = typeof pdoc.config === 'string';

  return (
    <aside aria-label="Problem statement" style={{ padding: 'var(--space-4)', overflow: 'auto', height: '100%' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: '0 0 var(--space-3)' }}>{pdoc.title}</h2>
      {contentLangs.length > 1 && (
        <div role="tablist" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {contentLangs.map((l) => (
            <Link
              key={l}
              to="problem_detail"
              params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
              searchParams={l === preferredLang ? {} : { lang: l }}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                color: l === preferredLang ? 'var(--accent)' : 'var(--text-soft)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {l}
            </Link>
          ))}
        </div>
      )}
      {noData && !pdoc.reference && (
        <Alert variant="warn" title={t('Problem.NoTestdata')} message={t('Problem.NoTestdataMessage')} />
      )}
      {configError && (
        <Alert variant="error" title={t('Problem.ConfigurationError')} message={String(pdoc.config)} />
      )}
      {mode === 'view' && (
        <Alert variant="info" title={t('Problem.ContestEnded')} message={t('Problem.ContestEndedMessage')} />
      )}
      {mode === 'correction' && (
        <Alert variant="info" title={t('Problem.CorrectionSubmissions')} message={t('Problem.CorrectionSubmissionsMessage')} />
      )}
      {!contentText && !configError && (
        <Alert variant="info" title={t('Problem.StatementPending')} message={t('Problem.StatementPendingMessage')} />
      )}
      {contentText && !configError && <Article content={contentText} />}
    </aside>
  );
}
