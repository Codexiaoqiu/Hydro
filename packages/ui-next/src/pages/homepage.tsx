import { usePageData } from '../context/page-data';
import { SectionSlot } from '../registry/sections';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { LangPill } from '../components/nav/LangPill';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/primitives/Button';
import type { SectionProps } from '../sections/types';
import styles from '../styles/homepage.module.css';

interface ContentColumn {
  width: number;
  sections: Array<[string, unknown]>;
}

interface HomepageArgs {
  UserContext?: { viewLangName?: string };
  UiContext?: Record<string, unknown>;
  contents?: ContentColumn[];
  udict?: SectionProps['udict'];
  domain?: SectionProps['domain'];
}

export default function Homepage() {
  const { args } = usePageData() as unknown as { args: HomepageArgs };
  const { UserContext, contents, udict = {}, domain = { _id: '' } } = args ?? {};
  const cols = Array.isArray(contents) ? contents : [];
  return (
    <>
      <TopNav
        brand="Hydro"
        currentRoute="homepage"
        right={
          <>
            <LangPill label={UserContext?.viewLangName || '中文'} />
            <ThemeToggle />
            <Button variant="ghost">登录</Button>
            <Button variant="primary">注册</Button>
          </>
        }
      >
        <NavLink to="homepage">首页</NavLink>
        <NavLink to="problem_main">题库</NavLink>
        <NavLink to="contest_main">比赛</NavLink>
        <NavLink to="discussion_main">讨论</NavLink>
      </TopNav>

      <main className={styles.page}>
        <div className={styles.columns}>
          {cols.map((col, ci) => (
            <div key={ci} className={styles.column} style={{ flexGrow: col.width }}>
              {col.sections.map(([name, payload], si) => (
                <SectionSlot
                  key={`${ci}-${si}-${name}`}
                  name={name}
                  payload={payload}
                  udict={udict}
                  domain={domain}
                />
              ))}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
