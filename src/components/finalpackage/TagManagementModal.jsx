import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input } from '../common/FormField';

const EMPTY_FORM = {
  tagId: '',
};

export default function TagManagementModal({ existingTagIds = [], onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const normalizedExisting = useMemo(
    () => existingTagIds.map(tag => String(tag || '').trim().toLowerCase()),
    [existingTagIds],
  );

  function handleSubmit(e) {
    e.preventDefault();
    const tagId = form.tagId.trim();

    if (!tagId) {
      setError('กรุณากรอก TAG ID');
      return;
    }

    if (normalizedExisting.includes(tagId.toLowerCase())) {
      setError('TAG ID นี้มีอยู่แล้ว');
      return;
    }

    setError('');
    onSave({ tagId });
  }

  return (
    <Modal title="Create TAG" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <FormField label="TAG ID" required>
          <Input
            value={form.tagId}
            onChange={e => setForm(current => ({ ...current, tagId: e.target.value }))}
            placeholder="Enter TAG ID"
            autoFocus
            required
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
