import { useState } from 'react'
import { QueryClient } from '@tanstack/react-query'

export function useProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return { queryClient }
}
