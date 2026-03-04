import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Closed'];

const EMPTY = {
  areaName: '', handoverDate: '', status: 'Pending',
  docPackageRef: '', note: '', handoverTo: '', receivedBy: '',
};

export default function HandoverModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const isEdit = !!item;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.areaName.trim()) return;
    onSave(form);
  }

  const statusStyle = {
    'Pending':     'bg-slate-50  border-slate-300  text-slate-600',
    'In Progress': 'bg-amber-50  border-amber-300  text-amber-700',
    'Closed':      'bg-green-50  border-green-300  text-green-700',
  };
  const statusEmoji = { 'Pending': '📋', 'In Progress': '🔄', 'Closed': '🔒' };

  return (
    <Modal
      title={isEdit ? `Edit Handover — ${item.areaName}` : 'Create Area Handover Record'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Area Name" required>
            <Input value={form.areaName} onChange={set('areaName')} placeholder="Foundation Zone A / Level 1 Lobby" required />
          </FormField>
          <FormField label="Handover Date">
            <Input type="date" value={form.handoverDate} onChange={set('handoverDate')} />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Handover To (Client Rep.)">
            <Input value={form.handoverTo || ''} onChange={set('handoverTo')} placeholder="Client representative name" />
          </FormField>
          <FormField label="Received By">
            <Input value={form.receivedBy || ''} onChange={set('receivedBy')} placeholder="Signature / name" />
          </FormField>
        </FormGrid>

        <FormField label="Document Package Ref.">
          <Input value={form.docPackageRef} onChange={set('docPackageRef')} placeholder="PKG-FOUND-001" />
        </FormField>

        <FormField label="Handover Status">
          <div className="grid grid-cols-3 gap-3 mt-1">
            {STATUS_OPTIONS.map(s => (
              <label key={s} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${form.status === s ? statusStyle[s] : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <input type="radio" name="hoStatus" value={s} checked={form.status === s} onChange={set('status')} className="hidden" />
                <span>{statusEmoji[s]}</span> {s}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Note / Conditions">
          <Textarea value={form.note} onChange={set('note')} placeholder="Conditions of handover, outstanding items, client feedback..." rows={3} />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Create Handover'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
