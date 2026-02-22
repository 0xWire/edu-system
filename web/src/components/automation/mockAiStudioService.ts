import type {
  AIPipelineRunRequest,
  AIPipelineRunResponse,
  AIProviderStatus,
} from '@/types/ai';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const providers: AIProviderStatus[] = [
  { name: 'openai', configured: true, model: 'gpt-4o-mini' },
  { name: 'gemini', configured: true, model: 'gemini-2.0-flash' },
  { name: 'deepseek', configured: false, model: 'deepseek-chat' },
  { name: 'openrouter', configured: false, model: 'openai/gpt-4o-mini' },
  { name: 'local', configured: false, model: 'llama3.1:8b-instruct' },
];

export const mockAIStudioService = {
  async getProviders(): Promise<AIProviderStatus[]> {
    await delay(450);
    return providers;
  },

  async runPipeline(payload: AIPipelineRunRequest): Promise<AIPipelineRunResponse> {
    await delay(2200);

    const title = payload.material.title || 'Math 101 Materials';
    const audience = payload.generation_config?.audience || 'students';
    const variantsCount = payload.generation_config?.variants_count || 3;
    const questionsPerVariant = payload.generation_config?.questions_per_variant || 12;

    return {
      plan: {
        summary: `Plan generated for ${title} focused on linear algebra and calculus foundations.`,
        learning_objectives: [
          'Compute eigenvalues and eigenvectors for small matrices',
          'Interpret orthogonality and basis transformations',
          'Solve fundamental derivative and integral tasks',
          'Construct concise mathematical proof-style explanations',
        ],
        topic_blocks: [
          { topic: 'Eigenvalues and diagonalization', weight_percent: 35, key_facts: ['Spectral theorem', 'Orthogonal bases'] },
          { topic: 'Vector spaces and basis change', weight_percent: 25, key_facts: ['Span', 'Linear independence'] },
          { topic: 'Calculus basics', weight_percent: 40, key_facts: ['Derivatives', 'Definite integrals'] },
        ],
        test_blueprint: {
          variants_count: variantsCount,
          questions_per_variant: questionsPerVariant,
          question_type_targets: [
            { type: 'single', count: Math.max(questionsPerVariant - 2, 1), focus: 'fast objective checks' },
            { type: 'text', count: 1, focus: 'open-ended reasoning' },
            { type: 'multi', count: 1, focus: 'concept combinations' },
          ],
        },
        assumptions: ['Learners are first-year university students', 'Core topics were covered in lectures'],
        risks: ['Open-ended answers require rubric-based teacher review'],
      },
      draft: {
        test_variants: [
          {
            title: 'Variant A',
            instructions: 'Answer all objective questions and provide short proof for open task.',
            questions: [
              {
                question: 'For A=[[2,1],[1,2]], what are eigenvalues?',
                type: 'single',
                options: ['1 and 3', '0 and 4', '2 and 2', '-1 and 5'],
                correct_answers: [0],
                explanation: 'Characteristic polynomial gives λ=1 and λ=3.',
              },
              {
                question: 'Compute ∫(3x^2-4x+1) dx on [0,2].',
                type: 'single',
                options: ['2', '4', '6', '8'],
                correct_answers: [0],
                explanation: 'Evaluate antiderivative x^3-2x^2+x from 0 to 2.',
              },
              {
                question: 'Explain why real symmetric matrices are orthogonally diagonalizable.',
                type: 'text',
                explanation: 'Expect mention of spectral theorem and orthonormal eigenbasis.',
              },
            ],
          },
        ],
        study_notes: {
          title: 'Math 101 Midterm Notes',
          summary: 'Focus on spectral theorem, vector space fundamentals, and basic integral computation.',
          key_points: ['Symmetric => real eigenvalues', 'Orthogonality of eigenspaces', 'Fundamental derivative rules'],
          common_mistakes: ['Incorrect characteristic polynomial', 'Skipping justification steps'],
          preparation_advice: ['Practice 2x2 and 3x3 examples', 'Write proof sketches in 4-5 lines'],
        },
        practice_test: {
          title: 'Quick Practice Set',
          questions: [
            {
              question: 'Choose basis vector set that spans R^2.',
              type: 'single',
              options: ['(1,0),(0,1)', '(1,1),(2,2)', '(0,0),(1,0)', '(1,2),(2,4)'],
              correct_answers: [0],
            },
          ],
        },
      },
      validation: {
        is_aligned: true,
        alignment_score: 0.93,
        issues: [
          {
            severity: 'low',
            location: 'Variant A / Q3',
            problem: 'Rubric phrasing can be made more explicit.',
            recommendation: 'Add explicit point breakdown for theorem mention and logical structure.',
          },
        ],
        missing_topics: [],
        extra_topics: [],
        summary: `Generated content is aligned for ${audience} and ready for teacher review.`,
      },
      final: {
        teacher_summary:
          'Assessment is ready. Objective items are auto-gradable; open responses should use AI suggestion and teacher final approval.',
        ready_for_use: true,
        applied_fixes: ['Balanced objective/open ratio', 'Standardized option formatting'],
        unresolved_warnings: [],
        test_variants: [
          {
            title: 'Variant A (Final)',
            instructions: 'Time limit: 20 minutes. Submit all answers.',
            questions: [
              {
                question: 'For A=[[2,1],[1,2]], what are eigenvalues?',
                type: 'single',
                options: ['1 and 3', '0 and 4', '2 and 2', '-1 and 5'],
                correct_answers: [0],
                explanation: 'Characteristic polynomial gives λ=1 and λ=3.',
              },
              {
                question: 'Compute ∫(3x^2-4x+1) dx on [0,2].',
                type: 'single',
                options: ['2', '4', '6', '8'],
                correct_answers: [0],
                explanation: 'Evaluate antiderivative x^3-2x^2+x from 0 to 2.',
              },
              {
                question: 'Explain why real symmetric matrices are orthogonally diagonalizable.',
                type: 'text',
                explanation: 'Expect mention of spectral theorem and orthonormal eigenbasis.',
              },
            ],
          },
        ],
        study_notes: {
          title: 'Math 101 Midterm Notes',
          summary: 'Teacher-ready summary for revision session.',
          key_points: ['Spectral theorem', 'Orthogonal diagonalization', 'Definite integrals'],
          common_mistakes: ['Missing proof rationale', 'Arithmetic errors'],
          preparation_advice: ['Practice concise proof statements', 'Review linear algebra fundamentals'],
        },
        practice_test: {
          title: 'Quick Practice Set',
          questions: [
            {
              question: 'Choose basis vector set that spans R^2.',
              type: 'single',
              options: ['(1,0),(0,1)', '(1,1),(2,2)', '(0,0),(1,0)', '(1,2),(2,4)'],
              correct_answers: [0],
            },
          ],
        },
      },
      provider_trace: [
        { layer: 'plan', provider: 'gemini', model: 'gemini-2.0-flash', attempts: 1, fallback_used: false },
        { layer: 'generate', provider: 'openai', model: 'gpt-4o-mini', attempts: 1, fallback_used: false },
        { layer: 'validate', provider: 'gemini', model: 'gemini-2.0-flash', attempts: 1, fallback_used: false },
        { layer: 'refine', provider: 'openai', model: 'gpt-4o-mini', attempts: 1, fallback_used: false },
      ],
    };
  },
};
