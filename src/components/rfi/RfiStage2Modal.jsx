import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Textarea, FormGrid } from '../common/FormField';

export default function RfiStage2Modal({ rfi, onSave, onClose }) {
  const [form, setForm] = useState({
    issueDate:               rfi.issueDate               || '',
    descriptionOfInspection: rfi.descriptionOfInspection || '',
    inspectionPackage:       rfi.inspectionPackage       || '',
    inspectionScheduleDate:  rfi.inspectionScheduleDate  || '',
    inspectionScheduleTime:  rfi.inspectionScheduleTime  || '',
    stage2Note:              rfi.stage2Note              || '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.issueDate) return;
    onSave(form);
  }

  return (
    <Modal
      title={`Issue RFI to Client — Stage 2 (${rfi.rfiNo})`}
      onClose={onClose}
      size="lg"
    >
      {/* Stage context banner */}
      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S2</span>
        </div>
        <div>
          <div className="text-xs font-bold text-blue-800">Issue RFI to Client / Owner</div>
          <div className="text-[11px] text-blue-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection} · {rfi.location}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Issue Date" required>
            <Input type="date" value={form.issueDate} onChange={set('issueDate')} required />
          </FormField>
          <FormField label="Inspection Package Ref.">
            <Input value={form.inspectionPackage} onChange={set('inspectionPackage')} placeholder="PKG-FOUND-001" />
          </FormField>
        </FormGrid>

        <FormField label="Description of Inspection">
          <Textarea
            value={form.descriptionOfInspection}
            onChange={set('descriptionOfInspection')}
            placeholder="Describe the inspection scope as communicated to the client..."
            rows={3}
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="Inspection Schedule Date">
            <Input type="date" value={form.inspectionScheduleDate} onChange={set('inspectionScheduleDate')} />
          </FormField>
          <FormField label="Inspection Schedule Time">
            <Input type="time" value={form.inspectionScheduleTime} onChange={set('inspectionScheduleTime')} />
          </FormField>
        </FormGrid>

        <FormField label="Note">
          <Textarea
            value={form.stage2Note}
            onChange={set('stage2Note')}
            placeholder="Any additional instructions or notes for the inspector..."
            rows={2}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            Issue to Client →
          </button>
        </div>
      </form>
    </Modal>
  );
}
