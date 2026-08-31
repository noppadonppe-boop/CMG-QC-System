import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import FinalPackageStatusTab from './FinalPackageStatusTab';
import TagManagementTab from './TagManagementTab';

export default function FinalPackagePage() {
  const { selectedProject } = useApp();
  const [activeTab, setActiveTab] = useState('status');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Final Document Package</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — Final Package Workspace</p>
        </div>
      </div>

      <div role="tablist" aria-label="Final Document Package views" className="inline-flex rounded-xl border border-slate-200 bg-slate-900/5 p-0.5 text-xs font-semibold">
        {[
          { id: 'status', label: 'TAG / CI Matrix' },
          { id: 'assignment', label: 'CI Assignment' },
          { id: 'tag-management', label: 'TAG Management' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`final-package-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={tab.id === 'status'
              ? 'final-package-matrix-panel'
              : (tab.id === 'assignment' ? 'final-package-assignment-panel' : 'final-package-tag-panel')}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-500 hover:bg-white hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className={activeTab === 'tag-management' ? 'hidden' : ''}
      >
        <FinalPackageStatusTab
          viewMode={activeTab === 'assignment' ? 'workflow' : 'matrix'}
          onOpenWorkflow={() => setActiveTab('assignment')}
        />
      </div>

      <div
        id="final-package-tag-panel"
        role="tabpanel"
        aria-labelledby="final-package-tab-tag-management"
        className={activeTab === 'tag-management' ? '' : 'hidden'}
      >
        <TagManagementTab />
      </div>
    </div>
  );
}
