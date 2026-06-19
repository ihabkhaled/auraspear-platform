import { Search } from 'lucide-react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import type { EntityFiltersProps } from '@/types'

export function EntityFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  t,
}: EntityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.currentTarget.value)}
          className="ps-9"
        />
      </div>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t('filterType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allTypes')}</SelectItem>
          <SelectItem value="ip">{t('typeIp')}</SelectItem>
          <SelectItem value="domain">{t('typeDomain')}</SelectItem>
          <SelectItem value="hostname">{t('typeHostname')}</SelectItem>
          <SelectItem value="user">{t('typeUser')}</SelectItem>
          <SelectItem value="email">{t('typeEmail')}</SelectItem>
          <SelectItem value="hash">{t('typeHash')}</SelectItem>
          <SelectItem value="url">{t('typeUrl')}</SelectItem>
          <SelectItem value="process">{t('typeProcess')}</SelectItem>
          <SelectItem value="file">{t('typeFile')}</SelectItem>
          <SelectItem value="asset">{t('typeAsset')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
