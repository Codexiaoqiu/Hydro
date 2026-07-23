import { unzipSync } from 'fflate';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { buildDownloadZip } from './download-zip';

const fetchMock = vi.fn();

function okResponse(body: string) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

async function entriesOf(blob: Blob): Promise<Record<string, string>> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const files = unzipSync(buf);
  const out: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) out[name] = new TextDecoder().decode(data);
  return out;
}

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('buildDownloadZip', () => {
  it('zips every target when all downloads succeed', async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve(okResponse(`content-of-${url}`)));

    const result = await buildDownloadZip([
      { filename: 'a.txt', url: '/file/a' },
      { filename: 'dir/b.txt', url: '/file/b' },
    ]);

    expect(result.failures).toEqual([]);
    expect(result.blob).not.toBeNull();
    const entries = await entriesOf(result.blob!);
    expect(entries['a.txt']).toBe('content-of-/file/a');
    expect(entries['dir/b.txt']).toBe('content-of-/file/b');
  });

  it('zips the successful targets and reports the failed ones', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/file/bad') return Promise.resolve(errorResponse(404));
      return Promise.resolve(okResponse('good'));
    });

    const result = await buildDownloadZip([
      { filename: 'good.txt', url: '/file/good' },
      { filename: 'bad.txt', url: '/file/bad' },
    ]);

    expect(result.blob).not.toBeNull();
    const entries = await entriesOf(result.blob!);
    expect(Object.keys(entries)).toEqual(['good.txt']);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].filename).toBe('bad.txt');
    expect(result.failures[0].reason).toContain('404');
  });

  it('returns a null blob and lists all failures when every download fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/file/net') return Promise.reject(new Error('Network down'));
      return Promise.resolve(errorResponse(500));
    });

    const result = await buildDownloadZip([
      { filename: 'x.txt', url: '/file/500' },
      { filename: 'y.txt', url: '/file/net' },
    ]);

    expect(result.blob).toBeNull();
    expect(result.failures).toHaveLength(2);
    const reasons = Object.fromEntries(result.failures.map((f) => [f.filename, f.reason]));
    expect(reasons['x.txt']).toContain('500');
    expect(reasons['y.txt']).toContain('Network down');
  });

  it('returns a null blob with no failures when the signal is already aborted (I1)', async () => {
    fetchMock.mockImplementation((_url: string, opts?: { signal?: AbortSignal }) => {
      if (opts?.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return Promise.resolve(okResponse('never'));
    });
    const controller = new AbortController();
    controller.abort();

    const result = await buildDownloadZip([
      { filename: 'a.txt', url: '/file/a' },
      { filename: 'b.txt', url: '/file/b' },
    ], controller.signal);

    expect(result.blob).toBeNull();
    expect(result.failures).toEqual([]);
  });

  it('returns a null blob with no failures when the signal is aborted mid-flight (I1)', async () => {
    // First call returns a never-resolving promise; the caller aborts before
    // we await it, so the fetch should reject with AbortError. The second
    // call resolves normally but its result is discarded because the signal
    // is already aborted when its handler fires.
    let abortListener: (() => void) | undefined;
    fetchMock.mockImplementation((_url: string, opts?: { signal?: AbortSignal }) => {
      if (_url === '/file/a') {
        return new Promise((_, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
          abortListener = () => reject(new DOMException('Aborted', 'AbortError'));
        });
      }
      return Promise.resolve(okResponse('late'));
    });
    const controller = new AbortController();
    const p = buildDownloadZip([
      { filename: 'a.txt', url: '/file/a' },
      { filename: 'b.txt', url: '/file/b' },
    ], controller.signal);
    // Schedule the abort on a microtask so all fetch() calls have been made.
    queueMicrotask(() => controller.abort());
    const result = await p;

    expect(result.blob).toBeNull();
    expect(result.failures).toEqual([]);
    expect(abortListener).toBeDefined();
  });

  it('returns a null blob for an empty target list without fetching', async () => {
    const result = await buildDownloadZip([]);
    expect(result.blob).toBeNull();
    expect(result.failures).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
