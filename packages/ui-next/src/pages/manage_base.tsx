import { usePageData } from '../context/page-data';

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  items?: Array<{ icon?: string, name: string, url?: string }>;
}

const NAV_ITEMS: Array<{ name: string, url: string }> = [
  { name: 'Dashboard', url: '/manage/dashboard' },
  { name: 'Script', url: '/manage/script' },
  { name: 'User Import', url: '/manage/userimport' },
  { name: 'User Priv', url: '/manage/userpriv' },
  { name: 'Setting', url: '/manage/setting' },
  { name: 'Config', url: '/manage/config' },
];

export default function ManageBasePage() {
  const { args } = usePageData();
  const items = args?.items ?? NAV_ITEMS;
  return (
    <div className="manage-layout">
      <header className="manage-banner">
        <h1>Control Panel</h1>
      </header>
      <div className="manage-body">
        <nav className="manage-sidebar">
          <ol>
            <li>
              <span className="manage-sidebar__properties">Properties</span>
              <ol>
                {items.map((item) => (
                  <li key={item.url ?? item.name}>
                    <a href={item.url ?? '#'}>{item.name}</a>
                  </li>
                ))}
              </ol>
            </li>
          </ol>
        </nav>
        <main className="manage-content" />
      </div>
    </div>
  );
}
