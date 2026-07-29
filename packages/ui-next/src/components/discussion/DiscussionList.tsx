import { Paginator } from '../primitives/Paginator';
import styles from './DiscussionList.module.css';
import { type DiscussionDdoc, DiscussionListItem, type VnodeLite } from './DiscussionListItem';

export interface DiscussionListProps {
  ddocs: DiscussionDdoc[];
  /** Map of `parentType → { parentId → VnodeLite }`. */
  vndict: Record<string, Record<string, VnodeLite>>;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  page: number;
  dpcount: number;
  buildHref: (name: string, params?: Record<string, unknown>) => string;
  buildPageHref?: (page: number) => string;
  emptyText?: string;
}

export function DiscussionList({
  ddocs, vndict, udict, page, dpcount, buildHref, buildPageHref, emptyText = '暂无讨论',
}: DiscussionListProps) {
  if (ddocs.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  return (
    <div className={styles.wrap}>
      <ol className={styles.list}>
        {ddocs.map((d) => {
          const vnode = vndict[String(d.parentType)]?.[String(d.parentId)];
          const owner = udict[d.owner];
          return (
            <DiscussionListItem
              key={d._id}
              ddoc={d}
              vnode={vnode}
              owner={owner}
              buildHref={buildHref}
            />
          );
        })}
      </ol>
      <Paginator
        current={page}
        total={dpcount}
        buildHref={(p) => (buildPageHref ? buildPageHref(p) : `?page=${p}`)}
      />
    </div>
  );
}
