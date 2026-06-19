'use client'

import { Search, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        className="ps-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => onChange('')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
