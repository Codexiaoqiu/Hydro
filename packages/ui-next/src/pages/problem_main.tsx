import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { LangPill } from '../components/nav/LangPill';
import { NavLink } from '../components/nav/NavLink';
import { TopNav } from '../components/nav/TopNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/primitives/Button';
import { Ring } from '../components/charts/Ring';
import { TagCloud } from '../components/primitives/TagCloud';
import { Author } from '../components/sidebar/Author';
import { ContestList } from '../components/sidebar/ContestList';
import { CtaCard } from '../components/sidebar/CtaCard';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';

const SAMPLE = [
  { id: 'H1000', title: 'A + B Problem', tags: ['入门', 'IO'], difficulty: 1, acRate: 45 },
  { id: 'H1001', title: 'Sort the Array', tags: ['排序', '基础'], difficulty: 2, acRate: 60 },
  { id: 'H1002', title: 'Binary Search', tags: ['二分', '基础'], difficulty: 3, acRate: 38 },
];

export default function ProblemMain() {
  const { UserContext } = usePageData() as any;
  return (
    <>
      <TopNav
        brand="Hydro"
        currentRoute="problem_main"
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

      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: 'var(--shell-padding)', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
        <div>
          <Card variant="default" header={
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>题目列表</h3>
          }>
            <div>
              {SAMPLE.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }}>{p.id}</span>
                  <Link to="problem_detail" style={{ color: 'var(--text)' }}>{p.title}</Link>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.tags.map((t) => <Chip key={t} variant="tag">{t}</Chip>)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Ring percent={p.acRate} size={32} strokeWidth={4} />
                    <Chip variant="diff">★ {p.difficulty}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Card variant="side">
            <CtaCard title="准备好开刷了？" subtitle="登录后即可提交代码" actionLabel="登录" />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>热门标签</h4>
            <TagCloud tags={['语法基础', '输入输出', '入门', '数学', '排序', '二分', '图论', '动态规划']} />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>活跃出题人</h4>
            <Author name="Macesuted" contribution="已贡献 142 道题目" />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>进行中的比赛</h4>
            <ContestList items={[
              { title: 'Weekly Round 12', date: '今日 20:00' },
              { title: 'Newbie Contest 03', date: '明日 14:00' },
            ]} />
          </Card>
        </aside>
      </div>
    </>
  );
}
