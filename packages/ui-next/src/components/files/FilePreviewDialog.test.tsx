import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { FilePreviewDialog, previewKind } from './FilePreviewDialog';

const fetchMock = vi.fn();
const createObjectURL = vi.fn(() => 'blob:mock-url');
const revokeObjectURL = vi.fn();
const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  writeText.mockClear();
  (global as any).fetch = fetchMock;
  (global as any).URL.createObjectURL = createObjectURL;
  (global as any).URL.revokeObjectURL = revokeObjectURL;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});
afterEach(() => { vi.restoreAllMocks(); });

function withToast(node: React.ReactNode) {
  return render(<ToastProvider>{node}</ToastProvider>);
}

function textResponse(body: string) {
  return { ok: true, status: 200, text: async () => body, blob: async () => new Blob([body]) };
}
function blobResponse(body: string, type: string) {
  return { ok: true, status: 200, text: async () => body, blob: async () => new Blob([body], { type }) };
}

describe('previewKind', () => {
  it('classifies images', () => {
    for (const n of ['a.png', 'b.JPG', 'c.jpeg', 'd.gif', 'e.webp', 'f.bmp']) {
      expect(previewKind(n)).toBe('image');
    }
  });
  it('classifies video, audio and pdf', () => {
    expect(previewKind('m.mp4')).toBe('video');
    expect(previewKind('m.webm')).toBe('video');
    expect(previewKind('s.mp3')).toBe('audio');
    expect(previewKind('s.wav')).toBe('audio');
    expect(previewKind('doc.pdf')).toBe('pdf');
  });
  it('treats archives and oversized files as download-only', () => {
    expect(previewKind('bundle.zip')).toBe('download');
    expect(previewKind('data.7z')).toBe('download');
    expect(previewKind('small.txt', 20 * 1024 * 1024)).toBe('download');
  });
  it('defaults to text', () => {
    expect(previewKind('main.cpp')).toBe('text');
    expect(previewKind('1.in')).toBe('text');
    expect(previewKind('config.yaml')).toBe('text');
  });
});

