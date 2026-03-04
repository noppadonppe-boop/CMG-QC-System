import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Pending', 'Hold'];
const CATEGORY_OPTIONS = ['Structural Steel', 'Rebar / Bar', 'Cement / Concrete', 'Aggregate', 'Waterproofing', 'Pipe & Fittings', 'Electrical Cable', 'Conduit & Tray', 'Brick / Block', 'Tile / Stone', 'Paint / Coating', 'Sealant / Adhesive', 'Hardware / Fasteners', 'MEP Equipment', 'Other'];

const EMPTY = {
  matRevNo: '', receiveDate: '', description: '', category: 'Structural Steel',
  materialSpecPackage: '', supplier: '', quantity: '', unit: '',
  result: 'Pending', includeTestResult: false, testCertLink: '', noteOfTest: '',
};

export default function MaterialModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.matRevNo.trim() || !form.description.trim()) return;
    onSave(form);
  }

  const isEdit = !!item;

  const resultStyle = {
    'Pass':    'bg-green-50 border-green-300 text-green-700',
    'Reject':  'bg-red-50 border-red-300 text-red-700',
    'Pending': 'bg-slate-50 border-slate-300 text-slate-600',
    'Hold':    'bg-amber-50 border-amber-300 text-amber-700',
  };

  return (
    <Modal
      title={isEdit ? `Edit Material Receive — ${item.matRevNo}` : 'Add Material Receive Record'}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Identification ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identification</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="Mat. Rev. No." required>
              <Input value={form.matRevNo} onChange={set('matRevNo')} placeholder="MR-2024-001" required />
            </FormField>
            <FormField label="Receive Date">
              <Input type="date" value={form.receiveDate} onChange={set('receiveDate')} />
            </FormField>
            <FormField label="Category">
              <Select value={form.category} onChange={set('category')}>
                {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </Select>
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section 2: Material Detail ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Detail</h3>
          </div>
          <FormField label="Description / Material Name" required>
            <Input value={form.description} onChange={set('description')} placeholder="e.g. Deformed Bar DB25 Grade SD50" required />
          </FormField>
          <FormGrid cols={3} className="mt-4">
            <FormField label="Supplier">
              <Input value={form.supplier || ''} onChange={set('supplier')} placeholder="Supplier name" />
            </FormField>
            <FormField label="Quantity">
              <Input type="number" value={form.quantity || ''} onChange={set('quantity')} placeholder="0" min="0" />
            </FormField>
            <FormField label="Unit">
              <Input value={form.unit || ''} onChange={set('unit')} placeholder="Ton / m³ / pcs" />
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField label="Material Spec / Package Ref.">
              <Input value={form.materialSpecPackage} onChange={set('materialSpecPackage')} placeholder="SPEC-STR-001" />
            </FormField>
          </div>
        </div>

        {/* ── Section 3: Test & Result ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test & Approval</h3>
          </div>

          {/* Result radio cards */}
          <FormField label="Result" required>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {RESULT_OPTIONS.map(r => (
                <label
                  key={r}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${
                    form.result === r
                      ? resultStyle[r]
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="matResult"
                    value={r}
                    checked={form.result === r}
                    onChange={set('result')}
                    className="hidden"
                  />
                  <span>
                    {r === 'Pass' ? '✅' : r === 'Reject' ? '❌' : r === 'Hold' ? '⏸' : '⏳'}
                  </span>
                  {r}
                </label>
              ))}
            </div>
          </FormField>

          <div className="mt-4">
            <label className="flex items-center gap-2.5 cursor-pointer w-fit group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                form.includeTestResult
                  ? 'bg-teal-500 border-teal-500'
                  : 'bg-white border-slate-300 group-hover:border-teal-400'
              }`}>
                {form.includeTestResult && <span className="text-white text-[10px]">✓</span>}
              </div>
              <input
                type="checkbox"
                checked={form.includeTestResult}
                onChange={setCheck('includeTestResult')}
                className="hidden"
              />
              <span className="text-xs font-semibold text-slate-700">Include Test Result Document</span>
            </label>
          </div>

          {form.includeTestResult && (
            <div className="mt-3">
              <FormField label="Test Certificate / Link">
                <Input
                  value={form.testCertLink || ''}
                  onChange={set('testCertLink')}
                  placeholder="https://drive.google.com/..."
                />
              </FormField>
            </div>
          )}

          <div className="mt-4">
            <FormField label="Note of Test / Inspection Remarks">
              <Textarea
                value={form.noteOfTest}
                onChange={set('noteOfTest')}
                placeholder="Describe test findings, observations, approvals..."
                rows={3}
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
