/* @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import Schema from 'schemastery';
import { describe, expect, it, vi } from 'vitest';
import { SchemaForm } from './SchemaForm';

describe('SchemaForm', () => {
  it('renders a text input for a string schema', () => {
    const s = new Schema({ site_name: 'string' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: /site_name/i })).toBeInTheDocument();
  });

  it('renders a number input for a number schema', () => {
    const s = new Schema({ max_conn: 'number' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('spinbutton', { name: /max_conn/i })).toBeInTheDocument();
  });

  it('renders a checkbox for a boolean schema', () => {
    const s = new Schema({ enable_x: 'boolean' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /enable_x/i })).toBeInTheDocument();
  });

  it('calls onChange with merged value when an input changes', () => {
    const onChange = vi.fn();
    const s = new Schema({ site_name: 'string' });
    render(<SchemaForm schema={s} value={{}} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: /site_name/i }), {
      target: { value: 'Hydro' },
    });
    expect(onChange).toHaveBeenCalledWith({ site_name: 'Hydro' });
  });

  it('renders nested keys with flat path labels (e.g. server.cdn)', () => {
    const s = new Schema({ server: Schema.object({ cdn: 'string' }) });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    // schemastery-react flattens nested objects; we use the dotted path as the label
    expect(screen.getByRole('textbox', { name: /server\.cdn/i })).toBeInTheDocument();
  });
});