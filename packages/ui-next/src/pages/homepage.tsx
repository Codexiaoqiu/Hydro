import { usePageData } from '../context/page-data';
import { SectionSlot } from '../registry/sections';
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
  console.log(cols)
  return (
    <>
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
