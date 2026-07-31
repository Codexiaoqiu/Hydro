// Source of truth for which templates the ui-next renderer serves.
// Keys MUST match `registerPage` keys in src/pages/index.ts (enforced by manifest.test.ts).
// Templates MUST NOT include email / pjax / partial fragments (enforced by the same test).
//
// `contest_create` and `problem_create` route to handlers that set the same
// `*_edit.html` template as their edit counterparts (handler/contest.ts:381,
// handler/problem.ts:997). Their template appears in NEXT_TEMPLATES only once,
// under the edit page; the create page key still lives in NEXT_PAGES so the
// drift test passes — its absence would silently break that route.

export const NEXT_PAGES = {
  domain_base: ['domain_base.html'],
  domain_create: ['domain_create.html'],
  domain_dashboard: ['domain_dashboard.html'],
  domain_edit: ['domain_edit.html'],
  domain_join: ['domain_join.html'],
  domain_join_applications: ['domain_join_applications.html'],
  domain_group: ['domain_group.html'],
  domain_permission: ['domain_permission.html'],
  domain_role: ['domain_role.html'],
  domain_user: ['domain_user.html'],
  homepage: ['main.html'],
  error: ['error.html', 'bsod.html'],
  contest_detail: ['contest_detail.html'],
  contest_main: ['contest_main.html'],
  contest_problemlist: ['contest_problemlist.html'],
  contest_scoreboard: ['contest_scoreboard.html'],
  contest_manage: ['contest_manage.html'],
  contest_user: ['contest_user.html'],
  contest_create: ['contest_edit.html'], // shared template
  contest_balloon: ['contest_balloon.html'],
  contest_clarification: ['contest_clarification.html'],
  contest_edit: ['contest_edit.html'],
  contest_print: ['contest_print.html'],
  problem_main: ['problem_main.html'],
  problem_solution: ['problem_solution.html'],
  discussion_detail: ['discussion_detail.html'],
  discussion_main: ['discussion_main_or_node.html'], // shared with discussion_node
  discussion_node: ['discussion_main_or_node.html'],
  discussion_create: ['discussion_create.html'],
  discussion_edit: ['discussion_edit.html'],
  user_detail: ['user_detail.html'],
  user_login: ['user_login.html'],
  user_register: ['user_register.html'],
  user_register_with_code: ['user_register_with_code.html'],
  user_lostpass: ['user_lostpass.html'],
  user_lostpass_with_code: ['user_lostpass_with_code.html'],
  user_logout: ['user_logout.html'],
  user_sudo: ['user_sudo.html'],
  problem_create: ['problem_edit.html'], // shared template
  problem_edit: ['problem_edit.html'],
  problem_import: ['problem_import.html'],
  problem_detail: ['problem_detail.html'],
  problem_statistics: ['problem_statistics.html'],
  problem_submit: ['problem_submit.html'],
  problem_files: ['problem_files.html'],
  problem_config: ['problem_config.html'],
  problem_hack: ['problem_hack.html'],
  record_detail: ['record_detail.html'],
  record_main: ['record_main.html'],
  home_messages: ['home_messages.html'],
  home_security: ['home_security.html'],
  home_settings: ['home_settings.html'],
  manage_base: ['manage_base.html'],
  manage_config: ['manage_config.html'],
  manage_dashboard: ['manage_dashboard.html'],
  manage_script: ['manage_script.html'],
  manage_setting: ['manage_setting.html'],
} as const;

export const NEXT_TEMPLATES: readonly string[] = Object.freeze(
  [...new Set(Object.values(NEXT_PAGES).flat())],
);
