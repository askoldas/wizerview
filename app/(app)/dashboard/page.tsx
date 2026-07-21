import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/app-shell/protected-route';
import { ProjectsDashboard } from '@/components/projects-dashboard';

export const metadata: Metadata = {
  title: 'Dashboard — WizerView',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <ProjectsDashboard />
    </ProtectedRoute>
  );
}
