import Modal from '../common/Modal';
import { FileText, Image, FileSpreadsheet, Send, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-xs text-slate-800 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">{value}</span>
    </div>
  );
}

function referDrawingFileType(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'pdf';
}

function ReferDrawingThumb({ file }) {
  const type = referDrawingFileType(file.name);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-orange-300 transition-colors w-24 shrink-0"
    >
      {type === 'image' ? (
        <img src={file.url} alt="" className="w-14 h-14 object-cover rounded border border-slate-200" />
      ) : (
        <div className="w-14 h-14 rounded border border-slate-200 bg-white flex items-center justify-center">
          {type === 'excel' ? <FileSpreadsheet size={24} className="text-emerald-600" /> : <FileText size={24} className="text-orange-500" />}
        </div>
      )}
      <span className="text-[10px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
    </a>
  );
}

function Section({ number, title, color = 'bg-orange-500', children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className={`w-6 h-6 rounded-lg ${color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
          {number}
        </div>
        <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      </div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

const STAGE_LABELS = ['', 'Create Request', 'Issue to Client', 'Onsite Inspection', 'Complete Document'];
const STAGE_COLORS = ['', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500'];

export default function RfiDetailModal({ rfi, onClose }) {
  const { updateRfi } = useApp();
  const emailOk = rfi.stage2EmailStatus === 'ok';

  function markEmailSent() {
    updateRfi(rfi.id, {
      stage2EmailStatus: 'ok',
      stage2EmailSentAt: new Date().toISOString(),
    });
  }

  return (
    <Modal title={`RFI Detail — ${rfi.rfiNo}`} onClose={onClose} size="xl">
      {/* Compact Header Section */}
      <div className="mb-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">{rfi.rfiNo}</h2>
              <p className="text-xs text-slate-600">{rfi.typeOfInspection}</p>
            </div>
            <div className="text-xs text-slate-500">{rfi.location} • {rfi.area}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">Request No.</div>
            <div className="text-xs font-semibold text-slate-800">{rfi.requestNo}</div>
            {rfi.dueDate && (
              <div className="text-[10px] text-slate-500">Due: {rfi.dueDate}</div>
            )}
          </div>
        </div>
        
        {/* Compact Progress Bar */}
        <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => {
              const done    = rfi.stage > s;
              const current = rfi.stage === s;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-semibold flex-1 transition-all ${
                    done    ? 'bg-green-50 text-green-700 border border-green-200' :
                    current ? `${STAGE_COLORS[s]} text-white shadow-md` :
                              'bg-slate-50 text-slate-400 border border-slate-200'
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                      done    ? 'bg-green-500 text-white' :
                      current ? 'bg-white/20 text-white' :
                                'bg-slate-200 text-slate-500'
                    }`}>
                      {done ? '✓' : s}
                    </div>
                    <span className="truncate text-[10px]">{STAGE_LABELS[s]}</span>
                  </div>
                  {s < 4 && <div className={`w-2 h-0.5 ${rfi.stage > s ? 'bg-green-400' : 'bg-slate-300'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stage 1 */}
        <Section number="1" title="RFI Request (Stage 1)">
          <Field label="Request No."      value={rfi.requestNo} />
          <Field label="RFI No."          value={rfi.rfiNo} />
          <Field label="Type of Inspection" value={rfi.typeOfInspection} />
          <Field label="Request Date (Internal)"  value={rfi.requestDateInternal} />
          <Field label="Request Time (Internal)"  value={rfi.requestTimeInternal} />
          <Field label="Issue Date"         value={rfi.dueDate} />
          <Field label="Request Date (Owner)"     value={rfi.requestDateOwner} />
          <Field label="Request Time (Owner)"     value={rfi.requestTimeOwner} />
          <div className="col-span-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Refer Drawing , Markup Drawing</span>
            {Array.isArray(rfi.referDrawingFiles) && rfi.referDrawingFiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rfi.referDrawingFiles.map((file, i) => (
                  <ReferDrawingThumb key={i} file={file} />
                ))}
              </div>
            ) : rfi.referDrawing ? (
              <span className="text-xs text-slate-800 font-medium">{rfi.referDrawing}</span>
            ) : null}
          </div>
          <Field label="Location"         value={rfi.location} />
          <Field label="Area"             value={rfi.area} />
          <Field label="Working Step"     value={rfi.workingStep} />
          <Field label="Structure Type"   value={rfi.structureType} />
          <div className="col-span-3">
            <Field label="Detail of Inspection" value={rfi.detailInspection} />
          </div>
          <Field label="Requested By"     value={rfi.requestedBy} />
          <Field label="Inspected By"     value={rfi.inspectedBy} />
          <Field label="Status Insp."     value={rfi.statusInsp} />
          <Field label="Status Doc"       value={rfi.statusDoc} />
        </Section>

        {rfi.stage >= 2 && (
          <Section number="2" title="Issue to Client (Stage 2)" color="bg-blue-500">
            <div className="col-span-4 mb-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {emailOk ? (
                      <>
                        <CheckCircle2 size={14} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Email Sent</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} className="text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700">Email Pending</span>
                      </>
                    )}
                  </div>
                  {rfi.stage === 2 && !emailOk && (
                    <button
                      type="button"
                      onClick={markEmailSent}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold transition-colors"
                    >
                      <Send size={10} />
                      Send
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Field label="Work Step"              value={rfi.inspectionPackage} />
            <Field label="Schedule Date"          value={rfi.inspectionScheduleDate} />
            <Field label="Schedule Time"          value={rfi.inspectionScheduleTime} />
            <div className="col-span-3">
              <Field label="Inspection Scope" value={rfi.descriptionOfInspection} />
            </div>
            <div className="col-span-2">
              <Field label="Note" value={rfi.stage2Note} />
            </div>
            {Array.isArray(rfi.stage2Files) && rfi.stage2Files.length > 0 && (
              <div className="col-span-4">
                <div className="text-[10px] font-semibold text-slate-600 mb-1">📎 Files</div>
                <div className="flex flex-wrap gap-1">
                  {rfi.stage2Files.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700 hover:bg-blue-100 transition-colors"
                      title={f.name}>
                      <FileText size={10} className="text-blue-600" />
                      <span className="truncate max-w-[120px]">{f.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Previous Stage 3 inspection data (if RFI returned due to Comment) */}
        {rfi.stage === 2 && rfi.result === 'Comment' && rfi.inspectionDate && (
          <div className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </div>
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider">Onsite Inspection (Stage 3) - Previous Rejected</h3>
            </div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 pl-7">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Inspection Date</span>
                <span className="text-xs text-red-800 font-medium">{rfi.inspectionDate}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Result</span>
                <span className="text-xs text-red-800 font-medium">{rfi.result}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Status Insp.</span>
                <span className="text-xs text-red-800 font-medium">{rfi.statusInsp || '—'}</span>
              </div>
              {rfi.stage3Note && (
                <div className="col-span-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Inspector Comments</span>
                    <div className="text-xs text-red-800 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {rfi.stage3Note}
                    </div>
                  </div>
                </div>
              )}
              {Array.isArray(rfi.stage3InspectorFiles) && rfi.stage3InspectorFiles.length > 0 && (
                <div className="col-span-3">
                  <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">Stage 3 Inspector Files (Previous)</div>
                  <div className="flex flex-wrap gap-2">
                    {rfi.stage3InspectorFiles.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:border-red-400 hover:underline truncate max-w-[200px]"
                        title={f.name}>{f.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Stage 3 inspection data (if rejected) */}
        {rfi.stage === 3 && rfi.result === 'Reject' && rfi.inspectionDate && (
          <div className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </div>
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider">Onsite Inspection (Stage 3) - Current Rejected</h3>
            </div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 pl-7">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Inspection Date</span>
                <span className="text-xs text-red-800 font-medium">{rfi.inspectionDate}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Result</span>
                <span className="text-xs text-red-800 font-medium">{rfi.result}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Status Insp.</span>
                <span className="text-xs text-red-800 font-medium">{rfi.statusInsp || '—'}</span>
              </div>
              {rfi.stage3Note && (
                <div className="col-span-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Inspector Comments</span>
                    <div className="text-xs text-red-800 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {rfi.stage3Note}
                    </div>
                  </div>
                </div>
              )}
              {Array.isArray(rfi.stage3InspectorFiles) && rfi.stage3InspectorFiles.length > 0 && (
                <div className="col-span-3">
                  <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">Stage 3 Inspector Files (Current)</div>
                  <div className="flex flex-wrap gap-2">
                    {rfi.stage3InspectorFiles.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:border-red-400 hover:underline truncate max-w-[200px]"
                        title={f.name}>{f.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {rfi.stage >= 3 && rfi.result !== 'Reject' && (
          <Section number="3" title="Onsite Inspection (Stage 3)" color="bg-purple-500">
            <Field label="Inspection Date" value={rfi.inspectionDate} />
            <Field label="Result"          value={rfi.result} />
            <div className="col-span-3">
              <Field label="Note" value={rfi.stage3Note} />
            </div>
            {rfi.stage3Attachment && (
              <div className="col-span-3">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Stage 3 Attachment (URL)</div>
                <a href={rfi.stage3Attachment} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-purple-600 hover:underline break-all">{rfi.stage3Attachment}</a>
              </div>
            )}
            {Array.isArray(rfi.stage3InspectorFiles) && rfi.stage3InspectorFiles.length > 0 && (
              <div className="col-span-3">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Stage 3 Inspector Files</div>
                <div className="flex flex-wrap gap-2">
                  {rfi.stage3InspectorFiles.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:border-purple-400 hover:underline truncate max-w-[200px]"
                      title={f.name}>{f.name}</a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {rfi.stage >= 4 && (
          <Section number="4" title="Complete Document (Stage 4)" color="bg-green-500">
            <Field label="Result"   value={rfi.stage4Result} />
            <div className="col-span-3">
              <Field label="Note" value={rfi.stage4Note} />
            </div>
            {rfi.stage4Attachment && (
              <div className="col-span-3">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Stage 4 Attachment (URL)</div>
                <a href={rfi.stage4Attachment} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-green-700 hover:underline break-all">{rfi.stage4Attachment}</a>
              </div>
            )}
            {/* Document Workflow Files */}
            <div className="col-span-4">
              <div className="text-[10px] font-semibold text-slate-600 mb-1">📋 Workflow Files</div>
              <div className="space-y-2">
                {/* Step 1: CMG Sign Files */}
                {Array.isArray(rfi.stage4ClientSignFiles) && rfi.stage4ClientSignFiles.length > 0 && (
                  <div className="bg-teal-50 border border-teal-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-4 h-4 rounded bg-teal-500 text-white flex items-center justify-center text-[8px] font-bold">1</div>
                      <span className="text-[10px] font-semibold text-teal-800">CMG Sign</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rfi.stage4ClientSignFiles.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-teal-200 rounded text-[10px] text-teal-700 hover:bg-teal-100 transition-colors"
                          title={f.name}>
                          <FileText size={10} className="text-teal-600" />
                          <span className="truncate max-w-[100px]">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Subcontractor Sign Files */}
                {Array.isArray(rfi.stage4CompleteFiles) && rfi.stage4CompleteFiles.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-4 h-4 rounded bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">2</div>
                      <span className="text-[10px] font-semibold text-blue-800">Subcontractor Sign</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rfi.stage4CompleteFiles.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-[10px] text-blue-700 hover:bg-blue-100 transition-colors"
                          title={f.name}>
                          <FileText size={10} className="text-blue-600" />
                          <span className="truncate max-w-[100px]">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Owner Sign Files */}
                {Array.isArray(rfi.stage4OwnerSignFiles) && rfi.stage4OwnerSignFiles.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-4 h-4 rounded bg-green-500 text-white flex items-center justify-center text-[8px] font-bold">3</div>
                      <span className="text-[10px] font-semibold text-green-800">Owner Sign</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rfi.stage4OwnerSignFiles.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-green-200 rounded text-[10px] text-green-700 hover:bg-green-100 transition-colors"
                          title={f.name}>
                          <FileText size={10} className="text-green-600" />
                          <span className="truncate max-w-[100px]">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* Concrete/Test section */}
        {(rfi.concretePourDate || rfi.brand || rfi.cementQty || rfi.cementUnit || rfi.status7Day || rfi.status28Day || rfi.steelTestResult || rfi.soilTestResult) && (
          <Section number="+" title="Concrete / Material Test Data" color="bg-slate-400">
            <Field label="Pour Date"            value={rfi.concretePourDate} />
            <Field label="Brand (ปูนซีเมนต์)"  value={rfi.brand} />
            <Field label="ปริมาณที่จองปูน"      value={rfi.cementQty} />
            <Field label="หน่วย"                value={rfi.cementUnit} />
            <Field label="7-Day Status"         value={rfi.status7Day} />
            <Field label="28-Day Status"        value={rfi.status28Day} />
            <Field label="Steel Test"           value={rfi.steelTestResult} />
            <Field label="Soil Test"            value={rfi.soilTestResult} />
          </Section>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
        <button 
          onClick={onClose}
          className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>
    </Modal>
  );
}
