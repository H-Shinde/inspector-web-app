import { fireEvent, render, screen } from '@testing-library/react';
import ClientTypeahead from './ClientTypeahead';
const clients = [{ id: 1, name: 'Avery Wilson', businessName: 'Example' }, { id: 2, name: 'Jordan Lee' }];
test('filters by name and supports keyboard selection without submitting', () => {
    const select = jest.fn();
    render(<ClientTypeahead clients={clients} onSelect={select} />);
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'AV' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(select).toHaveBeenCalledWith(clients[0]);
    expect(search).toHaveValue('Avery Wilson');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});
test('shows no matches and dismisses with Escape', () => {
    render(<ClientTypeahead clients={clients} onSelect={jest.fn()} />);
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByRole('status')).toHaveTextContent('No matching clients');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveAttribute('aria-expanded', 'false');
});
