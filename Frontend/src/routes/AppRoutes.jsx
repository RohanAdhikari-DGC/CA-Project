import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import PracticeDashboardPage from '../pages/practice/PracticeDashboardPage';
import CrossClientDocumentsPage from '../pages/practice/CrossClientDocumentsPage';
import ClientOnboarding from '../pages/practice/ClientOnboarding';
import Invoices from '../pages/invoice/Invoices';
import PendingReviewPage from '../pages/review/PendingReviewPage';
import CorrectionPage from '../pages/review/CorrectionPage';
import FlaggedPage from '../pages/review/FlaggedPage';
import ViewDocumentsPage from '../pages/reference/ViewDocumentsPage';
import ClientSettingsPage from '../pages/reference/ClientSettingsPage';
import ReportingPage from '../pages/reference/ReportingPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Default redirect to client dashboard, context will handle state logic */}
        <Route index element={<Navigate to="/client-dashboard" replace />} />
        
        {/* Dashboards & Practice */}
        <Route path="client-dashboard" element={<DashboardPage />} />
        <Route path="practice-dashboard" element={<PracticeDashboardPage />} />
        <Route path="crossclient" element={<CrossClientDocumentsPage />} />
        <Route path="onboarding" element={<ClientOnboarding />} />
        
        {/* Core Queues & Docs */}
        <Route path="incoming" element={<Invoices />} />
        <Route path="pending" element={<PendingReviewPage />} />
        <Route path="correction" element={<CorrectionPage />} />
        <Route path="flagged" element={<FlaggedPage />} />
        
        {/* References & Settings */}
        <Route path="viewdocs" element={<ViewDocumentsPage />} />
        <Route path="settings" element={<ClientSettingsPage />} />
        <Route path="reporting" element={<ReportingPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;