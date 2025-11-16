export interface AttemptPolicyView {
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  require_all_answered: boolean;
  lock_answer_on_confirm: boolean;
  disable_copy: boolean;
  disable_browser_back: boolean;
  show_elapsed_time: boolean;
  allow_navigation: boolean;
  question_time_limit_sec: number;
  max_attempt_time_sec: number;
  reveal_score_mode: 'never' | 'after_submit' | 'always';
  reveal_solutions: boolean;
}

export interface AttemptView {
  attempt_id: string;
  assignment_id: string;
  status: string;
  version: number;
  time_left_sec: number;
  total: number;
  cursor: number;
  guest_name?: string;
  score?: number;
  max_score?: number;
  policy?: AttemptPolicyView | null;
}

export interface QuestionView {
  id: string;
  question_text: string;
  image_url?: string;
  options: OptionView[];
}

export interface OptionView {
  id: string;
  option_text: string;
  image_url?: string;
}

export interface AnsweredView {
  question_id: string;
}

export interface NextQuestionResponse {
  attempt: AttemptView | null;
  question: QuestionView | null;
  done?: boolean;
}

export interface StartAttemptRequest {
  assignment_id: string;
  guest_name?: string;
  fingerprint?: string;
}

export interface AnswerPayload {
  kind: "single" | "multi" | "text" | "code";
  selected?: number; // For single choice
  selected_options?: number[]; // For multi choice
  text?: string; // For text answers
  code?: {
    lang: string;
    body: string;
  }; // For code answers
}

export interface SubmitAnswerRequest {
  version: number;
  payload: AnswerPayload;
}

export interface SubmitAttemptRequest {
  version: number;
}

export interface CancelAttemptRequest {
  version: number;
}

export interface AttemptSummary {
  attempt_id: string;
  assignment_id: string;
  test_id: string;
  status: string;
  started_at: string;
  submitted_at?: string;
  expired_at?: string;
  duration_sec: number;
  score: number;
  max_score: number;
  participant: AttemptParticipant;
}

export interface AttemptParticipant {
  kind: 'user' | 'guest';
  name: string;
  user_id?: number;
}

export interface AttemptDetails {
  attempt: AttemptDetailsMeta;
  answers: AttemptAnswer[];
}

export interface AttemptDetailsMeta {
  attempt_id: string;
  assignment_id: string;
  test_id: string;
  status: string;
  started_at: string;
  submitted_at?: string;
  expired_at?: string;
  duration_sec: number;
  score: number;
  max_score: number;
  participant: AttemptParticipant;
}

export interface AttemptAnswer {
  question_id: string;
  question_text: string;
  image_url?: string;
  kind: 'single' | 'multi' | 'text' | 'code' | string;
  options?: AttemptAnswerOption[];
  text_answer?: string;
  code_answer?: CodeAnswerView;
  is_correct?: boolean;
  score?: number;
}

export interface AttemptAnswerOption {
  id: string;
  option_text: string;
  image_url?: string;
  selected: boolean;
}

export interface CodeAnswerView {
  lang: string;
  body: string;
}
