import type {
  AnswerPayload,
  AttemptPolicyView,
  AttemptView,
  NextQuestionResponse,
  QuestionView,
  StartAttemptRequest,
} from '@/types/testAttempt';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const AUTO_TEACHER_RESULTS_STORAGE_KEY = 'teacher-results-auto';

type MockQuestion = QuestionView & {
  correctSingle?: number;
  weight: number;
};

type InternalAttempt = {
  attempt: AttemptView;
  startedAt: number;
  answers: Record<string, AnswerPayload>;
};

export type AutoTeacherOpenCheck = {
  question_id: string;
  question_text: string;
  student_answer: string;
  ai_score: number;
  max_score: number;
  ai_notes: string[];
};

export type AutoTeacherResult = {
  attempt_id: string;
  assignment_id: string;
  student_name: string;
  submitted_at: string;
  objective_score: number;
  objective_max: number;
  open_score: number;
  open_max: number;
  total_score: number;
  total_max: number;
  open_checks: AutoTeacherOpenCheck[];
};

const DEFAULT_DURATION_SEC = 20 * 60;

const policy: AttemptPolicyView = {
  shuffle_questions: false,
  shuffle_answers: false,
  require_all_answered: true,
  lock_answer_on_confirm: true,
  disable_copy: false,
  disable_browser_back: false,
  show_elapsed_time: true,
  allow_navigation: false,
  question_time_limit_sec: 0,
  max_attempt_time_sec: DEFAULT_DURATION_SEC,
  reveal_score_mode: 'after_submit',
  reveal_solutions: true,
};

const questions: MockQuestion[] = [
  {
    id: 'mq-1',
    type: 'single',
    question_text: 'For matrix A=[[2,1],[1,2]], choose the correct eigenvalues.',
    options: [
      { id: 'a1', option_text: '1 and 3' },
      { id: 'a2', option_text: '0 and 4' },
      { id: 'a3', option_text: '2 and 2' },
      { id: 'a4', option_text: '-1 and 5' },
    ],
    correctSingle: 0,
    weight: 4,
  },
  {
    id: 'mq-2',
    type: 'single',
    question_text: 'Compute integral of (3x^2 - 4x + 1) on [0,2].',
    options: [
      { id: 'b1', option_text: '2' },
      { id: 'b2', option_text: '4' },
      { id: 'b3', option_text: '6' },
      { id: 'b4', option_text: '8' },
    ],
    correctSingle: 0,
    weight: 4,
  },
  {
    id: 'mq-3',
    type: 'text',
    question_text: 'Explain why every real symmetric matrix has an orthonormal eigenbasis.',
    options: [],
    weight: 4,
  },
  {
    id: 'mq-4',
    type: 'text',
    question_text: 'Describe how a basis change matrix transforms coordinates between two bases.',
    options: [],
    weight: 4,
  },
  {
    id: 'mq-5',
    type: 'text',
    question_text: 'State the chain rule and give one practical derivative example.',
    options: [],
    weight: 4,
  },
  {
    id: 'mq-6',
    type: 'text',
    question_text: 'Interpret the geometric meaning of a definite integral on interval [a,b].',
    options: [],
    weight: 4,
  },
  {
    id: 'mq-7',
    type: 'text',
    question_text: 'Give one short real-world application of eigenvalues in engineering or data science.',
    options: [],
    weight: 4,
  },
];

const textRubrics: Record<string, string[]> = {
  'mq-3': ['spectral theorem', 'orthogon', 'eigen'],
  'mq-4': ['basis', 'coordinate', 'matrix'],
  'mq-5': ['chain rule', 'derivative', 'composition'],
  'mq-6': ['area', 'integral', 'interval'],
  'mq-7': ['eigen', 'application', 'data'],
};

const attempts = new Map<string, InternalAttempt>();

const totalMaxScore = questions.reduce((sum, q) => sum + q.weight, 0);

function cloneAttempt(attempt: AttemptView): AttemptView {
  return JSON.parse(JSON.stringify(attempt)) as AttemptView;
}

function evaluateTextAnswer(question: MockQuestion, answerText: string): { score: number; notes: string[] } {
  const text = answerText.toLowerCase();
  const keywords = textRubrics[question.id] ?? [];
  const notes: string[] = [];

  let matches = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches += 1;
      notes.push(`Mentions \"${keyword}\".`);
    }
  }

  if (text.includes('because') || text.includes('therefore') || text.includes('hence')) {
    notes.push('Contains logical explanation structure.');
  } else {
    notes.push('Reasoning structure can be more explicit.');
  }

  const base = keywords.length === 0 ? 0 : Math.round((matches / keywords.length) * question.weight);
  const bonus = text.length > 120 ? 1 : 0;
  let score = base + bonus;

  if (score > question.weight) score = question.weight;
  if (score < 0) score = 0;

  if (matches === 0) {
    notes.push('Needs stronger domain vocabulary.');
  }

  return { score, notes };
}

