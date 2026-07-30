import { useTranslate } from '../../lib/i18n';
import { Menu } from './Menu';
import { pickSidebarItems, type ProblemSidebarContext } from './problem-sidebar-items';

export function ProblemSidebar({
  context, mode,
}: {
  context: ProblemSidebarContext;
  mode: 'normal' | 'contest' | 'view' | 'correction';
}) {
  const t = useTranslate();
  return <Menu items={pickSidebarItems(context, mode, t)} />;
}
