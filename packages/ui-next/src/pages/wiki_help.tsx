import { usePageData } from '../context/page-data';

export interface Section { id: string, title: string, content: string }
export interface Args { sections?: Section[] }

export default function WikiHelpPage() {
  const { args } = usePageData();
  // Defensive default: handler may omit `sections` on a fresh install.
  const sections = args.sections ?? [];
  return (
    <div className="wiki-layout">
      <aside className="wiki-toc">
        <h2>Contents</h2>
        {sections.length > 0 && (
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className="wiki-content">
        {sections.length === 0 ? (
          <p className="empty">No content.</p>
        ) : (
          sections.map((s) => (
            <section key={s.id} data-heading-extract-to="#menu-item-wiki_help">
              <h1 id={s.id} data-heading>{s.title}</h1>
              {/* `s.content` for wiki_help is pre-rendered HTML
                  (see ui-default `templates/wiki_help.html`), so it
                  must be injected via dangerouslySetInnerHTML. The
                  `richmedia` class hooks into the legacy CSS. */}
              <div
                className="typo richmedia"
                dangerouslySetInnerHTML={{ __html: s.content }}
              />
            </section>
          ))
        )}
      </main>
    </div>
  );
}
