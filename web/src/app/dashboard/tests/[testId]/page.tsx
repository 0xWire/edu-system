'use client';

import { use } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import TestDetails from '@/components/TestDetails';

interface PageProps {
  params: Promise<{
    testId: string;
  }>;
}

export default function DashboardTestDetailsPage({ params }: PageProps) {
  const { testId } = use(params);
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <TestDetails testId={testId} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
