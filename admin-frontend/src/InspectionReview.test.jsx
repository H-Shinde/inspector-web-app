import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import InspectionReview from './InspectionReview';

const job = { id: 1, status: 'Pending Review', reviewNotes: '', inspectionParts: [{ id: 'desk', name: 'Desk', serial: '123' }] };
test('only feedback controls are shown and require a description', async () => {
    const request = jest.fn().mockResolvedValue({});
    render(<InspectionReview job={job} onRequestChanges={request} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Review')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Describe the changes');
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Changes needed'), { target: { value: ' Correct the serial. ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(request).toHaveBeenCalledWith('Correct the serial.');
});
test('returned and archived jobs show feedback without review controls', () => {
    render(<InspectionReview job={{ ...job, status: 'Needs Changes', reviewNotes: 'Check the serial.' }} onRequestChanges={jest.fn()} />);
    expect(screen.getByText(/Check the serial/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
});
