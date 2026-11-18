import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import StateSelect from './StateSelect';
import StateTypeahead from './StateTypeahead';
test('state dropdown displays full names, submits codes, and keeps selected values', () => {
    const change = jest.fn();
    render(<StateSelect aria-label="State" value="ny" onChange={change} />);
    expect(screen.getByRole('combobox', { name: 'State' })).toHaveValue('NY');
    expect(screen.getByRole('option', { name: 'New York (NY)' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CA' } });
    expect(change).toHaveBeenCalled();
});

test('state typeahead searches names and codes and saves the selected abbreviation', () => {
    function Field() {
        const [value, setValue] = useState('');
        return <><label htmlFor="state">State</label><StateTypeahead id="state" name="state" value={value} onChange={setValue} /></>;
    }
    render(<Field />);
    const input = screen.getByRole('combobox', { name: 'State' });
    fireEvent.change(input, { target: { value: 'new y' } });
    expect(screen.getByRole('option', { name: 'New York (NY)' })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('NY');

    fireEvent.change(input, { target: { value: 'ca' } });
    fireEvent.click(screen.getByRole('option', { name: 'California (CA)' }));
    expect(input).toHaveValue('CA');
    expect(input).toHaveAttribute('aria-expanded', 'false');
});
