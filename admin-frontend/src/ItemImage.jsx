import { useEffect, useState } from 'react';
import { readItemImage } from './itemImages';

export default function ItemImage({ item }) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState(false);
    useEffect(() => {
        let active = true;
        let objectUrl;
        setUrl(''); setError(false);
        if (item.imageId) readItemImage(item.imageId).then((blob) => {
            if (!active) return;
            if (!blob) { setError(true); return; }
            objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
        }).catch(() => { if (active) setError(true); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [item.imageId]);
    if (!item.imageId && !item.photos?.length) return null;
    return <div className="job_item_photo">
        {!!item.photos?.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {item.photos.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" aria-label={`View photo of ${item.name}`}>
                <img src={photo.url} loading="lazy" alt={`${item.name}: ${photo.name || 'Inspection photo'}`} style={{ width: 180, height: 150, objectFit: 'cover', borderRadius: 8 }} />
            </a>)}
        </div>}{url && <img src={url} alt={`Item: ${item.name}`} />}{error && <p>Unable to load the saved item image.</p>}</div>;
}
