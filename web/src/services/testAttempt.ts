import api from '@/lib/api';
import {
  AttemptView,
  QuestionView,
  AnsweredView,
  StartAttemptRequest,
  SubmitAnswerRequest,
  SubmitAttemptRequest,
  CancelAttemptRequest
} from '@/types/testAttempt';

export class TestAttemptService {
  // Start a new test attempt
  static async startAttempt(data: StartAttemptRequest): Promise<AttemptView> {
    try {
      const response = await api.post('/api/v1/attempts/start', data);
      return response.data;
    } catch (error) {
      console.error('Failed to start test attempt:', error);
      throw error;
    }
  }

  // Get the next question in an attempt
  static async getNextQuestion(attemptId: string): Promise<{ attempt: AttemptView, question: QuestionView }> {
    try {
      const response = await api.get(`/api/v1/attempts/${attemptId}/question`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch next question:', error);
      throw error;
    }
  }

  // Submit an answer to the current question
  static async submitAnswer(
    attemptId: string,
    data: SubmitAnswerRequest
  ): Promise<{ attempt: AttemptView, answered: AnsweredView }> {
    try {
      const response = await api.post(`/api/v1/attempts/${attemptId}/answer`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to submit answer:', error);
      throw error;
    }
  }

  // Submit the entire test attempt
  static async submitAttempt(attemptId: string, data: SubmitAttemptRequest): Promise<AttemptView> {
    try {
      const response = await api.post(`/api/v1/attempts/${attemptId}/submit`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to submit test attempt:', error);
      throw error;
    }
  }

  // Cancel a test attempt
  static async cancelAttempt(attemptId: string, data: CancelAttemptRequest): Promise<AttemptView> {
    try {
      const response = await api.post(`/api/v1/attempts/${attemptId}/cancel`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel test attempt:', error);
      throw error;
    }
  }
}
