'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardTests from '@/components/DashboardTests';

export default function DashboardTestsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardTests />
    </ProtectedRoute>
  );
}
