import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const CATEGORY_OPTIONS = ['A', 'B', 'C', 'D'];
const CATEGORY_DESC = { A: 'Safety / Critical', B: 'Major Defect', C: 'Minor Defect', D: 'Cosmetic / Snag' };
const STATUS_OPTIONS = ['ongoing', 'close', 'hold'];

const EMPTY = {
  punchNo: '', description: '', categoryLegend: 'B',
  location: '', area: '', openDate: '', openPhoto: '',
  inspectionDate: '', inspectionStatus: 'ongoing', note: '',
};

export default function PunchModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const isEdit = !!item;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.punchNo.trim() || !form.description.trim()) return;
    onSave(form);
  }

  const statusStyle = {
    ongoing: 'bg-amber-50  border-amber-300  text-amber-700',
    close:   'bg-green-50  border-green-300  text-green-700',
    hold:    'bg-slate-50  border-slate-300  text-slate-600',
  };
  const statusEmoji = { ongoing: '🔧', close: '✅', hold: '⏸' };

  const catColors = { A: 'border-red-400 bg-red-50 text-red-700', B: 'border-orange-400 bg-orange-50 text-orange-700', C: 'border-yellow-400 bg-yellow-50 text-yellow-700', D: 'border-slate-400 bg-slate-50 text-slate-600' };

  return (
    <Modal
      title={isEdit ? `Edit Punch Item — ${item.punchNo}` : 'Add Punch List Item'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Section 1: Identification */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identification</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="Punch No." required>
              <Input value={form.punchNo} onChange={set('punchNo')} placeholder="PL-2024-001" required />
            </FormField>
            <FormField label="Open Date">
              <Input type="date" value={form.openDate} onChange={set('openDate')} />
            </FormField>
            <FormField label="Category Legend" required>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {CATEGORY_OPTIONS.map(c => (
                  <label key={c} className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${form.categoryLegend === c ? catColors[c] : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    <input type="radio" name="cat" value={c} checked={form.categoryLegend === c} onChange={set('categoryLegend')} className="hidden" />
                    <span className="text-sm font-extrabold">{c}</span>
                    <span className="text-[9px] font-medium text-center leading-tight">{CATEGORY_DESC[c]}</span>
                  </label>
                ))}
              </div>
            </FormField>
          </FormGrid>
        </div>

        {/* Section 2: Detail */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Defect Detail</h3>
          </div>
          <FormField label="Description of Defect" required>
            <Textarea value={form.description} onChange={set('description')} placeholder="Describe the defect or punch item clearly..." rows={2} required />
          </FormField>
          <FormGrid cols={2} className="mt-4">
            <FormField label="Location">
              <Input value={form.location} onChange={set('location')} placeholder="Grid C5 / Level 2" />
            </FormField>
            <FormField label="Area">
              <Input value={form.area || ''} onChange={set('area')} placeholder="Lobby / Zone A / Foundation" />
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField label="Open Photo / Attachment (URL)">
              <Input value={form.openPhoto} onChange={set('openPhoto')} placeholder="https://drive.google.com/..." />
            </FormField>
          </div>
        </div>

        {/* Section 3: Inspection & Status */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inspection & Status</h3>
          </div>
          <FormGrid cols={2}>
            <FormField label="Inspection Date">
              <Input type="date" value={form.inspectionDate} onChange={set('inspectionDate')} />
            </FormField>
            <FormField label="Inspection Status">
              <div className="grid grid-cols-3 gap-2 mt-1">
                {STATUS_OPTIONS.map(s => (
                  <label key={s} className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold capitalize ${form.inspectionStatus === s ? statusStyle[s] : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    <input type="radio" name="status" value={s} checked={form.inspectionStatus === s} onChange={set('inspectionStatus')} className="hidden" />
                    <span>{statusEmoji[s]}</span> {s}
                  </label>
                ))}
              </div>
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField label="Note / Remarks">
              <Textarea value={form.note} onChange={set('note')} placeholder="Inspector notes, conditions, follow-up actions..." rows={2} />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Add Punch Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
