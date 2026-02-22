export type DemoQuestion = {
  id: string;
  kind: "single" | "open";
  text: string;
  options?: string[];
  correctOption?: string;
  maxScore: number;
};

export type DemoAttempt = {
  id: string;
  studentName: string;
  assignmentId: string;
  objectiveScore: number;
  objectiveMax: number;
  openAnswer: string;
  openScore?: number;
  openMax: number;
  status: "submitted" | "reviewed" | "graded";
  submittedAt: string;
};

export const DEMO_STORAGE_KEY = "demo_math_latest_attempt";

export const demoAssignment = {
  id: "math-demo-2026-a",
  course: "Math 101: Linear Algebra and Calculus",
  title: "Midterm Diagnostic Test",
  durationMin: 20,
  teacherName: "Dr. Elena Smirnova",
  shareUrl: "/demo-flow/student-attempt?assignment=math-demo-2026-a",
};

export const demoMaterial = {
  title: "Math 101 Midterm Builder",
  sourceUrl: "https://university.edu/math/linear-algebra/week4",
  text:
    "Generate an assessment for first-year university students. Focus on eigenvalues, orthogonality, basis transformations, derivatives, and definite integrals. Include one open-ended proof question.",
  language: "en",
  note: "Balance conceptual and procedural tasks. Include clear scoring rubric for open answer.",
  resources: [
    "https://university.edu/math/linear-algebra/week4",
    "https://university.edu/math/calculus/definite-integrals",
    "https://drive.university.edu/courses/math101/midterm-bank.pdf",
  ],
};

export const generationSteps = [
  "Parsing source materials",
  "Extracting core concepts",
  "Building balanced blueprint",
  "Generating objective and open questions",
  "Running validation and quality checks",
  "Publishing assignment link",
];

export const demoQuestions: DemoQuestion[] = [
  {
    id: "q1",
    kind: "single",
    text: "For matrix A = [[2, 1], [1, 2]], what are the eigenvalues?",
    options: ["1 and 3", "0 and 4", "2 and 2", "-1 and 5"],
    correctOption: "1 and 3",
    maxScore: 4,
  },
  {
    id: "q2",
    kind: "single",
    text: "Compute integral of (3x^2 - 4x + 1) from 0 to 2.",
    options: ["2", "4", "6", "8"],
    correctOption: "2",
    maxScore: 4,
  },
  {
    id: "q3",
    kind: "open",
    text: "Explain why every real symmetric matrix has an orthonormal eigenbasis.",
    maxScore: 8,
  },
];

export const baseTeacherAttempts: DemoAttempt[] = [
  {
    id: "att-001",
    studentName: "Aisha N.",
    assignmentId: demoAssignment.id,
    objectiveScore: 7,
    objectiveMax: 8,
    openAnswer: "Strong argument referencing spectral theorem and orthogonality.",
    openScore: 6,
    openMax: 8,
    status: "graded",
    submittedAt: "2026-02-22T09:14:00Z",
  },
  {
    id: "att-002",
    studentName: "Daniel K.",
    assignmentId: demoAssignment.id,
    objectiveScore: 6,
    objectiveMax: 8,
    openAnswer: "Correct intuition but weak proof structure.",
    openScore: 5,
    openMax: 8,
    status: "graded",
    submittedAt: "2026-02-22T09:18:00Z",
  },
];

export function calculateObjectiveScore(answers: Record<string, string>): { score: number; max: number } {
  let score = 0;
  let max = 0;

  for (const q of demoQuestions) {
    if (q.kind !== "single") continue;
    max += q.maxScore;
    if (answers[q.id] && answers[q.id] === q.correctOption) {
      score += q.maxScore;
    }
  }

  return { score, max };
}

export function evaluateOpenAnswerAI(answer: string): {
  suggestedScore: number;
  maxScore: number;
  rationale: string[];
} {
  const lower = answer.toLowerCase();
  let score = 0;
  const rationale: string[] = [];

  if (lower.includes("spectral theorem")) {
    score += 3;
    rationale.push("Mentions spectral theorem explicitly.");
  } else {
    rationale.push("No explicit spectral theorem mention.");
  }

  if (lower.includes("orthogon")) {
    score += 2;
    rationale.push("Explains orthogonality of eigenvectors.");
  } else {
    rationale.push("Orthogonality argument is missing or weak.");
  }

  if (lower.includes("eigen")) {
    score += 2;
    rationale.push("Uses eigenvalue/eigenvector vocabulary correctly.");
  } else {
    rationale.push("Needs clearer eigenvalue terminology.");
  }

  if (lower.includes("proof") || lower.includes("because") || lower.includes("therefore")) {
    score += 1;
    rationale.push("Includes logical explanation structure.");
  } else {
    rationale.push("Argument structure could be more formal.");
  }

  if (score > 8) score = 8;

  return {
    suggestedScore: score,
    maxScore: 8,
    rationale,
  };
}
