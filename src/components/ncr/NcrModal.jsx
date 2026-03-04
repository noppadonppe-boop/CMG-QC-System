import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const TYPE_OPTIONS   = ['Internal NCR', 'External NCR'];
const STATUS_OPTIONS = ['Open', 'In Progress', 'With Comment', 'Reject', 'Close'];
const CATEGORY_OPTIONS = ['Civil / Structural', 'Architectural', 'Mechanical', 'Electrical', 'HVAC', 'Sanitary', 'Safety', 'Quality', 'Other'];

const EMPTY = {
  ncrNo: '', issueDate: '', type: 'Internal NCR', category: 'Civil / Structural',
  description: '', location: '', raisedBy: '', assignedTo: '',
  rootCause: '', actionToClose: '', attDocument: '',
  closedDate: '', closedBy: '', status: 'Open',
};

export default function NcrModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.ncrNo.trim() || !form.type) return;
    onSave(form);
  }

  const isEdit = !!item;

  const statusStyle = {
    'Open':         'bg-red-50    border-red-300    text-red-700',
    'In Progress':  'bg-amber-50  border-amber-300  text-amber-700',
    'With Comment': 'bg-blue-50   border-blue-300   text-blue-700',
    'Reject':       'bg-rose-50   border-rose-300   text-rose-700',
    'Close':        'bg-green-50  border-green-300  text-green-700',
  };

  return (
    <Modal
      title={isEdit ? `Edit NCR — ${item.ncrNo}` : 'Raise NCR (Non-Conformance Report)'}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: NCR Identification ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">NCR Identification</h3>
          </div>
          <FormGrid cols={4}>
            <FormField label="NCR No." required>
              <Input value={form.ncrNo} onChange={set('ncrNo')} placeholder="NCR-2024-001" required />
            </FormField>
            <FormField label="Issue Date">
              <Input type="date" value={form.issueDate || ''} onChange={set('issueDate')} />
            </FormField>
            <FormField label="NCR Type">
              <Select value={form.type} onChange={set('type')}>
                {TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </Select>
            </FormField>
            <FormField label="Category">
              <Select value={form.category || 'Civil / Structural'} onChange={set('category')}>
                {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </Select>
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section 2: Non-Conformance Detail ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Non-Conformance Detail</h3>
          </div>
          <FormField label="Description of Non-Conformance">
            <Textarea
              value={form.description || ''}
              onChange={set('description')}
              placeholder="Describe the non-conformance clearly..."
              rows={3}
            />
          </FormField>
          <FormGrid cols={2} className="mt-4">
            <FormField label="Location / Area">
              <Input value={form.location || ''} onChange={set('location')} placeholder="Grid C5 / Level 2" />
            </FormField>
            <FormField label="Attachment Document (URL)">
              <Input value={form.attDocument} onChange={set('attDocument')} placeholder="https://drive.google.com/..." />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section 3: Responsibility ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Responsibility</h3>
          </div>
          <FormGrid cols={2}>
            <FormField label="Raised By">
              <Input value={form.raisedBy || ''} onChange={set('raisedBy')} placeholder="Name / Department" />
            </FormField>
            <FormField label="Assigned To">
              <Input value={form.assignedTo} onChange={set('assignedTo')} placeholder="Subcontractor / Team / Person" />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section 4: Corrective Action ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Root Cause & Corrective Action</h3>
          </div>
          <FormField label="Root Cause Analysis">
            <Textarea
              value={form.rootCause || ''}
              onChange={set('rootCause')}
              placeholder="Describe the root cause of the non-conformance..."
              rows={2}
            />
          </FormField>
          <div className="mt-4">
            <FormField label="Action to Close NCR">
              <Textarea
                value={form.actionToClose}
                onChange={set('actionToClose')}
                placeholder="Describe corrective / preventive actions required to close this NCR..."
                rows={3}
              />
            </FormField>
          </div>
        </div>

        {/* ── Section 5: Status & Closure ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status & Closure</h3>
          </div>

          {/* Status radio cards */}
          <FormField label="NCR Status">
            <div className="grid grid-cols-5 gap-2 mt-1">
              {STATUS_OPTIONS.map(s => (
                <label
                  key={s}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-[11px] font-bold text-center ${
                    form.status === s
                      ? statusStyle[s]
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="ncrStatus"
                    value={s}
                    checked={form.status === s}
                    onChange={set('status')}
                    className="hidden"
                  />
                  <span className="text-base">
                    {s === 'Open'        ? '🔴' :
                     s === 'In Progress' ? '🟡' :
                     s === 'With Comment'? '💬' :
                     s === 'Reject'      ? '❌' :
                     s === 'Close'       ? '🔒' : ''}
                  </span>
                  {s}
                </label>
              ))}
            </div>
          </FormField>

          {form.status === 'Close' && (
            <FormGrid cols={2} className="mt-4">
              <FormField label="Closed Date">
                <Input type="date" value={form.closedDate || ''} onChange={set('closedDate')} />
              </FormField>
              <FormField label="Closed By">
                <Input value={form.closedBy || ''} onChange={set('closedBy')} placeholder="Name" />
              </FormField>
            </FormGrid>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Raise NCR'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
