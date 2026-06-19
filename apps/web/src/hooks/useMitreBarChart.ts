import { useState, useCallback } from 'react'

export function useMitreBarChart() {
  const [isNarrow, setIsNarrow] = useState(false)

  const handleResize = useCallback((width: number) => {
    setIsNarrow(width < 400)
  }, [])

  const yAxisWidth = isNarrow ? 50 : 75
  const leftMargin = isNarrow ? 55 : 80

  return { isNarrow, handleResize, yAxisWidth, leftMargin }
}
