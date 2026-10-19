import { fireEvent, render, screen, within } from '@testing-library/react';
import History from './history';

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
    sessionStorage.setItem('deletedRecords', JSON.stringify([{ id: 3, recordType: 'Job', name: 'Avery', businessName: 'Example Co', status: 'Deleted', sourceBidId: 42, items: [{ name: 'Hidden equipment' }], subjectContactEmail: 'avery@example.com' }]));
});

test('shows seven summary columns and opens full deleted record details on click or keyboard', () => {
    render(<History />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.queryByText('avery@example.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Example Co'));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('avery@example.com')).toBeInTheDocument();
    expect(within(dialog).queryByText('ID')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Source Bid Id')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('42')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Items')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Hidden equipment/)).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('deletedRecords'))[0].items).toEqual([{ name: 'Hidden equipment' }]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByText('Example Co').closest('tr'), { key: 'Enter' });
    dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { bubbles: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
