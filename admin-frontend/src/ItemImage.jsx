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
    if (!item.imageId) return null;
    return <div className="job_item_photo">{url && <img src={url} alt={`Item: ${item.name}`} />}{error && <p>Unable to load the saved item image.</p>}</div>;
}
