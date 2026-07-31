import { usePageData } from '../context/page-data';

interface UserLite { _id: number, uname: string, avatar: string }
interface Entry { rank: number, score: number, udoc: UserLite }
interface Args { ranking: Entry[] }

export default function RankingPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">Ranking</h1>
      </div>
      {args.ranking.length === 0 ? (
        <p className="empty">No ranking data.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>User</th><th>Score</th></tr>
          </thead>
          <tbody>
            {args.ranking.map((e) => (
              <tr key={e.udoc._id} data-top={e.rank <= 3 ? 'true' : undefined}>
                <td>{e.rank}</td>
                <td>{e.udoc.uname}</td>
                <td>{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
