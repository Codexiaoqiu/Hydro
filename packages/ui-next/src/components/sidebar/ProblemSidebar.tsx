import { STATUS } from '@hydrooj/common';
import { useTranslate } from '../../lib/i18n';
import {
  canEditProblem, canRejudgeProblem, canSubmitProblem, canViewAcceptedSolution,
  canViewDiscussion, canViewProblemSolution, isLoggedIn,
} from '../../lib/perms';
import { Menu, type MenuItem } from './Menu';
import { resolveSubmitAction } from './submit-action';

// ===== Shared Types (mirrored from problem_detail.tsx) =====================
interface Pdoc {
  docId: number;
  pid?: string;
  title: string;
  hidden?: boolean;
  tag?: string[];
  difficulty?: number;
  nSubmit?: number;
  nAccept?: number;
  content?: string | Record<string, string>;
  config?: {
    type?: string;
    subType?: string;
    timeMin?: number;
    timeMax?: number;
    memoryMin?: number;
    memoryMax?: number;
    langs?: string[];
    [k: string]: unknown;
  } | string;
  reference?: { domainId: string, pid: string | number };
  data?: unknown[];
  additional_file?: Array<{ name: string, size: number }>;
}

interface Psdoc { star?: boolean, status?: number }
interface Tdoc { _id?: string, docId?: string, pids?: Array<number | string>, rule?: string, owner?: number }
interface Args {
  pdoc: Pdoc;
  psdoc?: Psdoc;
  tdoc?: Tdoc;
  mode?: 'normal' | 'contest' | 'view' | 'correction';
  UserContext?: {
    _id?: number;
    uname?: string;
    avatar?: string;
    perm?: bigint | string | number;
    priv?: number;
    scope?: bigint | string | number;
    hasPerm?: (p: number) => boolean;
    hasPriv?: (p: number) => boolean;
    own?: (p: { owner?: number }, perm: number) => boolean;
    viewLang?: string;
    codeLang?: string;
    codeTemplate?: string;
    canViewRecord?: boolean;
  };
}
type Mode = NonNullable<Args['mode']>;

// ===== Sidebar Menu Implementation =========================================

export interface ProblemSidebarContext {
  pdoc: Pdoc;
  tdoc?: Tdoc;
  UserContext?: Args['UserContext'];
  buildUrl: (name: string, params?: Record<string, unknown>, query?: Record<string, string>) => string;
  discussionCount: number;
  solutionCount: number;
  psdoc?: Psdoc;
}

export function getTidQuery(tdoc?: Tdoc): Record<string, string> {
  return tdoc && tdoc.docId != null ? { tid: String(tdoc.docId) } : {};
}

function buildSubmitItem(ctx: ProblemSidebarContext, t: (k: string) => string): MenuItem {
  const r = resolveSubmitAction({
    loggedIn: isLoggedIn(ctx.UserContext),
    hasSubmitPerm: canSubmitProblem(ctx.UserContext),
    domainJoin: true,
    pid: ctx.pdoc.pid ?? String(ctx.pdoc.docId),
    tid: ctx.tdoc?.docId,
  });

  if (r.state === 'allowed') {
    return { key: 'submit', title: t('Problem.Submit'), href: r.href };
  }
  if (r.state === 'anonymous') {
    return { key: 'submit', title: t(r.reasonKey ?? 'Problem.LoginToSubmit'), href: r.href };
  }
  return { key: 'submit', title: t(r.reasonKey ?? 'Problem.NoPermissionToSubmit'), disabled: true };
}

export function getNormalMenu(ctx: ProblemSidebarContext, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const {
    pdoc, tdoc, UserContext, buildUrl, discussionCount, solutionCount, psdoc,
  } = ctx;

  const items: MenuItem[] = [];
  const canRejudge = canRejudgeProblem(UserContext);
  const canViewDisc = canViewDiscussion(UserContext);
  const psdocAccepted = psdoc?.status === STATUS.STATUS_ACCEPTED;
  const canViewSolution =
    canViewProblemSolution(UserContext)
    || (canViewAcceptedSolution(UserContext) && psdocAccepted);
  const editable = canEditProblem(UserContext, pdoc as unknown as { owner?: number });
  const showRejudge = canRejudge && !pdoc.reference;

  items.push(buildSubmitItem(ctx, t));

  if (showRejudge) {
    items.push({
      key: 'rejudge',
      title: t('Problem.Rejudge'),
      form: true,
      action: '',
      postBody: { operation: 'rejudge' },
    });
  }

  if (canViewDisc || canViewSolution) {
    items.push({ key: 'sep-1', separator: true });
  }
  if (canViewDisc) {
    items.push({
      key: 'discussions',
      title: `${t('Problem.Discussions')} (${discussionCount})`,
      href: buildUrl('discussion_node', { type: 'problem', name: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  if (canViewSolution) {
    items.push({
      key: 'solutions',
      title: `${t('Problem.Solutions')} (${solutionCount})`,
      href: buildUrl('problem_solution', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  items.push({
    key: 'files',
    title: t('Problem.Files'),
    href: buildUrl('problem_files', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });
  items.push({
    key: 'statistics',
    title: t('Problem.Statistics'),
    href: buildUrl('problem_statistics', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });
  items.push({
    key: 'scratchpad',
    title: t('Problem.OpenScratchpad') ?? '进入在线编程模式',
    href: buildUrl('problem_detail',
      { pid: String(pdoc.docId) },
      { ...getTidQuery(tdoc), mode: 'scratchpad' },
    ),
  });

  if (editable) {
    items.push({ key: 'sep-2', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    if (!pdoc.reference) {
      items.push({
        key: 'judge-config',
        title: t('Problem.JudgeConfig'),
        href: buildUrl('problem_config', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    }
  }

  void pdoc;
  return items;
}

export function getContestMenu(ctx: ProblemSidebarContext, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  if (mode === 'view' || mode === 'correction') {
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  } else {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }

  if (mode === 'contest' || (mode !== 'view' && mode !== 'correction')) {
    items.push(buildSubmitItem(ctx, t));
  }

  const editable = canEditProblem(UserContext, pdoc as unknown as { owner?: number });
  if (editable) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

export function getHomeworkMenu(ctx: ProblemSidebarContext, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  const showSubmitArea = mode === 'contest' || mode === 'correction' || mode === 'normal';

  if (showSubmitArea) {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    items.push(buildSubmitItem(ctx, t));
  } else {
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  }

  const editable = canEditProblem(UserContext, pdoc as unknown as { owner?: number });
  if (editable) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

export function pickSidebarItems(ctx: ProblemSidebarContext, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  if (!ctx.tdoc) return getNormalMenu(ctx, t);
  if (ctx.tdoc.rule === 'homework') return getHomeworkMenu(ctx, mode, t);
  return getContestMenu(ctx, mode, t);
}

// ===== Component Wrapper ====================================================

export function ProblemSidebar({
  context, mode,
}: {
  context: ProblemSidebarContext;
  mode: Mode;
}) {
  const t = useTranslate();
  return <Menu items={pickSidebarItems(context, mode, t)} />;
}
