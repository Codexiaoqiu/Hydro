import { Article } from '../article/Article';

export interface ContestDescriptionProps {
  content: string;
  docId: string;
}

export function rewriteContent(raw: string, docId: string): string {
  return raw
    .replace(/\(file:\/\//g, `(${docId}/file/public/`)
    .replace(/="file:\/\//g, `="${docId}/file/public/`);
}

export function ContestDescription({ content, docId }: ContestDescriptionProps) {
  const rewritten = rewriteContent(content ?? '', docId);
  return <Article content={rewritten} />;
}
