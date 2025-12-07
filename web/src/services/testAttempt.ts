import api from '@/lib/api';
import {
  AttemptView,
  AnsweredView,
  StartAttemptRequest,
  SubmitAnswerRequest,
  SubmitAttemptRequest,
  CancelAttemptRequest,
  AttemptSummary,
  NextQuestionResponse,
  AttemptDetails
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
  static async getNextQuestion(attemptId: string): Promise<NextQuestionResponse> {
    try {
      const response = await api.get(`/api/v1/attempts/${attemptId}/question`);
      if (response.data?.done) {
        return {
          attempt: response.data.attempt ?? null,
          question: null,
          done: true
        };
      }
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

  static async listAttempts(assignmentId: string): Promise<AttemptSummary[]> {
    try {
      const response = await api.get('/api/v1/attempts', {
        params: { assignment_id: assignmentId }
      });
      return response.data?.attempts ?? [];
    } catch (error) {
      console.error('Failed to load attempt summaries:', error);
      throw error;
    }
  }

  static async getAttemptDetails(attemptId: string): Promise<AttemptDetails> {
    try {
      const response = await api.get(`/api/v1/attempts/${attemptId}/details`);
      return response.data;
    } catch (error) {
      console.error('Failed to load attempt details:', error);
      throw error;
    }
  }

  static async gradeAnswer(
    attemptId: string,
    data: { question_id: string; score: number; is_correct?: boolean }
  ): Promise<void> {
    try {
      await api.post(`/api/v1/attempts/${attemptId}/grade`, data);
    } catch (error) {
      console.error('Failed to grade answer:', error);
      throw error;
    }
  }

  static async exportAttempts(assignmentId: string, format: 'csv' | 'xlsx'): Promise<Blob> {
    const response = await api.get('/api/v1/attempts/export', {
      params: { assignment_id: assignmentId, format },
      responseType: 'blob'
    });
    return response.data as Blob;
  }
}
