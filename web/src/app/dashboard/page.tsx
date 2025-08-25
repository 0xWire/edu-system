import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <Dashboard />
    </ProtectedRoute>
  );
}
