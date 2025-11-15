'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AssignmentManagePage from '@/components/AssignmentManagePage';

interface ManageAssignmentPageProps {
  params: {
    assignmentId: string;
  };
}

export default function ManageAssignmentPage({ params }: ManageAssignmentPageProps) {
  return (
    <ProtectedRoute requireAuth={true}>
      <AssignmentManagePage assignmentId={params.assignmentId} />
    </ProtectedRoute>
  );
}
