'use client';

import TestAttemptPage from '@/components/TestAttempt/TestAttemptPage';
import { mockTestAttemptService } from '@/components/automation/mockTestAttemptService';

export default function TakeTestAutoPage() {
  return (
    <TestAttemptPage
      assignmentId="math-demo-2026-auto"
      guestName="Roman Voronov"
      participantFields={{
        first_name: 'Roman',
        last_name: 'Voronov',
        group: 'A-101',
      }}
      service={mockTestAttemptService}
      autoPlay
      autoPlayDelayMs={900}
      reviewHref="/teacher-results-auto"
      reviewLabel="Open teacher results"
    />
  );
}
