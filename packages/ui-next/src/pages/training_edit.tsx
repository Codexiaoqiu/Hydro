import { useState } from 'react';
import { Link } from '../components/link';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import styles from './training_edit.module.css';

// Response body from `TrainingEditHandler.get`
// (packages/hydrooj/src/handler/training.ts:189-208).
//   - `page_name` is 'training_edit' for an existing training, 'training_create' for new
//   - `tdoc` is only present in the edit case (handler sets it on `this.tdoc`)
//   - `dag` is a stringified, pretty-printed JSON of `tdoc.dag`; it must be
//     round-tripped verbatim on save (the handler's `_parseDagJson` re-parses
//     and validates the same shape).
interface Tdoc {
  docId: string;
  title?: string;
  content?: string;
  description?: string;
  pin?: number;
  dag?: unknown[];
}

interface Args {
  page_name?: 'training_edit' | 'training_create';
  tdoc?: Tdoc;
  dag?: string;
  UserContext?: { _id?: number };
}

const DEFAULT_DAG = `[
  {
    "_id": 1,
    "title": "最初的最初 - A+B Problem",
    "requireNids": [],
    "pids": ["P1000"]
  },
  {
    "_id": 2,
    "title": "最初的进阶",
    "requireNids": [1],
    "pids": [2, 3]
  }
]`;

export default function TrainingEdit() {
  const pageData = usePageData() as unknown as { args: Args };
  const { args } = pageData;
  const isEdit = args?.page_name === 'training_edit';
  const tdoc = args?.tdoc;

  const [title, setTitle] = useState(tdoc?.title ?? '');
  const [content, setContent] = useState(tdoc?.content ?? '');
  const [description, setDescription] = useState(tdoc?.description ?? '');
  const [pin, setPin] = useState(String(tdoc?.pin ?? 0));
  const [dag, setDag] = useState(args?.dag ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If this is the create flow, seed dag with the default plan the
  // ui-default template uses (see partials/training_default.json).
  const dagValue = dag || (isEdit ? '' : DEFAULT_DAG);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // The handler reads `dag` as a JSON-encoded string. We send the
      // current textarea contents verbatim — preserving the user's
      // whitespace / ordering. The server re-parses + re-stringifies, so
      // we deliberately avoid touching the string client-side beyond
      // trimming the title for empty validation.
      const body: Record<string, unknown> = {
        title: title.trim(),
        content,
        dag: dagValue,
        pin: Number(pin) || 0,
        description,
      };
      if (isEdit && tdoc) body.tid = tdoc.docId;

      // The handler returns `{ tid }` plus a redirect. We follow the SPA
      // navigation by reloading through navigate() so the new tdoc is
      // fetched as JSON.
      await request.post(
        isEdit ? `/training/${tdoc?.docId}/edit` : '/training/create',
        body,
      );
      setSuccess(isEdit ? '已保存' : '已创建');
      // Best-effort navigation back to detail. We can't read the new tid
      // from the response without a schema contract, so we just stay put
      // and let the success notice inform the user.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (typeof window !== 'undefined') window.history.back();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {isEdit ? '编辑训练计划' : '创建训练计划'}
        </h1>
        {isEdit && tdoc && (
          <Link to="training_detail" params={{ tid: tdoc.docId }} className={styles.backLink}>
            ← 返回训练详情
          </Link>
        )}
      </header>

      <Card variant="default">
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="training-edit-title">
              标题
            </label>
            <input
              id="training-edit-title"
              name="title"
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
              autoFocus
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="training-edit-pin">
              置顶权重
            </label>
            <input
              id="training-edit-pin"
              name="pin"
              type="number"
              min="0"
              className={styles.inputNarrow}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="training-edit-content">
              简介
            </label>
            <textarea
              id="training-edit-content"
              name="content"
              className={styles.textarea}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="列表中显示的简介,最多 500 字符"
            />
            <p className={styles.hint}>简介不超过 500 字符,会显示在列表中。</p>
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="training-edit-description">
              描述
            </label>
            <textarea
              id="training-edit-description"
              name="description"
              className={styles.textarea}
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="支持 Markdown ……"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="training-edit-dag">
              计划 (DAG JSON)
            </label>
            <textarea
              id="training-edit-dag"
              name="dag"
              className={`${styles.textarea} ${styles.dagArea}`}
              rows={18}
              spellCheck={false}
              value={dagValue}
              onChange={(e) => setDag(e.target.value)}
            />
            <p className={styles.hint}>
              JSON 数组,每个元素包含 <code>_id</code> / <code>title</code> /{' '}
              <code>requireNids</code> / <code>pids</code>。保存时会原样回传。
            </p>
          </div>

          {error ? (
            <div className={styles.error} role="alert" data-testid="edit-error">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className={styles.success} role="status" data-testid="edit-success">
              {success}
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !title.trim()}
              data-testid="submit"
            >
              {submitting ? (isEdit ? '保存中…' : '创建中…') : (isEdit ? '更新' : '创建')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={cancel}
              disabled={submitting}
            >
              取消
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
