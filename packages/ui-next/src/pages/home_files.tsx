import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';

interface FileEntry { name: string, size: number, mtime: number }
interface Args { files: FileEntry[] }

export default function HomeFilesPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">Files</h1>
        <Button variant="primary" disabled>Upload File</Button>
      </div>
      {args.files.length === 0 ? (
        <p className="empty">No files.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Size</th><th>Modified</th></tr></thead>
          <tbody>
            {args.files.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>{f.size}</td>
                <td>{new Date(f.mtime * 1000).toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
