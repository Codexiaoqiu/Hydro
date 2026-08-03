/**
 * Canvas-backed font support detection. Lifted from
 * `packages/ui-default/pages/home_preference.page.jsx:31-49` and adapted for
 * React without jQuery.
 *
 * `supportFontFamily(font)` paints `a` at 100px using `font, Arial` and
 * again using only `Arial`, then compares the two pixel buffers. Different
 * pixels ⇒ the font painted something ⇒ supported. Identical pixels ⇒ the
 * font fell back to Arial ⇒ unsupported.
 */
const FONT_SELECT_NAMES = ['fontFamily', 'codeFontFamily'] as const;
const BASELINE_FONT = 'Arial';

export function supportFontFamily(font: string): boolean {
  if (!font) return false;
  if (font.toLowerCase() === BASELINE_FONT.toLowerCase()) return true;
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'black';
  ctx.textBaseline = 'middle';
  const paint = (family: string): Uint8ClampedArray => {
    ctx.clearRect(0, 0, 100, 100);
    ctx.font = `100px ${family}, ${BASELINE_FONT}`;
    ctx.fillText('a', 50, 50);
    return ctx.getImageData(0, 0, 100, 100).data;
  };
  const baseline = paint(BASELINE_FONT);
  const candidate = paint(font);
  if (baseline.length !== candidate.length) return false;
  for (let i = 0; i < baseline.length; i += 1) {
    if (baseline[i] !== candidate[i]) return true;
  }
  return false;
}

/**
 * Walks every `<option>` inside `<select name=...>` for the configured
 * font/key settings, applying `hidden=true` to unsupported choices and
 * previewing the option's own font in its label.
 */
export function applyFontFilter(root: ParentNode = document): void {
  for (const name of FONT_SELECT_NAMES) {
    const select = root.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
    if (!select) continue;
    for (const option of Array.from(select.options)) {
      option.style.fontFamily = option.value;
      if (supportFontFamily(option.value)) continue;
      option.hidden = true;
    }
  }
}
