'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardAIStudio from '@/components/DashboardAIStudio';

export default function DashboardAIStudioPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardAIStudio />
    </ProtectedRoute>
  );
}
