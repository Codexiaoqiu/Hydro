import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFileUpload, type UploadEntry } from './use-file-upload';

class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: { onprogress: ((e: any) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  method = '';
  url = '';
  body: any = null;
  aborted = false;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: any) {
    this.body = body;
    FakeXHR.instances.push(this);
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  setRequestHeader() {}

  // test helpers
  emitProgress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }

  finish(status: number, responseText = '') {
    this.status = status;
    this.responseText = responseText;
    this.onload?.();
  }
}

const OriginalXHR = global.XMLHttpRequest;

beforeEach(() => {
  FakeXHR.instances = [];
  (global as any).XMLHttpRequest = FakeXHR;
});
afterEach(() => {
  (global as any).XMLHttpRequest = OriginalXHR;
});

function fakeFile(name: string) {
  return new File(['content'], name, { type: 'text/plain' });
}

describe('useFileUpload', () => {
  it('sends the expected FormData fields', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    const xhr = FakeXHR.instances[0];
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/upload');
    const fd = xhr.body as FormData;
    expect(fd.get('operation')).toBe('upload_file');
    expect(fd.get('type')).toBe('testdata');
    expect(fd.get('filename')).toBe('a.txt');
    expect(fd.get('file')).toBeInstanceOf(File);
  });

  it('tracks upload progress', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    act(() => { FakeXHR.instances[0].emitProgress(50, 100); });
    expect(result.current.entries[0].progress).toBeCloseTo(0.5);
    expect(result.current.entries[0].status).toBe('uploading');
  });

  it('marks an entry done on a 2xx response', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    act(() => { FakeXHR.instances[0].finish(200); });
    expect(result.current.entries[0].status).toBe('done');
    expect(result.current.entries[0].progress).toBe(1);
  });

  it('marks an entry failed on a 4xx response', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    act(() => { FakeXHR.instances[0].finish(400, 'bad request'); });
    expect(result.current.entries[0].status).toBe('failed');
    expect(result.current.entries[0].error).toBeTruthy();
  });

  it('cancels the active upload', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    act(() => { result.current.cancel(); });
    expect(FakeXHR.instances[0].aborted).toBe(true);
    expect(result.current.entries[0].status).toBe('cancelled');
  });

  it('aborts the active upload on unmount (cleanup)', () => {
    const { result, unmount } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    unmount();
    expect(FakeXHR.instances[0].aborted).toBe(true);
  });

  it('calls onSettled with final entries once the batch finishes', async () => {
    const settled: UploadEntry[][] = [];
    const { result } = renderHook(() => useFileUpload({
      url: '/upload', type: 'testdata',
      onSettled: (e) => settled.push(e),
    }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    // batch is still in-flight: nothing settled yet
    expect(settled).toHaveLength(0);
    await act(async () => { FakeXHR.instances[0].finish(200); });
    expect(settled).toHaveLength(1);
    expect(settled[0].map((e) => e.status)).toEqual(['done']);
  });

  it('does not call onSettled when the batch is cancelled mid-flight', () => {
    const settled: UploadEntry[][] = [];
    const { result } = renderHook(() => useFileUpload({
      url: '/upload', type: 'testdata',
      onSettled: (e) => settled.push(e),
    }));
    act(() => { result.current.upload([fakeFile('a.txt')]); });
    act(() => { result.current.cancel(); });
    expect(settled).toHaveLength(0);
  });

  it('runs two files strictly serially: the second XHR is not created until the first finishes', async () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt'), fakeFile('b.txt')]); });
    // first file is in-flight, second has not started
    expect(FakeXHR.instances).toHaveLength(1);
    expect(result.current.entries[0].status).toBe('uploading');
    expect(result.current.entries[1].status).toBe('queued');
    await act(async () => { FakeXHR.instances[0].finish(200); });
    // first is done, second is now uploading (created after the first finished)
    expect(FakeXHR.instances).toHaveLength(2);
    expect(result.current.entries[0].status).toBe('done');
    expect(result.current.entries[1].status).toBe('uploading');
    await act(async () => { FakeXHR.instances[1].finish(200); });
    expect(FakeXHR.instances).toHaveLength(2);
    expect(result.current.entries[1].status).toBe('done');
  });

  it('does not start queued files after cancel()', () => {
    const { result } = renderHook(() => useFileUpload({ url: '/upload', type: 'testdata' }));
    act(() => { result.current.upload([fakeFile('a.txt'), fakeFile('b.txt')]); });
    act(() => { result.current.cancel(); });
    // only the first XHR should ever have been created
    expect(FakeXHR.instances).toHaveLength(1);
    expect(result.current.entries[0].status).toBe('cancelled');
    expect(result.current.entries[1].status).toBe('queued');
  });
});
