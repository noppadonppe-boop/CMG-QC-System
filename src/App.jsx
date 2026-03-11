import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider }  from './auth/AuthContext';
import { AppProvider }   from './context/AppContext';
import ProtectedRoute    from './auth/ProtectedRoute';
import ErrorBoundary     from './components/common/ErrorBoundary';
import LoginPage         from './pages/auth/LoginPage';
import RegisterPage      from './pages/auth/RegisterPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';
import Layout            from './components/layout/Layout';
import Dashboard         from './components/dashboard/Dashboard';
import ProjectsPage      from './components/projects/ProjectsPage';
import QcDocumentsPage   from './components/qcdocuments/QcDocumentsPage';
import ItpPage           from './components/itp/ItpPage';
import RfiPage           from './components/rfi/RfiPage';
import MaterialsPage     from './components/materials/MaterialsPage';
import NcrPage           from './components/ncr/NcrPage';
import PunchListPage     from './components/punchlist/PunchListPage';
import HandoverPage      from './components/handover/HandoverPage';
import FinalPackagePage  from './components/finalpackage/FinalPackagePage';
import ComingSoon        from './components/common/ComingSoon';
import UserManagementPanel from './pages/admin/UserManagementPanel';

const MODULE_TITLES = {
  itp:            'ITP System',
  rfi:            'RFI Workflow',
  materials:      'Material Receive',
  ncr:            'NCR Management',
  punchlist:      'Punch List Management',
  handover:       'Handover',
  'final-package':'Final Document Package',
};

function MainApp() {
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
    if (activePage === 'admin-users')  return <UserManagementPanel />;
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
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending"  element={<PendingApprovalPage />} />

          {/* Protected — path="*" คือ wildcard ที่ถูกต้องใน React Router v6 */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppProvider>
                    <MainApp />
                  </AppProvider>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
