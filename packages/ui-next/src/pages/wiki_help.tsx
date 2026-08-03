import { usePageData } from '../context/page-data';

export interface Section { id: string, title: string, content: string }
export interface Args { sections: Section[] }

export default function WikiHelpPage() {
  const { args } = usePageData();
  return (
    <div className="wiki-layout">
      <aside className="wiki-toc">
        <h2>Contents</h2>
        <ul>
          {args.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </aside>
      <main className="wiki-content">
        {args.sections.length === 0 ? (
          <p className="empty">No content.</p>
        ) : (
          args.sections.map((s) => (
            <section key={s.id} data-heading-extract-to="#menu-item-wiki_help">
              <h1 id={s.id} data-heading>{s.title}</h1>
              <div className="typo richmedia">{s.content}</div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
