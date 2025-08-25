import api from '@/lib/api';
import { GetTestResponse, CreateTestRequest } from '@/types/test';

export class TestService {
  // Get all tests
  static async getAllTests(): Promise<GetTestResponse[]> {
    try {
      const response = await api.get('/api/v1/tests');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tests:', error);
      throw error;
    }
  }

  // Get a specific test by ID
  static async getTest(id: string): Promise<GetTestResponse> {
    try {
      const response = await api.get(`/api/v1/tests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch test:', error);
      throw error;
    }
  }

  // Create a new test
  static async createTest(testData: CreateTestRequest): Promise<void> {
    try {
      await api.post('/api/v1/tests', testData);
    } catch (error) {
      console.error('Failed to create test:', error);
      throw error;
    }
  }

  // Update a test
  static async updateTest(id: string, testData: Partial<CreateTestRequest>): Promise<void> {
    try {
      await api.put(`/api/v1/tests/${id}`, testData);
    } catch (error) {
      console.error('Failed to update test:', error);
      throw error;
    }
  }

  // Delete a test
  static async deleteTest(id: string): Promise<void> {
    try {
      await api.delete(`/api/v1/tests/${id}`);
    } catch (error) {
      console.error('Failed to delete test:', error);
      throw error;
    }
  }
}
