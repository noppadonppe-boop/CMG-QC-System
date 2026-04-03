import { useRef, useState } from 'react';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';
import { storage } from '../../config/firebase';
import { Upload, X, Loader2, FileText, FileSpreadsheet, Image, Camera } from 'lucide-react';
import { useMenuPermissions } from '../../auth/useMenuPermissions';

const RESULT_OPTIONS = ['Pass', 'Reject', 'Comment', 'Pass with comment'];

const S3_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
];
const S3_EXT = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const S3_MAX_MB = 20;
const CEMENT_BILL_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const CEMENT_BILL_EXT = '.pdf,.jpg,.jpeg,.png,.gif,.webp';
const CEMENT_BILL_MAX_MB = 10;

function s3FileIcon(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image size={12} className="text-green-500 shrink-0" />;
  return <FileText size={12} className="text-orange-500 shrink-0" />;
}

function isImageFile(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

function CementBillThumb({ file, onPreview }) {
  const isImage = isImageFile(file.name);
  return (
    <button
      type="button"
      onClick={() => isImage ? onPreview(file.url) : window.open(file.url, '_blank')}
      className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-purple-300 transition-colors w-16 shrink-0 text-left"
    >
      {isImage ? (
        <img src={file.url} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
      ) : (
        <div className="w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center">
          <FileText size={18} className="text-purple-500" />
        </div>
      )}
      <span className="text-[9px] text-slate-600 truncate w-full text-center" title={file.name}>{file.name}</span>
    </button>
  );
}

function Stage3Uploader({ label, files, setFiles, projectId, requestNo, folder, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleFiles(fileList) {
    if (disabled) return;
    if (!projectId || !requestNo) {
      setErrorMsg('ไม่พบ Project/Request No — กรุณารีโหลดหน้าแล้วลองใหม่');
      return;
    }
    setErrorMsg('');
    setUploading(true);
    const safeReq = String(requestNo).replace(/[/\\#?]/g, '-');
    const results = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!S3_MIME.includes(file.type)) {
        setErrorMsg(`"${file.name}" ไม่รองรับ — อัปโหลดได้เฉพาะ PDF, Excel, รูปภาพ`);
        continue;
      }
      if (file.size > S3_MAX_MB * 1024 * 1024) {
        setErrorMsg(`"${file.name}" มีขนาดเกิน ${S3_MAX_MB} MB`);
        continue;
      }
      const seq = files.length + results.length + 1;
      const ext = file.name.split('.').pop();
      const path = `rfi-stage3/${projectId}/${safeReq}/${folder}_${String(seq).padStart(2, '0')}.${ext}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise((resolve, reject) => {
        task.on('state_changed',
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, () => resolve());
      });
      const url = await getDownloadURL(task.snapshot.ref);
      results.push({ name: file.name, url });
    }
    setFiles(prev => [...prev, ...results]);
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(idx) {
    if (disabled) return;
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-1">
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-purple-50 border border-purple-100 rounded-lg text-[11px]">
              {s3FileIcon(f.name)}
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-purple-700 hover:text-purple-900">{f.name}</a>
              {!disabled && (
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => !disabled && inputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed">
        {uploading ? (
          <><Loader2 size={12} className="animate-spin text-purple-500" />อัปโหลด... {progress}%</>
        ) : (
          <><Upload size={12} />{label}</>
        )}
      </button>
      <input ref={inputRef} type="file" multiple accept={S3_EXT} className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
      {errorMsg && (
        <p className="text-[10px] text-red-500 flex items-center gap-1"><X size={10} /> {errorMsg}</p>
      )}
    </div>
  );
}

export default function RfiStage3Modal({ rfi, onSave, onClose }) {
  const { canAction } = useMenuPermissions();
  const canUploadInspector = canAction('rfi', 'uploadRfiS3Inspector');

  const [form, setForm] = useState({
    inspectionDate:   rfi.inspectionDate   || '',
    result:           rfi.result           || '',
    stage3Note:       rfi.stage3Note       || '',
    stage3Attachment: rfi.stage3Attachment || '',
    concretePourDate: rfi.concretePourDate || '',
    brand:            rfi.brand || '',
    cementQty:        rfi.cementQty || '',
    cementUnit:       rfi.cementUnit || '',
    cementBillLink:   rfi.cementBillLink || '',
    status7Day:       rfi.status7Day || '',
    status28Day:      rfi.status28Day || '',
    steelTestResult:  rfi.steelTestResult || '',
    soilTestResult:   rfi.soilTestResult || '',
  });

  const [inspectorFiles, setInspectorFiles] = useState(
    Array.isArray(rfi.stage3InspectorFiles) ? rfi.stage3InspectorFiles : [],
  );
  const [cementBillFiles, setCementBillFiles] = useState(
    Array.isArray(rfi.cementBillFiles) ? rfi.cementBillFiles : [],
  );
  const cementBillCameraRef = useRef(null);
  const cementBillGalleryRef = useRef(null);
  const [cementBillUploading, setCementBillUploading] = useState(false);
  const [cementBillProgress, setCementBillProgress] = useState(0);
  const [cementBillError, setCementBillError] = useState('');
  const [cementBillPreviewUrl, setCementBillPreviewUrl] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleCementBillFiles(fileList) {
    if (!rfi.projectId || !rfi.requestNo?.trim()) {
      setCementBillError('ไม่พบ Project/Request No — กรุณารีโหลดหน้าแล้วลองใหม่');
      return;
    }
    setCementBillError('');
    setCementBillUploading(true);
    try {
      const safeReq = rfi.requestNo.replace(/[/\\#?]/g, '-');
      const results = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!CEMENT_BILL_MIME.includes(file.type)) {
          setCementBillError(`"${file.name}" ไม่รองรับ — ใช้ได้เฉพาะรูปภาพหรือ PDF`);
          continue;
        }
        if (file.size > CEMENT_BILL_MAX_MB * 1024 * 1024) {
          setCementBillError(`"${file.name}" มีขนาดเกิน ${CEMENT_BILL_MAX_MB} MB`);
          continue;
        }
        const seq = cementBillFiles.length + results.length + 1;
        const ext = file.name.split('.').pop();
        const path = `rfi-cement-bills/${rfi.projectId}/${safeReq}/bill_${String(seq).padStart(2, '0')}.${ext}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file);
        await new Promise((resolve, reject) => {
          task.on('state_changed',
            snap => setCementBillProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            () => resolve(),
          );
        });
        const url = await getDownloadURL(task.snapshot.ref);
        results.push({ name: file.name, url });
      }
      setCementBillFiles(prev => [...prev, ...results]);
    } catch (err) {
      setCementBillError(err?.message ?? 'อัปโหลดบิลปูนไม่สำเร็จ');
    } finally {
      setCementBillUploading(false);
      setCementBillProgress(0);
      if (cementBillCameraRef.current) cementBillCameraRef.current.value = '';
      if (cementBillGalleryRef.current) cementBillGalleryRef.current.value = '';
    }
  }

  function removeCementBillFile(idx) {
    setCementBillFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.inspectionDate || !form.result) return;
    onSave({
      ...form,
      stage3InspectorFiles: inspectorFiles,
      cementBillFiles,
      cementBillLink: cementBillFiles[0]?.url ?? form.cementBillLink ?? '',
    });
  }

  return (
    <Modal title={`Onsite Inspection — Stage 3 (${rfi.rfiNo})`} onClose={onClose} size="lg">
      <div className="mb-5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">S3</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-purple-800">Inspection Onsite — Site QC Inspector</div>
          <div className="text-[11px] text-purple-600 mt-0.5">
            Ref: <span className="font-semibold">{rfi.requestNo}</span> · {rfi.typeOfInspection}
          </div>
          <div className="text-[11px] text-purple-500 mt-0.5 truncate">{rfi.location} · {rfi.area}</div>
          {rfi.inspectionScheduleDate && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Scheduled: {rfi.inspectionScheduleDate} {rfi.inspectionScheduleTime}
              </span>
            </div>
          )}
        </div>
      </div>

      {rfi.descriptionOfInspection && (
        <div className="mb-5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inspection Scope (from Stage 2)</div>
          <div className="text-xs text-slate-600">{rfi.descriptionOfInspection}</div>
          {rfi.stage2Note && (
            <div className="text-[11px] text-slate-500 mt-1.5 italic">Note: {rfi.stage2Note}</div>
          )}
        </div>
      )}

      {/* Current Stage 3 inspection data (if already rejected) */}
      {rfi.result === 'Reject' && rfi.inspectionDate && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="text-xs font-bold text-red-700 mb-2">Stage 3: Onsite Inspection (Current - Rejected)</div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] text-red-600">
            <div>Inspection Date: <span className="font-semibold text-red-800">{rfi.inspectionDate}</span></div>
            <div>Inspection Result: <span className="font-semibold text-red-800">{rfi.result}</span></div>
            <div>Status Insp.: <span className="font-semibold text-red-800">{rfi.statusInsp || '—'}</span></div>
            
            {rfi.stage3Note && (
              <div className="col-span-3 mt-1">
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider block mb-1">Inspector Comments</span>
                <div className="text-[10px] text-red-700 bg-red-100 border border-red-200 rounded-lg px-2 py-1 whitespace-pre-wrap">
                  {rfi.stage3Note}
                </div>
              </div>
            )}
            
            {Array.isArray(rfi.stage3InspectorFiles) && rfi.stage3InspectorFiles.length > 0 && (
              <div className="col-span-3 mt-1">
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider block mb-1">Inspector Files</span>
                <div className="flex flex-wrap gap-1.5">
                  {rfi.stage3InspectorFiles.map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-md bg-red-100 border border-red-200 text-red-700 hover:border-red-400 truncate max-w-[160px]"
                      title={file.name}>{file.name}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormGrid cols={2}>
          <FormField label="Inspection Date" required>
            <Input type="date" value={form.inspectionDate} onChange={set('inspectionDate')} required />
          </FormField>
          <FormField label="Inspection Result" required>
            <Select value={form.result} onChange={set('result')} required>
              <option value="">— Select Result —</option>
              {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {form.result && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
            form.result === 'Pass' ? 'bg-green-50 border-green-200 text-green-700' :
            form.result === 'Reject' ? 'bg-red-50 border-red-200 text-red-700' :
            form.result === 'Comment' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            form.result === 'Pass with comment' ? 'bg-teal-50 border-teal-200 text-teal-700' :
            'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-base">
              {form.result === 'Pass' ? '✅' : form.result === 'Reject' ? '❌' :
               form.result === 'Comment' ? '💬' : form.result === 'Pass with comment' ? '✔️' : ''}
            </span>
            Result: <span className="font-bold">{form.result}</span>
          </div>
        )}

        <FormField label="Note / Inspection Findings">
          <Textarea value={form.stage3Note} onChange={set('stage3Note')}
            placeholder="Describe findings, observations, non-conformances if any..." rows={4} />
        </FormField>

        <FormField label="Inspector field information (Upload)">
          <Stage3Uploader
            label={canUploadInspector ? 'เลือกไฟล์ Inspector info' : 'ไม่มีสิทธิ์อัปโหลด (ดูไฟล์เท่านั้น)'}
            files={inspectorFiles} setFiles={setInspectorFiles}
            projectId={rfi.projectId} requestNo={rfi.requestNo}
            folder="inspector" disabled={!canUploadInspector}
          />
        </FormField>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">6</div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concrete / Material Test (if applicable)</h3>
          </div>
          <FormGrid cols={4}>
            <FormField label="วันที่เทคอนกรีต">
              <Input type="date" value={form.concretePourDate} onChange={set('concretePourDate')} />
            </FormField>
            <FormField label="BRAND (ปูนซีเมนต์)">
              <Input value={form.brand} onChange={set('brand')} placeholder="TPI / SCG..." />
            </FormField>
            <FormField label="ปริมาณที่จองปูน">
              <Input
                type="number"
                min="0"
                step="any"
                value={form.cementQty}
                onChange={set('cementQty')}
                placeholder="0"
              />
            </FormField>
            <FormField label="หน่วย">
              <Input value={form.cementUnit} onChange={set('cementUnit')} placeholder="ลบ.ม. / ถุง..." />
            </FormField>
          </FormGrid>
          <div className="mt-4">
            <FormField label="แนบลิงค์บิลปูน">
              <div className="space-y-2">
                {cementBillFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cementBillFiles.map((file, i) => (
                      <div key={i} className="relative group">
                        <CementBillThumb file={file} onPreview={setCementBillPreviewUrl} />
                        <button
                          type="button"
                          onClick={() => removeCementBillFile(i)}
                          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={cementBillCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => e.target.files && handleCementBillFiles(e.target.files)}
                  />
                  <input
                    ref={cementBillGalleryRef}
                    type="file"
                    accept={CEMENT_BILL_EXT}
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && handleCementBillFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => cementBillCameraRef.current?.click()}
                    disabled={cementBillUploading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 border border-slate-300 rounded-lg hover:border-purple-400 hover:text-purple-600 disabled:opacity-60"
                  >
                    <Camera size={12} /> ถ่ายรูป
                  </button>
                  <button
                    type="button"
                    onClick={() => cementBillGalleryRef.current?.click()}
                    disabled={cementBillUploading}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-purple-400 hover:text-purple-600 disabled:opacity-60"
                  >
                    {cementBillUploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> {cementBillProgress}%
                      </>
                    ) : (
                      <>
                        <Upload size={12} /> แกลลอรี่ / ไฟล์ (รูปหรือ PDF)
                      </>
                    )}
                  </button>
                </div>
                {cementBillError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <X size={11} /> {cementBillError}
                  </p>
                )}
              </div>
            </FormField>
          </div>
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
          <button type="submit" disabled={!form.result}
            className="px-6 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
            Submit Inspection →
          </button>
        </div>
      </form>

      {cementBillPreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCementBillPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setCementBillPreviewUrl(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 text-slate-800 flex items-center justify-center"
          >
            <X size={18} />
          </button>
          <img
            src={cementBillPreviewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
