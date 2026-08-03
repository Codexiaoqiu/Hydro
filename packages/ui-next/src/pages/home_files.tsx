import { useRef, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { formatFileSize } from '../lib/format';

interface FileEntry {
  _id?: string;
  name: string;
  size: number;
  lastModified?: string | number | Date;
  etag?: string;
}
export interface Args {
  files: FileEntry[];
  urlForFile: (filename: string) => string;
}

export default function HomeFilesPage() {
  const { args } = usePageData();
  const [files, setFiles] = useState(args.files);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.set('operation', 'upload_file');
        form.set('filename', file.name);
        form.set('file', file);
        await request.postFile('/file', form);
        setFiles((current) => current.some((entry) => entry.name === file.name)
          ? current
          : [...current, { _id: file.name, name: file.name, size: file.size }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (targets: string[]) => {
    setBusy(true);
    setError(null);
    try {
      await request.post('/file', { operation: 'delete_files', files: targets });
      setFiles((current) => current.filter((file) => !targets.includes(file.name)));
      setSelected((current) => new Set([...current].filter((name) => !targets.includes(name))));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allSelected = files.length > 0 && selected.size === files.length;

  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">Files</h1>
        <div className="section__tools">
          <Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Working…' : 'Upload File'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            disabled={busy}
            aria-label="Choose files to upload"
            onChange={(event) => upload(event.currentTarget.files)}
          />
        </div>
      </div>

      {error ? (
        <div className="section__body" role="alert">
          <span>{error}</span>
          <Button variant="ghost" type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="section__body no-padding files">
        {files.length === 0 ? (
          <p className="empty">There are no files currently.</p>
        ) : (
          <table className="data-table">
            <colgroup>
              <col className="col--checkbox" />
              <col className="col--name" />
              <col className="col--size" />
              <col className="col--operation" />
            </colgroup>
            <thead>
              <tr>
                <th className="col--checkbox" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all files"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(files.map((file) => file.name)))}
                  />
                </th>
                <th className="col--name" scope="col">Filename</th>
                <th className="col--size" scope="col">Size</th>
                <th className="col--operation" scope="col">Operation</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const href = args.urlForFile(file.name);
                return (
                  <tr key={file.name} data-filename={file.name} data-size={file.size}>
                    <td className="col--checkbox">
                      <input
                        type="checkbox"
                        aria-label={`Select ${file.name}`}
                        checked={selected.has(file.name)}
                        onChange={() => toggleSelected(file.name)}
                      />
                    </td>
                    <td className="col--name"><a href={href}>{file.name}</a></td>
                    <td className="col--size">{formatFileSize(file.size)}</td>
                    <td className="col--operation">
                      <a href={href} download={file.name} aria-label={`Download ${file.name}`}>Download</a>
                      {' '}
                      <Button
                        variant="danger"
                        type="button"
                        disabled={busy}
                        aria-label={`Delete ${file.name}`}
                        onClick={() => {
                          // eslint-disable-next-line no-alert
                          if (window.confirm('Confirm to delete the file?')) remove([file.name]);
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="section__body">
        <Button
          variant="ghost"
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => {
            // eslint-disable-next-line no-alert
            if (window.confirm('Confirm to delete the selected files?')) remove([...selected]);
          }}
        >
          Remove Selected
        </Button>
      </div>
    </div>
  );
}
