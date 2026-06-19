import { useMutation } from '@tanstack/react-query'
import { knowledgeService } from '@/services'

export function useAiGenerateRunbook(connector?: string) {
  return useMutation({
    mutationFn: (description: string) => knowledgeService.aiGenerate(description, connector),
  })
}

export function useAiSearchKnowledge(connector?: string) {
  return useMutation({
    mutationFn: (query: string) => knowledgeService.aiSearch(query, connector),
  })
}
