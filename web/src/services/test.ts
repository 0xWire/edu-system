import api from '@/lib/api';
import type { GetTestResponse, CreateTestRequest, CreateTestResponse } from '@/types/test';

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

  static async updateTest(id: string, testData: Partial<CreateTestRequest>): Promise<boolean> {
    try {
      await api.put(`/api/v1/tests/${id}`, testData);
      return true;
    } catch (error) {
      console.error('Failed to update test:', error);
      return false;
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
}
