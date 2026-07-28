import { Avatar } from '../primitives/Avatar';
import { Link } from '../link';
import { useToast } from '../primitives/Toast';
import styles from './ProfileHeader.module.css';

export interface ProfileHeaderUdoc {
  _id: number;
  uname: string;
  avatar?: string;
  displayName?: string;
  backgroundImage?: string;
  regat?: number;
  loginat?: number;
  mail?: string;
  qq?: string;
  wechat?: string;
  gender?: number;
  nSubmit?: number;
  nAccept?: number;
  nLiked?: number;
  rp?: number;
  rank?: number | string;
  bio?: string;
  isBanned?: boolean;
  isSuperuser?: boolean;
  isModerator?: boolean;
}

export interface ProfileHeaderProps {
  udoc: ProfileHeaderUdoc;
  isSelf: boolean;
  canViewPrivate: boolean;
  buildHref?: (name: string, params?: Record<string, unknown>) => string;
}

async function copyToClipboard(value: string, show: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    show('已复制');
  } catch {
    show('复制失败');
  }
}

export function ProfileHeader({
  udoc, isSelf, canViewPrivate, buildHref,
}: ProfileHeaderProps) {
  const { show } = useToast();
  const editHref = buildHref?.('home_settings', { category: 'account' }) ?? '/home/settings/account';
  const sendMsgHref = buildHref?.('home_messages', { query: { target: udoc._id } }) ?? `/home/messages?target=${udoc._id}`;
  return (
    <header className={styles.header} data-testid="profile-header">
      <div className={styles.avatar}>
        <Avatar name={udoc.uname} src={udoc.avatar} size={120} />
      </div>
      <div className={styles.meta}>
        <h1 className={styles.name}>
          {udoc.uname}
          {canViewPrivate && udoc.displayName && <small>({udoc.displayName})</small>}
        </h1>
        <p className={styles.stats}>
          UID: {udoc._id} · 提交 {udoc.nSubmit ?? 0} · 通过 {udoc.nAccept ?? 0} · RP {udoc.rp ?? 0}
        </p>
        {udoc.isBanned && <p className={styles.banned}>该用户已被封禁</p>}
        <div className={styles.contactBar}>
          {isSelf && (
            <Link href={editHref} className={styles.contactItem} aria-label="编辑资料">✎</Link>
          )}
          <Link href={sendMsgHref} className={styles.contactItem} aria-label="发送消息">✉</Link>
          {udoc.mail && (
            <button type="button" className={styles.contactItem} aria-label="复制邮箱" onClick={() => copyToClipboard(udoc.mail!, show)}>📧</button>
          )}
          {udoc.qq && (
            <button type="button" className={styles.contactItem} aria-label="复制 QQ" onClick={() => copyToClipboard(udoc.qq!, show)}>QQ</button>
          )}
          {udoc.wechat && (
            <button type="button" className={styles.contactItem} aria-label="复制微信" onClick={() => copyToClipboard(udoc.wechat!, show)}>微</button>
          )}
          {udoc.isSuperuser && <span className={styles.badgeSu}>SU</span>}
          {udoc.isModerator && !udoc.isSuperuser && <span className={styles.badgeMod}>MOD</span>}
        </div>
      </div>
    </header>
  );
}
