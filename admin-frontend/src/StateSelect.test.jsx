import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import StateSelect from './StateSelect';
test('state dropdown displays full names, submits codes, and keeps selected values', () => {
    const change = jest.fn();
    render(<StateSelect aria-label="State" value="ny" onChange={change} />);
    expect(screen.getByRole('combobox', { name: 'State' })).toHaveValue('NY');
    expect(screen.getByRole('option', { name: 'New York (NY)' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CA' } });
    expect(change).toHaveBeenCalled();
});
