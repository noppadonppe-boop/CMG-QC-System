import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const PILLAR_OPTIONS = [
  'ITP / RFI',
  'Material Approval',
  'NCR / Punch List',
  'Handover Documents',
];
const STATUS_OPTIONS = ['Draft', 'Under Review', 'Approved', 'Archived'];

const EMPTY = {
  pillar: 'ITP / RFI', title: '', ref: '',
  date: '', status: 'Draft', description: '', fileLink: '',
};

export default function FinalPackageModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const isEdit = !!item;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <Modal
      title={isEdit ? `Edit Package Item — ${item.ref || item.title}` : 'Add to Final Document Package'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Pillar" required>
            <Select value={form.pillar} onChange={set('pillar')}>
              {PILLAR_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        <FormField label="Document Title" required>
          <Input value={form.title} onChange={set('title')} placeholder="e.g. Foundation ITP & RFI Bundle" required />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Reference No.">
            <Input value={form.ref} onChange={set('ref')} placeholder="PKG-FOUND-001" />
          </FormField>
          <FormField label="Date">
            <Input type="date" value={form.date} onChange={set('date')} />
          </FormField>
        </FormGrid>

        <FormField label="Description">
          <Textarea value={form.description || ''} onChange={set('description')} placeholder="Brief description of what this package contains..." rows={2} />
        </FormField>

        <FormField label="File / Link (URL)">
          <Input value={form.fileLink || ''} onChange={set('fileLink')} placeholder="https://drive.google.com/..." />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Add to Package'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
