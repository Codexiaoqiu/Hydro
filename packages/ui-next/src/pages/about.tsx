import { usePageData } from '../context/page-data';

export interface Section { id: string, title: string, content: string }
export interface Args { sections: Section[] }

export default function AboutPage() {
  const { args } = usePageData();
  return (
    <div className="section">
      {args.sections.map((s) => (
        <div className="section__body typo richmedia" key={s.id}>
          <h1 className="section__title" id={s.id} data-heading>{s.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: s.content }} />
        </div>
      ))}
    </div>
  );
}
