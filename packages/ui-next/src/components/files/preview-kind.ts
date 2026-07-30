export type PreviewKind = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'download';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico']);
// `ogg` is intentionally treated as video to match ui-default's preview.page.ts.
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'aac', 'm4a', 'oga']);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'xz', 'bz2']);

/** Files larger than this can't be previewed inline and fall back to download. */
const MAX_PREVIEW_SIZE = 8 * 1024 * 1024;

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase();
}

/**
 * Classifies a file into a preview strategy from its name (and optional size).
 * Archives and oversized files are `download`-only; everything unrecognised
 * defaults to `text` so source / data files open in the editor.
 */
export function previewKind(filename: string, size = 0): PreviewKind {
  const ext = extOf(filename);
  if (ARCHIVE_EXTS.has(ext) || size > MAX_PREVIEW_SIZE) return 'download';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'text';
}

export function editorLanguage(filename: string): string {
  const ext = extOf(filename);
  if (['yaml', 'yml'].includes(ext)) return 'yaml';
  if (['c', 'cc', 'cpp', 'h', 'hpp', 'cxx'].includes(ext)) return 'cpp';
  if (ext === 'json') return 'json';
  if (ext === 'py') return 'python';
  return 'plaintext';
}
