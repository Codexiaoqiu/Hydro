import { useState } from 'react';
import { Link } from '../components/link';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { Paginator } from '../components/primitives/Paginator';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { PERM } from '../lib/perm-constants';
import { hasPerm } from '../lib/perms';
import styles from './homework_main.module.css';

interface Tdoc {
  docId: string;
  title: string;
  content?: string;
  attend?: number;
  beginAt?: string;
  endAt?: string;
  penaltySince?: string;
  assign?: string[];
}

export interface Args {
  tdocs?: Tdoc[];
  calendar?: Tdoc[];
  tpcount?: number;
  page?: number;
  qs?: string;
  groups?: string[];
  group?: string;
  q?: string;
  UserContext?: Record<string, unknown>;
}

export default function HomeworkMain() {
  const { args } = usePageData();
  const tdocs = args?.tdocs ?? [];
  const page = Math.max(1, args?.page ?? 1);
  const total = Math.max(0, args?.tpcount ?? 0);
  const [query, setQuery] = useState(args?.q ?? '');
  const [group, setGroup] = useState(args?.group ?? '');
  const navigate = useNavigate();
  const buildUrl = useBuildUrl();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (group) params.group = group;
    navigate(buildUrl('homework_main', {}, params));
  };
  const pageHref = (targetPage: number) => buildUrl('homework_main', {}, {
    page: String(targetPage),
    ...(query ? { q: query } : {}),
    ...(group ? { group } : {}),
  });
  const canCreate = hasPerm(args?.UserContext as never, PERM.PERM_CREATE_HOMEWORK);

  return (
    <div className={styles.shell}>
      <main>
        <Card header={<h1 className={styles.title}>作业 {total ? `(${total})` : ''}</h1>}>
          <form className={styles.toolbar} onSubmit={submit}>
            <label className={styles.search}>
              <span aria-hidden>⌕</span>
              <input
                aria-label="搜索作业"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索作业…"
              />
            </label>
            {(args?.groups ?? []).length > 0 && (
              <select
                aria-label="作业分组"
                value={group}
                onChange={(event) => setGroup(event.target.value)}
              >
                <option value="">全部分组</option>
                {args.groups?.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}
            <Button type="submit" variant="primary">搜索</Button>
          </form>
          {tdocs.length === 0 ? (
            <div className={styles.empty} data-testid="homework-empty">暂无作业。</div>
          ) : (
            <ol className={styles.list}>
              {tdocs.map((tdoc) => (
                <li key={tdoc.docId} className={styles.item}>
                  <div className={styles.attend}>
                    <strong>{tdoc.attend ?? 0}</strong>
                    <span>参与</span>
                  </div>
                  <div className={styles.body}>
                    <h2>
                      <Link to="homework_detail" params={{ tid: tdoc.docId }}>{tdoc.title}</Link>
                    </h2>
                    {tdoc.content && <p>{tdoc.content}</p>}
                    <small>
                      {tdoc.assign?.length ? `分组：${tdoc.assign.join('、')}` : '公开作业'}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Paginator current={page} total={total} buildHref={pageHref} ariaLabel="作业分页" />
        </Card>
      </main>
      {canCreate && (
        <aside>
          <Card variant="side">
            <h2>创建作业</h2>
            <Link to="homework_create">＋ 新建作业</Link>
          </Card>
        </aside>
      )}
    </div>
  );
}
