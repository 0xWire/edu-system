'use client';

import DashboardAIStudio from '@/components/DashboardAIStudio';
import { mockAIStudioService } from '@/components/automation/mockAiStudioService';

export default function AIStudioAutoPage() {
  return (
    <DashboardAIStudio
      service={mockAIStudioService}
      hideBackButton
      automation={{
        enabled: true,
        delayMs: 1000,
        material: {
          title: 'Math 101 Midterm Builder',
          sourceUrl: 'https://university.edu/math/linear-algebra/week4',
          text: 'Generate a university-level assessment on eigenvalues, orthogonality, basis transformations, derivatives, and definite integrals. Include one proof-style open question.',
          language: 'en',
          note: 'Target first-year students. Keep rubric clear for open answers.',
        },
        generation: {
          variantsCount: '2',
          questionsPerVariant: '12',
          difficulty: 'mixed',
          audience: 'first-year university students',
          outputLanguage: 'en',
          includeExplanations: true,
          includePracticeTest: true,
        },
      }}
    />
  );
}
