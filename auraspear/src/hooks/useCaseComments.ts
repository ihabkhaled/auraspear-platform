import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { COMMENTS_PAGE_SIZE } from '@/lib/constants/cases'
import { requirePermission } from '@/lib/permissions'
import { caseService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CreateCaseCommentInput, UpdateCaseCommentInput } from '@/types'

export function useCaseComments(caseId: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useInfiniteQuery({
    queryKey: ['caseComments', tenantId, caseId],
    queryFn: ({ pageParam }) =>
      caseService.getComments(caseId, { page: pageParam, limit: COMMENTS_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page ?? 1) + 1
      }
      return
    },
    enabled: caseId.length > 0,
  })
}

export function useCreateCaseComment(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (data: CreateCaseCommentInput) => {
      requirePermission(permissions, Permission.CASES_ADD_COMMENT)
      return caseService.createComment(caseId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseComments', tenantId, caseId] })
      void queryClient.invalidateQueries({ queryKey: ['cases', tenantId, caseId] })
    },
  })
}

export function useUpdateCaseComment(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCaseCommentInput }) => {
      requirePermission(permissions, Permission.CASES_ADD_COMMENT)
      return caseService.updateComment(caseId, commentId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseComments', tenantId, caseId] })
    },
  })
}

export function useDeleteCaseComment(caseId: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (commentId: string) => {
      requirePermission(permissions, Permission.CASES_DELETE_COMMENT)
      return caseService.deleteComment(caseId, commentId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['caseComments', tenantId, caseId] })
    },
  })
}

export function useMentionableUsers(caseId: string, query: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['mentionableUsers', tenantId, caseId, query],
    queryFn: () => caseService.searchMentionableUsers(caseId, query),
    enabled: caseId.length > 0 && query.length >= 1,
    staleTime: 30 * 1000,
  })
}
