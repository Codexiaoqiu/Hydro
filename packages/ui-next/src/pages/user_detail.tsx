import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { UserStat } from '../components/profile/UserStat';
import { TagCloud } from '../components/primitives/TagCloud';
import { store } from '../registry/store';
import styles from './user_detail.module.css';

interface Pdoc { docId: number, title: string, pid?: string, tag?: string[] }
interface Args {
  isSelfProfile: boolean;
  udoc: any;
  sdoc?: { updateAt?: number };
  pdocs: Pdoc[];
  tags: Array<[string, number]>;
  tdocs?: Array<{ docId: string, title: string }>;
  psdocs?: Array<any>;
  pdict?: Record<number, any>;
}

export default function UserDetail() {
  const { args } = usePageData() as unknown as { args: Args };
  const { isSelfProfile, udoc, sdoc, pdocs, tags } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const canViewPrivate = !!user?.hasPerm?.(/* PERM_VIEW_USER_PRIVATE_INFO */ 1 << 16);
  const pluginTabs = store.getInterceptors('user_detail:tabs' as any); // SP1+ 后期可改 slot,目前恒空

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <ProfileHeader
          udoc={udoc}
          isSelf={isSelfProfile}
          canViewPrivate={canViewPrivate}
          buildHref={(name, params) => buildUrl(name, params as any)}
        />
        <ProfileTabs
          bio={udoc.bio}
          acceptedProblems={pdocs}
          pluginTabs={pluginTabs as any}
          buildHref={(name, params) => buildUrl(name, params as any)}
        />
      </main>
      <aside className={styles.side}>
        <UserStat
          submitted={udoc.nSubmit ?? 0}
          accepted={udoc.nAccept ?? 0}
          liked={udoc.nLiked ?? 0}
        />
        {tags.length > 0 && (
          <section className={styles.tagBox}>
            <h3>题目标签</h3>
            <TagCloud>
              {tags.map(([name, count]) => (
                <span key={name}>· {name} <small>({count})</small></span>
              ))}
            </TagCloud>
          </section>
        )}
      </aside>
    </div>
  );
}
