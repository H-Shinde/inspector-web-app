import { render, screen } from '@testing-library/react';
import ItemImage from './ItemImage';
import { readItemImage } from './itemImages';
jest.mock('./itemImages', () => ({ readItemImage: jest.fn() }));

beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:stored-photo');
    URL.revokeObjectURL = jest.fn();
});

test('loads a saved item image and releases the preview when closed', async () => {
    readItemImage.mockResolvedValue(new Blob(['photo'], { type: 'image/png' }));
    const { unmount } = render(<ItemImage item={{ name: 'Forklift', imageId: 'job-1-item-1' }} />);
    expect(await screen.findByAltText('Item: Forklift')).toHaveAttribute('src', 'blob:stored-photo');
    expect(readItemImage).toHaveBeenCalledWith('job-1-item-1');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stored-photo');
});

test('shows a useful message when the stored image is unavailable', async () => {
    readItemImage.mockResolvedValue(undefined);
    render(<ItemImage item={{ name: 'Forklift', imageId: 'missing' }} />);
    expect(await screen.findByText('Unable to load the saved item image.')).toBeInTheDocument();
});
