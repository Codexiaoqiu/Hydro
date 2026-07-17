import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../context/router';
import { HydroClientError, request } from '../../hooks/use-api';
import { useBuildUrl } from '../../hooks/use-build-url';
import { useTranslate } from '../../lib/i18n';
import { Alert, Button, Checkbox, Input, LangTabs, RateLimitAlert } from '../primitives';
import styles from './ProblemForm.module.css';

const PID_PATTERN = /^(?:[a-z0-9]{1,10}-)?[a-z][a-z0-9]*$/i;

interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

interface ProblemDoc {
  docId?: number;
  pid?: string;
  title?: string;
  hidden?: boolean;
  tag?: string[];
  difficulty?: number;
  content?: string | Record<string, string>;
  additional_file?: Array<{ name: string, size: number }>;
}

export interface ProblemFormProps {
  pageName: 'problem_edit' | 'problem_create';
  pdoc?: ProblemDoc;
  statementLangs: string[];
  categoryTree?: CategoryNode[];
  additionalFile?: Array<{ name: string, size: number }>;
  canDelete?: boolean;
  action?: string;
  isReference?: boolean;
}

/**
 * Shared form used by both `problem_edit` and `problem_create`. Mirrors the
 * field semantics in `ProblemEditHandler.post` / `ProblemCreateHandler.post`
 * (handler/problem.ts):
 *
 *   - `pid`  → optional, regex `/^(?:[a-z0-9]{1,10}-)?[a-z][a-z0-9]*$/i`
 *   - `title`, `content` (multi-lang JSON), `tag` (CSV), `difficulty` (1–10), `hidden`
 *   - Edit additionally offers Delete (when `canDelete`).
 */
