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

export interface CreateTestRequest {
  author: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface GetTestResponse {
  author: string;
  test_id: string;
  title: string;
  description: string;
  questions: QuestionResponse[];
}

export interface UpdateTestRequest {
  test_id: string;
  title?: string;
  description?: string;
  questions?: Question[];
}

export interface DeleteTestRequest {
  test_id: string;
}

// Form types for frontend
export interface TestFormData {
  title: string;
  description: string;
  questions: QuestionFormData[];
}

export interface QuestionFormData {
  question_text: string;
  options: AnswerFormData[];
  correct_option: number;
  image_url?: string;
}

export interface AnswerFormData {
  answer_text: string;
  image_url?: string;
}

// Response types
export interface TestListResponse {
  tests: GetTestResponse[];
  total: number;
}
