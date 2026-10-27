import { useEffect, useState } from 'react';
import { getBidSettings } from './bidSettingsApi';
export default function useBidSettings() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        getBidSettings(controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
            .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [attempt]);
    return { data, setData, loading, error, retry: () => setAttempt((value) => value + 1) };
}
