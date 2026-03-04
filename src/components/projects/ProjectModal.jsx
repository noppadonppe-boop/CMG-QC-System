import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const EMPTY = {
  projectNo: '', name: '', location: '', pm: '', cm: '',
  startDate: '', finishDate: '', mainContractor: '', subContractor: '',
  clientName: '', note: '', status: 'Active',
};

export default function ProjectModal({ project, onSave, onClose }) {
  const [form, setForm] = useState(project ? { ...project } : { ...EMPTY });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.projectNo.trim() || !form.name.trim()) return;
    onSave(form);
  }

  const isEdit = !!project;

  return (
    <Modal
      title={isEdit ? `Edit Project — ${project.projectNo}` : 'Add New Project'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={3}>
          <FormField label="Project No." required>
            <Input value={form.projectNo} onChange={set('projectNo')} placeholder="CMG-2024-XXX" required />
          </FormField>
          <FormField label="Project Name" required className="col-span-2">
            <Input value={form.name} onChange={set('name')} placeholder="Project display name" required />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Location" required>
            <Input value={form.location} onChange={set('location')} placeholder="City / Province" required />
          </FormField>
          <FormField label="Client Name">
            <Input value={form.clientName} onChange={set('clientName')} placeholder="Client company name" />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Project Manager (PM)">
            <Input value={form.pm} onChange={set('pm')} placeholder="Full name" />
          </FormField>
          <FormField label="Construction Manager (CM)">
            <Input value={form.cm} onChange={set('cm')} placeholder="Full name" />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField label="Main Contractor">
            <Input value={form.mainContractor} onChange={set('mainContractor')} placeholder="Company name" />
          </FormField>
          <FormField label="Sub-Contractor">
            <Input value={form.subContractor} onChange={set('subContractor')} placeholder="Company name" />
          </FormField>
        </FormGrid>

        <FormGrid cols={3}>
          <FormField label="Project Start">
            <Input type="date" value={form.startDate} onChange={set('startDate')} />
          </FormField>
          <FormField label="Project Finish">
            <Input type="date" value={form.finishDate} onChange={set('finishDate')} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="Active">Active</option>
              <option value="Handover">Handover</option>
              <option value="Closed">Closed</option>
              <option value="On Hold">On Hold</option>
            </Select>
          </FormField>
        </FormGrid>

        <FormField label="Project Note">
          <Textarea value={form.note} onChange={set('note')} placeholder="Any additional notes..." rows={2} />
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
            {isEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
