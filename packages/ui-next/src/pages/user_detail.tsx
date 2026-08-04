import { PERM } from '@hydrooj/common';
import { TagCloud } from '../components/primitives/TagCloud';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { UserStat } from '../components/profile/UserStat';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { canEditSystem } from '../lib/perms';
import styles from './user_detail.module.css';

export interface Pdoc { docId: number, title: string, pid?: string, tag?: string[] }
export interface Args {
  isSelfProfile: boolean;
  udoc: any;
  sdoc?: { updateAt?: number };
  pdocs?: Pdoc[];
  tags?: Array<[string, number]>;
  tdocs?: Array<{ docId: string, title: string }>;
  psdocs?: Array<any>;
  pdict?: Record<number, any>;
}

export default function UserDetail() {
  const { args } = usePageData();
  const {
    isSelfProfile, udoc, pdocs = [], tags = [],
  } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const canViewPrivate = !!user?.hasPerm?.(PERM.PERM_VIEW_USER_PRIVATE_INFO);
  // Admins with PRIV_EDIT_SYSTEM can switch into any user's account via
  // the /account/:uid route (SwitchAccountHandler). Per ADR-2026-08-03
  // (`docs/superpowers/decisions/2026-08-03-missing-routes-reclassified.md`),
  // the link lives in user_detail rather than a dedicated page, and must
  // be hidden from non-admin viewers.
  const showAccountSwitch = canEditSystem(user) && !isSelfProfile;
  // SP1+ 扩展点:当前为占位,后续可接入 slot 注册由插件提供额外 tab
  const pluginTabs: Array<{ key: string, label: string, render: () => React.ReactNode }> = [];

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
            <TagCloud tags={tags.map(([name, count]) => `${name} (${count})`)} />
          </section>
        )}
        {showAccountSwitch && udoc?._id && (
          <section className={styles.accountSwitch}>
            <a
              className={styles.accountSwitchLink}
              href={`/account/${udoc._id}`}
              data-testid="account-switch-link"
            >
              Switch to this account
            </a>
          </section>
        )}
      </aside>
    </div>
  );
}
