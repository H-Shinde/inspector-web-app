import { useEffect, useRef, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import './Tablefilter.css';

// Reusable filter icon + panel for a DataTables table (works for Bids and Jobs).
// tableRef: ref given to <DataTable ref={...} />
// columns:  [{ index, label, options? }]  index = column position in the DataTable `columns` array;
//           pass `options` (array of strings) to render a dropdown instead of a text box.
function TableFilter({ tableRef, columns }) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState({});
    const wrapper = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'mousedown' && wrapper.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    const applyFilter = (column, value) => {
        const dt = tableRef.current?.dt();
        if (!dt) return;
        if (column.options) dt.column(column.index).search(value ? `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` : '', true, false);
        else dt.column(column.index).search(value, false, true);
        dt.draw();
    };

    const changeFilter = (column, value) => {
        setValues((current) => ({ ...current, [column.index]: value }));
        applyFilter(column, value);
    };

    const clearAll = () => {
        columns.forEach((column) => applyFilter(column, ''));
        setValues({});
    };

    const activeCount = Object.values(values).filter(Boolean).length;

    return (
        <div className="table_filter" ref={wrapper}>
            <button type="button" className={`table_filter_button${activeCount ? ' active' : ''}`}
                aria-label="Filter table" aria-expanded={open} aria-haspopup="true" title="Filter"
                onClick={() => setOpen(!open)}>
                <FaFilter aria-hidden="true" />
                {activeCount > 0 && <span className="table_filter_count" aria-label={`${activeCount} active filters`}>{activeCount}</span>}
            </button>
            {open && (
                <div className="table_filter_panel" role="group" aria-label="Filter by column">
                    {columns.map((column) => (
                        <div className="table_filter_field" key={column.index}>
                            <label htmlFor={`table-filter-${column.index}`}>{column.label}</label>
                            {column.options ? (
                                <select id={`table-filter-${column.index}`} value={values[column.index] ?? ''}
                                    onChange={(event) => changeFilter(column, event.target.value)}>
                                    <option value="">All</option>
                                    {column.options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            ) : (
                                <input id={`table-filter-${column.index}`} type="text" placeholder={`Filter ${column.label.toLowerCase()}`}
                                    value={values[column.index] ?? ''} onChange={(event) => changeFilter(column, event.target.value)} />
                            )}
                        </div>
                    ))}
                    <button type="button" className="table_filter_clear" disabled={!activeCount} onClick={clearAll}>Clear filters</button>
                </div>
            )}
        </div>
    );
}

export default TableFilter;