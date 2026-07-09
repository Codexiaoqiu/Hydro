import { Button, Card } from '../primitives';
import { Link } from '../link';
import { useBuildUrl } from '../../hooks/use-build-url';
import { useTranslate } from '../../lib/i18n';

export interface ProblemReferenceProps {
  pdoc: {
    reference?: { domainId: string; pid: string | number };
  };
}

/**
 * Banner shown on a problem that is a copy of another problem in the set.
 * Mirrors the `<blockquote class="note">` block from
 * `partials/problem_files.html`. The "Open in problem set" CTA uses
 * `problem_detail` so the upstream render also runs (which renders its own
 * full sidebar / files card).
 */
export function ProblemReference({ pdoc }: ProblemReferenceProps) {
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const ref = pdoc.reference;
  if (!ref) return null;

  // `domainId` is a path parameter on the upstream problem, not a query
  // parameter: pass it inside the route params (second arg) so the resolved
  // URL looks like `/d/<domainId>/p/<pid>` rather than dropping it into the
  // query string as `?domainId=…`.
  const href = buildUrl(
    'problem_detail',
    { pid: String(ref.pid), domainId: ref.domainId },
  );

  return (
    <Card variant="default">
      <div
        style={{
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        <strong>{t('ProblemReference.CopyNotice')}</strong>
        <p style={{ margin: 0, color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>
          {t('ProblemReference.CopyNoticeDetail')}
        </p>
        <div>
          <Link href={href}>
            <Button variant="primary" type="button">{t('Problem.OpenInProblemSet')}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
