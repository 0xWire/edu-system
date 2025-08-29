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
  options: { answer_text: string }[];
  correct_option: number;
  image_url?: string;
}

export interface AnswerFormData {
  answer_text: string;
}

export interface CreateTestResponse {
  success: boolean;
  error?: string;
  test?: Test;
}

export interface GetTestResponse {
  test_id: string;
  author: string;
  title: string;
  description: string;
  questions: QuestionResponse[];
}

export interface QuestionResponse {
  id: string;
  question_text: string;
  options: OptionResponse[];
  correct_option: number;
  image_url?: string;
}

export interface OptionResponse {
  id: string;
  option_text: string;
  image_url?: string;
}
