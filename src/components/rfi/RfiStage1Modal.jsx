import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';

const INSPECTION_TYPES = [
  'Concrete Pour', 'Rebar Inspection', 'Steel Erection', 'Pile Driving',
  'Foundation Check', 'Waterproofing', 'MEP Rough-in', 'Masonry',
  'Roofing', 'Facade / Curtain Wall', 'Final Inspection', 'Other',
];

const STATUS_OPTIONS = ['Pending', 'Pass', 'Reject', 'Comment', 'Pass with comment'];

const EMPTY = {
  requestNo: '', rfiNo: '',
  requestDateInternal: '', requestTimeInternal: '',
  requestDateOwner: '', requestTimeOwner: '',
  typeOfInspection: 'Concrete Pour',
  location: '', area: '',
  detailInspection: '', workingStep: '', referDrawing: '',
  requestedBy: '', inspectedBy: '',
  attachmentDoc: '',
  statusInsp: 'Pending', statusDoc: 'Pending',
  dueDate: '',
  concretePourDate: '', brand: '', cementBillLink: '',
  status7Day: '', status28Day: '',
  steelTestResult: '', soilTestResult: '',
};

export default function RfiStage1Modal({ rfi, onSave, onClose }) {
  const { currentUser, selectedProject } = useApp();
  const [form, setForm] = useState(rfi ? { ...rfi } : {
    ...EMPTY,
    requestedBy: currentUser.name,
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.requestNo.trim() || !form.rfiNo.trim()) return;
    onSave(form);
  }

  const isEdit = !!rfi;

  return (
    <Modal
      title={isEdit ? `Edit RFI Request — ${rfi.rfiNo}` : 'Create RFI Request (Stage 1)'}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section: Identification ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identification</h3>
          </div>
          <FormGrid cols={4}>
            <FormField label="Request No." required>
              <Input value={form.requestNo} onChange={set('requestNo')} placeholder="REQ-001" required />
            </FormField>
            <FormField label="RFI No." required>
              <Input value={form.rfiNo} onChange={set('rfiNo')} placeholder="RFI-2024-001" required />
            </FormField>
            <FormField label="Type of Inspection">
              <Select value={form.typeOfInspection} onChange={set('typeOfInspection')}>
                {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Due Date">
              <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Request Dates ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Request Dates & Times</h3>
          </div>
          <FormGrid cols={4}>
            <FormField label="Request Date (Internal)">
              <Input type="date" value={form.requestDateInternal} onChange={set('requestDateInternal')} />
            </FormField>
            <FormField label="Request Time (Internal)">
              <Input type="time" value={form.requestTimeInternal} onChange={set('requestTimeInternal')} />
            </FormField>
            <FormField label="Request Date (with Owner)">
              <Input type="date" value={form.requestDateOwner} onChange={set('requestDateOwner')} />
            </FormField>
            <FormField label="Request Time (with Owner)">
              <Input type="time" value={form.requestTimeOwner} onChange={set('requestTimeOwner')} />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Location & Detail ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Location & Inspection Detail</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="Location">
              <Input value={form.location} onChange={set('location')} placeholder="Grid A / Level 1" />
            </FormField>
            <FormField label="Area">
              <Input value={form.area} onChange={set('area')} placeholder="Foundation / Superstructure" />
            </FormField>
            <FormField label="Working Step & Structure Type">
              <Input value={form.workingStep} onChange={set('workingStep')} placeholder="Rebar & Formwork" />
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField label="Detail of Inspection">
              <Textarea value={form.detailInspection} onChange={set('detailInspection')} placeholder="Describe the scope of this inspection..." rows={3} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Refer Drawing">
              <Input value={form.referDrawing} onChange={set('referDrawing')} placeholder="S-DWG-001 Rev B" />
            </FormField>
          </div>
        </div>

        {/* ── Section: Personnel ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Personnel</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="QC Doc Requested By">
              <Input value={form.requestedBy} onChange={set('requestedBy')} placeholder="Name" />
            </FormField>
            <FormField label="QC Inspector Inspected By">
              <Input value={form.inspectedBy} onChange={set('inspectedBy')} placeholder="Name" />
            </FormField>
            <FormField label="Attachment Document">
              <Input value={form.attachmentDoc} onChange={set('attachmentDoc')} placeholder="https://..." />
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Status ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</h3>
          </div>
          <FormGrid cols={2}>
            <FormField label="Status Inspection">
              <Select value={form.statusInsp} onChange={set('statusInsp')}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Status Document">
              <Select value={form.statusDoc} onChange={set('statusDoc')}>
                {['Pending', 'Complete', 'Waiting Approve', 'Close'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
          </FormGrid>
        </div>

        {/* ── Section: Concrete / Test (conditional section, always shown) ── */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">6</div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</h3>
          </div>
          <FormGrid cols={3}>
            <FormField label="วันที่เทคอนกรีต">
              <Input type="date" value={form.concretePourDate} onChange={set('concretePourDate')} />
            </FormField>
            <FormField label="BRAND (ปูนซีเมนต์)">
              <Input value={form.brand} onChange={set('brand')} placeholder="TPI / SCG..." />
            </FormField>
            <FormField label="แนบลิงค์บิลปูน">
              <Input value={form.cementBillLink} onChange={set('cementBillLink')} placeholder="https://..." />
            </FormField>
          </FormGrid>
          <FormGrid cols={4} className="mt-4">
            <FormField label="Status 7 Day">
              <Select value={form.status7Day} onChange={set('status7Day')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="Status 28 Day">
              <Select value={form.status28Day} onChange={set('status28Day')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="ผลเทสเหล็ก">
              <Select value={form.steelTestResult} onChange={set('steelTestResult')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
              </Select>
            </FormField>
            <FormField label="ผลเทสดิน">
              <Select value={form.soilTestResult} onChange={set('soilTestResult')}>
                <option value="">—</option>
                <option>Pass</option><option>Fail</option><option>N/A</option><option>Pending</option>
              </Select>
            </FormField>
          </FormGrid>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-6 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            {isEdit ? 'Save Changes' : 'Create RFI Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
