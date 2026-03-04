import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];

export default function RfiStage3Modal({ rfi, onSave, onClose }) {
  const [form, setForm] = useState({
    inspectionDate:  rfi.inspectionDate  || '',
    result:          rfi.result          || '',
    stage3Note:      rfi.stage3Note      || '',
    stage3Attachment:rfi.stage3Attachment|| '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.inspectionDate || !form.result) return;
    onSave(form);
  }

  return (
    <Modal
      title={`Onsite Inspection — Stage 3 (${rfi.rfiNo})`}
      onClose={onClose}
      size="md"
    >
      {/* Context banner */}
      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S3</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-purple-800">Inspection Onsite — Site QC Inspector</div>
          <div className="text-[11px] text-purple-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-purple-500 mt-0.5 truncate">
            {rfi.location} · {rfi.area}
          </div>
          {rfi.inspectionScheduleDate && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Scheduled: {rfi.inspectionScheduleDate} {rfi.inspectionScheduleTime}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stage 2 summary (read-only context) */}
      {rfi.descriptionOfInspection && (
        <div className="mb-5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inspection Scope (from Stage 2)</div>
          <div className="text-xs text-slate-600">{rfi.descriptionOfInspection}</div>
          {rfi.stage2Note && (
            <div className="text-[11px] text-slate-500 mt-1.5 italic">Note: {rfi.stage2Note}</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Inspection Date" required>
            <Input
              type="date"
              value={form.inspectionDate}
              onChange={set('inspectionDate')}
              required
            />
          </FormField>
          <FormField label="Inspection Result" required>
            <Select value={form.result} onChange={set('result')} required>
              <option value="">— Select Result —</option>
              {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {/* Result visual indicator */}
        {form.result && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
            form.result === 'Pass'              ? 'bg-green-50  border-green-200  text-green-700' :
            form.result === 'Reject'            ? 'bg-red-50    border-red-200    text-red-700'   :
            form.result === 'Comment'           ? 'bg-amber-50  border-amber-200  text-amber-700' :
            form.result === 'Pass with comment' ? 'bg-teal-50   border-teal-200   text-teal-700'  :
            'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-base">
              {form.result === 'Pass'              ? '✅' :
               form.result === 'Reject'            ? '❌' :
               form.result === 'Comment'           ? '💬' :
               form.result === 'Pass with comment' ? '✔️' : ''}
            </span>
            Result: <span className="font-bold">{form.result}</span>
          </div>
        )}

        <FormField label="Note / Inspection Findings">
          <Textarea
            value={form.stage3Note}
            onChange={set('stage3Note')}
            placeholder="Describe findings, observations, non-conformances if any..."
            rows={4}
          />
        </FormField>

        <FormField label="Attachment Photo / File (URL)">
          <Input
            value={form.stage3Attachment}
            onChange={set('stage3Attachment')}
            placeholder="https://drive.google.com/... or photo link"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.result}
            className="px-6 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Submit Inspection →
          </button>
        </div>
      </form>
    </Modal>
  );
}
