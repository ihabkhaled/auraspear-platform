import type { Column, RunbookColumnTranslations, RunbookRecord } from '@/types'

export function buildRunbookColumns(ct: RunbookColumnTranslations): Column<RunbookRecord>[] {
  return [
    { key: 'title', label: ct.title, sortable: true },
    { key: 'category', label: ct.category, sortable: true },
    { key: 'tags', label: ct.tags },
    { key: 'createdBy', label: ct.createdBy },
    { key: 'updatedAt', label: ct.updatedAt, sortable: true },
  ]
}
