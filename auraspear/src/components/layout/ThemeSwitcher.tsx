'use client'

import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui'
import { useThemeSwitcher } from '@/hooks'

export function ThemeSwitcher() {
  const { t, mounted, isDark, handleToggle } = useThemeSwitcher()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Moon className="text-muted-foreground h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={isDark ? t('lightMode') : t('darkMode')}
    >
      {isDark ? (
        <Sun className="text-muted-foreground h-4 w-4" />
      ) : (
        <Moon className="text-muted-foreground h-4 w-4" />
      )}
    </Button>
  )
}
