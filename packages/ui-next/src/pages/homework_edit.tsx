import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import styles from './homework_edit.module.css';

interface Tdoc {
  docId?: string;
  title?: string;
  content?: string;
  rated?: boolean;
  maintainer?: number[];
  assign?: string[];
  langs?: string[];
}

export interface Args {
  tdoc?: Tdoc;
  dateBeginText?: string;
  timeBeginText?: string;
  datePenaltyText?: string;
  timePenaltyText?: string;
  extensionDays?: number;
  penaltyRules?: string;
  pids?: string;
  page_name?: string;
}

export default function HomeworkEdit() {
  const { args } = usePageData();
  const edit = args?.page_name === 'homework_edit' || !!args?.tdoc?.docId;
  const [form, setForm] = useState({
    title: args?.tdoc?.title ?? '',
    content: args?.tdoc?.content ?? '',
    beginAtDate: args?.dateBeginText ?? '',
    beginAtTime: args?.timeBeginText ?? '',
    penaltySinceDate: args?.datePenaltyText ?? '',
    penaltySinceTime: args?.timePenaltyText ?? '',
    extensionDays: String(args?.extensionDays ?? 1),
    penaltyRules: args?.penaltyRules ?? '',
    pids: args?.pids ?? '',
    rated: !!args?.tdoc?.rated,
    maintainer: args?.tdoc?.maintainer?.join(',') ?? '',
    assign: args?.tdoc?.assign?.join(',') ?? '',
    langs: args?.tdoc?.langs?.join(',') ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const set = (key: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request.post(
        edit ? `/homework/${args.tdoc?.docId}/edit` : '/homework/create',
        {
          ...(edit ? { tid: args.tdoc?.docId } : {}),
          ...form,
          extensionDays: Number(form.extensionDays),
          rated: form.rated,
          maintainer: form.maintainer,
          assign: form.assign,
          langs: form.langs,
        },
      );
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <label className={styles.row}>
      <span>{label}</span>
      <input
        type={type}
        value={String(form[key])}
        onChange={(event) => set(key, event.target.value)}
      />
    </label>
  );

  return (
    <div className={styles.page}>
      <Card header={<h1>{edit ? '编辑作业' : '创建作业'}</h1>}>
        <form onSubmit={submit} className={styles.form}>
          {field('title', '标题')}
          {field('beginAtDate', '开始日期', 'date')}
          {field('beginAtTime', '开始时间', 'time')}
          {field('penaltySinceDate', '截止日期', 'date')}
          {field('penaltySinceTime', '截止时间', 'time')}
          {field('extensionDays', '延期天数', 'number')}
          <label className={styles.row}>
            <span>惩罚规则</span>
            <textarea
              value={form.penaltyRules}
              onChange={(event) => set('penaltyRules', event.target.value)}
              rows={5}
            />
          </label>
          <label className={styles.row}>
            <span>内容</span>
            <textarea
              value={form.content}
              onChange={(event) => set('content', event.target.value)}
              rows={8}
            />
          </label>
          {field('pids', '题目 ID（逗号分隔）')}
          {field('maintainer', '维护者')}
          {field('assign', '分组')}
          {field('langs', '语言')}
          <label>
            <input
              type="checkbox"
              checked={form.rated}
              onChange={(event) => set('rated', event.target.checked)}
            />
            {' 计入评级'}
          </label>
          {error && <div role="alert">{error}</div>}
          {success && <div role="status">已保存</div>}
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !form.title.trim()}
            data-testid="submit"
          >
            {busy ? '提交中…' : edit ? '更新' : '创建'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
