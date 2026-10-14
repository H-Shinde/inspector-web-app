import { fireEvent, render, screen, within } from '@testing-library/react';
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
        { id: 1, name: 'Test job', status: 'Accepted', isCreatedJob: true, items: [] },
    ]));
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'new-item-id' } });
});

test('combines appraisal groups and keeps their rate edits separate', () => {
    const { unmount } = render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Item Appraisal' }));
    const appraised = within(screen.getByRole('region', { name: 'Appraised Items' }));
    const nonAppraised = within(screen.getByRole('region', { name: 'Non Appraised Items' }));
    fireEvent.change(appraised.getByLabelText('Inspection rate'), { target: { value: '45' } });
    fireEvent.change(nonAppraised.getByLabelText('Inspection rate'), { target: { value: '25' } });
    unmount();
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Item Appraisal' }));
    expect(within(screen.getByRole('region', { name: 'Appraised Items' })).getByLabelText('Inspection rate')).toHaveValue(45);
    expect(within(screen.getByRole('region', { name: 'Non Appraised Items' })).getByLabelText('Inspection rate')).toHaveValue(25);
});

test('shows valuation and fees together with shared history controls', () => {
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Valuation & Fees' }));
    fireEvent.change(screen.getByLabelText('FMV in Continued Use'), { target: { value: '10000' } });
    fireEvent.blur(screen.getByLabelText('FMV in Continued Use'));
    fireEvent.change(screen.getByLabelText('Total'), { target: { value: '500' } });
    fireEvent.blur(screen.getByLabelText('Total'));
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getAllByRole('button', { name: 'Current' })).toHaveLength(1);
    expect(screen.getByLabelText('FMV in Continued Use')).toHaveValue('10000');
    expect(screen.getByLabelText('Total')).toHaveValue('500');
    expect(JSON.parse(sessionStorage.getItem('jobValuationHistory')).map((entry) => entry.section)).toEqual(['Inspection Fees', 'Asset Valuation']);
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
