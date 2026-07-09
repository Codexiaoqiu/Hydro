/**
 * Sub-components factored out of the legacy `problem_detail` monolith. The
 * goal is to keep the page file focused on layout + state, while the panels
 * here can grow (and be reused on `/problem_main` etc.) independently.
 */

export { ProblemFiles } from './ProblemFiles';
export type { ProblemFilesProps } from './ProblemFiles';

export { ProblemReference } from './ProblemReference';
export type { ProblemReferenceProps } from './ProblemReference';

export { ProblemOpenGraph } from './ProblemOpenGraph';
export type { ProblemOpenGraphProps } from './ProblemOpenGraph';

export { Scratchpad } from './Scratchpad';
export type { ScratchpadProps } from './Scratchpad';

export { MonacoEditor } from './MonacoEditor';
export type { MonacoEditorProps } from './MonacoEditor';
