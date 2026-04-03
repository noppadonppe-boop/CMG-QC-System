import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { useApp } from '../../context/AppContext';

const RESULT_OPTIONS = [
  'Approved (AP)',
  'Approved with Comments (AC)',
  'Not Approved (NA)',
  'Reviewed with No Comment (RN)',
  'Reviewed with Comments (RC)',
];
const CATEGORY_OPTIONS = ['Structural Steel', 'Rebar / Bar', 'Cement / Concrete', 'Aggregate', 'Waterproofing', 'Pipe & Fittings', 'Electrical Cable', 'Conduit & Tray', 'Brick / Block', 'Tile / Stone', 'Paint / Coating', 'Sealant / Adhesive', 'Hardware / Fasteners', 'MEP Equipment', 'Other'];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildRfiSearchContent(rfi) {
  return [
    rfi.rfiNo,
    rfi.requestNo,
    rfi.typeOfInspection,
    rfi.location,
    rfi.area,
    rfi.detailInspection,
    rfi.workingStep,
    rfi.inspectionPackage,
    rfi.descriptionOfInspection,
    rfi.brand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getRfiDisplayTitle(rfi) {
  return rfi.requestNo || rfi.rfiNo || 'RFI';
}

function ReadonlyField({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xs text-slate-800 break-words">{value || '—'}</div>
    </div>
  );
}

const EMPTY = {
  matRevNo: '', documentNo: '', rev: '', vendorBrand: '', receiveDate: '', description: '', category: 'Structural Steel',
  materialSpecPackage: '', supplier: '', quantity: '', unit: '',
  result: 'Approved (AP)', includeTestResult: false, testCertLink: '', approvedDocLink: '', approveDate: getTodayDate(), noteOfTest: '',
  materialReceived: '', linkedRfiId: '', linkedRfiLabel: '',
};

export default function MaterialModal({ item, onSave, onClose }) {
  const { rfiItems, selectedProjectId } = useApp();
  const [form, setForm] = useState(item ? { ...EMPTY, ...item, approveDate: item.approveDate || getTodayDate() } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setCheck = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));
  const setMaterialReceived = (e) => {
    const value = e.target.value;
    setForm(f => ({
      ...f,
      materialReceived: value,
      linkedRfiId: '',
      linkedRfiLabel: '',
    }));
  };

  const projectRfis = useMemo(
    () => rfiItems.filter(rfi => rfi.projectId === selectedProjectId),
    [rfiItems, selectedProjectId]
  );

  const materialReceivedSuggestions = useMemo(() => {
    const keyword = (form.materialReceived || '').trim().toLowerCase();
    if (!keyword) return [];
    return projectRfis
      .filter(rfi => buildRfiSearchContent(rfi).includes(keyword))
      .slice(0, 8);
  }, [form.materialReceived, projectRfis]);

  const selectedRfi = useMemo(
    () => projectRfis.find(rfi => rfi.id === form.linkedRfiId) || null,
    [projectRfis, form.linkedRfiId]
  );

  function selectRfi(rfi) {
    setForm(f => ({
      ...f,
      materialReceived: getRfiDisplayTitle(rfi),
      linkedRfiId: rfi.id,
      linkedRfiLabel: `${getRfiDisplayTitle(rfi)}${rfi.typeOfInspection ? ` - ${rfi.typeOfInspection}` : ''}`,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!(form.matRevNo || '').trim() || !(form.description || '').trim()) return;
    onSave(form);
  }

  const isEdit = !!item;

  const resultStyle = {
    'Approved (AP)': 'bg-green-50 border-green-300 text-green-700',
    'Approved with Comments (AC)': 'bg-teal-50 border-teal-300 text-teal-700',
    'Not Approved (NA)': 'bg-red-50 border-red-300 text-red-700',
    'Reviewed with No Comment (RN)': 'bg-blue-50 border-blue-300 text-blue-700',
    'Reviewed with Comments (RC)': 'bg-amber-50 border-amber-300 text-amber-700',
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
            <FormField label="Tranmittal No." required>
              <Input value={form.matRevNo} onChange={set('matRevNo')} placeholder="MR-2024-001" required />
            </FormField>
            <FormField label="Document No.">
              <Input value={form.documentNo || ''} onChange={set('documentNo')} placeholder="DOC-001" />
            </FormField>
            <FormField label="Rev.">
              <Input value={form.rev || ''} onChange={set('rev')} placeholder="A / 00 / 01" />
            </FormField>
          </FormGrid>
          <FormGrid cols={3} className="mt-4">
            <FormField label="Vender No. / Brand">
              <Input value={form.vendorBrand || ''} onChange={set('vendorBrand')} placeholder="Vendor code or brand" />
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
            <div className="grid grid-cols-2 gap-2 mt-1 md:grid-cols-4">
              {RESULT_OPTIONS.map(r => (
                <label
                  key={r}
                  className={`flex min-h-[56px] items-center justify-center gap-1.5 px-2 py-2 rounded-xl border cursor-pointer transition-all text-[11px] font-bold text-center leading-tight ${
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
                  <span className="shrink-0">
                    {r === 'Approved (AP)' ? '✅' : r === 'Approved with Comments (AC)' ? '💬' : r === 'Not Approved (NA)' ? '❌' : r === 'Reviewed with No Comment (RN)' ? '📝' : '🗨️'}
                  </span>
                  <span>{r}</span>
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

          <FormGrid cols={2} className="mt-4">
            <FormField label="Approved Document Link">
              <Input
                value={form.approvedDocLink || ''}
                onChange={set('approvedDocLink')}
                placeholder="https://drive.google.com/approved-doc"
              />
            </FormField>
            <FormField label="Approve Date">
              <Input
                type="date"
                value={form.approveDate || getTodayDate()}
                readOnly
              />
            </FormField>
          </FormGrid>

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

        {/* ── Section 4: Material recived ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material recived</h3>
          </div>
          <div className="relative">
            <FormField label="Material recived">
              <Input
                type="text"
                inputMode="numeric"
                value={form.materialReceived || ''}
                onChange={setMaterialReceived}
                placeholder="Type RFI No. / Request No. to search"
              />
            </FormField>

            {!form.linkedRfiId && materialReceivedSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto p-2">
                  {materialReceivedSuggestions.map(rfi => (
                    <button
                      key={rfi.id}
                      type="button"
                      onClick={() => selectRfi(rfi)}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-xs font-semibold text-slate-800">{getRfiDisplayTitle(rfi)}</div>
                      <div className="text-[11px] text-slate-500">
                        {[rfi.typeOfInspection, rfi.location, rfi.area].filter(Boolean).join(' - ') || 'RFI content'}
                      </div>
                      {rfi.detailInspection && (
                        <div className="text-[10px] text-slate-400 truncate">{rfi.detailInspection}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {form.linkedRfiLabel && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-emerald-700">Selected RFI</div>
              <div className="text-xs text-emerald-800">{form.linkedRfiLabel}</div>
            </div>
          )}

          {selectedRfi && (
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="text-sm font-bold text-slate-800">RFI Reference</div>
                  <div className="text-xs text-slate-500">Readonly data from all 4 stages of the selected RFI</div>
                </div>
                <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                  {selectedRfi.rfiNo || selectedRfi.requestNo || 'RFI'}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-600">Stage 1</div>
                  <FormGrid cols={3}>
                    <ReadonlyField label="RFI No." value={selectedRfi.rfiNo} />
                    <ReadonlyField label="Request No." value={selectedRfi.requestNo} />
                    <ReadonlyField label="Type" value={selectedRfi.typeOfInspection} />
                    <ReadonlyField label="Location" value={selectedRfi.location} />
                    <ReadonlyField label="Area" value={selectedRfi.area} />
                    <ReadonlyField label="Issue Date" value={selectedRfi.dueDate} />
                    <ReadonlyField label="Request Date (Internal)" value={selectedRfi.requestDateInternal} />
                    <ReadonlyField label="Request Time (Internal)" value={selectedRfi.requestTimeInternal} />
                    <ReadonlyField label="Request Date (Owner)" value={selectedRfi.requestDateOwner} />
                    <ReadonlyField label="Request Time (Owner)" value={selectedRfi.requestTimeOwner} />
                    <ReadonlyField label="Working Step" value={selectedRfi.workingStep} />
                    <ReadonlyField label="Structure Type" value={selectedRfi.structureType} />
                    <ReadonlyField label="Requested By" value={selectedRfi.requestedBy} />
                    <ReadonlyField label="Inspected By" value={selectedRfi.inspectedBy} />
                    <ReadonlyField label="Detail" value={selectedRfi.detailInspection} />
                  </FormGrid>
                </div>

                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600">Stage 2</div>
                  <FormGrid cols={3}>
                    <ReadonlyField label="Work Step" value={selectedRfi.inspectionPackage} />
                    <ReadonlyField label="Schedule Date" value={selectedRfi.inspectionScheduleDate} />
                    <ReadonlyField label="Schedule Time" value={selectedRfi.inspectionScheduleTime} />
                    <ReadonlyField label="Inspection Scope" value={selectedRfi.descriptionOfInspection} />
                    <ReadonlyField label="Note" value={selectedRfi.stage2Note} />
                    <ReadonlyField label="Email Status" value={selectedRfi.stage2EmailStatus} />
                  </FormGrid>
                </div>

                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-600">Stage 3</div>
                  <FormGrid cols={3}>
                    <ReadonlyField label="Inspection Date" value={selectedRfi.inspectionDate} />
                    <ReadonlyField label="Result" value={selectedRfi.stage3Result} />
                    <ReadonlyField label="Note" value={selectedRfi.stage3Note} />
                    <ReadonlyField label="Concrete Pour Date" value={selectedRfi.concretePourDate} />
                    <ReadonlyField label="Brand" value={selectedRfi.brand} />
                    <ReadonlyField label="Cement Qty" value={selectedRfi.cementQty} />
                    <ReadonlyField label="Cement Unit" value={selectedRfi.cementUnit} />
                    <ReadonlyField label="7 Day Status" value={selectedRfi.status7Day} />
                    <ReadonlyField label="28 Day Status" value={selectedRfi.status28Day} />
                    <ReadonlyField label="Steel Test Result" value={selectedRfi.steelTestResult} />
                    <ReadonlyField label="Soil Test Result" value={selectedRfi.soilTestResult} />
                  </FormGrid>
                </div>

                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-green-600">Stage 4</div>
                  <FormGrid cols={3}>
                    <ReadonlyField label="Document Status" value={selectedRfi.stage4Status} />
                    <ReadonlyField label="Document Note" value={selectedRfi.stage4Note} />
                    <ReadonlyField
                      label="Progress"
                      value={(() => {
                        const steps = [
                          Array.isArray(selectedRfi.stage4ClientSignFiles) && selectedRfi.stage4ClientSignFiles.length > 0,
                          Array.isArray(selectedRfi.stage4CompleteFiles) && selectedRfi.stage4CompleteFiles.length > 0,
                          Array.isArray(selectedRfi.stage4OwnerSignFiles) && selectedRfi.stage4OwnerSignFiles.length > 0,
                        ].filter(Boolean).length;
                        return `${Math.round((steps / 3) * 100)}%`;
                      })()}
                    />
                  </FormGrid>
                </div>
              </div>
            </div>
          )}
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