export function ProblemForm({
  pageName,
  pdoc,
  statementLangs,
  categoryTree,
  additionalFile,
  canDelete,
  action,
  isReference,
}: ProblemFormProps) {
  const navigate = useNavigate();
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const userLang = statementLangs[0] ?? 'zh_CN';

  const [pid, setPid] = useState(pdoc?.pid ?? '');
  const [title, setTitle] = useState(pdoc?.title ?? '');
  const [hidden, setHidden] = useState(pdoc?.hidden ?? false);
  const [tagText, setTagText] = useState((pdoc?.tag ?? []).join(','));
  const [difficulty, setDifficulty] = useState<number | ''>(pdoc?.difficulty ?? '');
  const [activeLang, setActiveLang] = useState(userLang);
  const [contentByLang, setContentByLang] = useState<Record<string, string>>(() => {
    const raw = pdoc?.content;
    if (!raw) return {};
    // Backend's `Types.Content` is just a string validator; the multi-lang map
    // is JSON-encoded inside that single string (matches ui-default's
    // problem_edit.page.jsx convention). Try to decode it before falling back
    // to treating the string as a single-language markdown blob — otherwise
    // every save re-stringifies an already-stringified value, corrupting data.
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') out[k] = v;
            else out[k] = JSON.stringify(v);
          }
          if (Object.keys(out).length) return out;
        }
      } catch {
        // not JSON; fall through to plain markdown
      }
      return { [userLang]: raw };
    }
    if (typeof raw === 'object') return { ...raw };
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);

  useEffect(() => {
    if (!statementLangs.includes(activeLang)) setActiveLang(statementLangs[0]);
  }, [statementLangs, activeLang]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!title.trim()) {
      setError(new HydroClientError({ code: 400, message: t('ProblemForm.ErrorTitleRequired') }));
      setSubmitting(false);
      return;
    }
    if (pid && !PID_PATTERN.test(pid)) {
      setError(new HydroClientError({ code: 400, message: t('ProblemForm.ErrorPidInvalid') }));
      setSubmitting(false);
      return;
    }
    if (difficulty !== '' && (typeof difficulty !== 'number' || difficulty < 1 || difficulty > 10)) {
      setError(new HydroClientError({ code: 400, message: t('ProblemForm.ErrorDifficultyRange') }));
      setSubmitting(false);
      return;
    }
    try {
      const fd = new URLSearchParams();
      fd.set('title', title);
      fd.set('content', JSON.stringify(contentByLang));
      if (pid) fd.set('pid', pid);
      if (hidden) fd.set('hidden', 'on');
      fd.set('tag', tagText);
      if (difficulty !== '') fd.set('difficulty', String(difficulty));
      const url = action ?? (pageName === 'problem_create' ? '/problem/create' : window.location.pathname);
      await request.post(url, fd);
      const redirectTo = pageName === 'problem_create'
        ? buildUrl('problem_files', { pid: pid || String(pdoc?.docId ?? '') })
        : buildUrl('problem_detail', { pid: pid || String(pdoc?.docId ?? '') });
      navigate(redirectTo);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(t('ProblemForm.DeleteConfirm', { name: title || pid }))) return;
    setDeleting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'delete');
      await request.post(window.location.pathname, fd);
      navigate(buildUrl('problem_main'));
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setDeleting(false);
    }
  };

  const flatCategories = useMemo(() => {
    const out: string[] = [];
    const walk = (nodes?: CategoryNode[]) => {
      if (!nodes) return;
      for (const n of nodes) {
        out.push(n.name);
        walk(n.children);
      }
    };
    walk(categoryTree);
    return out;
  }, [categoryTree]);

  const appendTag = (name: string) => {
    const cur = tagText.split(',').map((t) => t.trim()).filter(Boolean);
    if (cur.includes(name)) return;
    setTagText([...cur, name].join(','));
  };

  const activeContent = contentByLang[activeLang] ?? '';
  const onContentChange = (v: string) => setContentByLang((m) => ({ ...m, [activeLang]: v }));

  return (
    <form className={styles.form} method="POST" onSubmit={submit}>
      <div className={styles.fields}>
        {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
        <RateLimitAlert error={error} />

        <div className={styles.row}>
          <Input
            label={t('ProblemForm.ProblemID')}
            name="pid"
            value={pid}
            onChange={(e) => setPid(e.currentTarget.value)}
            placeholder={t('ProblemForm.ProblemIDPlaceholder')}
            disabled={isReference}
            hint={t('ProblemForm.ProblemIDHint')}
          />
          <Input
            label={t('ProblemForm.Difficulty')}
            name="difficulty"
            type="number"
            inputMode="numeric"
            value={difficulty}
            min={1}
            max={10}
            onChange={(e) => setDifficulty(e.currentTarget.value === '' ? '' : Number(e.currentTarget.value))}
            placeholder={t('ProblemForm.DifficultyPlaceholder')}
          />
        </div>

        <Input
          label={t('ProblemForm.Title')}
          name="title"
          required
          autoFocus={pageName === 'problem_create'}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />

        <Input
          label={t('ProblemForm.Tags')}
          name="tag"
          value={tagText}
          onChange={(e) => setTagText(e.currentTarget.value)}
          hint={t('ProblemForm.TagsHint')}
          placeholder={t('ProblemForm.TagsPlaceholder')}
        />

        <Checkbox name="hidden" label={t('ProblemForm.Hidden')} checked={hidden} onChange={(e) => setHidden(e.currentTarget.checked)} />

        <div className={styles.markdown}>
          <LangTabs
            options={statementLangs.map((l) => ({ value: l, label: l }))}
            active={activeLang}
            onChange={setActiveLang}
          />
          <textarea
            value={activeContent}
            onChange={(e) => onContentChange(e.currentTarget.value)}
            placeholder={t('ProblemForm.StatementPlaceholder', { lang: activeLang })}
            spellCheck={false}
          />
        </div>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={submitting || deleting}>
            {submitting ? t('ProblemForm.Saving') : pageName === 'problem_create' ? t('ProblemForm.Create') : t('ProblemForm.Update')}
          </Button>
          <div className={styles.actionsRight}>
            {pageName === 'problem_edit' && canDelete && (
              <Button type="button" variant="ghost" disabled={submitting || deleting} onClick={onDelete}>
                {deleting ? t('ProblemForm.Deleting') : t('ProblemForm.Delete')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        {pageName === 'problem_create' ? (
          <div className={styles.mdHint}>
            <strong>{t('ProblemForm.MarkdownTips')}</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li>{t('ProblemForm.MarkdownImage').split('file://filename.png').map((part, i, arr) => (
                <span key={i}>{part}{i < arr.length - 1 ? <code>file://filename.png</code> : null}</span>
              ))}</li>
              <li>{t('ProblemForm.MarkdownCode').split('```cpp').map((part, i, arr) => (
                <span key={i}>{part}{i < arr.length - 1 ? <code>```cpp</code> : null}</span>
              ))}</li>
              <li>{t('ProblemForm.MarkdownLang')}</li>
            </ul>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-md)' }}>{t('ProblemForm.AdditionalFiles')}</h3>
            <div className={styles.uploadList}>
              {(additionalFile ?? pdoc?.additional_file ?? []).map((f) => (
                <div key={f.name} className={styles.uploadItem}>
                  <span>{f.name}</span>
                  <span style={{ color: 'var(--text-mute)' }}>{Math.round(f.size / 1024)} KB</span>
                </div>
              ))}
              {(!(additionalFile ?? pdoc?.additional_file ?? []).length) && (
                <span style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>{t('ProblemForm.NoneUploaded')}</span>
              )}
            </div>
          </div>
        )}

        {flatCategories.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-md)' }}>{t('ProblemForm.Categories')}</h3>
            <div className={styles.categoryTree}>
              {flatCategories.map((name) => (
                <button key={name} type="button" className={styles.categoryChip} onClick={() => appendTag(name)}>
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </form>
  );
}
