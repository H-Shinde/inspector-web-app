import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Inspector from './inspector';
import { listInspectors, createInspector, updateInspector } from './inspectorApi';
jest.mock('./inspectorApi', () => ({ listInspectors: jest.fn(), createInspector: jest.fn(), updateInspector: jest.fn() }));
jest.mock('datatables.net-react', () => {
    const React = require('react');
    const Table = React.forwardRef(({ data, slots }, ref) => {
        React.useImperativeHandle(ref, () => ({ dt: () => ({ row: (element) => ({ data: () => data.find((row) => String(row.id) === element.dataset.id) }) }) }));
        return <table><tbody>{data.map((row) => <tr key={row.id} data-id={row.id}><td>{row.name}</td><td>{row.cityStateZip}</td><td>{slots[4](null, null, row)}</td></tr>)}</tbody></table>;
    });
    Table.use = () => {}; return Table;
});
jest.mock('datatables.net-dt', () => ({ render: { text: () => undefined } }));
const inspector = { id: 42, name: 'Database Inspector', email: 'inspector@example.com', zipCode: '10001', city: 'New York', state: 'NY', cityStateZip: 'New York, NY 10001', is_active: true };
beforeEach(() => {
    jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    listInspectors.mockResolvedValue({ inspectors: [inspector] });
    createInspector.mockResolvedValue(inspector); updateInspector.mockResolvedValue(inspector);
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
});
test('loads real inspectors and their ZIP-based location', async () => {
    render(<Inspector />);
    expect(await screen.findByText('Database Inspector')).toBeInTheDocument();
    expect(screen.getByText('New York, NY 10001')).toBeInTheDocument();
    expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument();
});
test('creates an inspector using only an email', async () => {
    render(<Inspector />); await screen.findByText('Database Inspector');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Inspector' }));
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Inspector')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ZIP')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Distance (miles)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Add inspector' })).not.toBeInTheDocument());
    expect(createInspector).toHaveBeenCalledWith({ email: 'new@example.com' });
});
test('preserves entered fields on failure', async () => {
    createInspector.mockRejectedValueOnce(new Error('Unable to save.'));
    render(<Inspector />); await screen.findByText('Database Inspector');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Inspector' }));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('new@example.com');
});
test('edits an existing inspector location', async () => {
    render(<Inspector />); fireEvent.click(await screen.findByText('Database Inspector'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Inspector' }));
    fireEvent.change(screen.getByLabelText('ZIP'), { target: { value: '11201' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Inspector' }));
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Edit inspector' })).not.toBeInTheDocument());
    expect(updateInspector).toHaveBeenCalledWith(42, expect.objectContaining({ zipCode: '11201' }));
});
