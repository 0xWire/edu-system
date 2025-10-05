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

export interface StartAttemptRequest {
  assignment_id: string;
  guest_name?: string;
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
