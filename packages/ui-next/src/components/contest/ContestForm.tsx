import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from '../../context/router';
import { HydroClientError, request } from '../../hooks/use-api';
import { useBuildUrl } from '../../hooks/use-build-url';
import { KNOWN_RULES } from '../../lib/contest-flags';
import { useTranslate } from '../../lib/i18n';
import { canEditSystem } from '../../lib/perms';
import { Alert, Button, Checkbox, Input, RateLimitAlert } from '../primitives';
import styles from './ContestForm.module.css';

interface ContestDoc {
  docId?: string;
  title?: string;
  content?: string;
  rule?: string;
  beginAt?: number;
  endAt?: number;
  pids?: number[];
  rated?: boolean;
  autoHide?: boolean;
  allowViewCode?: boolean;
  allowPrint?: boolean;
  keepScoreboardHidden?: boolean;
  langs?: string[];
  assign?: string[];
  maintainer?: number[];
  lockAt?: number;
}

interface Props {
  pageName: 'contest_create' | 'contest_edit' | 'homework_create' | 'homework_edit';
  tdoc?: ContestDoc;
  tid?: string;
  UserContext?: Record<string, unknown>;
}

interface FormState {
  rule: string;
  title: string;
  beginAtDate: string;
  beginAtTime: string;
  duration: string;
  pids: string;
  content: string;
  rated: boolean;
  autoHide: boolean;
  allowViewCode: boolean;
  allowPrint: boolean;
  keepScoreboardHidden: boolean;
  langs: string;
  maintainer: string;
  lock: string;
  contestDuration: string;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }
function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Three-section form mirroring `templates/contest_edit.html`:
 *   1. Basic Info        (rule, title, begin/duration/end, pids, description)
 *   2. Permission Control (maintainer)
 *   3. Contest Settings   (langs, rated, autoHide, viewCode, print, lock, contestDuration, keepScoreboardHidden)
 *
 * Rule-specific fields (lock for acm/ioi; contestDuration for oi/ioi/ledo/strictioi;
 * keepScoreboardHidden for oi/strictioi) toggle on/off as the user picks a rule,
 * matching the ui-default `contest_edit.page.ts` script.
 */
