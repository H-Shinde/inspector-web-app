import { fireEvent, render, screen, within } from '@testing-library/react';
import History from './history';

jest.mock('./ItemImage', () => () => null);
jest.mock('datatables.net-dt', () => ({ render: { text: () => (value) => value } }));

jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, columns }, ref) => {
        React.useImperativeHandle(ref, () => ({ dt: () => ({ row: (tr) => ({ data: () => data[Number(tr.dataset.index)] }) }) }));
        return <table><thead><tr>{columns.map((column) => <th key={column.data}>{column.title}</th>)}</tr></thead>
            <tbody>{data.map((record, index) => <tr key={index} data-index={index} tabIndex={0}>{columns.map((column) => <td key={column.data}>{record[column.data]}</td>)}</tr>)}</tbody></table>;
    });
    Table.use = jest.fn();
    return Table;
});

beforeEach(() => {
    sessionStorage.clear();
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    sessionStorage.setItem('deletedRecords', JSON.stringify([{ id: 3, recordType: 'Job', name: 'Avery', businessName: 'Example Co', status: 'Deleted', sourceBidId: 42, items: [{ name: 'Visible equipment', make: 'Toyota' }], subjectContactEmail: 'avery@example.com' }]));
});

test('lists records with Declined or Completed status only', () => {
    sessionStorage.setItem('completedJobs', JSON.stringify([{ id: 4, recordType: 'Job', name: 'Jordan', businessName: 'Done Co', status: 'Complete' }]));
    sessionStorage.setItem('availableJobs', JSON.stringify([{ id: 5, name: 'Active', businessName: 'Active Co', status: 'Assigned' }]));
    render(<History />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Active Co')).not.toBeInTheDocument();
});

test('clicking a record opens a read-only details page instead of a popup', () => {
    render(<History />);
    fireEvent.click(screen.getByText('Example Co'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Job Information' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('avery@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('Declined');
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => expect(input).toHaveAttribute('readonly'));
    for (const section of ['Item Appraisal', 'Valuation & Fees', 'Items', 'Assigned Inspector']) {
        expect(screen.getByRole('button', { name: section })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    expect(screen.getByText('Visible equipment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add item|Upload CSV|Delete/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Visible equipment' }));
    expect(screen.getByLabelText('Make')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Make')).toHaveValue('Toyota');
    fireEvent.click(screen.getByRole('button', { name: /Back to History/ }));
    expect(screen.queryByRole('heading', { level: 1, name: 'Items' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'History' })).toBeInTheDocument();
});

test('opens details from the keyboard', () => {
    render(<History />);
    fireEvent.keyDown(screen.getByText('Example Co').closest('tr'), { key: 'Enter' });
    expect(screen.getByRole('heading', { level: 1, name: 'Job Information' })).toBeInTheDocument();
});