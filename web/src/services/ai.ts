import api from '@/lib/api';
import type { AIProviderStatus, AIPipelineRunRequest, AIPipelineRunResponse } from '@/types/ai';

export class AIService {
  static async getProviders(): Promise<AIProviderStatus[]> {
    const response = await api.get('/api/v1/ai/providers');
    return response.data as AIProviderStatus[];
  }

  static async runPipeline(payload: AIPipelineRunRequest): Promise<AIPipelineRunResponse> {
    const response = await api.post('/api/v1/ai/pipeline', payload);
    return response.data as AIPipelineRunResponse;
  }
}