describe('filePreviewDialog', () => {
  it('renders nothing when closed', () => {
    withToast(
      <FilePreviewDialog open={false} filename="a.txt" url="/file/a" onClose={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fetches and shows text content in an editor', async () => {
    fetchMock.mockResolvedValue(textResponse('int main(){}'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="main.cpp" url="/file/main.cpp" onClose={() => {}} />);
    });
    const editor = await screen.findByRole('textbox');
    expect((editor as HTMLTextAreaElement).value).toBe('int main(){}');
  });

  it('saves edited text via the upload_file operation and calls onSaved', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('old'));
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const onSaved = vi.fn();
    await act(async () => {
      withToast(
        <FilePreviewDialog
          open
          filename="notes.txt"
          url="/file/notes.txt"
          uploadUrl="/p/1/files"
          type="additional_file"
          onClose={() => {}}
          onSaved={onSaved}
        />,
      );
    });
    const editor = await screen.findByRole('textbox');
    fireEvent.change(editor, { target: { value: 'new content' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    });
    const saveCall = fetchMock.mock.calls.find(([u]) => u === '/p/1/files');
    expect(saveCall).toBeTruthy();
    const body = saveCall![1].body as FormData;
    expect(body.get('operation')).toBe('upload_file');
    expect(body.get('filename')).toBe('notes.txt');
    expect(body.get('type')).toBe('additional_file');
    expect((saveCall![1] as RequestInit).credentials).toBe('same-origin');
    expect(onSaved).toHaveBeenCalled();
  });

  it('hides Save for read-only text previews', async () => {
    fetchMock.mockResolvedValue(textResponse('readonly'));
    await act(async () => {
      withToast(
        <FilePreviewDialog open readOnly filename="notes.txt" url="/file/notes.txt" onClose={() => {}} />,
      );
    });
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /保存|save/i })).not.toBeInTheDocument();
  });

  it('shows a load-error message when the preview fetch returns non-2xx (I5)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });
    await act(async () => {
      withToast(<FilePreviewDialog open filename="x.txt" url="/file/x.txt" onClose={() => {}} />);
    });
    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('shows a save-error message when the upload_file fetch returns non-2xx (I5)', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('old'));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' });
    await act(async () => {
      withToast(
        <FilePreviewDialog
          open
          filename="notes.txt"
          url="/file/notes.txt"
          uploadUrl="/p/1/files"
          type="additional_file"
          onClose={() => {}}
        />,
      );
    });
    const editor = await screen.findByRole('textbox'); // eslint-disable-line ts/no-unused-vars
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    });
    expect(await screen.findByText(/HTTP 502/)).toBeInTheDocument();
  });

  it('renders an image via an object URL and revokes it on close', async () => {
    fetchMock.mockResolvedValue(blobResponse('imgdata', 'image/png'));
    const { rerender } = withToast(
      <FilePreviewDialog open filename="pic.png" url="/file/pic.png" onClose={() => {}} />,
    );
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'blob:mock-url');
    expect(createObjectURL).toHaveBeenCalled();

    rerender(
      <ToastProvider>
        <FilePreviewDialog open={false} filename="pic.png" url="/file/pic.png" onClose={() => {}} />
      </ToastProvider>,
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes the previous object URL when filename changes mid-session (I3)', async () => {
    fetchMock.mockResolvedValue(blobResponse('imgdata', 'image/png'));
    const callsBefore = revokeObjectURL.mock.calls.length;
    const { rerender } = withToast(
      <FilePreviewDialog open filename="pic.png" url="/file/pic.png" onClose={() => {}} />,
    );
    await screen.findByRole('img');
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    rerender(
      <ToastProvider>
        <FilePreviewDialog open filename="pic2.png" url="/file/pic2" onClose={() => {}} />
      </ToastProvider>,
    );
    // Cleanup must have revoked the URL created for pic.png before the new
    // fetch resolves.
    expect(revokeObjectURL.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes the object URL when the component unmounts (I3)', async () => {
    fetchMock.mockResolvedValue(blobResponse('imgdata', 'image/png'));
    const { unmount } = withToast(
      <FilePreviewDialog open filename="pic.png" url="/file/pic.png" onClose={() => {}} />,
    );
    await screen.findByRole('img');
    expect(createObjectURL).toHaveBeenCalled();
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('renders a video element for video files', async () => {
    fetchMock.mockResolvedValue(blobResponse('v', 'video/mp4'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="clip.mp4" url="/file/clip.mp4" onClose={() => {}} />);
    });
    expect(document.querySelector('video')).not.toBeNull();
  });

  it('renders an audio element for audio files', async () => {
    fetchMock.mockResolvedValue(blobResponse('a', 'audio/mpeg'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="song.mp3" url="/file/song.mp3" onClose={() => {}} />);
    });
    expect(document.querySelector('audio')).not.toBeNull();
  });

  it('renders a pdf embed for pdf files', async () => {
    fetchMock.mockResolvedValue(blobResponse('%PDF', 'application/pdf'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="doc.pdf" url="/file/doc.pdf" onClose={() => {}} />);
    });
    expect(document.querySelector('embed, object')).not.toBeNull();
  });

  it('shows a download-only message for archives without fetching content', async () => {
    withToast(<FilePreviewDialog open filename="data.zip" url="/file/data.zip" onClose={() => {}} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /下载/ })).toBeInTheDocument();
  });

  it('copies a file:// reference link and surfaces a success toast (I4)', async () => {
    fetchMock.mockResolvedValue(textResponse('x'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="ref.txt" url="/file/ref.txt" onClose={() => {}} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /复制/ }));
    });
    expect(writeText).toHaveBeenCalledWith('file://ref.txt');
    // Toast text comes from FilePreview.LinkCopied (zh_CN: 引用链接已复制到剪贴板).
    expect(await screen.findByText(/引用链接已复制到剪贴板/)).toBeInTheDocument();
  });

  it('surfaces an error toast when clipboard.writeText rejects (I4)', async () => {
    writeText.mockRejectedValueOnce(new Error('Clipboard blocked'));
    fetchMock.mockResolvedValue(textResponse('x'));
    await act(async () => {
      withToast(<FilePreviewDialog open filename="ref.txt" url="/file/ref.txt" onClose={() => {}} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /复制/ }));
    });
    // zh_CN FilePreview.CopyError: 复制失败:{message}
    expect(await screen.findByText(/复制失败/)).toBeInTheDocument();
  });
});