export function ContestForm({ pageName, tdoc, tid, UserContext }: Props) {
  const navigate = useNavigate();
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const isEdit = pageName.endsWith('edit');

  const initial: FormState = useMemo(() => {
    const now = Date.now();
    const beginAt = tdoc?.beginAt ?? now;
    const endAt = tdoc?.endAt ?? (now + 2 * 60 * 60 * 1000);
    const duration = tdoc ? Math.max(0.5, Math.round(((endAt - beginAt) / 3600000) * 10) / 10) : 2;
    return {
      rule: tdoc?.rule ?? 'acm',
      title: tdoc?.title ?? '',
      beginAtDate: fmtDate(beginAt),
      beginAtTime: fmtTime(beginAt),
      duration: String(duration),
      pids: (tdoc?.pids ?? []).join(','),
      content: tdoc?.content ?? '',
      rated: tdoc?.rated ?? false,
      autoHide: tdoc?.autoHide ?? true,
      allowViewCode: tdoc?.allowViewCode ?? true,
      allowPrint: tdoc?.allowPrint ?? false,
      keepScoreboardHidden: tdoc?.keepScoreboardHidden ?? false,
      langs: (tdoc?.langs ?? []).join(','),
      maintainer: (tdoc?.maintainer ?? []).join(','),
      lock: tdoc?.lockAt ? String(Math.round((endAt - tdoc.lockAt) / 60000)) : '',
      contestDuration: tdoc && tdoc.endAt && tdoc.beginAt
        ? String(Math.round(((tdoc.endAt - tdoc.beginAt) / 3600000) * 10) / 10)
        : '',
    };
  }, [tdoc]);

  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const canEditProblems = canEditSystem(UserContext);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const flags = useMemo(() => {
    const f = { showLock: false, showContestDuration: false, showKeepScoreboardHidden: false };
    if (form.rule === 'acm' || form.rule === 'ioi') f.showLock = true;
    if (form.rule === 'oi' || form.rule === 'ioi' || form.rule === 'ledo' || form.rule === 'strictioi') {
      f.showContestDuration = true;
    }
    if (form.rule === 'oi' || form.rule === 'strictioi') f.showKeepScoreboardHidden = true;
    return f;
  }, [form.rule]);

  const computedEndAt = useMemo(() => {
    const ms = new Date(`${form.beginAtDate}T${form.beginAtTime || '00:00'}:00`).getTime();
    if (Number.isNaN(ms)) return '';
    const end = new Date(ms + Number(form.duration || 0) * 3600000);
    return `${fmtDate(end.getTime())} ${fmtTime(end.getTime())}`;
  }, [form.beginAtDate, form.beginAtTime, form.duration]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(new HydroClientError({ code: 400, message: t('ContestForm.ErrorTitleRequired') }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      fd.set('rule', form.rule);
      fd.set('title', form.title);
      fd.set('beginAtDate', form.beginAtDate);
      fd.set('beginAtTime', form.beginAtTime);
      fd.set('duration', form.duration);
      fd.set('pids', form.pids);
      fd.set('content', form.content);
      fd.set('rated', form.rated ? 'on' : '');
      fd.set('autoHide', form.autoHide ? 'on' : '');
      fd.set('allowViewCode', form.allowViewCode ? 'on' : '');
      fd.set('allowPrint', form.allowPrint ? 'on' : '');
      fd.set('keepScoreboardHidden', form.keepScoreboardHidden ? 'on' : '');
      if (form.langs) fd.set('langs', form.langs);
      if (form.maintainer) fd.set('maintainer', form.maintainer);
      if (flags.showLock && form.lock) fd.set('lock', form.lock);
      if (flags.showContestDuration && form.contestDuration) fd.set('contestDuration', form.contestDuration);

      const url = isEdit ? `/contest/${tid}/edit` : '/contest/create';
      await request.post(url, fd);
      navigate(buildUrl('contest_main'));
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!tid) return;
    if (!confirm(t('ContestForm.DeleteConfirm'))) return;
    setDeleting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'delete');
      await request.post(`/contest/${tid}/edit`, fd);
      navigate(buildUrl('contest_main'));
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setDeleting(false);
    }
  };

  const onClone = async () => {
    if (!tid) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      Object.entries(form).forEach(([k, v]) => {
        if (typeof v === 'boolean') fd.set(k, v ? 'on' : '');
        else if (v) fd.set(k, String(v));
      });
      await request.post('/contest/create', fd);
      navigate(buildUrl('contest_main'));
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} method="POST" onSubmit={submit}>
      <h1 className={styles.pageTitle}>
        {isEdit ? t('ContestForm.EditTitle') : t('ContestForm.CreateTitle')}
      </h1>

      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('ContestForm.SectionBasic')}</h2>
        <div className={styles.fields}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>{t('ContestForm.Rule')}</span>
              <select className={styles.select} value={form.rule} onChange={(e) => set('rule', e.currentTarget.value)}>
                {KNOWN_RULES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className={styles.field} style={{ gridColumn: 'span 2' }}>
              <span className={styles.label}>{t('ContestForm.Title')}</span>
              <input
                type="text"
                name="title"
                required
                autoFocus={!isEdit}
                value={form.title}
                onChange={(e) => set('title', e.currentTarget.value)}
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>{t('ContestForm.BeginDate')}</span>
              <input type="date" value={form.beginAtDate} onChange={(e) => set('beginAtDate', e.currentTarget.value)} className={styles.input} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('ContestForm.BeginTime')}</span>
              <input type="time" value={form.beginAtTime} onChange={(e) => set('beginAtTime', e.currentTarget.value)} className={styles.input} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('ContestForm.Duration')}</span>
              <input type="number" min={0.5} step={0.5} value={form.duration} onChange={(e) => set('duration', e.currentTarget.value)} className={styles.input} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('ContestForm.EndAt')}</span>
              <input type="text" readOnly value={computedEndAt} className={styles.input} />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>{t('ContestForm.Pids')}</span>
            <input type="text" value={form.pids} onChange={(e) => set('pids', e.currentTarget.value)} placeholder={t('ContestForm.PidsPlaceholder')} className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('ContestForm.Description')}</span>
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.currentTarget.value)}
              placeholder={t('ContestForm.DescriptionPlaceholder')}
              className={styles.textarea}
              rows={8}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('ContestForm.SectionPermission')}</h2>
        <div className={styles.fields}>
          <Input
            label={t('ContestForm.Maintainer')}
            name="maintainer"
            value={form.maintainer}
            onChange={(e) => set('maintainer', e.currentTarget.value)}
            placeholder={t('ContestForm.MaintainerPlaceholder')}
            hint={t('ContestForm.MaintainerHint')}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('ContestForm.SectionSettings')}</h2>
        <div className={styles.fields}>
          <Input
            label={t('ContestForm.Langs')}
            name="langs"
            value={form.langs}
            onChange={(e) => set('langs', e.currentTarget.value)}
            placeholder={t('ContestForm.LangsPlaceholder')}
          />
          <div className={styles.checkboxGrid}>
            <Checkbox name="rated" label={t('ContestForm.Rated')} checked={form.rated} onChange={(e) => set('rated', e.currentTarget.checked)} />
            <Checkbox name="autoHide" label={t('ContestForm.AutoHide')} checked={form.autoHide} disabled={!canEditProblems} onChange={(e) => set('autoHide', e.currentTarget.checked)} />
            <Checkbox name="allowViewCode" label={t('ContestForm.AllowViewCode')} checked={form.allowViewCode} onChange={(e) => set('allowViewCode', e.currentTarget.checked)} />
            <Checkbox name="allowPrint" label={t('ContestForm.AllowPrint')} checked={form.allowPrint} onChange={(e) => set('allowPrint', e.currentTarget.checked)} />
            {flags.showKeepScoreboardHidden && (
              <Checkbox name="keepScoreboardHidden" label={t('ContestForm.KeepScoreboardHidden')} checked={form.keepScoreboardHidden} onChange={(e) => set('keepScoreboardHidden', e.currentTarget.checked)} />
            )}
            {flags.showLock && (
              <Input label={t('ContestForm.Lock')} name="lock" type="number" value={form.lock} onChange={(e) => set('lock', e.currentTarget.value)} placeholder={t('ContestForm.LockPlaceholder')} hint={t('ContestForm.LockHint')} />
            )}
            {flags.showContestDuration && (
              <Input label={t('ContestForm.ContestDuration')} name="contestDuration" type="number" value={form.contestDuration} onChange={(e) => set('contestDuration', e.currentTarget.value)} placeholder={t('ContestForm.ContestDurationPlaceholder')} hint={t('ContestForm.ContestDurationHint')} />
            )}
          </div>
        </div>
      </section>

      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <Button type="submit" variant="primary" disabled={submitting || deleting}>
            {submitting ? t('ContestForm.Saving') : isEdit ? t('ContestForm.Update') : t('ContestForm.Create')}
          </Button>
          {isEdit && (
            <Button type="button" variant="ghost" disabled={submitting || deleting} onClick={onClone}>
              {t('ContestForm.Clone')}
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={submitting || deleting} onClick={() => navigate(buildUrl('contest_main'))}>
            {t('ContestForm.Cancel')}
          </Button>
        </div>
        {isEdit && (
          <button type="button" className={styles.deleteBtn} disabled={submitting || deleting} onClick={onDelete}>
            {deleting ? t('ContestForm.Deleting') : t('ContestForm.Delete')}
          </button>
        )}
      </div>
    </form>
  );
}
