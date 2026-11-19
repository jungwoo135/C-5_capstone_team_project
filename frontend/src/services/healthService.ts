import { apiRequest } from './api';
import type { HealthResponse } from '../types/api';

export async function checkBackendHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health');
}