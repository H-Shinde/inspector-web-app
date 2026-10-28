import { useEffect, useState } from 'react';
import { listInspectors } from './inspectorApi';
import { setInspectorDirectory } from './inspectorSelection';
export default function useInspectorDirectory(includeInactive = false, zipCode = '') {
    const [inspectors, setInspectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        listInspectors({ includeInactive, zipCode }, controller.signal)
            .then((data) => { if (!controller.signal.aborted) { setInspectors(data.inspectors); setInspectorDirectory(data.inspectors.filter((row) => row.is_active)); } })
            .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [includeInactive, zipCode, attempt]);
    return { inspectors, setInspectors, loading, error, reload: () => setAttempt((value) => value + 1) };
}
