import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
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
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
