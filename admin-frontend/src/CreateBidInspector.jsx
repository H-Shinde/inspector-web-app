import { useState } from 'react';
import { createPortal } from 'react-dom';
import InspectorDialog from './InspectorDialog';
export default function CreateBidInspector({ disabled, onCreated }) {
    const [open, setOpen] = useState(false);
    return <><button type="button" className="bid_back_button" disabled={disabled} onClick={() => setOpen(true)}>+ Add Inspector</button>
        {open && createPortal(<InspectorDialog onClose={() => setOpen(false)} onSaved={(inspector) => { setOpen(false); onCreated(inspector); }} />, document.body)}
    </>;
}
