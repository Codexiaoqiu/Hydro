/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DomainForm } from './DomainForm';

describe('domainForm', () => {
  it('renders empty form', () => {
    render(<DomainForm domain={{ name: '', displayName: '', gravatar: '' }} mode="create" />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('');
    expect(screen.getByLabelText(/display/i)).toHaveValue('');
  });

  it('renders prefilled form for edit', () => {
    render(<DomainForm domain={{ name: 'd1', displayName: 'My', gravatar: 'g' }} mode="edit" />);
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('d1');
    expect(screen.getByLabelText(/display/i)).toHaveValue('My');
    expect(screen.getByLabelText(/gravatar/i)).toHaveValue('g');
  });
});
