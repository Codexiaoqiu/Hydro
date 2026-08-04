# ADR-2026-08-03: Reclassify 7 "Missing Page" Routes

## Context

The F1-F9 review at `.claude/reviews/ui-default-to-ui-next-by-feature.md` classified 7 routes as "missing ui-next pages". A pre-flight source-code investigation revealed that only 1 of them (`/user/delete`) actually returns a page template; the other 6 are form submissions, file downloads, or redirects that do not need SPA pages.

## Decision

In ui-next, do **NOT** implement SPA pages for these endpoints. Instead, add entry buttons/forms in existing ui-next pages:

- `contest_manage.tsx` — add "Download Code" button for `/contest/:tid/code` and `/homework/:tid/code`
- `home_security.tsx` — embed `<form>` for `/home/avatar` and handle `/home/changeMail/:code` redirect
- `user_detail.tsx` — add "Switch to this account" link for `/account/:uid` (visible only when `PRIV_EDIT_SYSTEM`)

## Routes Table

| Route | True Form | ui-next Page Needed? |
|---|---|---|
| `/user/delete` | Backend returns `user_delete_pending.html` | **Yes** (see Task 2.2) |
| `/contest/:tid/code` | `ContestCodeHandler` streams a ZIP file directly | No — only add "Download Code" button in `contest_manage.tsx` |
| `/homework/:tid/code` | Reuses `ContestCodeHandler` | No, same as above |
| `/home/avatar` | `HomeAvatarHandler` POST-only, no template | No — embed `<form action="/home/avatar" method="post" enctype="multipart/form-data">` in `home_security.tsx` |
| `/home/changeMail/:code` | `UserChangemailWithCodeHandler` redirects to `home_security` after processing | No — no page needed (triggered by email link) |
| `/storage` | `StorageHandler` returns file stream directly | No — pure download endpoint |
| `/account/:uid` | `SwitchAccountHandler` + `requireSudo`, admin only | No — add "Switch to this account" link in `user_detail.tsx` when `PRIV_EDIT_SYSTEM` is set |

## Rationale

- `/user/delete` — Renders a confirmation page (`user_delete_pending.html`); ui-next needs an equivalent page (delegated to Task 2.2).
- `/contest/:tid/code` and `/homework/:tid/code` — These are download endpoints that stream ZIP archives; no page to render, only a entry point in contest management UI.
- `/home/avatar` — Pure POST form handler; the ui-next `home_security.tsx` should embed the upload form directly rather than navigating to a separate page.
- `/home/changeMail/:code` — Triggered by an email link; after processing the code, the handler already redirects to `home_security`. No intermediate page is needed in ui-next.
- `/storage` — Serves files directly (images, attachments); no page component needed.
- `/account/:uid` — A privileged account-switching action; ui-next should expose it as a link in the user detail page for admins only, not as a standalone page.

## Consequences

- Tasks 2.3+ will add the entry buttons/forms listed above to the respective ui-next pages instead of creating new route-level pages.
- `/user/delete` remains tracked separately in Task 2.2 as a true page that requires an SPA equivalent.
