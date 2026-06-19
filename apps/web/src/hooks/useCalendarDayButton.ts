import { useEffect, useRef } from 'react'

export function useCalendarDayButton(modifiers: Record<string, boolean>) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (modifiers['focused']) {
      ref.current?.focus()
    }
  }, [modifiers])

  return { ref }
}
