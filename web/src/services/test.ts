import api from '@/lib/api';
import type {
  GetTestResponse,
  CreateTestRequest,
  CreateTestResponse,
  UpdateTestRequest,
  QuestionFormData,
  AnswerFormData,
  ImportTestResponse
} from '@/types/test';

export class TestService {
  static async getMyTests(): Promise<GetTestResponse[]> {
    const response = await api.get('/api/v1/tests');
    return response.data;
  }

  static async getTest(id: string): Promise<GetTestResponse> {
    const response = await api.get(`/api/v1/tests/${id}`);
    return response.data;
  }

  static async createTest(testData: CreateTestRequest): Promise<CreateTestResponse> {
    try {
      await api.post('/api/v1/tests', testData);
      return { success: true };
    } catch (error) {
      console.error('Failed to create test:', error);
      return { success: false, error: 'Failed to create test' };
    }
  }

  static async updateTest(id: string, testData: UpdateTestRequest): Promise<{ success: boolean; message?: string }> {
    try {
      const payload: Record<string, unknown> = {};

      if (typeof testData.title === 'string') {
        payload.title = testData.title;
      }
      if (typeof testData.description === 'string') {
        payload.description = testData.description;
      }

      if (testData.questions) {
        payload.questions = testData.questions.map((q: QuestionFormData) => ({
          question_text: q.question_text,
          correct_option: q.correct_option,
          correct_options: q.correct_options && q.correct_options.length ? q.correct_options : undefined,
          type: q.type,
          weight: q.weight,
          image_url: q.image_url,
          options: q.options.map((opt: AnswerFormData, idx: number) => ({
            answer: idx,
            answer_text: opt.answer_text,
            image_url: opt.image_url
          }))
        }));
      }

      if (testData.settings) {
        const settingsPayload: Record<string, unknown> = {};

        if (typeof testData.settings.duration_sec === 'number') {
          settingsPayload.duration_sec = testData.settings.duration_sec;
        }
        if (typeof testData.settings.allow_guests === 'boolean') {
          settingsPayload.allow_guests = testData.settings.allow_guests;
        }
        if ('available_from' in testData.settings) {
          settingsPayload.available_from = testData.settings.available_from ?? null;
        }
        if ('available_until' in testData.settings) {
          settingsPayload.available_until = testData.settings.available_until ?? null;
        }
        if (testData.settings.attempt_policy) {
          settingsPayload.attempt_policy = { ...testData.settings.attempt_policy };
        }

        if (Object.keys(settingsPayload).length > 0) {
          payload.settings = settingsPayload;
        }
      }

      await api.put(`/api/v1/tests/${id}`, payload);
      return { success: true };
    } catch (error) {
      console.error('Failed to update test:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        return {
          success: false,
          message: axiosErr.response?.data?.message
        };
      }
      return { success: false };
    }
  }

  static async deleteTest(id: string): Promise<boolean> {
    try {
      await api.delete(`/api/v1/tests/${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete test:', error);
      return false;
    }
  }

  static async downloadTemplate(): Promise<Blob> {
    const response = await api.get('/api/v1/tests/template/csv', {
      responseType: 'blob'
    });
    return response.data as Blob;
  }

  static async importFromCsv(
    file: File
  ): Promise<{ success: boolean; data?: ImportTestResponse; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/v1/tests/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const payload = (response.data?.data ?? response.data) as ImportTestResponse;
      return { success: true, data: payload };
    } catch (error) {
      console.error('Failed to import test:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        return {
          success: false,
          error: axiosErr.response?.data?.message
        };
      }
      return { success: false };
    }
  }
}
