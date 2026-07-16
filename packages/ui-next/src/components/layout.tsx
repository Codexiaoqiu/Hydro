import { defineSlot } from '../registry';
import { GlobalNav } from './nav/GlobalNav';

// The default layout is the single point that injects the global
// navigation. Every page rendered through `app.tsx` (or any future
// renderer that falls back to `layout:default`) gets the same
// brand, links, theme toggle, language pill, and login controls —
// no per-page wiring required.
const Layout = defineSlot('layout:default', ({ children }: React.PropsWithChildren) => {
  return (
    <>
      <GlobalNav />
      {children}
    </>
  );
});

export default Layout;
