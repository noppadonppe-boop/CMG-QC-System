import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';

const CATEGORIES = ['Structural', 'Architectural', 'Mechanical', 'Electrical', 'Civil', 'HVAC', 'Plumbing', 'Landscape', 'Other'];
const STATUSES   = ['Approved', 'For Construction', 'For Review', 'As-Built', 'Superseded', 'Void'];

const EMPTY = {
  from: '', transmittalNo: '', transmittalDate: '', byEmail: true,
  category: 'Structural', documentNo: '', documentTitle: '',
  receiveDate: '', rev: 'A', status: 'For Review', drawingLink: '',
};

export default function QcDocModal({ doc, onSave, onClose }) {
  const { selectedProjectId, projects } = useApp();

  // Pre-fill projectNo from the currently selected project when adding
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const EMPTY_WITH_PROJECT = {
    ...EMPTY,
    projectNo: selectedProject?.projectNo || '',
  };

  const [form, setForm] = useState(doc ? { ...doc } : { ...EMPTY_WITH_PROJECT });

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.transmittalNo.trim() || !form.documentNo.trim()) return;
    onSave({ ...form, projectId: selectedProjectId });
  }

  const isEdit = !!doc;

  return (
    <Modal
      title={isEdit ? `Edit Transmittal — ${doc.transmittalNo}` : 'Add Transmittal / Drawing'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={4}>
          <FormField label="Project No." required>
            <Select
              value={form.projectNo || ''}
              onChange={set('projectNo')}
              required
            >
              <option value="" disabled>Select project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.projectNo}>
                  {p.projectNo} — {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Transmittal No." required>
            <Input value={form.transmittalNo} onChange={set('transmittalNo')} placeholder="TR-001" required />
          </FormField>
          <FormField label="Transmittal Date">
            <Input type="date" value={form.transmittalDate} onChange={set('transmittalDate')} />
          </FormField>
          <FormField label="Received From">
            <Input value={form.from} onChange={set('from')} placeholder="Client / Consultant name" />
          </FormField>
        </FormGrid>

        <FormGrid cols={4}>
          <FormField label="Document No." required className="col-span-2">
            <Input value={form.documentNo} onChange={set('documentNo')} placeholder="S-DWG-001" required />
          </FormField>
          <FormField label="Rev.">
            <Input value={form.rev} onChange={set('rev')} placeholder="A" maxLength={4} />
          </FormField>
          <FormField label="Receive Date">
            <Input type="date" value={form.receiveDate} onChange={set('receiveDate')} />
          </FormField>
        </FormGrid>

        <FormField label="Document Title" required>
          <Input value={form.documentTitle} onChange={set('documentTitle')} placeholder="Full drawing / document title" required />
        </FormField>

        <FormGrid cols={3}>
          <FormField label="Category">
            <Select value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Delivery Method">
            <div className="flex items-center gap-4 mt-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="delivery"
                  checked={form.byEmail === true}
                  onChange={() => setForm(f => ({ ...f, byEmail: true }))}
                  className="accent-orange-500"
                />
                By Email
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="delivery"
                  checked={form.byEmail === false}
                  onChange={() => setForm(f => ({ ...f, byEmail: false }))}
                  className="accent-orange-500"
                />
                By Hand
              </label>
            </div>
          </FormField>
        </FormGrid>

        <FormField label="Drawing Link (URL)">
          <Input
            type="url"
            value={form.drawingLink}
            onChange={set('drawingLink')}
            placeholder="https://drive.google.com/..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add Document'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
