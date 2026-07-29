import '../pages'; // side-effect: triggers all registerPage calls

import { describe, expect, it } from 'vitest';
import { store } from '../registry/store';
import { NEXT_PAGES, NEXT_TEMPLATES } from './manifest';

const registeredPageKeys = () =>
  store.keys().filter((k) => k.startsWith('page:')).map((k) => k.slice(5));

describe('nEXT_PAGES manifest', () => {
  it('manifest keys exactly match all registerPage keys', () => {
    const manifestKeys = Object.keys(NEXT_PAGES).sort();
    const registeredKeys = registeredPageKeys().sort();
    expect(registeredKeys).toEqual(manifestKeys);
  });

  it('nEXT_TEMPLATES contains the homepage / error / create templates', () => {
    // Failure of any of these would silently regress C1 for the most-used page.
    expect(NEXT_TEMPLATES).toContain('main.html');
    expect(NEXT_TEMPLATES).toContain('error.html');
    expect(NEXT_TEMPLATES).toContain('bsod.html');
    expect(NEXT_TEMPLATES).toContain('contest_edit.html'); // contest_create shares
    expect(NEXT_TEMPLATES).toContain('problem_edit.html'); // problem_create shares
    expect(NEXT_TEMPLATES).toContain('problem_solution.html');
    expect(NEXT_TEMPLATES).toContain('problem_statistics.html');
    expect(NEXT_TEMPLATES).toContain('discussion_detail.html');
    expect(NEXT_TEMPLATES).toContain('discussion_create.html');
    expect(NEXT_TEMPLATES).toContain('discussion_edit.html');
    expect(NEXT_TEMPLATES).toContain('discussion_main_or_node.html');
    expect(NEXT_TEMPLATES).toContain('user_detail.html');
  });

  it('nEXT_TEMPLATES never includes email / pjax / partial templates', () => {
    // Pin down C2 (emails) and H1 (pjax) regression: any of these reappearing
    // means someone added a template the SPA cannot render.
    for (const tpl of NEXT_TEMPLATES) {
      expect(tpl).not.toMatch(/_mail\.html$/);
      expect(tpl).not.toMatch(/_tr\.html$/);
      expect(tpl).not.toMatch(/_status\.html$/);
      expect(tpl).not.toMatch(/_summary\.html$/);
      expect(tpl).not.toMatch(/^partials\//);
    }
  });

  it('nEXT_TEMPLATES is deduped and frozen', () => {
    const asSet = new Set(NEXT_TEMPLATES);
    expect(asSet.size).toBe(NEXT_TEMPLATES.length);
    expect(Object.isFrozen(NEXT_TEMPLATES)).toBe(true);
  });
});
