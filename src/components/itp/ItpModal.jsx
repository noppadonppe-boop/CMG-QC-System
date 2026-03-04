import { useState } from 'react';
import Modal from '../common/Modal';
import { FormField, Input, Select, Textarea, FormGrid } from '../common/FormField';

const ITP_BY_OPTIONS  = ['Client ITP', 'CMG ITP'];
const TYPE_ITC_OPTIONS = ['Civil', 'Building', 'Steel Structure', 'Mechanical', 'Electrical', 'HVAC', 'Sanitary'];

const EMPTY = {
  item: '', itpBy: 'CMG ITP', typeItc: 'Civil', attachmentLink: '', note: '',
};

export default function ItpModal({ itpItem, onSave, onClose }) {
  const [form, setForm] = useState(itpItem ? { ...itpItem } : { ...EMPTY });
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.item.trim()) return;
    onSave(form);
  }

  return (
    <Modal
      title={itpItem ? `Edit ITP — ${itpItem.item}` : 'Add ITP Item'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="ITP Item / Description" required>
          <Input
            value={form.item}
            onChange={set('item')}
            placeholder="e.g. Pile Installation Inspection"
            required
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField label="ITP By">
            <Select value={form.itpBy} onChange={set('itpBy')}>
              {ITP_BY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Select>
          </FormField>
          <FormField label="Type ITC">
            <Select value={form.typeItc} onChange={set('typeItc')}>
              {TYPE_ITC_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        <FormField label="Attachment / ITP Link (URL)">
          <Input
            type="url"
            value={form.attachmentLink}
            onChange={set('attachmentLink')}
            placeholder="https://drive.google.com/..."
          />
        </FormField>

        <FormField label="Note">
          <Textarea value={form.note} onChange={set('note')} placeholder="Any additional notes..." rows={2} />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            {itpItem ? 'Save Changes' : 'Add ITP Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
