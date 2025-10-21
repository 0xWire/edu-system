'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardAssignments from '@/components/DashboardAssignments';

export default function DashboardAssignmentsPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardAssignments />
    </ProtectedRoute>
  );
}
