import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Textarea } from '../common/FormField';

export default function CiGroupModal({ code, existingTitles = [], onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const normalizedTitles = useMemo(
    () => new Set(existingTitles.map(value => String(value || '').trim().toLocaleLowerCase()).filter(Boolean)),
    [existingTitles],
  );

  function handleClose() {
    if (!saving) onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('กรุณาระบุชื่อหรือรายละเอียดของ CI');
      return;
    }
    if (normalizedTitles.has(cleanTitle.toLocaleLowerCase())) {
      setError('มี CI ชื่อนี้อยู่แล้วในโปรเจกต์');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ code, title: cleanTitle, description: description.trim() });
      onClose();
    } catch (saveError) {
      setError(saveError?.message || 'สร้าง CI ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Create ${code}`} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">CI Number</p>
          <p className="mt-1 font-mono text-lg font-bold text-orange-800">{code}</p>
          <p className="mt-0.5 text-[10px] text-orange-600">หมายเลขสร้างอัตโนมัติต่อจาก CI ล่าสุดของโปรเจกต์</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <FormField label="CI Title" required>
          <Input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="เช่น Inspection / Test Report for Foundation Survey"
            maxLength={160}
            autoFocus
            required
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="รายละเอียดเพิ่มเติมของกลุ่ม CI (ถ้ามี)"
            rows={3}
            maxLength={500}
          />
        </FormField>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-orange-500 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Creating...' : `Create ${code}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
