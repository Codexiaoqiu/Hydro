/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestManagementSidebar } from './ContestManagementSidebar';

const t = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'ContestMgmt.SidebarAria': 'Management',
    'ContestMgmt.Contest': 'Contest',
    'ContestMgmt.Edit': 'Edit',
    'ContestMgmt.Manage': 'Manage',
    'ContestMgmt.Attendees': 'Attendees',
    'ContestMgmt.Export': 'Export',
    'ContestMgmt.Balloon': 'Balloon',
    'ContestMgmt.Clarifications': 'Clarifications',
  };
  return map[key] ?? key;
});

vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

vi.mock('../link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
}));

const tdoc = { docId: 7, title: 'Test' } as any;

describe('ContestManagementSidebar', () => {
  it('lists all six management entries', () => {
    render(<ContestManagementSidebar tdoc={tdoc} />);
    for (const label of ['Edit', 'Manage', 'Export', 'Attendees', 'Balloon', 'Clarifications']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });
});
