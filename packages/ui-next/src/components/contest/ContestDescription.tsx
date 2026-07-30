import { Article } from '../article/Article';
import { rewriteContent } from './rewrite-content';

export interface ContestDescriptionProps {
  content: string;
  docId: string;
}

export function ContestDescription({ content, docId }: ContestDescriptionProps) {
  const rewritten = rewriteContent(content ?? '', docId);
  return <Article content={rewritten} />;
}
