import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];
const STATUS_OPTIONS = ['Complete document', 'Waiting approve', 'Close'];

export default function RfiStage4Modal({ rfi, onSave, onClose }) {
  const [form, setForm] = useState({
    stage4Result:     rfi.stage4Result     || rfi.result || '',
    stage4Note:       rfi.stage4Note       || '',
    stage4Status:     rfi.stage4Status     || 'Waiting approve',
    stage4Attachment: rfi.stage4Attachment || rfi.stage3Attachment || '',
    inspectionDate:   rfi.inspectionDate   || '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.stage4Result || !form.stage4Status) return;
    onSave(form);
  }

  const resultStyle = {
    'Pass':              'bg-green-50  border-green-200  text-green-700',
    'Reject':            'bg-red-50    border-red-200    text-red-700',
    'Comment':           'bg-amber-50  border-amber-200  text-amber-700',
    'Pass with comment': 'bg-teal-50   border-teal-200   text-teal-700',
  };

  return (
    <Modal
      title={`Complete Document — Stage 4 (${rfi.rfiNo})`}
      onClose={onClose}
      size="lg"
    >
      {/* Context banner */}
      <div className="mb-5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S4</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-green-800">Complete Document — QC Doc Center</div>
          <div className="text-[11px] text-green-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-green-500 mt-0.5 truncate">
            {rfi.location} · {rfi.area}
          </div>
        </div>
      </div>

      {/* Stage 3 result summary (read-only) */}
      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
        <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Stage 3 Inspection Result (Reference)</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Inspection Date</div>
            <div className="text-xs text-purple-800 font-medium mt-0.5">{rfi.inspectionDate || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Onsite Result</div>
            <div className="mt-0.5">
              {rfi.result ? (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${resultStyle[rfi.result] || 'bg-slate-100 text-slate-600'}`}>
                  {rfi.result}
                </span>
              ) : <span className="text-xs text-purple-400">Not yet filled</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-purple-400 font-semibold">Inspector Note</div>
            <div className="text-[11px] text-purple-700 mt-0.5 line-clamp-2">{rfi.stage3Note || '—'}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Inspection Date (Confirm)" required>
            <Input
              type="date"
              value={form.inspectionDate}
              onChange={set('inspectionDate')}
            />
          </FormField>
          <FormField label="Final Result" required>
            <Select value={form.stage4Result} onChange={set('stage4Result')} required>
              <option value="">— Select Final Result —</option>
              {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {/* Result visual */}
        {form.stage4Result && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${resultStyle[form.stage4Result] || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <span className="text-base">
              {form.stage4Result === 'Pass'              ? '✅' :
               form.stage4Result === 'Reject'            ? '❌' :
               form.stage4Result === 'Comment'           ? '💬' :
               form.stage4Result === 'Pass with comment' ? '✔️' : ''}
            </span>
            Final Result: <span className="font-bold">{form.stage4Result}</span>
          </div>
        )}

        <FormField label="Document Completion Status" required>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {STATUS_OPTIONS.map(s => (
              <label
                key={s}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                  form.stage4Status === s
                    ? s === 'Close'
                      ? 'bg-green-500 border-green-500 text-white shadow-md'
                      : s === 'Complete document'
                      ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                      : 'bg-amber-400 border-amber-400 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="stage4Status"
                  value={s}
                  checked={form.stage4Status === s}
                  onChange={set('stage4Status')}
                  className="hidden"
                />
                <span className="text-sm">
                  {s === 'Close' ? '🔒' : s === 'Complete document' ? '📄' : '⏳'}
                </span>
                {s}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Note / Document Comments">
          <Textarea
            value={form.stage4Note}
            onChange={set('stage4Note')}
            placeholder="Final remarks, conditions, document filing instructions..."
            rows={3}
          />
        </FormField>

        <FormField label="Attachment Photo / File (URL)">
          <Input
            value={form.stage4Attachment}
            onChange={set('stage4Attachment')}
            placeholder="https://drive.google.com/..."
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.stage4Result || !form.stage4Status}
            className="px-6 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Complete Document ✓
          </button>
        </div>
      </form>
    </Modal>
  );
}
