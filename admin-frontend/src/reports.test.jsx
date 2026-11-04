import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Reports from './reports';


test('loads the reports table with totals and hidden IDs', () => {
    render(<StrictMode><Reports /></StrictMode>);
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'ID' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('tfoot th')).toHaveLength(5);
    expect(document.querySelector('tfoot').textContent).toContain('64');
    fireEvent.change(screen.getByLabelText('Filter reports'), { target: { value: 'no-match' } });
    expect(document.querySelector('tfoot').textContent).toBe('00000');
});
