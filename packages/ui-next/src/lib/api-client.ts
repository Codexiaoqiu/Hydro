/**
 * Minimal API client for ui-next. Centralizes the fetch call shape used by
 * pages that POST JSON to the Hydro backend so that CSRF / auth headers and
 * error handling can be added in one place later. The current `post`
 * implementation only handles JSON bodies; future verbs (put/patch/delete)
 * and form-data bodies can be added alongside.
 *
 * `credentials: 'same-origin'` is required so the session cookie is sent
 * with the request; without it the server treats the call as anonymous
 * and the save fails. CSRF itself is handled by the framework via
 * `Referer`-based checks (see `framework/framework/server.ts`), so no
 * explicit token header is needed for same-origin POSTs.
 */
async function post(url: string, body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res;
}

export const apiClient = { post };
