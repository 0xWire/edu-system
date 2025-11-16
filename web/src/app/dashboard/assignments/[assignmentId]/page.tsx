'use client';

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AssignmentManagePage from '@/components/AssignmentManagePage';

export default function ManageAssignmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params?.assignmentId || '';

  return (
    <ProtectedRoute requireAuth={true}>
      <AssignmentManagePage assignmentId={assignmentId} />
    </ProtectedRoute>
  );
}
