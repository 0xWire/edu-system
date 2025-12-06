export interface Answer {
  answer: number;
  answer_text: string;
  image_url?: string;
}

export interface Question {
  id: string;
  author?: string;
  question_text: string;
  options: Answer[];
  correct_option: number;
  correct_options?: number[];
  type?: 'single' | 'multi' | 'text' | 'code';
  weight?: number;
  image_url?: string;
}

export interface Test {
  test_id: string;
  author: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface CreateTestRequest {
  author: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface QuestionFormData {
  question_text: string;
  options: AnswerFormData[];
  correct_option: number;
  correct_options?: number[];
  type: 'single' | 'multi' | 'text' | 'code';
  weight?: number;
  image_url?: string;
  image_preview?: string;
}

export interface AnswerFormData {
  answer_text: string;
  image_url?: string;
  image_preview?: string;
}

export interface CreateTestResponse {
  success: boolean;
  error?: string;
}

export type ScoreRevealMode = 'never' | 'after_submit' | 'always';

export interface AttemptPolicyConfig {
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  max_questions: number;
  question_time_limit_sec: number;
  max_attempt_time_sec: number;
  require_all_answered: boolean;
  lock_answer_on_confirm: boolean;
  disable_copy: boolean;
  disable_browser_back: boolean;
  show_elapsed_time: boolean;
  allow_navigation: boolean;
  reveal_score_mode: ScoreRevealMode;
  reveal_solutions: boolean;
  max_attempts: number;
}

export interface TestSettings {
  duration_sec: number;
  allow_guests: boolean;
  available_from?: string | null;
  available_until?: string | null;
  attempt_policy: AttemptPolicyConfig;
}

export interface GetTestResponse {
  test_id: string;
  author: string;
  title: string;
  description: string;
  duration_sec: number;
  allow_guests: boolean;
  available_from?: string | null;
  available_until?: string | null;
  attempt_policy: AttemptPolicyConfig;
  questions: QuestionResponse[];
}

export interface QuestionResponse {
  id: string;
  question_text: string;
  options: OptionResponse[];
  correct_option: number;
  correct_options?: number[];
  type?: 'single' | 'multi' | 'text' | 'code';
  weight?: number;
  image_url?: string;
}

export interface OptionResponse {
  id: string;
  option_text: string;
  image_url?: string;
}

export interface UpdateTestAttemptPolicyPayload extends Partial<AttemptPolicyConfig> {
  question_time_limit_sec?: number;
  max_attempt_time_sec?: number;
}

export interface UpdateTestSettingsRequest {
  duration_sec?: number;
  allow_guests?: boolean;
  available_from?: string | null;
  available_until?: string | null;
  attempt_policy?: UpdateTestAttemptPolicyPayload;
}

export interface UpdateTestRequest {
  title?: string;
  description?: string;
  questions?: QuestionFormData[];
  settings?: UpdateTestSettingsRequest;
}
