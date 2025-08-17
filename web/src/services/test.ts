import api from '@/lib/api';
import {
  CreateTestRequest,
  GetTestResponse,
  UpdateTestRequest,
  DeleteTestRequest,
  TestListResponse
} from '@/types/test';
import { ErrorResponse, SuccessResponse } from '@/types/auth';

export class TestService {
  // Create a new test
  static async createTest(testData: CreateTestRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post<SuccessResponse>('/api/v1/tests', testData);
      return { success: true };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to create test'
      };
    }
  }

  // Get a specific test by ID
  static async getTest(testId: string): Promise<{ success: boolean; data?: GetTestResponse; error?: string }> {
    try {
      const response = await api.get<GetTestResponse>(`/api/v1/tests/${testId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to fetch test'
      };
    }
  }

  // Get all tests
  static async getAllTests(): Promise<{ success: boolean; data?: GetTestResponse[]; error?: string }> {
    try {
      const response = await api.get<GetTestResponse[]>('/api/v1/tests');
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to fetch tests'
      };
    }
  }

  // Update a test
  static async updateTest(testId: string, testData: Partial<UpdateTestRequest>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = { test_id: testId, ...testData };
      const response = await api.put<SuccessResponse>(`/api/v1/tests/${testId}`, updateData);
      return { success: true };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to update test'
      };
    }
  }

  // Delete a test
  static async deleteTest(testId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete<SuccessResponse>(`/api/v1/tests/${testId}`);
      return { success: true };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to delete test'
      };
    }
  }

  // Get tests by current user (will be filtered by backend based on JWT)
  static async getMyTests(): Promise<{ success: boolean; data?: GetTestResponse[]; error?: string }> {
    try {
      // Since we don't have a specific "my tests" endpoint yet, we'll use the same endpoint
      // and filter on the frontend by author name for now
      const response = await api.get<GetTestResponse[]>('/api/v1/tests');
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Failed to fetch your tests'
      };
    }
  }
}