function computeScores(internal: InternalAttempt): {
  total: number;
  objective: number;
  open: number;
  objectiveMax: number;
  openMax: number;
  openChecks: AutoTeacherOpenCheck[];
} {
  let total = 0;
  let objective = 0;
  let open = 0;
  let objectiveMax = 0;
  let openMax = 0;
  const openChecks: AutoTeacherOpenCheck[] = [];

  for (const question of questions) {
    const answer = internal.answers[question.id];

    if (question.type === 'single') {
      objectiveMax += question.weight;
      if (answer && typeof answer.selected === 'number' && answer.selected === question.correctSingle) {
        objective += question.weight;
        total += question.weight;
      }
      continue;
    }

    if (question.type === 'text') {
      openMax += question.weight;
      const studentAnswer = answer?.text ?? '';
      const evaluated = evaluateTextAnswer(question, studentAnswer);
      open += evaluated.score;
      total += evaluated.score;

      openChecks.push({
        question_id: question.id,
        question_text: question.question_text,
        student_answer: studentAnswer,
        ai_score: evaluated.score,
        max_score: question.weight,
        ai_notes: evaluated.notes,
      });
    }
  }

  return { total, objective, open, objectiveMax, openMax, openChecks };
}

function toScoredAttempt(internal: InternalAttempt): AttemptView {
  const next = cloneAttempt(internal.attempt);
  const elapsed = Math.floor((Date.now() - internal.startedAt) / 1000);
  next.time_left_sec = Math.max(DEFAULT_DURATION_SEC - elapsed, 0);

  if (next.time_left_sec <= 0 && next.status === 'active') {
    next.status = 'expired';
  }

  const scores = computeScores(internal);
  next.score = scores.total;
  next.max_score = totalMaxScore;

  return next;
}

function getQuestionByCursor(cursor: number): QuestionView | null {
  const found = questions[cursor];
  if (!found) return null;
  return {
    id: found.id,
    type: found.type,
    question_text: found.question_text,
    options: found.options,
  };
}

function persistTeacherResult(internal: InternalAttempt, finalAttempt: AttemptView): void {
  if (typeof window === 'undefined') {
    return;
  }

  const scores = computeScores(internal);
  const result: AutoTeacherResult = {
    attempt_id: finalAttempt.attempt_id,
    assignment_id: finalAttempt.assignment_id,
    student_name: finalAttempt.guest_name || 'Student',
    submitted_at: new Date().toISOString(),
    objective_score: scores.objective,
    objective_max: scores.objectiveMax,
    open_score: scores.open,
    open_max: scores.openMax,
    total_score: scores.total,
    total_max: totalMaxScore,
    open_checks: scores.openChecks,
  };

  window.localStorage.setItem(AUTO_TEACHER_RESULTS_STORAGE_KEY, JSON.stringify(result));
}

export const mockTestAttemptService = {
  async startAttempt(data: StartAttemptRequest): Promise<AttemptView> {
    await delay(500);

    const id = `mock-attempt-${Date.now()}`;
    const now = Date.now();

    const attempt: AttemptView = {
      attempt_id: id,
      assignment_id: data.assignment_id,
      status: 'active',
      version: 1,
      time_left_sec: DEFAULT_DURATION_SEC,
      total: questions.length,
      cursor: 0,
      guest_name: data.guest_name,
      score: 0,
      max_score: totalMaxScore,
      policy,
    };

    attempts.set(id, {
      attempt,
      startedAt: now,
      answers: {},
    });

    return cloneAttempt(attempt);
  },

  async getNextQuestion(attemptId: string): Promise<NextQuestionResponse> {
    await delay(350);

    const internal = attempts.get(attemptId);
    if (!internal) {
      throw new Error('attempt not found');
    }

    const attempt = toScoredAttempt(internal);
    internal.attempt = cloneAttempt(attempt);

    if (attempt.status !== 'active') {
      return { attempt, question: null, done: true };
    }

    const question = getQuestionByCursor(attempt.cursor);
    if (!question) {
      return { attempt, question: null, done: true };
    }

    return { attempt, question, done: false };
  },

  async submitAnswer(attemptId: string, data: { version: number; payload: AnswerPayload }): Promise<{ attempt: AttemptView }> {
    await delay(280);

    const internal = attempts.get(attemptId);
    if (!internal) {
      throw new Error('attempt not found');
    }

    const attempt = toScoredAttempt(internal);
    if (attempt.status !== 'active') {
      return { attempt };
    }

    const question = questions[attempt.cursor];
    if (question) {
      internal.answers[question.id] = data.payload;
      internal.attempt.cursor = Math.min(internal.attempt.cursor + 1, questions.length);
      internal.attempt.version += 1;
    }

    const updated = toScoredAttempt(internal);
    internal.attempt = cloneAttempt(updated);

    return { attempt: updated };
  },

  async submitAttempt(attemptId: string, _data: { version: number }): Promise<AttemptView> {
    await delay(360);
    void _data;

    const internal = attempts.get(attemptId);
    if (!internal) {
      throw new Error('attempt not found');
    }

    internal.attempt.status = 'submitted';
    internal.attempt.version += 1;

    const updated = toScoredAttempt(internal);
    updated.status = 'submitted';
    internal.attempt = cloneAttempt(updated);

    persistTeacherResult(internal, updated);

    return updated;
  },

  async cancelAttempt(attemptId: string, _data: { version: number }): Promise<AttemptView> {
    await delay(220);
    void _data;

    const internal = attempts.get(attemptId);
    if (!internal) {
      throw new Error('attempt not found');
    }

    internal.attempt.status = 'cancelled';
    internal.attempt.version += 1;

    const updated = toScoredAttempt(internal);
    updated.status = 'cancelled';
    internal.attempt = cloneAttempt(updated);

    return updated;
  },
};
