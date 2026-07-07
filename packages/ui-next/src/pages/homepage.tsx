import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { LangPill } from '../components/nav/LangPill';
import { NavLink } from '../components/nav/NavLink';
import { TopNav } from '../components/nav/TopNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';

export default function Homepage() {
  const { UserContext } = usePageData() as any;
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

      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: 'var(--shell-padding)' }}>
        <Eyebrow>Online Judge · Open Source</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 'var(--leading-tight)', margin: 'var(--space-5) 0 var(--space-2)' }}>
          Hydro
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 'var(--text-lg)', maxWidth: 640 }}>
          高性能、易部署、可扩展的在线评测系统。
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
          <Chip>TypeScript</Chip>
          <Chip variant="diff">AGPLv3</Chip>
          <Chip variant="tag">React 19</Chip>
          <Chip>Vite</Chip>
        </div>

        <div style={{ marginTop: 'var(--space-7)' }}>
          <Card variant="default" header={<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>开始使用</h3>}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <Link to="problem_main" style={{ color: 'var(--cyan)' }}>→ 浏览题库</Link>
              <Link to="contest_main" style={{ color: 'var(--violet)' }}>→ 查看比赛</Link>
              <Link to="discussion_main" style={{ color: 'var(--blue)' }}>→ 参与讨论</Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
