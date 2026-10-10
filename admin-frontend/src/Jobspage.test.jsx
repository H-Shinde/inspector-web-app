import { fireEvent, render, screen } from '@testing-library/react';
import Jobspage from './Jobspage';
import { selectGlobalInspector } from './inspectorSelection';
import { act } from '@testing-library/react';

jest.mock('datatables.net-react', () => {
    const Table = ({ data }) => <div>{data.map((item) => <p key={item.itemId}>{item.name}</p>)}</div>;
    Table.use = () => {};
    return Table;
});
jest.mock('datatables.net-dt', () => ({}));

beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('availableJobs', JSON.stringify([
        { id: 1, name: 'Test job', isCreatedJob: true, items: [] },
    ]));
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'new-item-id' } });
});

test('adds and persists an item, then dismisses confirmation on the next click', () => {
    const { unmount } = render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New forklift' } });
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'Toyota' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByRole('status').textContent).toBe('Item has been added.');
    expect(screen.getByText('New forklift')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('jobItems'))['1'][0]).toMatchObject({ name: 'New forklift', make: 'Toyota' });
    fireEvent.click(screen.getByRole('heading', { name: 'Items' }));
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    expect(screen.getByText('New forklift')).toBeTruthy();
});

test('canceling an item draft leaves the list unchanged', () => {
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    expect(screen.getByRole('button', { name: 'Add item' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved item' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Unsaved item')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(sessionStorage.getItem('jobItems')).toBeNull();
});

test('shows global selection in the dropdown and assigns changes directly', () => {
    selectGlobalInspector(2);
    render(<Jobspage />);
    expect(screen.getByLabelText('Assign inspector').value).toBe('Jordan Lee');
    act(() => selectGlobalInspector(3));
    expect(screen.getByLabelText('Assign inspector').value).toBe('Taylor Brooks');
    expect(screen.queryByRole('button', { name: 'Assign selected inspector' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Assign inspector'), { target: { value: 'Alex Morgan' } });
    expect(sessionStorage.getItem('selectedInspectorId')).toBe('1');
    expect(JSON.parse(sessionStorage.getItem('jobAssignments'))[0].inspector).toBe('Alex Morgan');
});
