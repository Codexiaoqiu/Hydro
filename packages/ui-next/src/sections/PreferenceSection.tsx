/* eslint-disable react-refresh/only-export-components */
/**
 * `/home/settings?category=preference` — mirrors the legacy ui-default pjax
 * hook `home_preference.page.jsx`. Renders no markup of its own; runs DOM-side
 * effects after mount to restore two original behaviours:
 *
 * 1. **Font support detection** — `supportFontFamily(font)` paints the letter
 *    `a` at 100px on a 100x100 canvas using the candidate font + an Arial
 *    fallback, then compares the rendered pixel buffers. A font is
 *    "supported" iff its painted pixels differ from Arial's (the fallback).
 *    `<option>` elements that fail the check are hidden so users only see
 *    fonts that will actually render on their system.
 *
 * 2. **Font preview** — each `<option>`'s `style.fontFamily` is set to its own
 *    value so the user sees the font in the dropdown chevron label itself.
 *
 * 3. **Live update** — listens for `document.fonts.onloadingdone` (fonts may
 *    still be loading asynchronously) and re-runs the filter when fonts
 *    become available later.
 *
 * This file lives under `sections/` per the P1-1 plan but is NOT a homepage
 * section-slot — it is a page-local DOM enhancer invoked by
 * `pages/home_settings.tsx` when `args.category === 'preference'`.
 *
 * Adapted from `packages/ui-default/pages/home_preference.page.jsx:31-49`.
 */
import { useEffect } from 'react';
import { applyFontFilter } from './PreferenceSection.fonts';

export { supportFontFamily } from './PreferenceSection.fonts';

// `document.fonts` is the FontFaceSet API; may be undefined in older
// browsers. The legacy script assigned `document.fonts.onloadingdone`
// directly — we use addEventListener to allow coexistence. Kept at module
// scope so the type is not re-declared on every component re-render.
interface FontsApi {
  addEventListener?: (t: string, h: () => void) => void;
  removeEventListener?: (t: string, h: () => void) => void;
  onloadingdone?: ((h: () => void) => void) | null;
}

export function PreferenceSection(): null {
  useEffect(() => {
    // Runs after React 19 commits the parent's children, so by this point
    // the sibling `<form>` (rendered after `<PreferenceSection/>` in
    // `home_settings.tsx`) has mounted its `<select name="fontFamily">`
    // and `<select name="codeFontFamily">` into the DOM. `applyFontFilter`
    // queries them by `[name=...]`, so those nodes MUST exist before this
    // effect fires — which they do because React commits the parent tree
    // before firing effects on any of its descendants.
    applyFontFilter();
    const handler = () => applyFontFilter();
    const fonts = (document as { fonts?: FontsApi }).fonts;
    if (fonts) {
      if (typeof fonts.addEventListener === 'function') {
        fonts.addEventListener('loadingdone', handler);
      } else if ('onloadingdone' in fonts) {
        // Legacy path: assign to onloadingdone so older Hydro pages
        // that wire the same slot continue to work.
        fonts.onloadingdone = handler;
      }
    }
    return () => {
      if (fonts && typeof fonts.removeEventListener === 'function') {
        fonts.removeEventListener('loadingdone', handler);
      }
    };
  }, []);
  return null;
}

export default PreferenceSection;
