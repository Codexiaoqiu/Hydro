/* @vitest-environment happy-dom */
import { render } from '@testing-library/react';
import Schema from 'schemastery';
import { describe, expect, it, vi } from 'vitest';
import { SchemaForm } from './SchemaForm';

// schemastery-react is a Vue / Element Plus form wrapped in veaury.
// In vitest's happy-dom the Vue render only flushes the outer bridge
// wrappers — Element Plus form internals (`.k-form`, `.k-schema-item`,
// inputs, etc.) do NOT mount here. So we assert on the veaury bridge
// structure that DOES render:
//
//   <div data-v-app="">                            ← Vue app root
//     <div __use_react_component_wrap__>           ← veaury React→Vue bridge
//       <div data-use-vue-component-wrap="" id="__vue_wrapper_container_…">
//       </div>
//     </div>
//   </div>
//
// happy-dom rejects CSS selectors whose attribute name starts with `_`
// (and JS `hasAttribute('__use_react_component_wrap__')` returns false),
// so we assert on the two `data-`-prefixed attributes that DO query
// successfully: `data-v-app` (Vue app mounted) and
// `data-use-vue-component-wrap` (veaury Vue wrapper present). Their
// presence proves schemastery-react is wired up. Input-level behaviour
// (typing, change events firing onChange) is covered by Playwright
// `test:visual` in a real browser where the full Element Plus form
// mounts.

describe('SchemaForm (form-structure contract)', () => {
  it('renders the schemastery-react / veaury bridge for a string schema', () => {
    const s = new Schema({ site_name: 'string' });
    const { container } = render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-use-vue-component-wrap]').length).toBeGreaterThan(0);
  });

  it('renders the schemastery-react / veaury bridge for a number schema', () => {
    const s = new Schema({ max_conn: 'number' });
    const { container } = render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-use-vue-component-wrap]').length).toBeGreaterThan(0);
  });

  it('renders the schemastery-react / veaury bridge for a boolean schema', () => {
    const s = new Schema({ enable_x: 'boolean' });
    const { container } = render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-use-vue-component-wrap]').length).toBeGreaterThan(0);
  });

  it('renders the schemastery-react / veaury bridge for a nested object schema', () => {
    const s = new Schema({ server: Schema.object({ cdn: 'string' }) });
    const { container } = render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-use-vue-component-wrap]').length).toBeGreaterThan(0);
  });

  it('accepts an onChange callback without throwing', () => {
    // The form mounts cleanly with onChange wired up. The actual
    // input-change → onChange pipeline is covered by Playwright
    // `test:visual` in a real browser.
    const onChange = vi.fn();
    const s = new Schema({ site_name: 'string' });
    expect(() => render(
      <SchemaForm schema={s} value={{}} onChange={onChange} />,
    )).not.toThrow();
  });
});