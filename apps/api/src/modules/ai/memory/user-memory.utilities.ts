import type { ListMemoriesOptions } from './memory.types'

export function buildUserMemoryWhere(
  tenantId: string,
  userId: string,
  options: ListMemoriesOptions
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId, userId, isDeleted: false }
  if (options.category) {
    where['category'] = options.category
  }
  if (options.search) {
    where['content'] = { contains: options.search, mode: 'insensitive' }
  }
  return where
}

export function buildAdminMemoryWhere(
  tenantId: string,
  options: ListMemoriesOptions
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId, isDeleted: false }
  if (options.userId) {
    where['userId'] = options.userId
  }
  if (options.category) {
    where['category'] = options.category
  }
  if (options.search) {
    where['content'] = { contains: options.search, mode: 'insensitive' }
  }
  return where
}
