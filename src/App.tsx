// ============================================================
// Linked Lead AI — Main App with Routing
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/dashboard/index';
import LeadsPage from './pages/leads/index';
import NewLeadPage from './pages/leads/new';
import BulkLeadImportPage from './pages/leads/bulk';
import LeadDetailPage from './pages/leads/[id]';
import PipelinePage from './pages/pipeline/index';
import FollowUpsPage from './pages/follow-ups/index';
import MessagesPage from './pages/messages/index';
import PostsPage from './pages/posts/index';
import ProjectsPage from './pages/projects/index';
import SettingsPage from './pages/settings/index';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  if (!state.user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LeadsPage />} />
        <Route path="new" element={<NewLeadPage />} />
        <Route path="bulk" element={<BulkLeadImportPage />} />
        <Route path=":id" element={<LeadDetailPage />} />
      </Route>
      <Route
        path="/pipeline"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PipelinePage />} />
      </Route>
      <Route
        path="/follow-ups"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FollowUpsPage />} />
      </Route>
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MessagesPage />} />
      </Route>
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PostsPage />} />
      </Route>
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProjectsPage />} />
      </Route>
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
