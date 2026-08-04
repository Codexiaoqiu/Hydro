import { usePageData } from '../context/page-data';

export interface Section { id: string, title: string, content: string }
export interface Args { sections?: Section[] }

export default function AboutPage() {
  const { args } = usePageData();
  // Defensive default: handlers may omit `sections` (e.g. on empty
  // wiki install). Without `?? []`, `args.sections.map(...)` throws.
  const sections = args.sections ?? [];
  return (
    <div className="section">
      {sections.length === 0 ? (
        <p className="empty">No content.</p>
      ) : (
        sections.map((s) => (
          <div className="section__body typo richmedia" key={s.id}>
            <h1 className="section__title" id={s.id} data-heading>{s.title}</h1>
            {/* `s.content` is server-side `markdown|safe` output (see
                ui-default `templates/about.html`), so it is HTML and must
                be injected via dangerouslySetInnerHTML. The `richmedia`
                class hooks into the legacy CSS for typography. */}
            <div dangerouslySetInnerHTML={{ __html: s.content }} />
          </div>
        ))
      )}
    </div>
  );
}
