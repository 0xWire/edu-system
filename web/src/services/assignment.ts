import api from '@/lib/api';
import type { AssignmentView, CreateAssignmentRequest } from '@/types/assignment';

export class AssignmentService {
  static async createAssignment(data: CreateAssignmentRequest): Promise<AssignmentView> {
    const response = await api.post('/api/v1/assignments', data);
    return response.data;
  }

  static async getMyAssignments(): Promise<AssignmentView[]> {
    const response = await api.get('/api/v1/assignments');
    return response.data;
  }

  static async getAssignment(id: string): Promise<AssignmentView> {
    const response = await api.get(`/api/v1/assignments/${id}`);
    return response.data;
  }
}
