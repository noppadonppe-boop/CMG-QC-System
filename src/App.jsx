import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import { seedFirebase } from './scripts/seedFirebase';
import Dashboard from './components/dashboard/Dashboard';
import ProjectsPage from './components/projects/ProjectsPage';
import QcDocumentsPage from './components/qcdocuments/QcDocumentsPage';
import ItpPage from './components/itp/ItpPage';
import RfiPage from './components/rfi/RfiPage';
import MaterialsPage from './components/materials/MaterialsPage';
import NcrPage from './components/ncr/NcrPage';
import PunchListPage from './components/punchlist/PunchListPage';
import HandoverPage from './components/handover/HandoverPage';
import FinalPackagePage from './components/finalpackage/FinalPackagePage';
import ComingSoon from './components/common/ComingSoon';

const MODULE_TITLES = {
  itp:            'ITP System',
  rfi:            'RFI Workflow',
  materials:      'Material Receive',
  ncr:            'NCR Management',
  punchlist:      'Punch List Management',
  handover:       'Handover',
  'final-package':'Final Document Package',
};

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null); // { type: 'success'|'error', text }

  async function handleSeed() {
    setSeedMessage(null);
    setSeeding(true);
    try {
      await seedFirebase();
      setSeedMessage({ type: 'success', text: 'บันทึก Mock Data ลง Firebase เรียบร้อย กำลัง reload...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      const msg = e?.message || String(e);
      setSeedMessage({
        type: 'error',
        text: msg.includes('permission') || msg.includes('PERMISSION_DENIED')
          ? `Seed ไม่สำเร็จ: ${msg}\n\nไปตั้ง Firestore Rules ใน Firebase Console (เช่น allow read, write: if true สำหรับพัฒนา)`
          : `Seed ไม่สำเร็จ: ${msg}`,
      });
    } finally {
      setSeeding(false);
    }
  }

  function renderPage() {
    if (activePage === 'dashboard')    return <Dashboard />;
    if (activePage === 'projects')     return <ProjectsPage />;
    if (activePage === 'qc-documents') return <QcDocumentsPage />;
    if (activePage === 'itp')          return <ItpPage />;
    if (activePage === 'rfi')          return <RfiPage />;
    if (activePage === 'materials')    return <MaterialsPage />;
    if (activePage === 'ncr')          return <NcrPage />;
    if (activePage === 'punchlist')    return <PunchListPage />;
    if (activePage === 'handover')     return <HandoverPage />;
    if (activePage === 'final-package') return <FinalPackagePage />;
    return <ComingSoon title={MODULE_TITLES[activePage] || activePage} />;
  }

  return (
    <>
      <Layout activePage={activePage} setActivePage={setActivePage}>
        {renderPage()}
      </Layout>
      {/* ปุ่ม Seed Mock Data ลง Firebase - แสดงตลอด */}
      <div className="fixed bottom-4 right-4 rounded-lg bg-amber-100 border border-amber-400 px-4 py-2 shadow flex flex-col gap-1 max-w-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="bg-amber-600 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          >
            {seeding ? 'กำลัง Seed...' : 'Seed Mock → Firebase'}
          </button>
          <span className="text-amber-800 text-xs">นำข้อมูล Mock ขึ้น Firestore</span>
        </div>
        {seedMessage && (
          <p className={`text-xs ${seedMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
            {seedMessage.text}
          </p>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
