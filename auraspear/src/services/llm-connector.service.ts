import api from '@/lib/api'
import type {
  ApiResponse,
  AvailableAiConnector,
  CreateLlmConnectorInput,
  LlmConnectorRecord,
  UpdateLlmConnectorInput,
} from '@/types'
import type { AxiosResponse } from 'axios'

export const llmConnectorService = {
  getAll: async (): Promise<ApiResponse<LlmConnectorRecord[]>> => {
    const r: AxiosResponse<ApiResponse<LlmConnectorRecord[]>> = await api.get('/llm-connectors')
    return r.data
  },

  getById: async (id: string): Promise<ApiResponse<LlmConnectorRecord>> => {
    const r: AxiosResponse<ApiResponse<LlmConnectorRecord>> = await api.get(`/llm-connectors/${id}`)
    return r.data
  },

  create: async (data: CreateLlmConnectorInput): Promise<ApiResponse<LlmConnectorRecord>> => {
    const r: AxiosResponse<ApiResponse<LlmConnectorRecord>> = await api.post(
      '/llm-connectors',
      data
    )
    return r.data
  },

  update: async (
    id: string,
    data: UpdateLlmConnectorInput
  ): Promise<ApiResponse<LlmConnectorRecord>> => {
    const r: AxiosResponse<ApiResponse<LlmConnectorRecord>> = await api.patch(
      `/llm-connectors/${id}`,
      data
    )
    return r.data
  },

  delete: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    const r: AxiosResponse<ApiResponse<{ deleted: boolean }>> = await api.delete(
      `/llm-connectors/${id}`
    )
    return r.data
  },

  test: async (
    id: string
  ): Promise<ApiResponse<{ id: string; ok: boolean; details: string; testedAt: string }>> => {
    const r: AxiosResponse<
      ApiResponse<{ id: string; ok: boolean; details: string; testedAt: string }>
    > = await api.post(`/llm-connectors/${id}/test`)
    return r.data
  },

  toggle: async (id: string): Promise<ApiResponse<LlmConnectorRecord>> => {
    const r: AxiosResponse<ApiResponse<LlmConnectorRecord>> = await api.post(
      `/llm-connectors/${id}/toggle`
    )
    return r.data
  },

  getAvailable: async (): Promise<AvailableAiConnector[]> => {
    const r: AxiosResponse<ApiResponse<AvailableAiConnector[]>> = await api.get(
      '/connectors/ai-available'
    )
    return r.data.data ?? []
  },
}
