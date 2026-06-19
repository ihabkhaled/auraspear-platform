'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useAvailableAiConnectors } from '@/hooks'
import { cn } from '@/lib/utils'
import type { AvailableAiConnector } from '@/types'

/**
 * Self-contained AI connector dropdown.
 * Calls useAvailableAiConnectors() internally — just drop <AiConnectorSelect /> anywhere.
 * Selection is global (Zustand store) so all AI surfaces share the same connector choice.
 *
 * For controlled usage (e.g. per-thread override), pass connectors/value/onChange props.
 */
export function AiConnectorSelect({
  connectors,
  value,
  onChange,
  placeholder,
  className,
  showDisabledState,
}: {
  connectors?: AvailableAiConnector[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  showDisabledState?: boolean
}) {
  const hook = useAvailableAiConnectors()

  const resolvedConnectors = connectors ?? hook.availableConnectors
  const resolvedValue = value ?? hook.selectedConnector
  const resolvedOnChange = onChange ?? hook.setSelectedConnector

  return (
    <Select value={resolvedValue} onValueChange={resolvedOnChange}>
      <SelectTrigger className={cn('h-7 w-full text-xs sm:w-[160px]', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {resolvedConnectors.map(c => {
          const isDisabledItem = !c.enabled && c.key !== 'default'
          return (
            <SelectItem
              key={c.key}
              value={c.key}
              disabled={isDisabledItem}
              className={showDisabledState && isDisabledItem ? 'opacity-40' : ''}
            >
              {c.label}
              {showDisabledState && isDisabledItem && (
                <span className="text-muted-foreground ms-1 text-xs">(disabled)</span>
              )}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
