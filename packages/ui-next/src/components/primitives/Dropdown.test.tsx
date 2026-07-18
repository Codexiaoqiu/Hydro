import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dropdown } from './Dropdown';

describe('dropdown', () => {
  it('toggles open on trigger click', () => {
    render(<Dropdown label="Menu"><div>Item</div></Dropdown>);
    const trigger = screen.getByRole('button', { name: 'Menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on outside click', () => {
    render(<div><Dropdown label="Menu"><div>Item</div></Dropdown><div data-testid="outside">outside</div></div>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<Dropdown label="Menu"><div>Item</div></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('controlled mode respects onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(<Dropdown label="Menu" open={false} onOpenChange={onOpenChange}><div>Item</div></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
