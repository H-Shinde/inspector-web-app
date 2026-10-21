import { fireEvent, render, screen, within } from '@testing-library/react';
import Jobspage from './Jobspage';
import { saveItemImage, readItemImage } from './itemImages';
jest.mock('./itemImages', () => ({ saveItemImage: jest.fn(), readItemImage: jest.fn(), deleteItemImage: jest.fn().mockResolvedValue(undefined) }));
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
    saveItemImage.mockResolvedValue(undefined);
    readItemImage.mockResolvedValue(new Blob(['image']));
    URL.createObjectURL = jest.fn(() => 'blob:item');
    URL.revokeObjectURL = jest.fn();
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
    fireEvent.click(screen.getByRole('heading', { name: 'Items', level: 2 }));
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

test('shows global selection in the dropdown and assigns only when the button is clicked', () => {
    selectGlobalInspector(2);
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Assign Inspector' }));
    expect(screen.getByLabelText('Assign inspector').value).toBe('Jordan Lee');
    act(() => selectGlobalInspector(3));
    expect(screen.getByLabelText('Assign inspector').value).toBe('Taylor Brooks');
    const assignButton = screen.getByRole('button', { name: 'Assign inspector' });
    expect(assignButton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Assign inspector'), { target: { value: 'Alex Morgan' } });
    expect(sessionStorage.getItem('selectedInspectorId')).not.toBe('1');
    expect(assignButton.disabled).toBe(false);
    fireEvent.click(assignButton);
    expect(sessionStorage.getItem('selectedInspectorId')).toBe('1');
    expect(JSON.parse(sessionStorage.getItem('jobAssignments'))[0].inspector).toBe('Alex Morgan');
    expect(screen.getByRole('button', { name: 'Assign inspector' }).disabled).toBe(true);
});

test('page title follows the selected tab and the old dropdowns are gone', () => {
    render(<Jobspage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Job Information');
    fireEvent.click(screen.getByRole('button', { name: 'Item Appraisal' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Item Appraisal');
    expect(screen.queryByLabelText('Jobs')).toBeNull();
    expect(screen.queryByLabelText('Assign inspector')).toBeNull();
});
test('uploading a CSV adds its rows as items and keeps them after reload', async () => {
    let count = 0;
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => `csv-item-${++count}` } });
    const { unmount } = render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    const csv = 'Name,Make,Model,Year,Hours/Miles,Notes\nForklift,Toyota,8FGCU25,2020,"1,200 hours","Good, clean"\n,Skip,Me,,,\nPallet jack,Crown,WP 3000,2021,480 hours,\n';
    fireEvent.change(screen.getByLabelText('Upload items CSV'), { target: { files: [new File([csv], 'items.csv', { type: 'text/csv' })] } });
    expect(await screen.findByText(/Imported 2 items from items\.csv/)).toBeTruthy();
    expect(screen.getByText('Forklift')).toBeTruthy();
    expect(screen.getByText('Pallet jack')).toBeTruthy();
    const saved = JSON.parse(sessionStorage.getItem('jobItems'))['1'];
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ name: 'Forklift', make: 'Toyota', hoursMiles: '1,200 hours', comments: 'Good, clean' });
    unmount();
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    expect(screen.getByText('Forklift')).toBeTruthy();
});

test('a CSV without a Name column shows an error and changes nothing', async () => {
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.change(screen.getByLabelText('Upload items CSV'), { target: { files: [new File(['Make,Model\nToyota,X'], 'bad.csv', { type: 'text/csv' })] } });
    expect((await screen.findByRole('alert')).textContent).toContain('"Name" column');
    expect(sessionStorage.getItem('jobItems')).toBeNull();
});

test('marks the job complete and redirects to history', () => {
    const location = window.location;
    delete window.location;
    window.location = { search: '?jobId=1', href: '' };
    try {
        const { unmount } = render(<Jobspage />);
        fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));
        expect(window.location.href).toBe('');
        expect(sessionStorage.getItem('completedJobs')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(sessionStorage.getItem('completedJobs')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));
        fireEvent.click(screen.getByRole('button', { name: 'Complete job' }));
        expect(window.location.href).toBe('/History');
        expect(JSON.parse(sessionStorage.getItem('completedJobs'))[0]).toMatchObject({ id: 1, status: 'Complete' });
        unmount();
        render(<Jobspage />);
        expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
        expect(sessionStorage.getItem('selectedJob')).toBeNull();
    } finally { window.location = location; }
});


test('offers Send Job to Inspector after assigning an inspector', () => {
    render(<Jobspage />);
    expect(screen.queryByRole('button', { name: 'Send Job to Inspector' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Assign Inspector' }));
    fireEvent.change(screen.getByLabelText('Assign inspector'), { target: { value: 'Alex Morgan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign inspector' }));
    expect(screen.getByRole('button', { name: 'Send Job to Inspector' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Assign inspector'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign inspector' }));
    expect(screen.queryByRole('button', { name: 'Send Job to Inspector' })).not.toBeInTheDocument();
});


test('restores previously submitted jobs to the original status without a dropdown', () => {
    sessionStorage.setItem('availableJobs', JSON.stringify([{ id: 1, name: 'Test job', status: 'Submitted to Client', inspector: 'Alex Morgan', isCreatedJob: true }]));
    render(<Jobspage />);
    expect(screen.queryByLabelText('Job Status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('Assigned');
});

test('uploads an image with a new item and persists its image reference', async () => {
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Forklift photo' } });
    const file = new File(['image'], 'forklift.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Item image'), { target: { files: [file] } });
    expect(screen.getByAltText('Selected item')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await screen.findByText('Forklift photo');
    expect(saveItemImage).toHaveBeenCalledWith('job-1-item-new-item-id', file);
    expect(JSON.parse(sessionStorage.getItem('jobItems'))['1'][0]).toMatchObject({ imageId: 'job-1-item-new-item-id', imageName: 'forklift.png' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('rejects non-image attachments', () => {
    render(<Jobspage />);
    fireEvent.click(screen.getByRole('button', { name: 'Items' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
    fireEvent.change(screen.getByLabelText('Item image'), { target: { files: [new File(['pdf'], 'file.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a PNG');
    expect(screen.queryByAltText('Selected item')).not.toBeInTheDocument();
});